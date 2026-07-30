/**
 * localStorage-backed persistence layer. This is the app's only "database" —
 * there is no server, so every read/write must fail soft (a private-browsing
 * tab or a full storage quota should degrade to "just don't persist", not crash).
 */
const ResumeStorage = (function () {
  const STORAGE_KEY = 'resumeforge.resume.v1';

  function getDefaultData() {
    return {
      templateId: 'default',
      personal: {
        firstName: '',
        lastName: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        website: ''
      },
      summary: '',
      experience: [],
      projects: [],
      education: [],
      certificates: [],
      skills: []
    };
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Object.assign(getDefaultData(), parsed, {
        personal: Object.assign(getDefaultData().personal, parsed.personal || {})
      });
    } catch (err) {
      console.warn('ResumeStorage: could not read saved resume, starting fresh.', err);
      return null;
    }
  }

  function save(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('ResumeStorage: could not save resume (storage may be full or unavailable).', err);
      return false;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('ResumeStorage: could not clear saved resume.', err);
    }
  }

  return { getDefaultData, load, save, clear };
})();
