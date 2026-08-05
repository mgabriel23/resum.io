/**
 * Resume completeness/quality score shown in the editor topbar: a compact
 * badge (e.g. "72%") that expands into a checklist of exactly which rules
 * passed or failed. A hidden section's rules are excluded from both the
 * earned and possible points, so choosing not to show a section (e.g. no
 * work history yet) never lowers the score — only sections the user has
 * actually chosen to include count toward it.
 */
const ResumeScore = (function () {
  const RULES = [
    {
      id: 'name', points: 10, section: null, label: 'Full name added (2+ characters each)',
      test: s => (s.personal.firstName || '').trim().length >= 2 && (s.personal.lastName || '').trim().length >= 2
    },
    {
      id: 'email', points: 5, section: null, label: 'Valid email address',
      test: s => isValidEmail(s.personal.email)
    },
    {
      id: 'phone', points: 5, section: null, label: 'Valid phone number (7+ digits)',
      test: s => digitCount(s.personal.phone) >= 7
    },
    {
      id: 'location', points: 5, section: null, label: 'Location added (3+ characters)',
      test: s => (s.personal.location || '').trim().length >= 3
    },
    {
      id: 'headline', points: 10, section: null, label: 'Headline / role added (3+ characters)',
      test: s => (s.personal.headline || '').trim().length >= 3
    },
    {
      id: 'summaryPresent', points: 10, section: 'summary', label: 'Summary added (20+ characters)',
      test: s => (s.summary || '').trim().length >= 20
    },
    {
      id: 'summaryDetail', points: 5, section: 'summary', label: 'Summary has strong detail (80+ characters)',
      test: s => (s.summary || '').trim().length >= 80
    },
    {
      id: 'experiencePresent', points: 10, section: 'experience', label: 'At least one real experience entry (company + role filled in)',
      test: s => hasRealExperienceEntries(s.experience)
    },
    {
      id: 'experienceBullets', points: 10, section: 'experience', label: 'Every real experience entry has a real bullet (20+ characters)',
      test: s => everyEntryHasRealBullet(s.experience)
    },
    {
      id: 'bulletQuality', points: 10, section: 'experience', label: 'Bullets describe impact in detail (60+ characters on average)',
      test: s => avgBulletLength(s.experience) >= 60
    },
    {
      id: 'educationPresent', points: 10, section: 'education', label: 'At least one real education entry (school + degree filled in)',
      test: s => hasRealEducationEntries(s.education)
    },
    {
      id: 'skillsPresent', points: 10, section: 'skills', label: 'At least 3 real skills (2+ characters each)',
      test: s => (s.skills || []).filter(sk => (sk || '').trim().length >= 2).length >= 3
    }
  ];

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  }

  function digitCount(value) {
    return ((value || '').match(/\d/g) || []).length;
  }

  // "Real" means the two identifying fields are both filled in with more
  // than a token character — a single letter in "Company" shouldn't count
  // the same as an actual company name.
  function hasRealExperienceEntries(list) {
    return (list || []).some(e => (e.company || '').trim().length >= 2 && (e.role || '').trim().length >= 2);
  }

  function hasRealEducationEntries(list) {
    return (list || []).some(e => (e.school || '').trim().length >= 2 && (e.degree || '').trim().length >= 2);
  }

  function everyEntryHasRealBullet(list) {
    const real = (list || []).filter(e => (e.company || '').trim().length >= 2 && (e.role || '').trim().length >= 2);
    if (!real.length) return false;
    return real.every(e => (e.bullets || []).some(b => (b || '').trim().length >= 20));
  }

  function avgBulletLength(list) {
    const bullets = [];
    (list || []).forEach(e => (e.bullets || []).forEach(b => { if ((b || '').trim()) bullets.push(b.trim()); }));
    if (!bullets.length) return 0;
    return bullets.reduce((sum, b) => sum + b.length, 0) / bullets.length;
  }

  function isSectionVisible(state, sectionId) {
    if (!sectionId) return true;
    const entry = (state.sectionOrder || []).find(s => s.id === sectionId);
    return !entry || entry.visible !== false;
  }

  function calculate(state) {
    let earned = 0;
    let possible = 0;
    const results = RULES
      .filter(rule => isSectionVisible(state, rule.section))
      .map(rule => {
        const passed = !!rule.test(state);
        possible += rule.points;
        if (passed) earned += rule.points;
        return { label: rule.label, passed };
      });
    const percent = possible ? Math.round((earned / possible) * 100) : 0;
    return { percent, results };
  }

  let $badge, $badgeValue, $panel, $panelValue, $panelList;
  let isOpen = false;

  function buildUI() {
    $('#saveIndicator').after(
      '<button type="button" id="scoreBadge" class="score-badge" aria-expanded="false" aria-haspopup="true">' +
        '<span class="score-badge__dot" aria-hidden="true"></span>' +
        '<span class="score-badge__label">Resume Score</span>' +
        '<span id="scoreBadgeValue">0%</span>' +
      '</button>'
    );
    $badge = $('#scoreBadge');
    $badgeValue = $('#scoreBadgeValue');

    $panel = $(
      '<div id="scorePanel" class="score-panel" role="dialog" aria-label="Resume score breakdown">' +
        '<div class="score-panel__header">' +
          '<span>Resume Score</span>' +
          '<span id="scorePanelValue" class="score-panel__value">0%</span>' +
        '</div>' +
        '<ul class="score-panel__list" id="scorePanelList"></ul>' +
      '</div>'
    ).appendTo('body').hide();
    $panelValue = $('#scorePanelValue');
    $panelList = $('#scorePanelList');

    $badge.on('click', toggle);
    $(document).on('click.resumeScore', (e) => {
      if (!isOpen) return;
      if ($(e.target).closest('#scorePanel, #scoreBadge').length) return;
      close();
    });
    $(document).on('keydown.resumeScore', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });
    $(window).on('resize.resumeScore scroll.resumeScore', () => { if (isOpen) positionPanel(); });
  }

  function scoreColorClass(percent) {
    if (percent >= 80) return 'is-good';
    if (percent >= 50) return 'is-fair';
    return 'is-low';
  }

  function positionPanel() {
    const rect = $badge[0].getBoundingClientRect();
    const panelWidth = $panel.outerWidth();
    const left = Math.max(16, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 16));
    $panel.css({ top: (rect.bottom + 8) + 'px', left: left + 'px' });
  }

  function toggle() {
    if (isOpen) close(); else open();
  }

  function open() {
    isOpen = true;
    $panel.show();
    positionPanel();
    $badge.attr('aria-expanded', 'true');
  }

  function close() {
    isOpen = false;
    $panel.hide();
    $badge.attr('aria-expanded', 'false');
  }

  function update(state) {
    if (!$badge) buildUI();
    const score = calculate(state);

    $badge.removeClass('is-good is-fair is-low').addClass(scoreColorClass(score.percent));
    $badgeValue.text(score.percent + '%');
    $panelValue.text(score.percent + '%');

    $panelList.empty();
    score.results.forEach(r => {
      const $li = $('<li></li>').addClass(r.passed ? 'is-pass' : 'is-fail');
      $('<span class="score-panel__icon" aria-hidden="true"></span>').text(r.passed ? '✓' : '✕').appendTo($li);
      $('<span></span>').text(r.label).appendTo($li);
      $panelList.append($li);
    });

    if (isOpen) positionPanel();
  }

  return { update };
})();
