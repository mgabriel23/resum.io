/**
 * "What's new" modal opened from the version badge in the footer. Content
 * is a plain static list — there's no backend to fetch it from, so each
 * release's highlights are just added here by hand when the version bumps.
 */
const ResumeChangelog = (function () {
    const CHANGELOG = [
        {
            version: 'v1.0.5',
            current: true,
            highlights: [
                'Redesigned landing page sections with an upgraded modern visual theme.',
                'Added Hero final output preview to showcase expected resume results instantly.',
                'Added short video demos for quick visual guidance on key features.',
                'Added user testimonials to build trust and highlight real success stories.',
                'Integrated official Facebook page link for real-time updates and announcements.',
            ],
        },
        {
            version: 'v1.0.4',
            current: false,
            highlights: [
                'Added AI Writing Assistant to generate role summaries, bullets, and skills instantly.',
                'Requires a 70%+ Resume Score before PDF export to prevent incomplete downloads.',
                'Added smart field validation and real-time warnings for missing information.',
                'Replaced native browser popups with modern toast notifications and audio cues.',
                'Simplified the Resume Score checklist into plain, actionable feedback.',
            ],
        },
        {
            version: 'v1.0.3',
            highlights: [
                'Added live Resume Quality Score badge to track completion.',
                'Added drag-and-drop reordering for resume sections and entries.',
                'Added interactive first-time guided tour.',
                'Fixed an issue causing blank PDF exports on fresh loads.',
            ],
        },
        {
            version: 'v1.0.2',
            highlights: [
                'Official rebranding to resum.io with a refreshed UI layout.',
                'Added profile photo upload support and section visibility toggles.',
                'Improved A4 preview scaling and mobile touch controls.',
            ],
        },
        {
            version: 'v1.0.1',
            highlights: [
                'Added Projects and Certificates sections.',
                'Added multi-page PDF export support.',
                'Added sample data presets to populate the editor instantly.',
                'Improved keyboard navigation and accessibility across form inputs.',
            ],
        },
        {
            version: 'v1.0.0',
            highlights: ['Initial Release — Free, account-free ATS resume builder with instant PDF export.'],
        },
    ];

    let $backdrop;

    function entryHtml(entry) {
        const items = entry.highlights.map((h) => '<li>' + h + '</li>').join('');
        return (
            '<div class="changelog-entry">' +
            '<div class="changelog-entry__header">' +
            '<span class="changelog-entry__version">' +
            entry.version +
            '</span>' +
            (entry.current ? '<span class="changelog-entry__badge">Current</span>' : '') +
            '</div>' +
            '<ul class="changelog-entry__list">' +
            items +
            '</ul>' +
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
                '<div class="changelog-modal__body" tabindex="0">' +
                CHANGELOG.map(entryHtml).join('') +
                '</div>' +
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
