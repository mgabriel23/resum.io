/**
 * Landing page interactions: picking a template opens the editor.
 * Switching templates later never destroys existing content — see
 * ResumeEditor.open(), which only overrides templateId on the loaded resume.
 */
$(function () {
  $('.template-card').on('click', function () {
    const templateId = $(this).data('template');
    ResumeEditor.open(templateId);
  });
});
