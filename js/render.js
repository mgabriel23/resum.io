/**
 * Turns resume data into the resume markup — the same function feeds the
 * live on-screen preview and (via the same DOM node) the printed PDF, so
 * what the user sees while editing is exactly what they download.
 */
const ResumeRender = (function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isEmptyResume(data) {
    const p = data.personal || {};
    return !p.firstName && !p.lastName && !p.headline && !p.email && !p.phone &&
      !p.location && !p.website && !(data.summary || '').trim() &&
      (data.experience || []).length === 0 &&
      (data.education || []).length === 0 &&
      (data.skills || []).length === 0;
  }

  function renderContact(personal) {
    const parts = [personal.email, personal.phone, personal.location, personal.website]
      .map(v => (v || '').trim())
      .filter(Boolean)
      .map(v => `<span>${escapeHtml(v)}</span>`);
    return parts.join('');
  }

  function renderBullets(bulletsText) {
    const lines = (bulletsText || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (!lines.length) return '';
    return `<ul class="resume-doc__bullets">${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  }

  function renderDateRange(start, end) {
    const s = (start || '').trim();
    const e = (end || '').trim();
    if (!s && !e) return '';
    if (s && e) return `${escapeHtml(s)} &ndash; ${escapeHtml(e)}`;
    return escapeHtml(s || e);
  }

  function renderTitleLine(primary, secondary) {
    const p = (primary || '').trim();
    const s = (secondary || '').trim();
    if (p && s) return `<strong>${escapeHtml(p)}</strong> &mdash; ${escapeHtml(s)}`;
    return `<strong>${escapeHtml(p || s)}</strong>`;
  }

  function renderExperience(entries) {
    const items = (entries || []).filter(e => e.company || e.role || (e.bullets || '').trim());
    if (!items.length) return '';
    const rows = items.map(e => `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${renderTitleLine(e.company, e.role)}</span>
          ${renderDateRange(e.startDate, e.endDate) ? `<span class="resume-doc__entry-date">${renderDateRange(e.startDate, e.endDate)}</span>` : ''}
        </div>
        ${renderBullets(e.bullets)}
      </div>`).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Experience</h2>
        ${rows}
      </div>`;
  }

  function renderEducation(entries) {
    const items = (entries || []).filter(e => e.school || e.degree);
    if (!items.length) return '';
    const rows = items.map(e => `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${renderTitleLine(e.school, e.degree)}</span>
          ${renderDateRange(e.startDate, e.endDate) ? `<span class="resume-doc__entry-date">${renderDateRange(e.startDate, e.endDate)}</span>` : ''}
        </div>
      </div>`).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Education</h2>
        ${rows}
      </div>`;
  }

  function renderSkills(skills) {
    const items = (skills || []).filter(Boolean);
    if (!items.length) return '';
    const pills = items.map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Skills</h2>
        <div class="resume-doc__skills">${pills}</div>
      </div>`;
  }

  function renderSummary(summary) {
    const text = (summary || '').trim();
    if (!text) return '';
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Summary</h2>
        <p class="resume-doc__summary">${escapeHtml(text)}</p>
      </div>`;
  }

  function renderHeader(personal) {
    const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ').trim();
    const contact = renderContact(personal);
    return `
      <div class="resume-doc__header">
        ${fullName ? `<h1 class="resume-doc__name">${escapeHtml(fullName)}</h1>` : ''}
        ${(personal.headline || '').trim() ? `<p class="resume-doc__headline">${escapeHtml(personal.headline)}</p>` : ''}
        ${contact ? `<p class="resume-doc__contact">${contact}</p>` : ''}
      </div>`;
  }

  function toHtml(data) {
    if (isEmptyResume(data)) {
      return '<div class="resume-doc__empty"><p>Start filling in your details on the left to see your resume come to life here.</p></div>';
    }
    return [
      renderHeader(data.personal || {}),
      renderSummary(data.summary),
      renderExperience(data.experience),
      renderEducation(data.education),
      renderSkills(data.skills)
    ].join('');
  }

  function renderInto(el, data) {
    el.className = 'resume-doc template-' + (data.templateId || 'default');
    el.innerHTML = toHtml(data);
  }

  return { toHtml, renderInto, escapeHtml };
})();
