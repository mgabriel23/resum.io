// Shows the concierge service price in PHP (default) or USD depending on
// the visitor's likely location — using ONLY signals the browser already
// exposes locally (no fetch/API call), since this site is static on
// GitHub Pages with no backend to do IP-based geolocation.
//
// Trade-off to be aware of: navigator.language reflects the browser/OS
// language setting, not physical location — a Filipino visitor using an
// English-US browser locale won't be detected as PH, and a traveler
// abroad with a PH locale still set will be. This is a best-effort
// guess, not a reliable location lookup, which is why the manual
// toggle exists as the real fallback.
(() => {
	const priceEl = document.getElementById("concierge-price");
	const toggleButtons = document.querySelectorAll(".concierge__currency-btn");

	if (!priceEl || toggleButtons.length === 0) return;

	function setCurrency(currency) {
		const price =
			currency === "usd"
				? priceEl.dataset.priceUsd
				: priceEl.dataset.pricePhp;
		priceEl.textContent = price;

		toggleButtons.forEach((btn) => {
			btn.classList.toggle(
				"is-active",
				btn.dataset.currency === currency,
			);
		});

		sessionStorage.setItem("concierge-currency-manual", currency);
	}

	toggleButtons.forEach((btn) => {
		btn.addEventListener("click", () => setCurrency(btn.dataset.currency));
	});

	// Respect a currency the visitor already picked this session before
	// running any auto-detection.
	const manualChoice = sessionStorage.getItem("concierge-currency-manual");
	if (manualChoice) {
		setCurrency(manualChoice);
		return;
	}

	// --- Client-side-only heuristic (no network requests) ---
	// Signal 1: browser/OS language region, e.g. "en-PH" -> "PH"
	const languageRegion = (navigator.language || "")
		.split("-")[1]
		?.toUpperCase();

	// Signal 2: IANA timezone, as a second independent hint
	let timezone = "";
	try {
		timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
	} catch (err) {
		// Intl.DateTimeFormat is universally supported in evergreen browsers;
		// this catch only guards very old/unusual environments.
	}

	const looksLikePH = languageRegion === "PH" || timezone === "Asia/Manila";

	setCurrency(looksLikePH ? "php" : "usd");
})();
