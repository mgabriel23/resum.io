// Click-to-play behavior for the "how it works" card videos:
// each clip is paused by default, plays once on click, and resets
// to frame 0 when it ends so a second click replays from the start.
(() => {
	const mediaBlocks = document.querySelectorAll(".how-step__media");

	mediaBlocks.forEach((media) => {
		const video = media.querySelector(".how-step__video");
		const playButton = media.querySelector(".how-step__play");

		if (!video || !playButton) return;

		playButton.addEventListener("click", () => {
			video.currentTime = 0; // ensures replay starts from the beginning, not mid/end frame
			video.play().catch(() => {
				/* Playback can be rejected (e.g. media not ready yet); safe to ignore. */
			});
		});

		video.addEventListener("play", () => {
			media.classList.add("is-playing");
		});

		video.addEventListener("ended", () => {
			media.classList.remove("is-playing");
			video.currentTime = 0; // rewinds so the poster/first frame shows again while idle
		});

		// Also handle a native pause (e.g. user right-clicks and pauses via
		// browser context menu) so the button reliably comes back.
		video.addEventListener("pause", () => {
			if (video.ended) return; // 'ended' handler already covers this case
			media.classList.remove("is-playing");
		});
	});
})();
