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

    populateForm(state);
    $('#templateSwitcher').val(state.templateId);
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
        website: $('#website').val().trim()
      },
      summary: $('#summaryInput').val(),
      experience: collectEntries('experience'),
      projects: collectEntries('projects'),
      education: collectEntries('education'),
      certificates: collectEntries('certificates'),
      skills: collectSkills()
    };
  }

  function renderPreview() {
    ResumeRender.renderInto(previewEl(), state);
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

    $(document).on('input change', '.editor-form-panel input:not(#skillInput), .editor-form-panel textarea', syncFromForm);

    $('#addExperienceBtn').on('click', function () {
      addEntry('experience', {});
      syncFromForm();
    });

    $('#addProjectBtn').on('click', function () {
      addEntry('projects', {});
      syncFromForm();
    });

    $('#addEducationBtn').on('click', function () {
      addEntry('education', {});
      syncFromForm();
    });

    $('#addCertificateBtn').on('click', function () {
      addEntry('certificates', {});
      syncFromForm();
    });

    $(document).on('click', '.entry-remove', function () {
      $(this).closest('.entry-card').remove();
      syncFromForm();
    });

    $(document).on('click', '.add-bullet-btn', function () {
      const $list = $(this).siblings('.bullet-list');
      addBulletRow($list, '');
      syncFromForm();
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

  return { init, open, close };
})();

$(function () {
  ResumeEditor.init();
});
