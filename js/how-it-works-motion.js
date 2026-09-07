// Click-to-play behavior for the "how it works" card videos:
// each clip is paused by default, plays once on click, and resets
// to frame 0 when it ends so a second click replays from the start.
(() => {
    const mediaBlocks = document.querySelectorAll('.how-step__media');
    const modal = document.getElementById('video-modal');
    const modalPlayer = document.getElementById('video-modal-player');
    const closeBtn = modal?.querySelector('.video-modal__close');
    const backdrop = modal?.querySelector('.video-modal__backdrop');

    // Card Inline Controls
    mediaBlocks.forEach((media) => {
        const video = media.querySelector('.how-step__video');
        const playButton = media.querySelector('.how-step__play');
        const expandBtn = media.querySelector('.how-step__expand');

        if (!video) return;

        if (playButton) {
            playButton.addEventListener('click', () => {
                video.currentTime = 0;
                video.play().catch(() => {});
            });
        }

        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                video.pause(); // Pause inline playback

                const source = video.querySelector('source')?.src;
                if (source && modalPlayer) {
                    modalPlayer.src = source;
                    openModal();
                }
            });
        }

        video.addEventListener('play', () => media.classList.add('is-playing'));
        video.addEventListener('ended', () => {
            media.classList.remove('is-playing');
            video.currentTime = 0;
        });
        video.addEventListener('pause', () => {
            if (!video.ended) media.classList.remove('is-playing');
        });
    });

    // Modal Mechanics
    function openModal() {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        modalPlayer.play().catch(() => {});
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modalPlayer.pause();
        modalPlayer.src = '';
    }

    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
            closeModal();
        }
    });
})();
