import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

window.MPNotesStorage = {
  isNative,
  async get(key) {
    const result = await Preferences.get({ key });
    return result.value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
    const check = await Preferences.get({ key });
    if (check.value !== value) throw new Error('Native preferences read-back verification failed');
    return true;
  }
};
