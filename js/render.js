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
    certificates: {
      name: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: 'March 2024'
    },
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Git']
  };

  // Declares the shape of each repeatable resume section (title/subtitle
  // fields, what goes on the right side, whether it has bullets) so a
  // single renderEntryRow()/renderSection() pair can drive all four,
  // instead of four almost-identical render functions.
  const SECTIONS = {
    experience: {
      label: 'Experience',
      sample: SAMPLE.experience,
      title: 'company', subtitle: 'role',
      right: { type: 'range', start: 'startDate', end: 'endDate' },
      bullets: true
    },
    projects: {
      label: 'Projects',
      sample: SAMPLE.projects,
      title: 'name', subtitle: 'techStack',
      right: { type: 'text', field: 'link' },
      bullets: true
    },
    education: {
      label: 'Education',
      sample: SAMPLE.education,
      title: 'school', subtitle: 'degree',
      right: { type: 'range', start: 'startDate', end: 'endDate' },
      bullets: false
    },
    certificates: {
      label: 'Certificates',
      sample: SAMPLE.certificates,
      title: 'name', subtitle: 'issuer',
      right: { type: 'text', field: 'date' },
      bullets: false
    }
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

  // Same as fieldValue, but when a whole entry/section is a placeholder
  // (no real data at all yet) every field in it must read as a placeholder,
  // including its own text — not fall back further to the sample.
  function resolveField(value, sampleValue, forcePlaceholder) {
    return forcePlaceholder ? { text: value, placeholder: true } : fieldValue(value, sampleValue);
  }

  function span(f) {
    return `<span${f.placeholder ? ' class="is-placeholder"' : ''}>${escapeHtml(f.text)}</span>`;
  }

  function boldSpan(f) {
    return `<span${f.placeholder ? ' class="is-placeholder"' : ''}><strong>${escapeHtml(f.text)}</strong></span>`;
  }

  function hasBulletContent(bullets) {
    if (Array.isArray(bullets)) return bullets.some(b => (b || '').trim());
    return !!(bullets || '').trim();
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
    const items = isPlaceholder ? sampleBullets : real;
    if (!items.length) return '';
    const cls = isPlaceholder ? ' is-placeholder' : '';
    return `<ul class="resume-doc__bullets${cls}">${items.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  }

  function renderDateRange(start, end, sampleStart, sampleEnd, forcePlaceholder) {
    const s = resolveField(start, sampleStart, forcePlaceholder);
    const e = resolveField(end, sampleEnd, forcePlaceholder);
    return `${span(s)} &ndash; ${span(e)}`;
  }

  function entryHasContent(entry, schema) {
    const fields = schema.right.type === 'range'
      ? [schema.title, schema.subtitle, schema.right.start, schema.right.end]
      : [schema.title, schema.subtitle, schema.right.field];
    const hasField = fields.some(f => (entry[f] || '').trim());
    return hasField || (schema.bullets && hasBulletContent(entry.bullets));
  }

  function renderEntryRight(entry, schema, forcePlaceholder) {
    if (schema.right.type === 'range') {
      return renderDateRange(entry[schema.right.start], entry[schema.right.end], schema.sample[schema.right.start], schema.sample[schema.right.end], forcePlaceholder);
    }
    const field = schema.right.field;
    return span(resolveField(entry[field], schema.sample[field], forcePlaceholder));
  }

  function renderEntryRow(entry, schema, forcePlaceholder) {
    const title = resolveField(entry[schema.title], schema.sample[schema.title], forcePlaceholder);
    const subtitle = resolveField(entry[schema.subtitle], schema.sample[schema.subtitle], forcePlaceholder);
    const bullets = schema.bullets ? renderBullets(entry.bullets, forcePlaceholder, schema.sample.bullets) : '';
    return `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${boldSpan(title)} &mdash; ${span(subtitle)}</span>
          <span class="resume-doc__entry-date">${renderEntryRight(entry, schema, forcePlaceholder)}</span>
        </div>
        ${bullets}
      </div>`;
  }

  function renderSection(entries, schema) {
    const real = (entries || []).filter(e => entryHasContent(e, schema));
    const items = real.length ? real : [schema.sample];
    const forcePlaceholder = real.length === 0;
    const rows = items.map(e => renderEntryRow(e, schema, forcePlaceholder)).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">&mdash; ${schema.label}</h2>
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

  // Maps each optional section's id (as used in data.sectionOrder) to the
  // function that renders it, so section order/visibility can drive output
  // instead of a fixed sequence. Personal details isn't in here — it's
  // always shown, via renderHeader() below.
  const SECTION_RENDERERS = {
    summary: data => renderSummary(data.summary),
    experience: data => renderSection(data.experience, SECTIONS.experience),
    projects: data => renderSection(data.projects, SECTIONS.projects),
    education: data => renderSection(data.education, SECTIONS.education),
    certificates: data => renderSection(data.certificates, SECTIONS.certificates),
    skills: data => renderSkills(data.skills)
  };

  // A resume saved before a given section type existed (or before this
  // ordering feature shipped) won't list it in sectionOrder — append any
  // missing ones, visible, rather than silently dropping that section.
  function normalizedSectionOrder(order) {
    const present = new Set((order || []).map(s => s.id));
    const missing = Object.keys(SECTION_RENDERERS)
      .filter(id => !present.has(id))
      .map(id => ({ id, visible: true }));
    return [...(order || []), ...missing];
  }

  function toHtml(data) {
    const body = normalizedSectionOrder(data.sectionOrder)
      .filter(section => section.visible)
      .map(section => (SECTION_RENDERERS[section.id] ? SECTION_RENDERERS[section.id](data) : ''))
      .join('');
    return renderHeader(data.personal || {}) + body;
  }

  function renderInto(el, data) {
    el.className = 'resume-doc template-' + (data.templateId || 'default');
    el.innerHTML = toHtml(data);
  }

  return { renderInto };
})();
