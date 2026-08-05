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
  switches to showing only genuine content, never a mix of the two.
- **Section & entry reordering** — sections, individual experience/project/
  certificate entries, and skills can all be reordered by drag-and-drop
  (desktop) or up/down buttons (touch and keyboard).
- **Resume Score** — a live completeness/quality badge in the editor topbar
  that checks things like contact info validity, summary length, and bullet
  detail, with a breakdown of exactly what's passing or failing. Hidden
  sections are excluded from scoring rather than penalized.
- **Guided first-run tour** — a spotlight walkthrough of the editor shown
  once automatically, replayable anytime via the help icon.
- **Autosave** — everything is saved to `localStorage` as you type, no save
  button required.
- **PDF export** — `window.print()` with dedicated print styles, sized to a
  real A4 page. Export always uses only genuinely-entered content, even if
  the on-screen preview is currently showing guided sample text.

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
- [Tally](https://tally.so/) — a "Send feedback" link (header nav and editor
  topbar) that opens a hosted Tally form in a new tab. No embed, no backend.

## Project structure

```
index.html              Landing page + full-screen editor markup
css/
  style.css              Landing page styles
  editor.css              Full-screen editor layout (form panel, live preview, mobile overlay)
  templates.css            The 3 resume templates + landing-page template card previews
  print.css               A4 print/PDF export rules
js/
  storage.js              localStorage read/write wrapper (the app's only "database")
  render.js               Resume data -> HTML, including sample-placeholder fallback logic
  editor.js                Form bindings, autosave, focus trap, template switching, reordering
  tour.js                 First-run guided spotlight tour of the editor
  score.js                Resume completeness/quality score badge + breakdown
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
  buttons, skill chips, template switcher).
- A "Skip to main content" link is available on first Tab press.
- The full-screen editor traps focus while open and returns focus to the
  triggering element on close.
- Placeholder/sample text is styled to meet WCAG AA contrast rather than
  relying on opacity alone.
