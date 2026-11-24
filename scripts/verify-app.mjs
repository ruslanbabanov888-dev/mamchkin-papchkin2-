import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const html = await read('../index.html');
const prepare = await read('./prepare-web.mjs');
const serviceWorker = await read('../sw.js');

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let parsedScripts = 0;
for (const [, attributes, source] of scripts) {
  if (/\bsrc\s*=/.test(attributes)) continue;
  if (/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attributes)) continue;
  if (!source.trim()) continue;
  parsedScripts += 1;
  new vm.Script(source, { filename: 'index.html:inline-script-' + parsedScripts });
}
assert.ok(parsedScripts > 0, 'No inline application scripts were checked');

for (const name of ['notesView', 'notesSave', 'notesEdit', 'notesDelete', 'notesPersist', 'notesDateChange']) {
  assert.ok(html.includes('function ' + name + '('), 'Missing notes function: ' + name);
}
assert.ok(html.includes("'mp2_family_notes'"), 'Notes storage key is missing');
assert.ok(html.includes("if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(v))"), 'Notes date validator is incorrect');
assert.ok(html.includes('src="notes-calm.webp"'), 'Home lion image is not referenced');
assert.ok(html.includes('src="notes-dreamer.webp"'), 'Notes lion image is not referenced');

for (const asset of ['notes-calm.webp', 'notes-dreamer.webp']) {
  assert.ok(prepare.includes("'" + asset + "'"), 'prepare-web does not copy ' + asset);
  assert.ok(serviceWorker.includes("'" + asset + "'"), 'Service worker does not cache ' + asset);
  await access(new URL('../' + asset, import.meta.url));
}

console.log('App verification passed: ' + parsedScripts + ' inline script(s), notes CRUD, date validation, and both lion assets.');
