/**
 * In-app replacement for the browser's native alert() — a small, non-blocking
 * notice that appears at the top of the screen, announced to screen readers
 * via aria-live, auto-dismisses, or can be closed manually. Supports 'warning'
 * (default) and 'error' severities; more can be added the same way if needed.
 */
const ResumeToast = (function () {
  const AUTO_HIDE_MS = 6000;

  const ICONS = {
    success: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    warning: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    error: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
  };

  let $toast;
  let hideTimer = null;

  function buildUI() {
    $toast = $(
      '<div id="resumeToast" class="toast-notice" role="alert" aria-live="assertive">' +
        '<span class="toast-notice__icon" aria-hidden="true"></span>' +
        '<span class="toast-notice__message"></span>' +
        '<button type="button" class="toast-notice__close" aria-label="Dismiss">&times;</button>' +
      '</div>'
    ).appendTo('body');

    $toast.find('.toast-notice__close').on('click', hide);
  }

  function show(message, type) {
    if (!$toast) buildUI();
    const severity = type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning';

    clearTimeout(hideTimer);
    $toast
      .removeClass('is-success is-warning is-error')
      .addClass('is-' + severity)
      .addClass('is-open');
    $toast.find('.toast-notice__icon').html(ICONS[severity]);
    $toast.find('.toast-notice__message').text(message);

    ResumeSound[severity]();

    hideTimer = setTimeout(hide, AUTO_HIDE_MS);
  }

  function hide() {
    clearTimeout(hideTimer);
    if ($toast) $toast.removeClass('is-open');
  }

  return { show, hide };
})();
