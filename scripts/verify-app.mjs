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
assert.ok(html.includes('async function loadSharedBaseContent()'), 'Supabase shared-content loader is missing');
assert.ok(html.includes("content_key=eq.game.base"), 'Base content key is not requested');
assert.ok(html.includes("published=eq.true"), 'Client must load published content only');
assert.ok(html.includes('sb_publishable_'), 'Supabase publishable key is missing');
assert.ok(!html.includes('service_role') && !html.includes('sb_secret_'), 'A privileged Supabase key must never ship in the app');
assert.ok(html.includes('using bundled game data'), 'Bundled offline fallback is missing');
assert.ok(html.includes('groups.c.length===30') && html.includes('groups.k.length===20') && html.includes('groups.r.length===20'), 'Remote card payload validation is incomplete');
const contentMigration = await read('../supabase/migrations/20261124000000_create_app_content.sql');
const seedMigration = await read('../supabase/migrations/20261124000100_seed_base_game_content.sql');
assert.ok(contentMigration.includes('enable row level security'), 'Shared content migration must enable RLS');
assert.ok(contentMigration.includes('grant select on table public.app_content to anon, authenticated'), 'Shared content must grant read-only access');
assert.ok(contentMigration.includes('revoke all on table public.app_content'), 'Shared content must revoke client writes');
assert.ok(seedMigration.includes("'game.base', 1"), 'Base content seed migration is missing');


for (const asset of ['notes-calm.webp', 'notes-dreamer.webp']) {
  assert.ok(prepare.includes("'" + asset + "'"), 'prepare-web does not copy ' + asset);
  assert.ok(serviceWorker.includes("'" + asset + "'"), 'Service worker does not cache ' + asset);
  await access(new URL('../' + asset, import.meta.url));
}

console.log('App verification passed: ' + parsedScripts + ' inline script(s), notes CRUD, date validation, and both lion assets.');
