/**
 * Drives the full-screen editor: form <-> state <-> live preview <-> localStorage.
 * `state` is the single in-memory source of truth for the resume being edited;
 * the DOM form is just a view onto it, rebuilt on open and re-read on every change.
 */
const ResumeEditor = (function () {
  let state = ResumeStorage.getDefaultData();
  let saveTimer = null;
  let elementFocusedBeforeOpen = null;

  const ENTRY_CONFIG = {
    experience: { templateId: 'experienceEntryTemplate', listSelector: '#experienceList', hasBullets: true },
    projects: { templateId: 'projectEntryTemplate', listSelector: '#projectsList', hasBullets: true },
    education: { templateId: 'educationEntryTemplate', listSelector: '#educationList', hasBullets: false },
    certificates: { templateId: 'certificateEntryTemplate', listSelector: '#certificatesList', hasBullets: false }
  };

  const SECTION_LABELS = {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    certificates: 'Certificates',
    skills: 'Skills'
  };

  let dragSectionId = null;

  const PHOTO_MAX_DIMENSION = 480; // px, longest side, after resize
  const PHOTO_MAX_FILE_BYTES = 8 * 1024 * 1024; // reject absurdly large files before even reading them
  const PHOTO_PLACEHOLDER_HTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

  function previewEl() {
    return document.getElementById('resumePreview');
  }

  // Elements a keyboard user can reach, in DOM/tab order, for the focus trap.
  function getFocusableElements() {
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(document.getElementById('editorOverlay').querySelectorAll(selector))
      .filter(el => el.offsetParent !== null);
  }

  function trapFocus(e) {
    const focusable = getFocusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open(templateId) {
    state = ResumeStorage.load() || ResumeStorage.getDefaultData();
    if (templateId) state.templateId = templateId;
    state.sectionOrder = normalizeSectionOrder(state.sectionOrder);

    populateForm(state);
    $('#templateSwitcher').val(state.templateId);
    renderSectionList();
    renderPhotoField();
    renderPreview();

    elementFocusedBeforeOpen = document.activeElement;
    $('body').addClass('editor-open');
    $('#editorOverlay').addClass('is-open').attr('aria-hidden', 'false');
    $('#editorBackBtn').trigger('focus');
  }

  function close() {
    $('#editorOverlay').removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('editor-open');
    closeMobilePreview();

    if (elementFocusedBeforeOpen && document.body.contains(elementFocusedBeforeOpen)) {
      elementFocusedBeforeOpen.focus();
    }
    elementFocusedBeforeOpen = null;
  }

  function populateForm(data) {
    $('#firstName').val(data.personal.firstName);
    $('#lastName').val(data.personal.lastName);
    $('#headline').val(data.personal.headline);
    $('#email').val(data.personal.email);
    $('#phone').val(data.personal.phone);
    $('#location').val(data.personal.location);
    $('#website').val(data.personal.website);
    $('#summaryInput').val(data.summary);

    $('#experienceList').empty();
    (data.experience || []).forEach(entry => addEntry('experience', entry));

    $('#projectsList').empty();
    (data.projects || []).forEach(entry => addEntry('projects', entry));

    $('#educationList').empty();
    (data.education || []).forEach(entry => addEntry('education', entry));

    $('#certificatesList').empty();
    (data.certificates || []).forEach(entry => addEntry('certificates', entry));

    $('#skillChips').empty();
    (data.skills || []).forEach(skill => addSkillChip(skill));
  }

  // A resume saved before a given section type existed (or before this
  // ordering feature shipped) won't list it — append any missing ones,
  // visible, rather than silently losing that section.
  function normalizeSectionOrder(order) {
    const present = new Set((order || []).map(s => s.id));
    const missing = Object.keys(SECTION_LABELS)
      .filter(id => !present.has(id))
      .map(id => ({ id, visible: true }));
    return [...(order || []), ...missing];
  }

  function sectionOrderRowHtml(item, index, total) {
    const label = SECTION_LABELS[item.id] || item.id;
    const hiddenClass = item.visible ? '' : ' section-order-row--hidden';
    return `
      <div class="section-order-row${hiddenClass}" draggable="true" data-section-id="${item.id}">
        <span class="section-order-row__handle" aria-hidden="true">&#8942;&#8942;</span>
        <span class="section-order-row__label">${label}</span>
        <div class="section-order-row__actions">
          <button type="button" class="section-order-row__arrow" data-direction="up" aria-label="Move ${label} up"${index === 0 ? ' disabled' : ''}>&uarr;</button>
          <button type="button" class="section-order-row__arrow" data-direction="down" aria-label="Move ${label} down"${index === total - 1 ? ' disabled' : ''}>&darr;</button>
          <label class="toggle-switch">
            <input type="checkbox" ${item.visible ? 'checked' : ''} aria-label="Show ${label} section">
            <span class="toggle-switch__track" aria-hidden="true"></span>
          </label>
        </div>
      </div>`;
  }

  function renderSectionList() {
    const $list = $('#sectionOrderList');
    $list.empty();
    state.sectionOrder.forEach((item, index) => {
      $list.append(sectionOrderRowHtml(item, index, state.sectionOrder.length));
    });
  }

  function moveSection(id, delta) {
    const index = state.sectionOrder.findIndex(s => s.id === id);
    const newIndex = index + delta;
    if (index === -1 || newIndex < 0 || newIndex >= state.sectionOrder.length) return;
    const [item] = state.sectionOrder.splice(index, 1);
    state.sectionOrder.splice(newIndex, 0, item);
    renderSectionList();
    renderPreview();
    scheduleSave();
  }

  function reorderSection(sourceId, targetId) {
    const fromIndex = state.sectionOrder.findIndex(s => s.id === sourceId);
    const toIndex = state.sectionOrder.findIndex(s => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const [item] = state.sectionOrder.splice(fromIndex, 1);
    state.sectionOrder.splice(toIndex, 0, item);
    renderSectionList();
    renderPreview();
    scheduleSave();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }

  // Downscales to at most PHOTO_MAX_DIMENSION on the longest side and
  // re-encodes as JPEG — a raw phone-camera photo can be several MB, which
  // risks the localStorage quota and makes for a slow, bloated PDF export.
  function resizeImage(dataUrl, maxDimension) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Could not load the selected image.'));
      img.src = dataUrl;
    });
  }

  async function handlePhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > PHOTO_MAX_FILE_BYTES) {
      console.warn('ResumeEditor: photo file is too large, ignoring.');
      return;
    }
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      state.personal.photo = await resizeImage(rawDataUrl, PHOTO_MAX_DIMENSION);
      state.personal.photoVisible = true;
      renderPhotoField();
      renderPreview();
      scheduleSave();
    } catch (err) {
      console.warn('ResumeEditor: could not process the selected photo.', err);
    }
  }

  function removePhoto() {
    state.personal.photo = '';
    state.personal.photoVisible = true;
    state.personal.photoPosition = 'left';
    $('#photoInput').val('');
    renderPhotoField();
    renderPreview();
    scheduleSave();
  }

  function renderPhotoField() {
    const hasPhoto = !!state.personal.photo;
    $('#photoField').toggleClass('has-photo', hasPhoto);
    $('#photoPreview').html(hasPhoto ? `<img src="${state.personal.photo}" alt="">` : PHOTO_PLACEHOLDER_HTML);
    $('#photoVisibleInput').prop('checked', hasPhoto && state.personal.photoVisible !== false);
    $('input[name="photoPosition"]').each(function () {
      $(this).prop('checked', $(this).val() === (state.personal.photoPosition || 'left'));
    });
  }

  function addEntry(type, values) {
    values = values || {};
    const config = ENTRY_CONFIG[type];
    const tpl = document.getElementById(config.templateId);
    const node = tpl.content.firstElementChild.cloneNode(true);

    $(node).find('[data-field]').each(function () {
      const field = $(this).data('field');
      if (values[field] !== undefined) $(this).val(values[field]);
    });

    if (config.hasBullets) {
      populateBullets(node, values.bullets);
    }

    $(config.listSelector).append(node);
  }

  // Accepts either the new array shape or the old newline-separated string
  // (resumes saved before bullets became separate inputs), always returns an array.
  function toBulletArray(value) {
    if (Array.isArray(value)) return value;
    return (value || '').split('\n').map(s => s.trim()).filter(Boolean);
  }

  function populateBullets(entryNode, bullets) {
    const $list = $(entryNode).find('.bullet-list');
    $list.empty();
    const items = toBulletArray(bullets);
    (items.length ? items : ['']).forEach(text => addBulletRow($list, text));
  }

  function addBulletRow($list, value) {
    const tpl = document.getElementById('bulletRowTemplate');
    const node = tpl.content.firstElementChild.cloneNode(true);
    $(node).find('.bullet-input').val(value || '');
    $list.append(node);
  }

  function focusFirstField($container) {
    $container.find('input, textarea').first().trigger('focus');
  }

  function addSkillChip(skill) {
    const $chip = $('<span class="skill-chip"><span class="skill-chip__label"></span><button type="button" aria-label="Remove skill">&times;</button></span>');
    $chip.find('.skill-chip__label').text(skill);
    $('#skillChips').append($chip);
  }

  function collectEntries(type) {
    const config = ENTRY_CONFIG[type];
    const entries = [];
    $(config.listSelector).children('.entry-card').each(function () {
      const entry = {};
      $(this).find('[data-field]').each(function () {
        entry[$(this).data('field')] = $(this).val();
      });
      if (config.hasBullets) {
        entry.bullets = $(this).find('.bullet-input').map(function () { return $(this).val(); }).get();
      }
      entries.push(entry);
    });
    return entries;
  }

  function collectSkills() {
    const skills = [];
    $('#skillChips .skill-chip__label').each(function () {
      skills.push($(this).text());
    });
    return skills;
  }

  function collectFormData() {
    return {
      templateId: state.templateId,
      personal: {
        firstName: $('#firstName').val().trim(),
        lastName: $('#lastName').val().trim(),
        headline: $('#headline').val().trim(),
        email: $('#email').val().trim(),
        phone: $('#phone').val().trim(),
        location: $('#location').val().trim(),
        website: $('#website').val().trim(),
        // Not derived from a form field — carried over as-is; the file
        // input's own handler mutates state.personal.photo directly.
        photo: state.personal.photo,
        photoVisible: state.personal.photoVisible,
        photoPosition: state.personal.photoPosition
      },
      summary: $('#summaryInput').val(),
      experience: collectEntries('experience'),
      projects: collectEntries('projects'),
      education: collectEntries('education'),
      certificates: collectEntries('certificates'),
      skills: collectSkills(),
      // Not derived from a form field — carried over as-is; its own
      // handlers (toggle/arrows/drag) mutate state.sectionOrder directly.
      sectionOrder: state.sectionOrder
    };
  }

  function renderPreview() {
    ResumeRender.renderInto(previewEl(), state);
    updatePageBreaks();
  }

  // Draws a dashed line + "Page N" label wherever content crosses another
  // A4 page height, so the preview shows a multi-page resume before export.
  // One page's height is derived from the page's own current on-screen
  // width (via its 210:297 aspect-ratio), so it stays correct at any zoom.
  function updatePageBreaks() {
    const pageEl = document.querySelector('.resume-page');
    if (!pageEl) return;

    $(pageEl).find('.page-break-marker').remove();

    const width = pageEl.getBoundingClientRect().width;
    if (!width) return;
    const pageHeightPx = width * (297 / 210);
    const contentHeight = pageEl.scrollHeight;
    const pageCount = Math.max(1, Math.ceil(contentHeight / pageHeightPx));

    for (let i = 1; i < pageCount; i++) {
      const $marker = $('<div class="page-break-marker"><span>Page ' + (i + 1) + '</span></div>');
      $marker.css('top', (i * pageHeightPx) + 'px');
      $(pageEl).append($marker);
    }
  }

  function syncFromForm() {
    state = collectFormData();
    renderPreview();
    scheduleSave();
  }

  function scheduleSave() {
    $('#saveIndicator').addClass('is-saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      ResumeStorage.save(state);
      $('#saveIndicator').removeClass('is-saving');
    }, 300);
  }

  function openMobilePreview() {
    $('#previewPanel').addClass('mobile-open');
  }

  function closeMobilePreview() {
    $('#previewPanel').removeClass('mobile-open');
  }

  function bindEvents() {
    $('#editorBackBtn').on('click', close);

    $('#templateSwitcher').on('change', function () {
      state.templateId = $(this).val();
      renderPreview();
      scheduleSave();
    });

    $(document).on('input change', '.editor-form-panel input:not(#skillInput):not(#photoInput):not(#photoVisibleInput):not([name="photoPosition"]):not(.section-order-row input), .editor-form-panel textarea', syncFromForm);

    $('#photoUploadBtn').on('click', function () {
      $('#photoInput').trigger('click');
    });

    $('#photoInput').on('change', function () {
      handlePhotoFile(this.files && this.files[0]);
    });

    $('#photoRemoveBtn').on('click', removePhoto);

    $('#photoVisibleInput').on('change', function () {
      state.personal.photoVisible = $(this).is(':checked');
      renderPreview();
      scheduleSave();
    });

    $(document).on('change', 'input[name="photoPosition"]', function () {
      state.personal.photoPosition = $(this).val();
      renderPreview();
      scheduleSave();
    });

    $(document).on('change', '.section-order-row .toggle-switch input', function () {
      const id = $(this).closest('.section-order-row').data('section-id');
      const entry = state.sectionOrder.find(s => String(s.id) === String(id));
      if (!entry) return;
      entry.visible = $(this).is(':checked');
      renderSectionList();
      renderPreview();
      scheduleSave();
    });

    $(document).on('click', '.section-order-row__arrow', function () {
      if ($(this).is(':disabled')) return;
      const id = $(this).closest('.section-order-row').data('section-id');
      moveSection(id, $(this).data('direction') === 'up' ? -1 : 1);
    });

    $(document).on('dragstart', '.section-order-row', function (e) {
      dragSectionId = $(this).data('section-id');
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      $(this).addClass('is-dragging');
    });

    $(document).on('dragend', '.section-order-row', function () {
      $(this).removeClass('is-dragging');
      $('.section-order-row').removeClass('is-drop-target');
      dragSectionId = null;
    });

    $(document).on('dragover', '.section-order-row', function (e) {
      e.preventDefault();
      $('.section-order-row').removeClass('is-drop-target');
      if ($(this).data('section-id') !== dragSectionId) $(this).addClass('is-drop-target');
    });

    $(document).on('drop', '.section-order-row', function (e) {
      e.preventDefault();
      const targetId = $(this).data('section-id');
      if (dragSectionId) reorderSection(dragSectionId, targetId);
    });

    // One delegated handler for all four "+ Add ..." entry buttons, instead
    // of four near-identical click handlers — see data-entry-type in the HTML.
    $(document).on('click', '.add-entry-btn[data-entry-type]', function () {
      const type = $(this).data('entry-type');
      addEntry(type, {});
      syncFromForm();
      focusFirstField($(ENTRY_CONFIG[type].listSelector).children('.entry-card').last());
    });

    $(document).on('click', '.entry-remove', function () {
      $(this).closest('.entry-card').remove();
      syncFromForm();
    });

    $(document).on('click', '.add-bullet-btn', function () {
      const $list = $(this).siblings('.bullet-list');
      addBulletRow($list, '');
      syncFromForm();
      $list.children('.bullet-row').last().find('.bullet-input').trigger('focus');
    });

    $(document).on('click', '.bullet-remove', function () {
      $(this).closest('.bullet-row').remove();
      syncFromForm();
    });

    $('#skillInput').on('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      const value = $(this).val().replace(/,/g, '').trim();
      const alreadyExists = collectSkills().some(s => s.toLowerCase() === value.toLowerCase());
      if (value && !alreadyExists) {
        addSkillChip(value);
        syncFromForm();
      }
      $(this).val('');
    });

    $(document).on('click', '.skill-chip button', function () {
      $(this).closest('.skill-chip').remove();
      syncFromForm();
    });

    $('#mobilePreviewBtn').on('click', openMobilePreview);
    $('#closePreviewBtn').on('click', closeMobilePreview);

    $('#exportPdfBtn').on('click', function () {
      window.print();
    });

    $(document).on('keydown', function (e) {
      if (!$('#editorOverlay').hasClass('is-open')) return;

      if (e.key === 'Escape') {
        if ($('#previewPanel').hasClass('mobile-open')) {
          closeMobilePreview();
        } else {
          close();
        }
        return;
      }

      if (e.key === 'Tab') {
        trapFocus(e);
      }
    });
  }

  function init() {
    bindEvents();
  }

  return { init, open };
})();

$(function () {
  ResumeEditor.init();
});
