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
      firstName: 'Jordan',
      lastName: 'Alvarez',
      headline: 'Full Stack Web Developer',
      email: 'jordan.alvarez@email.com',
      phone: '0917 123 4567',
      location: 'Quezon City, Philippines',
      website: 'jordanalvarez.dev'
    },
    summary: 'Motivated Web Developer dedicated to delivering clean, efficient, and user-focused solutions while continuously learning and evolving.',
    experience: [
      {
        company: 'Brightwave Technologies Inc.',
        role: 'Full Stack Developer',
        startDate: 'August 2022',
        endDate: 'Present',
        bullets: ['Developed, enhanced, and maintained core system features using PHP and SQL. Built responsive interfaces and critical internal tools utilizing JavaScript, React, and cloud infrastructure.']
      },
      {
        company: 'Northbridge Software Co.',
        role: 'Web Development Instructor',
        startDate: 'June 2021',
        endDate: 'May 2022',
        bullets: ['Instructed students in web development coursework. Delivered technical lectures, mentored students on practical projects, and designed coursework to improve hands-on skills.']
      },
      {
        company: 'Lumen Digital Solutions',
        role: 'Jr. Software Programmer',
        startDate: 'June 2018',
        endDate: 'May 2021',
        bullets: ['Maintained existing business applications, implemented new features, and developed internal tools to streamline daily operations. Diagnosed and troubleshooted technical issues to optimize application performance.']
      }
    ],
    projects: {
      name: 'Personal Portfolio Site',
      techStack: 'HTML, CSS, JavaScript, React',
      link: 'jordanalvarez.dev/projects',
      bullets: ['Designed and built a personal portfolio site to showcase web development projects.']
    },
    education: {
      school: 'Metro State University',
      degree: 'Bachelor of Science Information Technology',
      startDate: 'June 2014',
      endDate: 'May 2018'
    },
    certificates: {
      name: 'Responsive Web Design Certification',
      issuer: 'Online Course Platform',
      date: 'March 2022'
    },
    skills: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'PHP', 'MySQL', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Git', 'PWA', 'Bootstrap']
  };

  // Declares the shape of each repeatable resume section (title/subtitle
  // fields, what goes on the right side, whether it has bullets) so a
  // single renderEntryRow()/renderSection() pair can drive all four,
  // instead of four almost-identical render functions.
  const SECTIONS = {
    experience: {
      label: 'Experience',
      // A single representative entry for per-field fallback (see
      // resolveField), plus the full career history to show as the
      // guided placeholder when there's no real experience yet.
      sample: SAMPLE.experience[0],
      samplePlaceholder: SAMPLE.experience,
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
  // `hide` is true only for the export/print render pass — there, a blank
  // field must stay blank rather than fill the document with someone else's
  // fake data (see renderInto).
  function fieldValue(real, sample, hide) {
    const trimmed = (real || '').trim();
    if (trimmed) return { text: trimmed, placeholder: false };
    return hide ? { text: '', placeholder: false } : { text: sample, placeholder: true };
  }

  // Same as fieldValue, but when a whole entry/section is a placeholder
  // (no real data at all yet) every field in it must read as a placeholder,
  // including its own text — not fall back further to the sample. Never
  // reached in hide mode: renderSection() omits placeholder-only sections
  // there before forcePlaceholder can be true.
  function resolveField(value, sampleValue, forcePlaceholder, hide) {
    return forcePlaceholder ? { text: value, placeholder: true } : fieldValue(value, sampleValue, hide);
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

  function renderContact(personal, hide) {
    const fields = [
      fieldValue(personal.email, SAMPLE.personal.email, hide),
      fieldValue(personal.phone, SAMPLE.personal.phone, hide),
      fieldValue(personal.location, SAMPLE.personal.location, hide),
      fieldValue(personal.website, SAMPLE.personal.website, hide)
      // Blank fields are dropped rather than joined as empty spans, so the
      // "|" separators (CSS, based on :last-child) never leave a dangling
      // trailing pipe when hide mode removes the last field's text.
    ].filter(f => f.text);
    return fields.map(span).join('');
  }

  function renderBullets(bullets, forcePlaceholder, sampleBullets, hide) {
    // Bullets are entered as separate inputs (an array); a plain string is
    // only possible for resumes saved before that change, so split it here.
    const list = Array.isArray(bullets) ? bullets : (bullets || '').split('\n');
    const real = list.map(l => (l || '').trim()).filter(Boolean);
    const isPlaceholder = forcePlaceholder || !real.length;
    // real.length first, not isPlaceholder: a whole placeholder row already
    // carries its own bullets in `bullets` (=`real`) — sampleBullets is only
    // the right fallback when a genuine entry left just this field blank,
    // and never applies in hide mode (no fabricated bullet in an export).
    const items = real.length ? real : (hide ? [] : sampleBullets);
    if (!items.length) return '';
    const cls = isPlaceholder ? ' is-placeholder' : '';
    return `<ul class="resume-doc__bullets${cls}">${items.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  }

  function renderDateRange(start, end, sampleStart, sampleEnd, forcePlaceholder, hide) {
    const s = resolveField(start, sampleStart, forcePlaceholder, hide);
    const e = resolveField(end, sampleEnd, forcePlaceholder, hide);
    // In hide mode a blank date shouldn't leave a bare "–" floating with
    // nothing on one side — show whichever side is real, or neither.
    if (hide) {
      if (!s.text && !e.text) return '';
      if (!s.text) return span(e);
      if (!e.text) return span(s);
    }
    return `${span(s)} &ndash; ${span(e)}`;
  }

  function entryHasContent(entry, schema) {
    const fields = schema.right.type === 'range'
      ? [schema.title, schema.subtitle, schema.right.start, schema.right.end]
      : [schema.title, schema.subtitle, schema.right.field];
    const hasField = fields.some(f => (entry[f] || '').trim());
    return hasField || (schema.bullets && hasBulletContent(entry.bullets));
  }

  function renderEntryRight(entry, schema, forcePlaceholder, hide) {
    if (schema.right.type === 'range') {
      return renderDateRange(entry[schema.right.start], entry[schema.right.end], schema.sample[schema.right.start], schema.sample[schema.right.end], forcePlaceholder, hide);
    }
    const field = schema.right.field;
    return span(resolveField(entry[field], schema.sample[field], forcePlaceholder, hide));
  }

  function renderEntryRow(entry, schema, forcePlaceholder, hide) {
    const title = resolveField(entry[schema.title], schema.sample[schema.title], forcePlaceholder, hide);
    const subtitle = resolveField(entry[schema.subtitle], schema.sample[schema.subtitle], forcePlaceholder, hide);
    const bullets = schema.bullets ? renderBullets(entry.bullets, forcePlaceholder, schema.sample.bullets, hide) : '';
    return `
      <div class="resume-doc__entry">
        <div class="resume-doc__entry-head">
          <span class="resume-doc__entry-title">${boldSpan(title)} &mdash; ${span(subtitle)}</span>
          <span class="resume-doc__entry-date">${renderEntryRight(entry, schema, forcePlaceholder, hide)}</span>
        </div>
        ${bullets}
      </div>`;
  }

  // `hide` skips fabricated content for the export/print pass: a section
  // with no real entries at all is omitted outright rather than showing
  // someone else's sample company/school as if it were the user's own.
  function renderSection(entries, schema, hide) {
    const real = (entries || []).filter(e => entryHasContent(e, schema));
    if (hide && !real.length) return '';
    const items = real.length ? real : (schema.samplePlaceholder || [schema.sample]);
    const forcePlaceholder = real.length === 0;
    const rows = items.map(e => renderEntryRow(e, schema, forcePlaceholder, hide)).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">${schema.label}</h2>
        ${rows}
      </div>`;
  }

  function renderSkills(skills, hide) {
    const real = (skills || []).filter(Boolean);
    if (hide && !real.length) return '';
    const isPlaceholder = real.length === 0;
    const items = isPlaceholder ? SAMPLE.skills : real;
    const pills = items.map(s => `<span class="skill-pill${isPlaceholder ? ' is-placeholder' : ''}">${escapeHtml(s)}</span>`).join('');
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">Skills</h2>
        <div class="resume-doc__skills">${pills}</div>
      </div>`;
  }

  function renderSummary(summary, hide) {
    const f = fieldValue(summary, SAMPLE.summary, hide);
    if (hide && !f.text) return '';
    return `
      <div class="resume-doc__section">
        <h2 class="resume-doc__label">Summary</h2>
        <p class="resume-doc__summary${f.placeholder ? ' is-placeholder' : ''}">${escapeHtml(f.text)}</p>
      </div>`;
  }

  function renderHeader(personal, hide) {
    const first = fieldValue(personal.firstName, SAMPLE.personal.firstName, hide);
    const last = fieldValue(personal.lastName, SAMPLE.personal.lastName, hide);
    const headline = fieldValue(personal.headline, SAMPLE.personal.headline, hide);
    const textBlock = `
        <h1 class="resume-doc__name">${span(first)} ${span(last)}</h1>
        <p class="resume-doc__headline${headline.placeholder ? ' is-placeholder' : ''}">${escapeHtml(headline.text)}</p>
        <p class="resume-doc__contact">${renderContact(personal, hide)}</p>`;

    // The photo is optional and never sample-guided — an uploaded photo is
    // real content, not a field with a placeholder-worthy sample value.
    if (personal.photo && personal.photoVisible !== false) {
      const positionClass = personal.photoPosition === 'right' ? ' resume-doc__header--photo-right' : '';
      return `
      <div class="resume-doc__header resume-doc__header--with-photo${positionClass}">
        <img class="resume-doc__photo" src="${escapeHtml(personal.photo)}" alt="">
        <div class="resume-doc__header-text">${textBlock}</div>
      </div>`;
    }
    return `<div class="resume-doc__header">${textBlock}</div>`;
  }

  // Maps each optional section's id (as used in data.sectionOrder) to the
  // function that renders it, so section order/visibility can drive output
  // instead of a fixed sequence. Personal details isn't in here — it's
  // always shown, via renderHeader() below.
  const SECTION_RENDERERS = {
    summary: (data, hide) => renderSummary(data.summary, hide),
    experience: (data, hide) => renderSection(data.experience, SECTIONS.experience, hide),
    projects: (data, hide) => renderSection(data.projects, SECTIONS.projects, hide),
    education: (data, hide) => renderSection(data.education, SECTIONS.education, hide),
    certificates: (data, hide) => renderSection(data.certificates, SECTIONS.certificates, hide),
    skills: (data, hide) => renderSkills(data.skills, hide)
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

  function toHtml(data, hide) {
    const body = normalizedSectionOrder(data.sectionOrder)
      .filter(section => section.visible)
      .map(section => (SECTION_RENDERERS[section.id] ? SECTION_RENDERERS[section.id](data, hide) : ''))
      .join('');
    return renderHeader(data.personal || {}, hide) + body;
  }

  // `hide`, when true, renders only genuinely-entered content — no sample
  // fallback text anywhere. Used for the export/print pass (see editor.js's
  // beforeprint handler) so an unfinished resume can never be exported with
  // someone else's fake name, job history, or skills baked into the PDF.
  function renderInto(el, data, hide) {
    el.className = 'resume-doc template-' + (data.templateId || 'default');
    el.innerHTML = toHtml(data, hide);
  }

  return { renderInto };
})();
