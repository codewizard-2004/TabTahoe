const PREFIX = 'tabtahoe-v2:';

// Version 1 keys/IndexedDB remain untouched, including recovery after malformed data.
export function createBrowserStorage() {
  const extension = globalThis.chrome?.storage?.local;
  return {
    async get(key) {
      if (extension) return (await extension.get(key))[key];
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? undefined : JSON.parse(raw);
    },
    async set(values) {
      if (extension) return extension.set(values);
      for (const [key, value] of Object.entries(values)) localStorage.setItem(PREFIX + key, JSON.stringify(value));
    },
    async legacy() {
      if (extension) {
        const all = await extension.get(null);
        return { data: { settings: all.settings, apps: all.apps, pinned: all.pinned }, original: all };
      }
      const original = { preferences: localStorage.getItem('tabtahoe'), tasks: localStorage.getItem('tabtahoe-calendar-tasks') };
      return { data: original.preferences === null ? {} : JSON.parse(original.preferences), original };
    },
    // Web Locks serialize compare-and-write across dashboard tabs, including migration.
    lock(name, callback) {
      if (!globalThis.navigator?.locks) throw new Error('This browser cannot safely coordinate saved layouts. Use a current Chromium desktop browser.');
      return navigator.locks.request(`tabtahoe:${name}`, callback);
    },
    subscribe(listener) {
      if (extension) {
        const callback = (changes, area) => { if (area === 'local') for (const [key, value] of Object.entries(changes)) listener(key, value.newValue); };
        chrome.storage.onChanged.addListener(callback);
        return () => chrome.storage.onChanged.removeListener(callback);
      }
      const callback = event => {
        if (event.key?.startsWith(PREFIX)) {
          try { listener(event.key.slice(PREFIX.length), event.newValue === null ? undefined : JSON.parse(event.newValue)); }
          catch { listener(event.key.slice(PREFIX.length), undefined); }
        }
      };
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
  };
}
