/**
 * "What's new" modal opened from the version badge in the footer. Content
 * is a plain static list — there's no backend to fetch it from, so each
 * release's highlights are just added here by hand when the version bumps.
 */
const ResumeChangelog = (function () {
  const CHANGELOG = [
    {
      version: 'v1.0.4',
      current: true,
      highlights: [
        'Added a writing assistant that drafts a summary, a highlight bullet, or a skills list for a role you name, then inserts or copies it straight into your resume.',
        'PDF export now requires a 70%+ Resume Score, so a near-empty resume can’t be downloaded by accident.',
        'Every field the Resume Score checks is now marked as required and flags itself when it’s blank or invalid.',
        'Leaving a section that still has required fields empty now asks whether to finish it first or continue anyway, instead of just letting you wander off.',
        'Replaced the browser’s native alert/confirm popups with the app’s own toast notices, paired with short synthesized sound effects.',
        'Rephrased the Resume Score checklist to plain language instead of character-count jargon.',
        'Updated the guided tour to cover the writing assistant and the new scoring rules.',
        'Added a generated favicon and app icon.',
        'General bug fixes and a project-wide cleanup pass.'
      ]
    },
    {
      version: 'v1.0.3',
      highlights: [
        'Added a guided first-run tour of the editor.',
        'Added the Resume Score completeness/quality badge.',
        'Sections, entries, and skills can now be reordered by drag-and-drop or up/down buttons.',
        'Added free, privacy-friendly page-view analytics and an optional post-export feedback prompt.',
        'SEO improvements — meta tags, sitemap, structured data.',
        'Fixed a bug where exporting an untouched resume could produce a blank PDF with no explanation.'
      ]
    },
    {
      version: 'v1.0.2',
      highlights: [
        'Renamed the project to resum.io.',
        'Added section show/hide/reorder controls and profile photo upload.',
        'Rewrote the hero, "How things work", and templates section copy.',
        'Visual refresh of the templates, form, and footer.',
        'Fixed A4 preview sizing on small and large screens, and touch controls for reordering.'
      ]
    },
    {
      version: 'v1.0.1',
      highlights: [
        'Added Projects and Certificates sections.',
        'Added multi-page PDF export support.',
        'Added separate bullet-point inputs for experience entries.',
        'Keyboard accessibility pass — focus trap and tab order through the editor.',
        'Added guided sample content showing what a filled-out resume looks like.'
      ]
    },
    {
      version: 'v1.0.0',
      highlights: [
        'Initial release — pick a template, fill in your details, and export a clean PDF resume, entirely in your browser, no sign-up required.'
      ]
    }
  ];

  let $backdrop;

  function entryHtml(entry) {
    const items = entry.highlights.map(h => '<li>' + h + '</li>').join('');
    return (
      '<div class="changelog-entry">' +
        '<div class="changelog-entry__header">' +
          '<span class="changelog-entry__version">' + entry.version + '</span>' +
          (entry.current ? '<span class="changelog-entry__badge">Current</span>' : '') +
        '</div>' +
        '<ul class="changelog-entry__list">' + items + '</ul>' +
      '</div>'
    );
  }

  function buildUI() {
    $backdrop = $(
      '<div id="changelogBackdrop" class="changelog-modal-backdrop">' +
        '<div class="changelog-modal" role="dialog" aria-modal="true" aria-label="What\'s new">' +
          '<div class="changelog-modal__header">' +
            '<h2 class="changelog-modal__title">What’s new</h2>' +
            '<button type="button" class="changelog-modal__close" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="changelog-modal__body">' + CHANGELOG.map(entryHtml).join('') + '</div>' +
        '</div>' +
      '</div>'
    ).appendTo('body');

    $backdrop.on('click', function (e) {
      if (e.target === this) close();
    });
    $backdrop.find('.changelog-modal__close').on('click', close);
    $(document).on('keydown.resumeChangelog', function (e) {
      if (e.key === 'Escape' && $backdrop.hasClass('is-open')) close();
    });
  }

  function open() {
    if (!$backdrop) buildUI();
    $backdrop.addClass('is-open');
  }

  function close() {
    if ($backdrop) $backdrop.removeClass('is-open');
  }

  function init() {
    $('#changelogTrigger').on('click', open);
  }

  return { init };
})();

$(function () {
  ResumeChangelog.init();
});
