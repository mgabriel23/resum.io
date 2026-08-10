/**
 * Drives the full-screen editor: form <-> state <-> live preview <-> localStorage.
 * `state` is the single in-memory source of truth for the resume being edited;
 * the DOM form is just a view onto it, rebuilt on open and re-read on every change.
 */
const ResumeEditor = (function () {
  let state = ResumeStorage.getDefaultData();
  let saveTimer = null;
  let elementFocusedBeforeOpen = null;

  // Below this Resume Score, export is blocked — too little real content to
  // be worth downloading (and not worth prompting for feedback afterward).
  const MIN_EXPORT_SCORE = 70;

  const ENTRY_CONFIG = {
    experience: { templateId: 'experienceEntryTemplate', listSelector: '#experienceList', hasBullets: true },
    projects: { templateId: 'projectEntryTemplate', listSelector: '#projectsList', hasBullets: true },
    education: { templateId: 'educationEntryTemplate', listSelector: '#educationList', hasBullets: false },
    certificates: { templateId: 'certificateEntryTemplate', listSelector: '#certificatesList', hasBullets: false }
  };

  // Entry types whose template includes the drag handle + up/down arrows
  // (see addEntry below) — education entries don't have reorder controls.
  const REORDERABLE_ENTRY_TYPES = ['experience', 'projects', 'certificates'];

  const SECTION_LABELS = {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    certificates: 'Certificates',
    skills: 'Skills'
  };

  let dragSectionId = null;
  let dragEntryCard = null;
  let dragSkillChip = null;

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
    syncAccordionButtonStates();

    elementFocusedBeforeOpen = document.activeElement;
    $('body').addClass('editor-open');
    $('#editorOverlay').addClass('is-open').attr('aria-hidden', 'false');
    $('#editorBackBtn').trigger('focus');
    ResumeTour.maybeAutoStart();
    ResumeAssistant.show();
  }

  function close() {
    $('#editorOverlay').removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('editor-open');
    closeMobilePreview();
    ResumeTour.stopIfActive();
    ResumeAssistant.hide();

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

  // Matches the CSS breakpoint that hides the drag handle (editor.css).
  // A draggable="true" ancestor can swallow touch taps meant for its child
  // buttons/checkbox on mobile browsers, so the attribute itself — not just
  // the handle's visibility — needs to be conditional, not just hidden.
  function isDragCapableViewport() {
    return window.matchMedia('(min-width: 992px)').matches;
  }

  function sectionOrderRowHtml(item, index, total) {
    const label = SECTION_LABELS[item.id] || item.id;
    const hiddenClass = item.visible ? '' : ' section-order-row--hidden';
    const draggableAttr = isDragCapableViewport() ? ' draggable="true"' : '';
    return `
      <div class="section-order-row${hiddenClass}"${draggableAttr} data-section-id="${item.id}">
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

    // Native drag only works with a mouse, so the attribute itself (not
    // just a handle's visibility) stays conditional — same reasoning as
    // the section-order rows above.
    if (REORDERABLE_ENTRY_TYPES.includes(type) && isDragCapableViewport()) {
      node.setAttribute('draggable', 'true');
    }

    $(config.listSelector).append(node);
    updateEntryArrowStates($(config.listSelector));
  }

  // Disables "up" on the first card and "down" on the last — a no-op for
  // entry types without reorder arrows (projects/education/certificates),
  // since .entry-card__arrow simply won't exist inside those.
  function updateEntryArrowStates($list) {
    const $cards = $list.children('.entry-card');
    $cards.each(function (i) {
      const $card = $(this);
      $card.find('.entry-card__arrow[data-direction="up"]').prop('disabled', i === 0);
      $card.find('.entry-card__arrow[data-direction="down"]').prop('disabled', i === $cards.length - 1);
    });
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
    if (isDragCapableViewport()) $chip.attr('draggable', 'true');
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

  // True once ANY field anywhere has real content — used to flip the whole
  // preview from "full guided example" to "real data only" in one step,
  // instead of leaving untouched fields showing fake sample text next to
  // fields the user actually filled in.
  function entryHasAnyContent(entry) {
    return Object.keys(entry).some(function (key) {
      const val = entry[key];
      if (Array.isArray(val)) return val.some(v => (v || '').toString().trim());
      return (val || '').toString().trim();
    });
  }

  function isStateEmpty(s) {
    const p = s.personal || {};
    const personalFields = ['firstName', 'lastName', 'headline', 'email', 'phone', 'location', 'website'];
    const hasPersonal = personalFields.some(k => (p[k] || '').trim()) || !!p.photo;
    const hasSummary = !!(s.summary || '').trim();
    const hasLists = ['experience', 'projects', 'education', 'certificates']
      .some(key => (s[key] || []).some(entryHasAnyContent));
    const hasSkills = (s.skills || []).length > 0;
    return !(hasPersonal || hasSummary || hasLists || hasSkills);
  }

  // Mirrors the Resume Score rules exactly (score.js) so the amber marker on
  // a field always agrees with why the score panel says it's incomplete —
  // just aimed at one field instead of a whole rule.
  const REQUIRED_FIELD_TESTS = {
    firstName: v => v.trim().length >= 2,
    lastName: v => v.trim().length >= 2,
    headline: v => v.trim().length >= 3,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    phone: v => (v.match(/\d/g) || []).length >= 7,
    location: v => v.trim().length >= 3
  };

  function isSectionVisible(id) {
    const entry = (state.sectionOrder || []).find(s => s.id === id);
    return !entry || entry.visible !== false;
  }

  function toggleFieldIndicator($input, isValid) {
    $input.siblings('.field-indicator').toggleClass('is-visible', !isValid);
  }

  // Company/role, school/degree count the same way the score's "real entry"
  // check does — just per-field instead of requiring both at once, so
  // whichever one is still blank is the one that lights up.
  function updateEntryFieldIndicators(type, fields) {
    const visible = isSectionVisible(type);
    $(ENTRY_CONFIG[type].listSelector).children('.entry-card').each(function () {
      const $card = $(this);
      fields.forEach(function (field) {
        const $input = $card.find('[data-field="' + field + '"]');
        const isValid = !visible || $input.val().trim().length >= 2;
        toggleFieldIndicator($input, isValid);
      });
    });
  }

  function updateFieldIndicators() {
    Object.keys(REQUIRED_FIELD_TESTS).forEach(function (id) {
      const $input = $('#' + id);
      toggleFieldIndicator($input, REQUIRED_FIELD_TESTS[id]($input.val() || ''));
    });

    const summaryValid = !isSectionVisible('summary') || $('#summaryInput').val().trim().length >= 20;
    toggleFieldIndicator($('#summaryInput'), summaryValid);

    updateEntryFieldIndicators('experience', ['company', 'role']);
    updateEntryFieldIndicators('education', ['school', 'degree']);
  }

  // True once at least one entry in that list has every one of `fields`
  // filled in with real content — same bar as the field-indicator icons use.
  function hasCompleteEntry(type, fields) {
    return $(ENTRY_CONFIG[type].listSelector).children('.entry-card').toArray().some(function (card) {
      return fields.every(function (field) {
        return $(card).find('[data-field="' + field + '"]').val().trim().length >= 2;
      });
    });
  }

  function isPersonalComplete() {
    return Object.keys(REQUIRED_FIELD_TESTS).every(function (id) {
      return REQUIRED_FIELD_TESTS[id]($('#' + id).val() || '');
    });
  }

  function isSummaryComplete() {
    return !isSectionVisible('summary') || $('#summaryInput').val().trim().length >= 20;
  }

  function isExperienceComplete() {
    return !isSectionVisible('experience') || hasCompleteEntry('experience', ['company', 'role']);
  }

  function isEducationComplete() {
    return !isSectionVisible('education') || hasCompleteEntry('education', ['school', 'degree']);
  }

  // Not gated on order — every accordion stays freely clickable (not every
  // user needs every section). This just names which panels have a
  // completeness check, for the "still incomplete, continue anyway?" prompt
  // shown when someone opens a different section while the current one
  // hasn't cleared its required fields yet.
  const ACCORDION_SECTIONS = [
    { target: '#panelPersonal', label: 'Personal details', isComplete: isPersonalComplete },
    { target: '#panelSummary', label: 'Summary', isComplete: isSummaryComplete },
    { target: '#panelExperience', label: 'Experience', isComplete: isExperienceComplete },
    { target: '#panelProjects', label: 'Projects', isComplete: function () { return true; } },
    { target: '#panelEducation', label: 'Education', isComplete: isEducationComplete },
    { target: '#panelCertificates', label: 'Certificates', isComplete: function () { return true; } },
    { target: '#panelSkills', label: 'Skills', isComplete: function () { return true; } }
  ];

  function accordionSectionByTarget(target) {
    return ACCORDION_SECTIONS.find(function (s) { return s.target === target; });
  }

  let $sectionConfirmBackdrop;
  let pendingAccordionTarget = null;

  function buildSectionConfirmUI() {
    $sectionConfirmBackdrop = $(
      '<div id="sectionConfirmBackdrop" class="section-confirm-backdrop">' +
        '<div class="section-confirm" role="dialog" aria-modal="true" aria-label="Section incomplete">' +
          '<span class="section-confirm__icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span>' +
          '<h2 class="section-confirm__title">Finish this section first?</h2>' +
          '<p class="section-confirm__body" id="sectionConfirmMessage"></p>' +
          '<div class="section-confirm__actions">' +
            '<button type="button" class="section-confirm__stay">Finish this section</button>' +
            '<button type="button" class="section-confirm__continue">Continue anyway</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    ).appendTo('body');

    $sectionConfirmBackdrop.on('click', function (e) {
      if (e.target === this) closeSectionConfirm();
    });
    $sectionConfirmBackdrop.find('.section-confirm__stay').on('click', closeSectionConfirm);
    $sectionConfirmBackdrop.find('.section-confirm__continue').on('click', function () {
      const target = pendingAccordionTarget;
      closeSectionConfirm();
      if (target) openAccordionSection(target);
    });

    $(document).on('keydown.sectionConfirm', function (e) {
      if (e.key === 'Escape' && $sectionConfirmBackdrop.hasClass('is-open')) closeSectionConfirm();
    });
  }

  function showSectionConfirm(currentLabel, target) {
    if (!$sectionConfirmBackdrop) buildSectionConfirmUI();
    pendingAccordionTarget = target;
    $('#sectionConfirmMessage').text(
      'You still have required fields left in ' + currentLabel + '. You can continue anyway, or go back and finish it first.'
    );
    $sectionConfirmBackdrop.addClass('is-open');
  }

  function closeSectionConfirm() {
    pendingAccordionTarget = null;
    if ($sectionConfirmBackdrop) $sectionConfirmBackdrop.removeClass('is-open');
  }

  // Bypasses the confirm check entirely — used once the user has explicitly
  // chosen "Continue anyway", so this should behave exactly like a normal
  // accordion click would have.
  function openAccordionSection(target) {
    const el = document.querySelector(target);
    if (!el || !window.bootstrap) return;
    bootstrap.Collapse.getOrCreateInstance(el).show();
  }

  // The accordion buttons no longer carry data-bs-toggle (see bindEvents —
  // Bootstrap's own data-api click listener runs in the capture phase on
  // document, registered before this script even loads, so it always wins
  // any race against code trying to intercept the click). With
  // data-bs-toggle removed, Bootstrap also stops managing .collapsed/
  // aria-expanded on these buttons itself, so this keeps them in sync
  // whenever any panel in the accordion finishes opening or closing.
  function syncAccordionButtonStates() {
    ACCORDION_SECTIONS.forEach(function (section) {
      const isOpen = $(section.target).hasClass('show');
      $('.accordion-button[data-bs-target="' + section.target + '"]')
        .toggleClass('collapsed', !isOpen)
        .attr('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function renderPreview() {
    ResumeRender.renderInto(previewEl(), state, !isStateEmpty(state), true);
    updatePageBreaks();
    ResumeScore.update(state);
    updateFieldIndicators();
  }

  // Browsers suggest document.title as the "Save as PDF" filename, so a
  // print triggered while it's still "resum.io — Build an..." hands the
  // user a file no recruiter (or ATS) would recognize as a resume.
  const DEFAULT_TITLE = document.title;

  function exportDocumentTitle() {
    const name = [state.personal.firstName, state.personal.lastName].map(s => (s || '').trim()).filter(Boolean).join(' ');
    return (name || 'Resume') + ' - Resume';
  }

  function hasRealName(s) {
    return !!((s.personal.firstName || '').trim() || (s.personal.lastName || '').trim());
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

  // .resume-page is fixed at true A4 width (210mm ≈ 794px) so the desktop
  // split view always shows it true-to-size — but on a phone that's wider
  // than the whole screen, leaving text cut off with no visible hint that
  // horizontal scrolling would reveal the rest. `zoom` (unlike `transform`)
  // shrinks its actual layout box too, so the page's own `margin: 0 auto`
  // still centers it, just at a size that fits the screen.
  function fitPreviewToViewport() {
    const pageEl = document.querySelector('.resume-page');
    const panelEl = document.querySelector('.preview-panel');
    if (!pageEl || !panelEl) return;

    const isMobileLayout = !isDragCapableViewport();
    const isMobilePreviewOpen = panelEl.classList.contains('mobile-open');
    if (!isMobileLayout || !isMobilePreviewOpen) {
      pageEl.style.zoom = '';
      return;
    }

    pageEl.style.zoom = '1';
    const naturalWidth = pageEl.getBoundingClientRect().width;
    const available = panelEl.clientWidth - 32; // matches .preview-panel's 1rem side padding on mobile
    if (naturalWidth > 0 && available > 0) {
      pageEl.style.zoom = String(Math.min(1, available / naturalWidth));
    }
  }

  function openMobilePreview() {
    $('#previewPanel').addClass('mobile-open');
    fitPreviewToViewport();
  }

  function closeMobilePreview() {
    $('#previewPanel').removeClass('mobile-open');
  }

  function bindEvents() {
    $('#editorBackBtn').on('click', close);
    $('#tourHelpBtn').on('click', ResumeTour.start);

    // Accordion buttons don't use data-bs-toggle (see index.html) — toggling
    // is handled here instead of leaving it to Bootstrap, so a section with
    // required fields still missing can be confirmed before leaving it.
    $('#resumeAccordion').on('click', '.accordion-button', function () {
      const target = $(this).attr('data-bs-target');
      const $targetPanel = target ? $(target) : $();
      if (!$targetPanel.length) return;

      if ($targetPanel.hasClass('show')) {
        bootstrap.Collapse.getOrCreateInstance($targetPanel[0]).hide();
        return;
      }

      const $openPanel = $('#resumeAccordion .accordion-collapse.show');
      if ($openPanel.length) {
        const openSection = accordionSectionByTarget('#' + $openPanel.attr('id'));
        if (openSection && !openSection.isComplete()) {
          showSectionConfirm(openSection.label, target);
          return;
        }
      }

      openAccordionSection(target);
    });

    $('#resumeAccordion').on('shown.bs.collapse hidden.bs.collapse', syncAccordionButtonStates);

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
      const $list = $(this).closest('.entry-list');
      $(this).closest('.entry-card').remove();
      updateEntryArrowStates($list);
      syncFromForm();
    });

    $(document).on('click', '.entry-card__arrow', function () {
      if ($(this).is(':disabled')) return;
      const $card = $(this).closest('.entry-card');
      const direction = $(this).data('direction');
      const $sibling = direction === 'up' ? $card.prev('.entry-card') : $card.next('.entry-card');
      if (!$sibling.length) return;
      if (direction === 'up') $card.insertBefore($sibling); else $card.insertAfter($sibling);
      updateEntryArrowStates($card.closest('.entry-list'));
      syncFromForm();
    });

    $(document).on('dragstart', '.entry-card[draggable="true"]', function (e) {
      dragEntryCard = this;
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      $(this).addClass('is-dragging');
    });

    $(document).on('dragend', '.entry-card[draggable="true"]', function () {
      $(this).removeClass('is-dragging');
      $('.entry-card').removeClass('is-drop-target');
      dragEntryCard = null;
    });

    $(document).on('dragover', '.entry-card[draggable="true"]', function (e) {
      e.preventDefault();
      $('.entry-card').removeClass('is-drop-target');
      if (this !== dragEntryCard) $(this).addClass('is-drop-target');
    });

    $(document).on('drop', '.entry-card[draggable="true"]', function (e) {
      e.preventDefault();
      if (!dragEntryCard || dragEntryCard === this) return;
      const $list = $(this).closest('.entry-list');
      const cards = $list.children('.entry-card').get();
      const fromIndex = cards.indexOf(dragEntryCard);
      const toIndex = cards.indexOf(this);
      if (fromIndex === -1 || toIndex === -1) return;
      if (fromIndex < toIndex) $(dragEntryCard).insertAfter(this); else $(dragEntryCard).insertBefore(this);
      updateEntryArrowStates($list);
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

    $(document).on('dragstart', '.skill-chip[draggable="true"]', function (e) {
      dragSkillChip = this;
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      $(this).addClass('is-dragging');
    });

    $(document).on('dragend', '.skill-chip[draggable="true"]', function () {
      $(this).removeClass('is-dragging');
      $('.skill-chip').removeClass('is-drop-target');
      dragSkillChip = null;
    });

    $(document).on('dragover', '.skill-chip[draggable="true"]', function (e) {
      e.preventDefault();
      $('.skill-chip').removeClass('is-drop-target');
      if (this !== dragSkillChip) $(this).addClass('is-drop-target');
    });

    $(document).on('drop', '.skill-chip[draggable="true"]', function (e) {
      e.preventDefault();
      if (!dragSkillChip || dragSkillChip === this) return;
      const $list = $('#skillChips');
      const chips = $list.children('.skill-chip').get();
      const fromIndex = chips.indexOf(dragSkillChip);
      const toIndex = chips.indexOf(this);
      if (fromIndex === -1 || toIndex === -1) return;
      if (fromIndex < toIndex) $(dragSkillChip).insertAfter(this); else $(dragSkillChip).insertBefore(this);
      syncFromForm();
    });

    $('#mobilePreviewBtn').on('click', openMobilePreview);
    $('#closePreviewBtn').on('click', closeMobilePreview);
    $(window).on('resize', fitPreviewToViewport);

    $('#exportPdfBtn').on('click', function () {
      // The preview always looks like a full resume (guided sample text),
      // but export strips all of that — a resume with no real name yet
      // would silently produce a blank PDF with no explanation. Catch it
      // here instead of leaving people to wonder why their download is empty.
      if (!hasRealName(state)) {
        ResumeToast.show('Add your name in Personal details first — the preview you\'re seeing is just guide text, so there\'s nothing real to export yet.', 'warning');
        return;
      }
      // A too-thin resume isn't worth downloading yet, and exporting it
      // would also trigger the post-export feedback prompt on effectively
      // no effort — block both by gating export on the Resume Score itself.
      const score = ResumeScore.getPercent(state);
      if (score < MIN_EXPORT_SCORE) {
        ResumeToast.show('Your resume is only ' + score + '% complete. Fill in more details to reach ' + MIN_EXPORT_SCORE + '%+ before exporting — check the Resume Score badge to see exactly what\'s missing.', 'warning');
        return;
      }
      // Only counted once a real export actually proceeds — never for
      // attempts blocked by the guards above, so this reflects genuine
      // resume downloads, not button clicks.
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: 'export-pdf', title: 'Export PDF', event: true });
      }
      ResumeSound.success();
      window.print();
    });

    // Covers both the Export button and Ctrl/Cmd+P: swap in the strict,
    // sample-free render and a real filename right before the browser
    // captures the page, then restore the guided editing view after.
    window.addEventListener('beforeprint', function () {
      document.title = exportDocumentTitle();
      ResumeRender.renderInto(previewEl(), state, true);
    });

    window.addEventListener('afterprint', function () {
      document.title = DEFAULT_TITLE;
      renderPreview();
      ResumeFeedback.maybeShow();
    });

    $(document).on('keydown', function (e) {
      if (!$('#editorOverlay').hasClass('is-open')) return;

      if (e.key === 'Escape') {
        // Each of these floating panels has its own Escape handler already.
        // Without this check, the same keypress would ALSO hit this handler
        // and close the whole editor out from under whichever lighter-weight
        // overlay the user actually meant to dismiss.
        if ($('#scorePanel, #feedbackModalBackdrop, #sectionConfirmBackdrop, #assistantPanel, .tour-tooltip').is(':visible')) return;

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
