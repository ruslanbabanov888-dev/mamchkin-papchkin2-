import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const html = await read('../index.html');
const prepare = await read('./prepare-web.mjs');
const serviceWorker = await read('../sw.js');

// Parse every inline JavaScript block without executing browser code.
const scripts = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)];
let parsedScripts = 0;
for (const [, attributes, source] of scripts) {
  if (/\\bsrc\\s*=/.test(attributes)) continue;
  if (/type\\s*=\\s*["']application\\/(?:ld\\+)?json["']/i.test(attributes)) continue;
  if (!source.trim()) continue;
  new vm.Script(source, { filename: `index.html:inline-script-${++parsedScripts}` });
}
assert.ok(parsedScripts > 0, 'No inline application scripts were checked');

// Notes are deliberately stored separately from the game save.
for (const name of ['notesView', 'notesSave', 'notesEdit', 'notesDelete', 'notesPersist', 'notesDateChange']) {
  assert.ok(html.includes(`function ${name}(`), `Missing notes function: ${name}`);
}
assert.ok(html.includes("'mp2_family_notes'"), 'Notes storage key is missing');
assert.ok(!/if\\(!\\/\\^\\\\\\\\d\\{4\\}/.test(html), 'Notes date validator contains a double-escaped digit matcher');
assert.ok(html.includes("src=\"notes-calm.webp\""), 'Home lion image is not referenced');
assert.ok(html.includes("src=\"notes-dreamer.webp\""), 'Notes lion image is not referenced');

// Ensure both lion assets are copied into the Capacitor WebView bundle and cached offline.
for (const asset of ['notes-calm.webp', 'notes-dreamer.webp']) {
  assert.ok(prepare.includes(`'${asset}'`), `prepare-web does not copy ${asset}`);
  assert.ok(serviceWorker.includes(`'${asset}'`), `Service worker does not cache ${asset}`);
  await access(new URL(`../${asset}`, import.meta.url));
}

console.log(`App verification passed: ${parsedScripts} inline script(s), notes CRUD, date validation, and both lion assets.`);
