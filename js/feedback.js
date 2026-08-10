/**
 * Post-export feedback prompt: after a successful PDF export, sometimes (not
 * every time) invites the user to leave feedback via the Tally form in a new
 * tab. Capped at 2 lifetime shows per browser, and never more than once per
 * page session — so someone exporting several times in one sitting can't get
 * it twice in a row. Ties strictly to a completed export, never to plain
 * browsing or editing.
 */
const ResumeFeedback = (function () {
  const COUNT_KEY = 'resumio.feedbackPromptCount.v1';
  const MAX_SHOWS = 2;
  const SHOW_CHANCE = 0.6;
  const FEEDBACK_URL = 'https://tally.so/r/EkGJJ4';

  let shownThisSession = false;
  let $backdrop;

  function getShownCount() {
    try {
      return parseInt(window.localStorage.getItem(COUNT_KEY), 10) || 0;
    } catch (err) {
      return 0;
    }
  }

  function incrementShownCount() {
    try {
      window.localStorage.setItem(COUNT_KEY, String(getShownCount() + 1));
    } catch (err) {
      // Private browsing / storage unavailable — nothing to persist, no harm done.
    }
  }

  function buildUI() {
    $backdrop = $(
      '<div id="feedbackModalBackdrop" class="feedback-modal-backdrop">' +
        '<div class="feedback-modal" role="dialog" aria-modal="true" aria-label="Feedback">' +
          '<button type="button" class="feedback-modal__close" aria-label="Close">&times;</button>' +
          '<h2 class="feedback-modal__title">Your resume is ready!</h2>' +
          '<p class="feedback-modal__body">Got 30 seconds? Tell us what you think — it really helps us improve resum.io.</p>' +
          '<div class="feedback-modal__actions">' +
            '<a href="' + FEEDBACK_URL + '" target="_blank" rel="noopener noreferrer" class="feedback-modal__cta">Give feedback</a>' +
            '<button type="button" class="feedback-modal__later">Maybe later</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    ).appendTo('body');

    $backdrop.on('click', function (e) {
      if (e.target === this) close();
    });
    $backdrop.find('.feedback-modal__close, .feedback-modal__later, .feedback-modal__cta').on('click', close);

    $(document).on('keydown.resumeFeedback', function (e) {
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

  // Called after a successful export (see editor.js's afterprint handler).
  function maybeShow() {
    if (shownThisSession) return;
    if (getShownCount() >= MAX_SHOWS) return;
    if (Math.random() >= SHOW_CHANCE) return;

    shownThisSession = true;
    incrementShownCount();
    open();
  }

  return { maybeShow };
})();
