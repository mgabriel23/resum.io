/**
 * Writing assistant: a small phrase-bank "chatbot" that drafts a resume
 * summary, a highlight bullet, or a skills list from a plain-English
 * request, entirely client-side — no API calls, no external service. It
 * matches the request against a bank of common roles and a set of sentence
 * skeletons, then fills in the blanks with randomly-picked, role-relevant
 * phrases. Not real language generation, and deliberately narrow: it only
 * does these three things, and says so, rather than pretending to be a
 * general chatbot. For a role outside the bank it falls back to a generic
 * template built around whatever the user actually typed, so it never
 * hard-fails, just gets less specific.
 */
const ResumeAssistant = (function () {
  const ROLES = [
    {
      id: 'web-developer',
      label: 'web developer',
      aliases: ['web developer', 'software developer', 'software engineer', 'programmer', 'frontend developer', 'front-end developer', 'backend developer', 'back-end developer', 'full stack developer', 'fullstack developer', 'web dev', 'coder', 'developer'],
      skills: ['HTML, CSS, and JavaScript', 'responsive web design', 'REST APIs', 'version control with Git', 'debugging and testing', 'modern frameworks like React or Vue'],
      chipSkills: ['HTML', 'CSS', 'JavaScript', 'Git', 'REST APIs', 'React', 'Responsive Design', 'Debugging'],
      strengths: ['writing clean, maintainable code', 'solving tricky bugs', 'working closely with designers and stakeholders', 'shipping features on tight deadlines'],
      impact: ['building fast, user-friendly websites and applications', 'turning designs into working products', 'improving site performance and reliability']
    },
    {
      id: 'designer',
      label: 'graphic designer',
      aliases: ['graphic designer', 'ui designer', 'ux designer', 'ui/ux designer', 'product designer', 'visual designer', 'designer'],
      skills: ['Adobe Photoshop and Illustrator', 'Figma', 'typography and layout', 'branding and visual identity', 'wireframing and prototyping'],
      chipSkills: ['Photoshop', 'Illustrator', 'Figma', 'Typography', 'Branding', 'Wireframing', 'Prototyping'],
      strengths: ['turning ideas into clean visuals', 'attention to detail', 'balancing creativity with brand guidelines', 'collaborating with marketing and dev teams'],
      impact: ['creating designs that communicate clearly and look professional', 'strengthening brand identity across projects', 'improving user experience through thoughtful visuals']
    },
    {
      id: 'marketing',
      label: 'marketing specialist',
      aliases: ['marketing', 'digital marketing', 'social media marketing', 'content marketing', 'marketer', 'marketing specialist', 'marketing associate', 'social media manager'],
      skills: ['social media management', 'content creation', 'SEO and SEM', 'email marketing campaigns', 'analytics and reporting'],
      chipSkills: ['Social Media Management', 'SEO', 'Content Creation', 'Email Marketing', 'Google Analytics', 'Campaign Planning'],
      strengths: ['growing audience engagement', 'planning campaigns end to end', 'using data to guide decisions', 'clear, persuasive writing'],
      impact: ['growing brand awareness and audience engagement', 'driving traffic and leads through targeted campaigns', 'building a consistent brand voice across channels']
    },
    {
      id: 'sales',
      label: 'sales professional',
      aliases: ['sales', 'sales representative', 'sales associate', 'account executive', 'business development', 'sales agent'],
      skills: ['lead generation', 'client relationship management', 'CRM tools', 'negotiation', 'closing deals'],
      chipSkills: ['Lead Generation', 'CRM Software', 'Negotiation', 'Client Relationship Management', 'Cold Calling', 'Closing Deals'],
      strengths: ['building long-term client relationships', 'meeting and exceeding targets', 'clear communication', 'adapting to client needs'],
      impact: ['growing revenue through new and repeat business', 'building trust with clients from first contact to close', 'consistently meeting sales targets']
    },
    {
      id: 'customer-service',
      label: 'customer service representative',
      aliases: ['customer service', 'customer support', 'call center', 'client support', 'csr', 'customer service representative', 'support agent', 'bpo'],
      skills: ['phone, chat, and email support', 'CRM and ticketing systems', 'conflict resolution', 'multitasking under pressure'],
      chipSkills: ['Customer Support', 'CRM Software', 'Conflict Resolution', 'Multitasking', 'Phone & Chat Support', 'Ticketing Systems'],
      strengths: ['staying calm under pressure', 'clear, friendly communication', 'solving problems quickly', 'going the extra mile for customers'],
      impact: ['keeping customers happy and resolving issues quickly', 'maintaining high satisfaction scores', 'turning frustrated customers into repeat customers']
    },
    {
      id: 'virtual-assistant',
      label: 'virtual assistant',
      aliases: ['virtual assistant', 'remote assistant', 'admin support', 'va'],
      skills: ['calendar and email management', 'data entry', 'online research', 'basic bookkeeping', 'project tools like Trello or Asana'],
      chipSkills: ['Calendar Management', 'Email Management', 'Data Entry', 'Google Workspace', 'Trello/Asana', 'Basic Bookkeeping'],
      strengths: ['staying organized across multiple tasks', 'working independently with minimal supervision', 'clear written communication', 'meeting deadlines'],
      impact: ['freeing up clients’ time by handling day-to-day tasks', 'keeping projects and schedules organized', 'providing reliable remote support across time zones']
    },
    {
      id: 'teacher',
      label: 'teacher',
      aliases: ['teacher', 'tutor', 'educator', 'instructor', 'teaching'],
      skills: ['lesson planning', 'classroom management', 'differentiated instruction', 'student assessment', 'parent communication'],
      chipSkills: ['Lesson Planning', 'Classroom Management', 'Student Assessment', 'Curriculum Development', 'Parent Communication'],
      strengths: ['making lessons engaging and easy to understand', 'patience with different learning styles', 'building a positive classroom environment', 'tracking student progress'],
      impact: ['helping students build confidence and understanding', 'creating lesson plans that keep students engaged', 'supporting student growth both academically and personally']
    },
    {
      id: 'nurse',
      label: 'nurse',
      aliases: ['nurse', 'registered nurse', 'healthcare worker', 'caregiver', 'medical assistant', 'nursing'],
      skills: ['patient assessment and care', 'electronic health records', 'medication administration', 'coordinating with doctors and care teams'],
      chipSkills: ['Patient Care', 'Electronic Health Records', 'Medication Administration', 'Vital Signs Monitoring', 'Patient Assessment'],
      strengths: ['staying calm in high-pressure situations', 'compassionate patient care', 'careful attention to detail', 'clear communication with patients and families'],
      impact: ['providing safe, compassionate care to patients', 'supporting patients and families through difficult moments', 'working closely with care teams to improve outcomes']
    },
    {
      id: 'accountant',
      label: 'accountant',
      aliases: ['accountant', 'bookkeeper', 'accounting', 'finance associate', 'financial analyst', 'auditor'],
      skills: ['bookkeeping and reconciliation', 'financial reporting', 'Excel and accounting software', 'budgeting', 'tax preparation'],
      chipSkills: ['Bookkeeping', 'Financial Reporting', 'Excel', 'Budgeting', 'Tax Preparation', 'Reconciliation'],
      strengths: ['accuracy and attention to detail', 'meeting reporting deadlines', 'spotting discrepancies before they become problems', 'clear financial communication'],
      impact: ['keeping financial records accurate and up to date', 'supporting sound financial decisions with clear reporting', 'helping the business stay compliant and audit-ready']
    },
    {
      id: 'project-manager',
      label: 'project manager',
      aliases: ['project manager', 'program manager', 'scrum master', 'product manager'],
      skills: ['project planning and scheduling', 'stakeholder communication', 'Agile and Scrum', 'risk management', 'tools like Jira and Trello'],
      chipSkills: ['Project Planning', 'Agile/Scrum', 'Risk Management', 'Jira', 'Stakeholder Communication', 'Budgeting'],
      strengths: ['keeping projects on time and on budget', 'coordinating across teams', 'clear, proactive communication', 'solving problems before they derail a project'],
      impact: ['delivering projects on time and within scope', 'keeping teams aligned and unblocked', 'turning ambiguous goals into clear, actionable plans']
    },
    {
      id: 'data-analyst',
      label: 'data analyst',
      aliases: ['data analyst', 'data scientist', 'business analyst', 'analyst'],
      skills: ['SQL and Excel', 'data visualization tools like Power BI or Tableau', 'statistical analysis', 'building reports and dashboards'],
      chipSkills: ['SQL', 'Excel', 'Power BI', 'Tableau', 'Statistical Analysis', 'Data Visualization'],
      strengths: ['turning raw data into clear insights', 'attention to detail', 'communicating findings to non-technical audiences', 'spotting trends others miss'],
      impact: ['helping teams make data-driven decisions', 'uncovering trends that shape business strategy', 'building dashboards that keep stakeholders informed']
    },
    {
      id: 'admin',
      label: 'administrative assistant',
      aliases: ['admin', 'administrative assistant', 'office assistant', 'secretary', 'receptionist', 'office staff', 'clerk'],
      skills: ['scheduling and calendar management', 'document preparation', 'Microsoft Office and Google Workspace', 'filing and records management'],
      chipSkills: ['Scheduling', 'Microsoft Office', 'Google Workspace', 'Filing & Records', 'Document Preparation'],
      strengths: ['staying organized in a fast-paced office', 'handling multiple priorities at once', 'discretion with sensitive information', 'friendly, professional communication'],
      impact: ['keeping day-to-day office operations running smoothly', 'supporting teams and executives with reliable admin work', 'making sure nothing falls through the cracks']
    },
    {
      id: 'hospitality',
      label: 'hospitality professional',
      aliases: ['barista', 'waiter', 'waitress', 'server', 'chef', 'cook', 'hospitality', 'restaurant', 'food service', 'bartender', 'hotel staff'],
      skills: ['customer service under pressure', 'food safety and hygiene standards', 'point-of-sale systems', 'order accuracy and speed of service'],
      chipSkills: ['Customer Service', 'Point-of-Sale Systems', 'Food Safety', 'Order Accuracy', 'Teamwork'],
      strengths: ['staying friendly and composed during busy shifts', 'a positive, can-do attitude', 'quick thinking under pressure', 'attention to detail'],
      impact: ['creating a great experience for every guest', 'keeping service fast and smooth even during rush hours', 'supporting a team that customers want to come back to']
    },
    {
      id: 'it-support',
      label: 'IT support specialist',
      aliases: ['it support', 'help desk', 'helpdesk', 'technical support', 'it technician', 'desktop support', 'tech support'],
      skills: ['troubleshooting hardware and software issues', 'setting up and maintaining computer systems', 'ticketing systems like Zendesk or Freshdesk', 'basic networking'],
      chipSkills: ['Troubleshooting', 'Technical Support', 'Ticketing Systems', 'Networking Basics', 'Hardware Setup', 'Remote Support'],
      strengths: ['staying patient while explaining technical issues', 'solving problems methodically', 'clear communication with non-technical users', 'working well under pressure'],
      impact: ['keeping systems running smoothly with minimal downtime', 'resolving technical issues quickly', 'helping users get back to work faster']
    },
    {
      id: 'hr',
      label: 'HR specialist',
      aliases: ['hr', 'human resources', 'recruiter', 'recruitment', 'talent acquisition'],
      skills: ['recruitment and onboarding', 'employee relations', 'HR software like Workday or BambooHR', 'policy and compliance'],
      chipSkills: ['Recruitment', 'Onboarding', 'Employee Relations', 'HR Software', 'Compliance', 'Interviewing'],
      strengths: ['building trust with employees at every level', 'handling sensitive information with discretion', 'clear, empathetic communication', 'staying organized across many cases'],
      impact: ['building a positive, well-supported workplace', 'streamlining hiring and onboarding', 'keeping the company compliant and employees supported']
    },
    {
      id: 'content-writer',
      label: 'content writer',
      aliases: ['content writer', 'copywriter', 'writer', 'blogger', 'content creator'],
      skills: ['writing for web and social media', 'SEO writing', 'editing and proofreading', 'content planning', 'tools like WordPress or Google Docs'],
      chipSkills: ['Content Writing', 'SEO Writing', 'Editing', 'Copywriting', 'Content Planning', 'WordPress'],
      strengths: ['adapting tone and voice for different audiences', 'meeting content deadlines', 'strong grammar and storytelling', 'researching topics quickly'],
      impact: ['creating content that engages and informs readers', 'growing organic traffic through SEO-friendly writing', 'keeping a consistent brand voice across channels']
    },
    {
      id: 'logistics',
      label: 'logistics professional',
      aliases: ['driver', 'delivery driver', 'logistics', 'warehouse', 'dispatcher', 'courier'],
      skills: ['route planning', 'inventory and warehouse management', 'vehicle safety and maintenance checks', 'timely deliveries'],
      chipSkills: ['Route Planning', 'Inventory Management', 'Warehouse Operations', 'Vehicle Safety', 'Time Management'],
      strengths: ['staying punctual and reliable', 'working safely under time pressure', 'attention to detail with deliveries and records', 'good planning and sense of direction'],
      impact: ['keeping deliveries on time and customers satisfied', 'keeping warehouse operations organized and efficient', 'maintaining a strong safety record']
    },
    {
      id: 'engineer',
      label: 'engineer',
      aliases: ['engineer', 'mechanical engineer', 'civil engineer', 'electrical engineer', 'engineering'],
      skills: ['technical drawings and CAD software', 'project documentation', 'quality and safety standards', 'troubleshooting technical issues'],
      chipSkills: ['CAD Software', 'Technical Documentation', 'Quality Assurance', 'Troubleshooting', 'Project Coordination'],
      strengths: ['methodical problem-solving', 'attention to technical detail', 'working well with cross-functional teams', 'meeting project specifications'],
      impact: ['delivering projects that meet technical and safety standards', 'solving engineering problems efficiently', 'supporting projects from design through completion']
    }
  ];

  const GENERIC_ROLE = {
    skills: ['the core tools and processes the role needs', 'day-to-day problem solving', 'working well with a team', 'meeting deadlines and expectations'],
    chipSkills: ['Problem Solving', 'Time Management', 'Communication', 'Teamwork', 'Adaptability', 'Attention to Detail'],
    strengths: ['reliability', 'a strong work ethic', 'picking things up quickly', 'clear communication'],
    impact: ['getting things done reliably', 'supporting the team’s goals', 'consistently delivering quality work']
  };

  const LEVEL_ADJ = {
    entry: ['Motivated', 'Eager', 'Detail-oriented'],
    mid: ['Experienced', 'Dedicated', 'Reliable'],
    senior: ['Seasoned', 'Accomplished', 'Highly experienced']
  };

  const SUMMARY_SKELETONS = [
    '{level} {role} with hands-on experience in {skill1} and {skill2}. Known for {strength}, with a focus on {impact}.',
    '{level} {role} known for {strength}. Comfortable with {skill1} and {skill2}, and focused on {impact}.',
    '{level} {role} focused on {impact}. Strong background in {skill1} and {skill2}, with a reputation for {strength}.'
  ];

  const BULLET_SKELETONS = [
    '{verb} {skill1}, helping the team focus on {impact}.',
    '{verb} {skill1} and {skill2} to support {impact}.',
    '{verb} {skill1}, contributing to {impact}.'
  ];

  const ACTION_VERBS = ['Managed', 'Led', 'Coordinated', 'Delivered', 'Improved', 'Supported', 'Streamlined', 'Handled', 'Organized'];

  const ENTRY_LEVEL_WORDS = ['fresh grad', 'fresh graduate', 'entry level', 'entry-level', 'no experience', 'beginner', 'first job', 'starting out', 'new grad', 'newbie'];
  const SENIOR_LEVEL_WORDS = ['senior', 'lead ', 'expert', 'experienced', '5+ years', '10+ years', 'veteran', 'years of experience'];
  const SKILLS_WORDS = ['skill', 'competenc'];
  const SUMMARY_WORDS = ['summary', 'introduction', 'intro', 'about me', 'profile', 'bio', 'objective'];
  const BULLET_WORDS = ['bullet', 'achievement', 'highlight', 'accomplishment', 'experience point', 'work experience line', 'job description', 'duties', 'responsibilities', 'resume line'];

  // Capabilities are stated up front, repeatedly, and in the same words —
  // this is a fixed template tool, not open-ended chat, so it should never
  // sound like it's guessing or improvising outside those three things.
  const CAPABILITIES_LINE = 'I can only do 3 things: draft a Summary, draft a highlight Bullet point, or suggest a Skills list — always based on a role you give me.';

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fill(skeleton, values) {
    return skeleton.replace(/\{(\w+)\}/g, function (m, key) {
      return values[key] !== undefined ? values[key] : m;
    });
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Word-boundary matching instead of plain substring search — broader in
  // practice (short aliases like "va" or "hr" no longer need awkward
  // leading/trailing spaces to avoid false substring hits) and more
  // precise (won't fire mid-word).
  function detectRole(lowerText) {
    for (let i = 0; i < ROLES.length; i++) {
      const role = ROLES[i];
      for (let j = 0; j < role.aliases.length; j++) {
        if (new RegExp('\\b' + escapeRegExp(role.aliases[j]) + '\\b', 'i').test(lowerText)) return role;
      }
    }
    return null;
  }

  // For a role outside the bank, try to lift the phrase the user actually
  // typed ("...for a dog groomer") so the fallback template still feels
  // aimed at them, instead of only ever saying "professional."
  function extractRolePhrase(text) {
    const match = text.match(/\b(?:for|as)\s+(?:an?\s+)?([a-z][a-z\s/&-]{2,40}?)(?=[.,!?]|\s+(?:who|that|with|role|position|job)\b|$)/i);
    return match ? match[1].trim() : null;
  }

  function detectLevel(lowerText) {
    if (ENTRY_LEVEL_WORDS.some(function (w) { return lowerText.indexOf(w) !== -1; })) return 'entry';
    if (SENIOR_LEVEL_WORDS.some(function (w) { return lowerText.indexOf(w) !== -1; })) return 'senior';
    return 'mid';
  }

  function detectIntent(lowerText) {
    if (SKILLS_WORDS.some(function (w) { return lowerText.indexOf(w) !== -1; })) return 'skills';
    if (SUMMARY_WORDS.some(function (w) { return lowerText.indexOf(w) !== -1; })) return 'summary';
    if (BULLET_WORDS.some(function (w) { return lowerText.indexOf(w) !== -1; })) return 'bullet';
    return null;
  }

  function buildSummary(role, level) {
    const skill1 = pick(role.skills);
    let skill2 = pick(role.skills);
    let guard = 0;
    while (skill2 === skill1 && role.skills.length > 1 && guard++ < 5) skill2 = pick(role.skills);

    return fill(pick(SUMMARY_SKELETONS), {
      level: pick(LEVEL_ADJ[level] || LEVEL_ADJ.mid),
      role: role.label,
      skill1: skill1,
      skill2: skill2,
      strength: pick(role.strengths),
      impact: pick(role.impact)
    });
  }

  function buildBullet(role) {
    const skill1 = pick(role.skills);
    let skill2 = pick(role.skills);
    let guard = 0;
    while (skill2 === skill1 && role.skills.length > 1 && guard++ < 5) skill2 = pick(role.skills);

    const text = fill(pick(BULLET_SKELETONS), {
      verb: pick(ACTION_VERBS),
      skill1: skill1,
      skill2: skill2,
      impact: pick(role.impact)
    });
    return capitalize(text);
  }

  function buildUnique(generator, count) {
    const results = [];
    let guard = 0;
    while (results.length < count && guard++ < 12) {
      const val = generator();
      if (results.indexOf(val) === -1) results.push(val);
    }
    return results;
  }

  let $fab, $panel, $messages, $input;
  let isOpen = false;

  function buildUI() {
    $fab = $(
      '<button type="button" id="assistantFab" class="assistant-fab" aria-label="Open writing assistant" aria-expanded="false">' +
        '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96l6.13-1.58a2 2 0 0 0 1.44-1.44l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"></path><path d="M19 3v3"></path><path d="M20.5 4.5h-3"></path><path d="M5 17v2"></path><path d="M6 18H4"></path></svg>' +
      '</button>'
    ).appendTo('body');

    $panel = $(
      '<div id="assistantPanel" class="assistant-panel" role="dialog" aria-modal="false" aria-label="Writing assistant">' +
        '<div class="assistant-panel__header">' +
          '<span>Writing assistant</span>' +
          '<button type="button" class="assistant-panel__close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="assistant-panel__messages" id="assistantMessages" tabindex="0"></div>' +
        '<form class="assistant-panel__input-row" id="assistantForm">' +
          '<input type="text" class="assistant-panel__input" id="assistantInput" autocomplete="off" placeholder="Ask for a summary, bullet, or skills…" />' +
          '<button type="submit" class="assistant-panel__send" aria-label="Send">' +
            '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
          '</button>' +
        '</form>' +
      '</div>'
    ).appendTo('body');

    $messages = $('#assistantMessages');
    $input = $('#assistantInput');

    $fab.on('click', toggle);
    $panel.find('.assistant-panel__close').on('click', close);
    $('#assistantForm').on('submit', function (e) {
      e.preventDefault();
      const text = $input.val();
      $input.val('');
      handleUserMessage(text);
    });

    $(document).on('keydown.resumeAssistant', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    greet();
  }

  function scrollToBottom() {
    $messages.scrollTop($messages[0].scrollHeight);
  }

  function appendUserMessage(text) {
    $('<div class="assistant-msg assistant-msg--user"></div>').text(text).appendTo($messages);
    scrollToBottom();
  }

  function appendBotMessage(text) {
    $('<div class="assistant-msg assistant-msg--bot"></div>').text(text).appendTo($messages);
    scrollToBottom();
  }

  function appendChips(options) {
    const $wrap = $('<div class="assistant-chips"></div>');
    options.forEach(function (label) {
      $('<button type="button" class="assistant-chip"></button>').text(label).on('click', function () {
        handleUserMessage(label);
      }).appendTo($wrap);
    });
    $wrap.appendTo($messages);
    scrollToBottom();
  }

  function appendSuggestion(text, kind) {
    const $card = $('<div class="assistant-suggestion"></div>');
    $('<p class="assistant-suggestion__text"></p>').text(text).appendTo($card);
    const $actions = $('<div class="assistant-suggestion__actions"></div>').appendTo($card);

    if (kind === 'summary') {
      $('<button type="button" class="assistant-suggestion__btn">Use this</button>').on('click', function () {
        $('#summaryInput').val(text).trigger('input');
        ResumeToast.show('Added to your Summary.', 'success');
      }).appendTo($actions);
    } else {
      $('<button type="button" class="assistant-suggestion__btn">Copy</button>').on('click', function () {
        copyText(text);
        ResumeToast.show('Copied — paste it into a bullet point.', 'success');
      }).appendTo($actions);
    }

    $card.appendTo($messages);
    scrollToBottom();
  }

  function collectExistingSkillsLower() {
    return $('#skillChips .skill-chip__label').map(function () { return $(this).text().toLowerCase(); }).get();
  }

  // Reuses the editor's own "type + Enter" skill-add handler instead of
  // duplicating its dedupe/state-sync logic — this only drives the same
  // input a user would type into themselves.
  function addSkillViaInput(skillText) {
    const $skillInput = $('#skillInput');
    $skillInput.val(skillText);
    $skillInput.trigger($.Event('keydown', { key: 'Enter' }));
  }

  function appendSkillsSuggestion(role) {
    const skills = role.chipSkills.slice(0, 8);
    const $card = $('<div class="assistant-suggestion"></div>');
    $('<p class="assistant-suggestion__text"></p>').text('Skills often listed for a ' + (role.label || 'this role') + ':').appendTo($card);
    const $tags = $('<div class="assistant-skill-tags"></div>').appendTo($card);
    const tagRefs = [];

    function markAdded(skill, $tag) {
      $tag.off('click').addClass('is-added').prop('disabled', true).text('✓ ' + skill);
    }

    skills.forEach(function (skill) {
      const alreadyAdded = collectExistingSkillsLower().indexOf(skill.toLowerCase()) !== -1;
      const $tag = $('<button type="button" class="assistant-skill-tag"></button>').text((alreadyAdded ? '✓ ' : '+ ') + skill);
      if (alreadyAdded) {
        $tag.addClass('is-added').prop('disabled', true);
      } else {
        $tag.on('click', function () {
          addSkillViaInput(skill);
          markAdded(skill, $tag);
        });
      }
      tagRefs.push({ skill: skill, $tag: $tag });
      $tag.appendTo($tags);
    });

    const $actions = $('<div class="assistant-suggestion__actions"></div>').appendTo($card);
    $('<button type="button" class="assistant-suggestion__btn">Add all</button>').on('click', function () {
      tagRefs.forEach(function (ref) {
        if (!ref.$tag.hasClass('is-added')) {
          addSkillViaInput(ref.skill);
          markAdded(ref.skill, ref.$tag);
        }
      });
      ResumeToast.show('Added to your Skills.', 'success');
    }).appendTo($actions);

    $card.appendTo($messages);
    scrollToBottom();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return;
    }
    const $tmp = $('<textarea readonly></textarea>').val(text).css({ position: 'fixed', left: '-9999px' }).appendTo('body');
    $tmp[0].select();
    try { document.execCommand('copy'); } catch (err) { /* clipboard unavailable — nothing more we can do */ }
    $tmp.remove();
  }

  let typingTimer = null;

  function showTyping() {
    $('<div class="assistant-msg assistant-msg--bot assistant-typing" id="assistantTyping"><span></span><span></span><span></span></div>').appendTo($messages);
    scrollToBottom();
  }

  function hideTyping() {
    $('#assistantTyping').remove();
  }

  function greet() {
    appendBotMessage(CAPABILITIES_LINE + ' Tell me the role — e.g. "skills for a nurse."');
    appendChips(['Summary for a web developer', 'Skills for a virtual assistant', 'Bullet point for a sales rep']);
  }

  function handleUserMessage(rawText) {
    const text = (rawText || '').trim();
    if (!text) return;
    appendUserMessage(text);

    clearTimeout(typingTimer);
    showTyping();
    typingTimer = setTimeout(function () {
      hideTyping();
      respond(text);
    }, 450 + Math.random() * 350);
  }

  function respond(text) {
    const lower = text.toLowerCase();

    if (/^\s*(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(lower)) {
      appendBotMessage('Hey! ' + CAPABILITIES_LINE);
      return;
    }
    if (/^\s*help\s*[?!.]*\s*$/.test(lower) || /what can you do|how does this work|what do you do/.test(lower)) {
      appendBotMessage(CAPABILITIES_LINE + ' I’m not a general chatbot, so I can’t answer things outside that — try "summary for an entry-level virtual assistant" or "skills for a project manager."');
      return;
    }

    let intent = detectIntent(lower);
    const knownRole = detectRole(lower);
    const customLabel = !knownRole ? extractRolePhrase(text) : null;

    if (!intent && (knownRole || customLabel)) intent = 'summary';

    if (!intent) {
      appendBotMessage('I didn’t catch a request I can act on. ' + CAPABILITIES_LINE + ' For example:');
      appendChips(['Summary for a nurse', 'Skills for a sales associate', 'Bullet point for a fresh graduate accountant']);
      return;
    }

    const usedFallback = !knownRole;
    const role = knownRole || Object.assign({}, GENERIC_ROLE, { label: customLabel || 'professional' });
    const level = detectLevel(lower);

    if (intent === 'summary') {
      const options = buildUnique(function () { return buildSummary(role, level); }, 2);
      appendBotMessage(
        'Here’s a summary you can use' +
        (usedFallback ? ' — I used a general template since I don’t have specifics for that exact role, so tweak it as needed' : '') +
        ':'
      );
      options.forEach(function (t) { appendSuggestion(t, 'summary'); });
    } else if (intent === 'skills') {
      if (usedFallback) {
        appendBotMessage('I don’t have a specific list for that exact role, so here’s a general set — add your own specifics too:');
      } else {
        appendBotMessage('Here are some skills worth considering:');
      }
      appendSkillsSuggestion(role);
    } else {
      const options = buildUnique(function () { return buildBullet(role); }, 2);
      appendBotMessage('Here' + (options.length > 1 ? '’re a couple bullet points' : '’s a bullet point') + ' you can use:');
      options.forEach(function (t) { appendSuggestion(t, 'bullet'); });
      appendBotMessage('Tip: swap in a real number or result if you have one — specifics like "by 20%" or "for 50+ customers a day" make a bullet much stronger.');
    }

    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'assistant-suggestion', title: 'Assistant suggestion', event: true });
    }
  }

  function toggle() {
    if (isOpen) close(); else open();
  }

  function open() {
    if (!$panel) buildUI();
    isOpen = true;
    $panel.addClass('is-open');
    $fab.attr('aria-expanded', 'true');
    $input.trigger('focus');
  }

  function close() {
    isOpen = false;
    if ($panel) $panel.removeClass('is-open');
    if ($fab) $fab.attr('aria-expanded', 'false');
  }

  function show() {
    if (!$fab) buildUI();
    $fab.addClass('is-visible');
  }

  function hide() {
    close();
    if ($fab) $fab.removeClass('is-visible');
  }

  return { show, hide };
})();
