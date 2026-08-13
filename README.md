# resum.io

> A free, privacy-first, single-page resume builder. Pick an ATS-friendly template, fill in your details, and export a clean A4 PDF — no sign-up, no login, and no backend.

---

## 📸 Visual Preview

| Desktop Editor & Live Preview | Mobile Preview Overlay |
| :---: | :---: |
| ![resum.io Desktop Preview](https://github.com/mgabriel23/portfolio/blob/master/assets/resum.io-gallery-3.webp?text=resum.io+Desktop+Editor+Previe) | ![resum.io Mobile Preview](https://github.com/mgabriel23/portfolio/blob/master/assets/resum.io-gallery-3.webp?text=resum.io+Mobile+ Preview) |

---

## ✨ Features

* **3 ATS-Friendly Templates:** Choose between *Default*, *Operator*, and *Highlight*. Built with a single-column, semantic layout under the hood to ensure top compatibility with Applicant Tracking Systems.
* **Live Split Preview:** Real-time rendering as you type. Features a dual-panel desktop editor and a full-screen mobile overlay preview.
* **Guided Sample Content:** Starts with a realistic dummy resume. The instant you type into any field, sample text disappears automatically. Empty sections present dashed editor hints that never show up on export.
* **Smart Drag-and-Drop Reordering:** Easily reorder sections, experience, projects, certificates, and skill chips using drag-and-drop on desktop or simple action buttons on touch/keyboard interfaces.
* **Live Resume Quality Score:** A dynamic completeness badge in the editor topbar that checks contact validity, summary length, and bullet detail with explicit feedback. Blocked from PDF export if score is below 70%.
* **Writing Assistant:** Integrated phrase-bank tool helping you draft targeted summaries, highlight bullet points, and role-specific skill sets.
* **Privacy-First Autosave:** Zero backend. Everything is saved instantly to your browser's `localStorage`.
* **Guided Onboarding Tour:** Built-in spotlight walkthrough on first launch, replayable anytime.
* **A4 PDF Export:** Uses native browser print engine (`window.print()`) pre-configured with precise CSS print styling.
* **Full Accessibility (WCAG Compliant):** Keyboard operable, zero `axe-core` violations, focus-trap modals, and high-contrast placeholder designs.
* **In-App Toast & Audio FX:** Custom, non-intrusive notifications synthesized using the Web Audio API (no external sound files loaded).

---

## 🛠️ Tech Stack

* **Core:** Plain HTML5, CSS3, JavaScript (ES6+) — *No heavy frameworks or build steps.*
* **UI Components:** Bootstrap 5 (Layout & Accordion primitives)
* **DOM Operations:** jQuery
* **Typography:** Google Fonts (*Inter*, *JetBrains Mono*)
* **Analytics & Feedback (Optional):** GoatCounter (cookie-free analytics), Tally.so (post-export feedback modal)

---
