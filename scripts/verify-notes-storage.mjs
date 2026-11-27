import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf("const NOTES_STORAGE_KEY='mp2_family_notes_v2';");
const end = html.indexOf('function notesView(){', start);
assert.ok(start >= 0 && end > start, 'Could not locate the notes storage module');
const source = html.slice(start, end);

function createStorage(seed = {}, failWrites = false) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (failWrites) throw new Error('simulated storage quota failure');
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); }
  };
}
function createNative(seed = {}, failWrites = false) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    async get(key) { return values.has(key) ? values.get(key) : null; },
    async set(key, value) {
      if (failWrites) throw new Error('simulated native storage failure');
      values.set(key, String(value));
    }
  };
}
async function boot(localStorage, native) {
  const messages = [];
  const fields = {
    '#note-title': { value: 'Первые шаги' },
    '#note-body': { value: 'Сегодня малыш сделал первые шаги.' }
  };
  const context = {
    localStorage, Date, Math, JSON, Number, String, Array, Object,
    window: { MPNotesStorage: native },
    toast(message) { messages.push(message); },
    go() {}, confirm() { return true; },
    setTimeout(fn) { fn(); },
    $(selector) { return fields[selector] || null; }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'notes-storage-module.js' });
  await vm.runInContext('notesInitialization', context);
  return {
    context, messages,
    get entries() { return vm.runInContext('familyNotes', context); }
  };
}

const legacyEntry = {
  id: 'legacy-1', date: '2026-11-23', title: 'Первая улыбка',
  body: 'Улыбнулся утром.', created: 1795430000000
};
const legacyRaw = JSON.stringify([legacyEntry]);
const local = createStorage({ mp2_family_notes: legacyRaw });
const native = createNative();
const first = await boot(local, { isNative: true, ...native });
assert.equal(first.entries.length, 1, 'Legacy note was not loaded');
assert.equal(first.entries[0].title, 'Первая улыбка');
assert.equal(local.getItem('mp2_family_notes'), legacyRaw, 'Legacy recovery copy was modified');
const nativeEnvelope = native.values.get('mp2_family_notes_v2');
assert.ok(nativeEnvelope, 'Legacy records were not migrated to native storage');
assert.equal(JSON.parse(nativeEnvelope).schemaVersion, 1);
assert.equal(JSON.parse(nativeEnvelope).entries.length, 1);

// Simulated relaunch: native preferences remain the authoritative source.
const restarted = await boot(createStorage(), { isNative: true, ...native });
assert.equal(restarted.entries.length, 1, 'Native note did not survive a simulated app restart');
assert.equal(restarted.entries[0].body, legacyEntry.body);

// Native v2 data takes precedence over stale local recovery data.
const staleLocal = createStorage({
  mp2_family_notes_v2: JSON.stringify({ schemaVersion: 1, entries: [{ ...legacyEntry, title: 'Старая копия' }] })
});
const precedence = await boot(staleLocal, { isNative: true, ...native });
assert.equal(precedence.entries[0].title, 'Первая улыбка');

// Invalid calendar dates are rejected even when stored natively.
const invalidNative = createNative({
  mp2_family_notes_v2: JSON.stringify({ schemaVersion: 1, entries: [{ ...legacyEntry, date: '2026-02-30' }] })
});
const invalid = await boot(createStorage(), { isNative: true, ...invalidNative });
assert.equal(invalid.entries.length, 0, 'Invalid calendar date was accepted');

// Failed native writes must fall back to local storage and disclose degraded mode.
const failingLocal = createStorage();
const failingNative = createNative({}, true);
const failing = await boot(failingLocal, { isNative: true, ...failingNative });
await vm.runInContext('notesDate = "2026-11-24"; notesSave()', failing.context);
assert.equal(JSON.parse(failingLocal.getItem('mp2_family_notes_v2')).entries.length, 1);
assert.ok(failing.messages.some(message => message.includes('резервной копии')), 'Native failure was not disclosed');

console.log('Notes storage verification passed: native migration, legacy recovery, restart, native precedence, invalid dates, and fallback handling.');
