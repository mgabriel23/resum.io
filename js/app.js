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

    const menuToggle = document.getElementById('menuToggle');
    const siteMenu = document.getElementById('siteMenu');

    if (menuToggle && siteMenu) {
        // Toggle menu open/close
        menuToggle.addEventListener('click', () => {
            const isOpen = menuToggle.classList.toggle('is-active');
            siteMenu.classList.toggle('is-active');
            menuToggle.setAttribute('aria-expanded', isOpen);
        });

        // Close menu when clicking nav links
        siteMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('is-active');
                siteMenu.classList.remove('is-active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !siteMenu.contains(e.target)) {
                menuToggle.classList.remove('is-active');
                siteMenu.classList.remove('is-active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
});
