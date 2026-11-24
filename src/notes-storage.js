import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = () => Capacitor.isNativePlatform();

window.MPNotesStorage = {
  get isNative() {
    return isNative();
  },
  async get(key) {
    if (isNative()) {
      const result = await Preferences.get({ key });
      return result.value;
    }
    return window.localStorage.getItem(key);
  },
  async set(key, value) {
    if (isNative()) {
      await Preferences.set({ key, value });
      const check = await Preferences.get({ key });
      if (check.value !== value) throw new Error('Native preferences read-back verification failed');
      return true;
    }
    window.localStorage.setItem(key, value);
    return window.localStorage.getItem(key) === value;
  }
};
