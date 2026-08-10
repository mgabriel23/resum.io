# resum.io

A free, single-page resume builder. Pick a template, fill in your details, and
export a clean, ATS-friendly, A4-sized PDF — no sign-up, no login, no backend.
All data is stored in your browser's `localStorage`.

## Features

- **3 ATS-friendly templates** (Default, Operator, Highlight) — same
  single-column, semantic structure under the hood, just different fonts and
  accent colors, so every template stays parseable by applicant tracking
  systems.
- **Live preview** — a full-screen editor with the form on one side and a
  true-to-size A4 preview on the other (desktop), or a floating "Preview"
  button that opens a full-screen preview overlay (mobile).
- **Guided sample content** — an untouched resume shows a full realistic
  example; the moment any real field is filled in, the whole preview
  switches to showing only genuine content, never a mix of the two. Empty
  sections show a dashed hint in the live preview (never in the export)
  nudging you to fill them in or hide them.
- **Section & entry reordering** — sections, individual experience/project/
  certificate entries, and skills can all be reordered by drag-and-drop
  (desktop) or up/down buttons (touch and keyboard).
- **Required-field indicators** — labels for every field the Resume Score
  checks are marked with `*`, and a blank/invalid one shows a small warning
  icon that clears the moment it's fixed.
- **Section-complete confirmation** — leaving a section that still has
  required fields empty for a different one prompts a "finish this first, or
  continue anyway?" choice, without ever hard-blocking navigation.
- **Resume Score** — a live completeness/quality badge in the editor topbar
  that checks things like contact info validity, summary length, and bullet
  detail, with a breakdown of exactly what's passing or failing. Hidden
  sections are excluded from scoring rather than penalized. PDF export is
  blocked below 70% complete, with the badge showing exactly what's missing.
- **Writing assistant** — a phrase-bank based helper (not a general AI chat)
  that drafts a summary, a highlight bullet, or a skills list for a role you
  name, and inserts or copies the result directly into your resume.
- **Guided first-run tour** — a spotlight walkthrough of the editor shown
  once automatically, replayable anytime via the help icon.
- **Autosave** — everything is saved to `localStorage` as you type, no save
  button required.
- **PDF export** — `window.print()` with dedicated print styles, sized to a
  real A4 page. Export always uses only genuinely-entered content, even if
  the on-screen preview is currently showing guided sample text.
- **In-app notices & sound** — warnings, errors, and success confirmations
  use a custom toast (not the browser's native `alert()`), each paired with
  a short synthesized sound (Web Audio API, no audio files).
- **Post-export feedback prompt** — after a successful export, sometimes
  (capped, randomized, at most once per browser session) invites feedback
  via a Tally form in a new tab. Never shown otherwise.
- **Changelog** — the version badge in the footer opens a "What's new" modal
  listing highlights for every release.

## Tech stack

Plain HTML, CSS, and JavaScript — no build step, no framework.

- [Bootstrap 5](https://getbootstrap.com/) for layout primitives and the
  accordion component
- [jQuery](https://jquery.com/) for DOM/event handling in the editor
- Google Fonts (Inter, JetBrains Mono)

All three are loaded from a CDN, so an internet connection is required even
when running locally.

### Optional third-party integrations

- [GoatCounter](https://www.goatcounter.com/) — free, cookie-free page-view
  analytics. A single async `<script>` tag; the site is still fully static
  and works with it removed.
- [Tally](https://tally.so/) — powers the post-export feedback popup (see
  `js/feedback.js`), which links out to a hosted Tally form in a new tab. No
  embed, no backend. There is no persistent "Send feedback" link anywhere in
  the UI — it only ever appears after a successful export.

## Project structure

```
index.html              Landing page + full-screen editor markup
css/
  style.css              Landing page styles, incl. the changelog modal
  editor.css              Full-screen editor layout (form panel, live preview, mobile overlay,
                           score badge, toast, feedback/section-confirm modals, writing assistant)
  templates.css            The 3 resume templates + landing-page template card previews
  print.css               A4 print/PDF export rules
js/
  storage.js              localStorage read/write wrapper (the app's only "database")
  render.js               Resume data -> HTML, including sample-placeholder fallback logic
  editor.js                Form bindings, autosave, focus trap, template switching, reordering
  tour.js                 First-run guided spotlight tour of the editor
  score.js                Resume completeness/quality score badge + breakdown
  toast.js                In-app replacement for the browser's native alert()
  sound.js                Synthesized success/warning/error sound effects (Web Audio API)
  feedback.js             Post-export feedback popup (Tally link-out)
  assistant.js             Phrase-bank writing assistant (summary/bullet/skills suggestions)
  changelog.js             "What's new" modal (footer version badge -> release history)
  app.js                  Landing page interactions (template card -> opens editor)
assets/                  Static assets
```

## Running locally

This is a static site with no build step or backend — any local web server
works. It was built to run under XAMPP:

1. Place the project inside your XAMPP `htdocs` folder (or symlink it there).
2. Start Apache.
3. Visit `http://localhost/resume/`.

Alternatively, serve the folder with any static file server, e.g.:

```
npx serve .
```

## Data & privacy

Everything you type is saved only in your browser's `localStorage`, under a
single resume. Nothing is sent to a server, and there is no account system.
Clearing your browser's site data for this page will erase your saved resume.

## Accessibility

- Keyboard-operable throughout (accordion sections, add/remove entry
  buttons, skill chips, template switcher, all popups/modals).
- A "Skip to main content" link is available on first Tab press.
- The full-screen editor traps focus while open and returns focus to the
  triggering element on close.
- Placeholder/sample text is styled to meet WCAG AA contrast rather than
  relying on opacity alone.
- Every scrollable popup (score breakdown, writing assistant transcript,
  changelog) is independently keyboard-focusable and scrollable.
- Passes an [axe-core](https://github.com/dequelabs/axe-core) automated scan
  (WCAG 2 A/AA, WCAG 2.1/2.2 AA, best-practice rules) with zero violations
  across the landing page and every editor/modal state.
