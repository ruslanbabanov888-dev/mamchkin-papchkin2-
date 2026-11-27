// Browser/PWA fallback. Android builds replace this in www/ with the bundled native adapter.
(() => {
  const storage = window.localStorage;
  window.MPNotesStorage = {
    isNative: false,
    async get(key) { return storage.getItem(key); },
    async set(key, value) { storage.setItem(key, value); return storage.getItem(key) === value; }
  };
})();
