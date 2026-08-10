/**
 * First-run guided tour for the editor: a sequence of tooltips that spotlight
 * real UI elements (template switcher, sections, form, writing assistant,
 * preview, score, autosave, export), teaching a new user what each part
 * does. Shown automatically the first time the editor opens, then never
 * again unless replayed via the help button in the topbar.
 */
const ResumeTour = (function () {
  const SEEN_KEY = 'resumio.tourSeen.v1';

  const STEPS = [
    {
      selector: '#templateSwitcher',
      title: 'Pick a template',
      body: 'Choose a look for your resume. You can switch styles anytime — your content stays safe.'
    },
    {
      selector: '.section-order',
      title: 'Organize your sections',
      body: 'Show, hide, or drag to reorder any section so the resume fits your story.'
    },
    {
      selector: '#resumeAccordion',
      title: 'Fill in your details',
      body: 'Open any section and start typing — your resume builds itself as you go. Fields marked with * count toward your score, and a warning icon shows up on any that still need attention.'
    },
    {
      selector: '#assistantFab',
      title: 'Stuck on what to write?',
      body: 'The writing assistant can draft a summary, a highlight bullet, or a skills list for you — just tell it the role, like "summary for a web developer."'
    },
    {
      selector: '[data-bs-target="#panelExperience"]',
      title: 'Reorder anytime',
      body: 'Jobs, projects, certificates, and skills can all be reordered — drag them, or use the ↑↓ buttons, into whatever order tells your story best.'
    },
    {
      selector: '.preview-panel',
      mobileSelector: '#mobilePreviewBtn',
      title: 'Live preview',
      body: 'This is exactly what your exported PDF will look like, true to size.'
    },
    {
      selector: '#scoreBadge',
      title: 'Resume Score',
      body: 'Checks completeness and quality as you go — export unlocks at 70%. Click it anytime to see exactly what’s still missing.'
    },
    {
      selector: '#saveIndicator',
      title: 'Autosave',
      body: 'Everything is saved automatically in your browser. No save button needed.'
    },
    {
      selector: '#exportPdfBtn',
      title: 'Export your PDF',
      body: 'When you’re happy with it, download a clean, ATS-friendly PDF here.'
    }
  ];

  let currentIndex = 0;
  let active = false;
  let $spotlight, $tooltip;

  function hasSeenTour() {
    try {
      return window.localStorage.getItem(SEEN_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function markSeen() {
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch (err) {
      // Private browsing / storage unavailable — nothing to persist, no harm done.
    }
  }

  // Falls back to a mobile-only target (e.g. the floating Preview button)
  // when the primary target is hidden by a responsive breakpoint; if
  // neither is visible, the step still shows, just centered with no spotlight.
  function resolveTarget(step) {
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
    if (step.mobileSelector) {
      const fallback = document.querySelector(step.mobileSelector);
      if (fallback) {
        const rect = fallback.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return fallback;
      }
    }
    return null;
  }

  function buildUI() {
    // No separate blocking backdrop: the spotlight's own box-shadow already
    // dims everything else, and both it and the tooltip stay pointer-events:
    // none/auto respectively so the editor's own buttons (back, export, ...)
    // are never covered by an invisible click-blocking layer underneath.
    $spotlight = $('<div class="tour-spotlight"></div>').appendTo('body');
    $tooltip = $(
      '<div class="tour-tooltip" role="dialog" aria-modal="true" aria-label="Guided tour">' +
        '<div class="tour-tooltip__step"></div>' +
        '<div class="tour-tooltip__title"></div>' +
        '<p class="tour-tooltip__body"></p>' +
        '<div class="tour-tooltip__footer">' +
          '<button type="button" class="tour-tooltip__skip">Skip tour</button>' +
          '<div class="tour-tooltip__nav">' +
            '<button type="button" class="tour-tooltip__btn tour-tooltip__back">Back</button>' +
            '<button type="button" class="tour-tooltip__btn tour-tooltip__btn--primary tour-tooltip__next">Next</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    ).appendTo('body');

    $tooltip.find('.tour-tooltip__skip').on('click', end);
    $tooltip.find('.tour-tooltip__back').on('click', () => goTo(currentIndex - 1));
    $tooltip.find('.tour-tooltip__next').on('click', () => {
      if (currentIndex === STEPS.length - 1) { end(); return; }
      goTo(currentIndex + 1);
    });

    $(window).on('resize.resumeTour', () => { if (active) renderStep(); });
    $(document).on('keydown.resumeTour', (e) => {
      if (!active) return;
      if (e.key === 'Escape') end();
      if (e.key === 'ArrowRight') $tooltip.find('.tour-tooltip__next').trigger('click');
      if (e.key === 'ArrowLeft' && currentIndex > 0) goTo(currentIndex - 1);
    });
  }

  const MARGIN = 14;
  const EDGE = 16;

  // Picks whichever side (below/above the target) has more room, using the
  // tooltip's actual measured size — not a guessed height — then clamps the
  // result to the viewport as a final safety net. Needed because some
  // targets (the preview panel, the whole accordion) are tall enough that
  // neither "below" nor "above" fully fits on shorter screens; without the
  // clamp the tooltip could render partly off the top of the viewport.
  function positionFor(rect, tooltipWidth, tooltipHeight) {
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    let top = (spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove)
      ? rect.bottom + MARGIN
      : rect.top - MARGIN - tooltipHeight;
    top = Math.max(EDGE, Math.min(top, window.innerHeight - tooltipHeight - EDGE));
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - tooltipWidth - EDGE));
    return { top, left };
  }

  function renderStep() {
    const step = STEPS[currentIndex];
    const target = resolveTarget(step);

    $tooltip.find('.tour-tooltip__step').text((currentIndex + 1) + ' / ' + STEPS.length);
    $tooltip.find('.tour-tooltip__title').text(step.title);
    $tooltip.find('.tour-tooltip__body').text(step.body);
    $tooltip.find('.tour-tooltip__back').prop('disabled', currentIndex === 0);
    $tooltip.find('.tour-tooltip__next').text(currentIndex === STEPS.length - 1 ? 'Done' : 'Next');

    if (!target) {
      $spotlight.hide();
      $tooltip.css({ top: '50%', left: '50%', bottom: 'auto', transform: 'translate(-50%, -50%)' });
      return;
    }

    // The target can be scrolled out of view inside the form panel (e.g. a
    // later accordion section, pushed down while an earlier one is open) —
    // bring it into view first so the spotlight lands on something visible.
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = target.getBoundingClientRect();
    $spotlight.show().css({
      top: (rect.top - 6) + 'px',
      left: (rect.left - 6) + 'px',
      width: (rect.width + 12) + 'px',
      height: (rect.height + 12) + 'px'
    });

    // Measure the tooltip's real rendered size (content-dependent) before
    // placing it, rather than guessing a fixed height.
    $tooltip.css({ visibility: 'hidden', bottom: 'auto', transform: 'none' }).show();
    const tooltipWidth = $tooltip.outerWidth();
    const tooltipHeight = $tooltip.outerHeight();
    const pos = positionFor(rect, tooltipWidth, tooltipHeight);
    $tooltip.css({ top: pos.top + 'px', left: pos.left + 'px', bottom: 'auto', visibility: 'visible' });
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(STEPS.length - 1, index));
    renderStep();
  }

  function start() {
    if (!$spotlight) buildUI();
    active = true;
    currentIndex = 0;
    $spotlight.show();
    $tooltip.show();
    renderStep();
    $tooltip.find('.tour-tooltip__skip').trigger('focus');
  }

  function end() {
    active = false;
    if ($spotlight) { $spotlight.hide(); $tooltip.hide(); }
    markSeen();
  }

  // Same visual cleanup as end(), but doesn't mark the tour as seen — used
  // when the editor itself closes mid-tour, so an unfinished tour still
  // auto-starts again next time instead of counting as "shown".
  function stopIfActive() {
    if (!active) return;
    active = false;
    if ($spotlight) { $spotlight.hide(); $tooltip.hide(); }
  }

  function maybeAutoStart() {
    if (hasSeenTour()) return;
    setTimeout(start, 400); // let the editor-open transition settle first
  }

  return { start, maybeAutoStart, stopIfActive };
})();
