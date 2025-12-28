// Local storage helper for toggles, strings, and generic values
export const AppState = {
  prefix: 'mv:',
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify({ v: value }));
    } catch {}
  },
  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw == null) return defaultValue;
      const obj = JSON.parse(raw);
      return obj && 'v' in obj ? obj.v : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  remove(key) {
    try { localStorage.removeItem(this.prefix + key); } catch {}
  },
  setToggle(name, bool) { this.set(`toggle:${name}`, !!bool); },
  getToggle(name, defaultBool) { return !!this.get(`toggle:${name}`, !!defaultBool); },
  setString(name, str) { this.set(`string:${name}`, String(str)); },
  getString(name, defaultStr) {
    const val = this.get(`string:${name}`, defaultStr);
    return typeof val === 'string' ? val : String(defaultStr ?? '');
  }
};
