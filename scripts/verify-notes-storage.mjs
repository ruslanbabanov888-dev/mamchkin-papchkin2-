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

function boot(storage) {
  const messages = [];
  const fields = {
    '#note-title': { value: 'Первые шаги' },
    '#note-body': { value: 'Сегодня малыш сделал первые шаги.' }
  };
  const context = {
    localStorage: storage,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    toast(message) { messages.push(message); },
    go() {},
    confirm() { return true; },
    setTimeout(fn) { fn(); },
    $(selector) { return fields[selector] || null; }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'notes-storage-module.js' });
  return {
    context,
    messages,
    get entries() { return vm.runInContext('familyNotes', context); },
    get date() { return vm.runInContext('notesDate', context); }
  };
}

const legacyEntry = {
  id: 'legacy-1',
  date: '2026-11-23',
  title: 'Первая улыбка',
  body: 'Улыбнулся утром.',
  created: 1795430000000
};
const legacyRaw = JSON.stringify([legacyEntry]);
const firstStorage = createStorage({ mp2_family_notes: legacyRaw });
const firstBoot = boot(firstStorage);
assert.equal(firstBoot.entries.length, 1, 'Legacy note was not loaded');
assert.equal(firstBoot.entries[0].title, 'Первая улыбка');
assert.equal(firstStorage.getItem('mp2_family_notes'), legacyRaw, 'Legacy recovery copy was modified');
const migrated = JSON.parse(firstStorage.getItem('mp2_family_notes_v2'));
assert.equal(migrated.schemaVersion, 1, 'Migrated envelope has the wrong schema version');
assert.equal(migrated.entries.length, 1, 'Migrated envelope lost the note');

// Simulate a full app restart using the same persistent key/value store.
const secondBoot = boot(firstStorage);
assert.equal(secondBoot.entries.length, 1, 'Note did not survive a simulated app restart');
assert.equal(secondBoot.entries[0].body, legacyEntry.body);

// A valid v2 store takes precedence over the untouched legacy recovery copy.
firstStorage.setItem('mp2_family_notes', JSON.stringify([{ ...legacyEntry, title: 'Старая копия' }]));
const precedenceBoot = boot(firstStorage);
assert.equal(precedenceBoot.entries[0].title, 'Первая улыбка', 'Legacy copy overwrote current v2 data');

// Invalid calendar dates are rejected during normalization.
const invalidStorage = createStorage({
  mp2_family_notes_v2: JSON.stringify({ schemaVersion: 1, entries: [{ ...legacyEntry, date: '2026-02-30' }] })
});
assert.equal(boot(invalidStorage).entries.length, 0, 'Invalid calendar date was accepted');

// A failed write must not report success or leave an in-memory phantom note.
const failingStorage = createStorage({}, true);
const failingBoot = boot(failingStorage);
vm.runInContext('notesDate = "2026-11-24"; notesSave();', failingBoot.context);
assert.equal(failingBoot.entries.length, 0, 'Failed save left a phantom in-memory note');
assert.ok(failingBoot.messages.some(message => message.includes('Не удалось сохранить')), 'Failed save did not notify the user');

console.log('Notes storage verification passed: legacy migration, recovery copy, v2 precedence, restart persistence, invalid-date rejection, and failed-write handling.');
