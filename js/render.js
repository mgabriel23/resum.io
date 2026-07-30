/**
 * Turns resume data into the resume markup — the same function feeds the
 * live on-screen preview and (via the same DOM node) the printed PDF, so
 * what the user sees while editing is exactly what they download.
 *
 * Empty fields fall back to sample placeholder content (marked with
 * `is-placeholder`) so the preview always looks like a real resume and
 * guides the user — each field's sample is replaced the moment they type
 * their own value into it.
 */
const ResumeRender = (function () {
  const SAMPLE = {
    personal: {
      firstName: 'Jamie',
      lastName: 'Rivera',
      headline: 'Web Developer',
      email: 'jamie.rivera@email.com',
      phone: '+1 555 010 2020',
      location: 'San Francisco, CA',
      website: 'jamierivera.dev'
    },
    summary: 'Detail-oriented web developer with a passion for building clean, user-friendly interfaces and solving real-world problems through code.',
    experience: {
      company: 'Bright Path Digital',
      role: 'Web Developer',
      startDate: 'Jan 2023',
      endDate: 'Present',
      bullets: ['Developed and maintained responsive websites for 20+ clients', 'Collaborated with designers to translate mockups into functional pages']
    },
    projects: {
      name: 'Resume Builder',
      techStack: 'React, Node.js',
      link: 'github.com/jamierivera/resume-builder',
      bullets: ['Built a full-stack app used by 100+ students', 'Deployed with CI/CD on Vercel']
    },
    education: {
      school: 'State University',
      degree: 'B.S. in Computer Science',
      startDate: '2019',
      endDate: '2023'
    },
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Git']
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Falls back to sample text when the real value is blank; callers use
  // `.placeholder` to mark that piece of markup as a guide, not real content.
  function fieldValue(real, sample) {
    const trimmed = (real || '').trim();
    return trimmed ? { text: trimmed, placeholder: false } : { text: sample, placeholder: true };
  }

  function span(f) {
    return `<span${f.placeholder ? ' class="is-placeholder"' : ''}>${escapeHtml(f.text)}</span>`;
  }

  function boldSpan(f) {
    return `<span${f.placeholder ? ' class="is-placeholder"' : ''}><strong>${escapeHtml(f.text)}</strong></span>`;
  }

  function renderContact(personal) {
    const fields = [
      fieldValue(personal.email, SAMPLE.personal.email),
      fieldValue(personal.phone, SAMPLE.personal.phone),
      fieldValue(personal.location, SAMPLE.personal.location),
      fieldValue(personal.website, SAMPLE.personal.website)
    ];
    return fields.map(span).join('');
  }

  function renderBullets(bullets, forcePlaceholder, sampleBullets) {
    // Bullets are entered as separate inputs (an array); a plain string is
    // only possible for resumes saved before that change, so split it here.
    const list = Array.isArray(bullets) ? bullets : (bullets || '').split('\n');
    const real = list.map(l => (l || '').trim()).filter(Boolean);
    const isPlaceholder = forcePlaceholder || !real.length;
    const items = isPlaceholder ? (sampleBullets || SAMPLE.experience.bullets) : real;
    if (!items.length) return '';
    const cls = isPlaceholder ? ' is-placeholder' : '';
    return `<ul class="resume-doc__bullets${cls}">${items.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  }

  function renderDateRange(start, end, sampleStart, sampleEnd, forcePlaceholder) {
    const s = forcePlaceholder ? { text: start, placeholder: true } : fieldValue(start, sampleStart);
    const e = forcePlaceholder ? { text: end, placeholder: true } : fieldValue(end, sampleEnd);
    return `${span(s)} &ndash; ${span(e)}`;
  }

  function renderExperienceRow(entry, forcePlaceholder) {
    const company = forcePlaceholder ? { text: entry.company, placeholder: true } : fieldValue(entry.company, SAMPLE.experience.company);
    const role = forcePlaceholder ? { text: entry.role, placeholder: true } : fieldValue(entry.role, SAMPLE.experience.role);
    return `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${boldSpan(company)} &mdash; ${span(role)}</span>
          <span class="resume-doc__entry-date">${renderDateRange(entry.startDate, entry.endDate, SAMPLE.experience.startDate, SAMPLE.experience.endDate, forcePlaceholder)}</span>
        </div>
        ${renderBullets(entry.bullets, forcePlaceholder)}
      </div>`;
  }

  function renderProjectRow(entry, forcePlaceholder) {
    const name = forcePlaceholder ? { text: entry.name, placeholder: true } : fieldValue(entry.name, SAMPLE.projects.name);
    const techStack = forcePlaceholder ? { text: entry.techStack, placeholder: true } : fieldValue(entry.techStack, SAMPLE.projects.techStack);
    const link = forcePlaceholder ? { text: entry.link, placeholder: true } : fieldValue(entry.link, SAMPLE.projects.link);
    return `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${boldSpan(name)} &mdash; ${span(techStack)}</span>
          <span class="resume-doc__entry-date">${span(link)}</span>
        </div>
        ${renderBullets(entry.bullets, forcePlaceholder, SAMPLE.projects.bullets)}
      </div>`;
  }

  function renderEducationRow(entry, forcePlaceholder) {
    const school = forcePlaceholder ? { text: entry.school, placeholder: true } : fieldValue(entry.school, SAMPLE.education.school);
    const degree = forcePlaceholder ? { text: entry.degree, placeholder: true } : fieldValue(entry.degree, SAMPLE.education.degree);
    return `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${boldSpan(school)} &mdash; ${span(degree)}</span>
          <span class="resume-doc__entry-date">${renderDateRange(entry.startDate, entry.endDate, SAMPLE.education.startDate, SAMPLE.education.endDate, forcePlaceholder)}</span>
        </div>
      </div>`;
  }

  function hasBulletContent(bullets) {
    if (Array.isArray(bullets)) return bullets.some(b => (b || '').trim());
    return !!(bullets || '').trim();
  }

  function renderExperience(entries) {
    const real = (entries || []).filter(e => e.company || e.role || e.startDate || e.endDate || hasBulletContent(e.bullets));
    const items = real.length ? real : [SAMPLE.experience];
    const forcePlaceholder = real.length === 0;
    const rows = items.map(e => renderExperienceRow(e, forcePlaceholder)).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Experience</h2>
        ${rows}
      </div>`;
  }

  function renderProjects(entries) {
    const real = (entries || []).filter(e => e.name || e.techStack || e.link || hasBulletContent(e.bullets));
    const items = real.length ? real : [SAMPLE.projects];
    const forcePlaceholder = real.length === 0;
    const rows = items.map(e => renderProjectRow(e, forcePlaceholder)).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Projects</h2>
        ${rows}
      </div>`;
  }

  function renderEducation(entries) {
    const real = (entries || []).filter(e => e.school || e.degree || e.startDate || e.endDate);
    const items = real.length ? real : [SAMPLE.education];
    const forcePlaceholder = real.length === 0;
    const rows = items.map(e => renderEducationRow(e, forcePlaceholder)).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Education</h2>
        ${rows}
      </div>`;
  }

  function renderSkills(skills) {
    const real = (skills || []).filter(Boolean);
    const isPlaceholder = real.length === 0;
    const items = isPlaceholder ? SAMPLE.skills : real;
    const pills = items.map(s => `<span class="skill-pill${isPlaceholder ? ' is-placeholder' : ''}">${escapeHtml(s)}</span>`).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Skills</h2>
        <div class="resume-doc__skills">${pills}</div>
      </div>`;
  }

  function renderSummary(summary) {
    const f = fieldValue(summary, SAMPLE.summary);
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; Summary</h2>
        <p class="resume-doc__summary${f.placeholder ? ' is-placeholder' : ''}">${escapeHtml(f.text)}</p>
      </div>`;
  }

  function renderHeader(personal) {
    const first = fieldValue(personal.firstName, SAMPLE.personal.firstName);
    const last = fieldValue(personal.lastName, SAMPLE.personal.lastName);
    const headline = fieldValue(personal.headline, SAMPLE.personal.headline);
    return `
      <div class="resume-doc__header">
        <h1 class="resume-doc__name">${span(first)} ${span(last)}</h1>
        <p class="resume-doc__headline${headline.placeholder ? ' is-placeholder' : ''}">${escapeHtml(headline.text)}</p>
        <p class="resume-doc__contact">${renderContact(personal)}</p>
      </div>`;
  }

  function toHtml(data) {
    return [
      renderHeader(data.personal || {}),
      renderSummary(data.summary),
      renderExperience(data.experience),
      renderProjects(data.projects),
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
