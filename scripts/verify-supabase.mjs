import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const url = html.match(/const SHARED_CONTENT_URL='([^']+)'/)?.[1];
const key = html.match(/const SHARED_CONTENT_KEY='([^']+)'/)?.[1];
assert.ok(url && key && key.startsWith('sb_publishable_'), 'Missing public Supabase configuration');

const endpoint = new URL(url + '/rest/v1/app_content');
endpoint.searchParams.set('select', 'version,payload');
endpoint.searchParams.set('content_key', 'eq.game.base');
endpoint.searchParams.set('published', 'eq.true');
endpoint.searchParams.set('order', 'version.desc');
endpoint.searchParams.set('limit', '1');

const response = await fetch(endpoint, {
  headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' },
  signal: AbortSignal.timeout(15000)
});
assert.equal(response.status, 200, 'Supabase Data API request failed: HTTP ' + response.status);
const rows = await response.json();
assert.ok(Array.isArray(rows) && rows.length === 1, 'Expected one published base-game content row');
const payload = rows[0].payload;
assert.equal(payload.schema_version, 1);
assert.equal(payload.mode, 'base');
assert.equal(payload.card_groups?.c?.length, 30, 'Expected 30 challenge cards');
assert.equal(payload.card_groups?.k?.length, 20, 'Expected 20 care cards');
assert.equal(payload.card_groups?.r?.length, 20, 'Expected 20 reward cards');
console.log('Supabase Data API passed: published base content is reachable read-only (30/20/20 cards).');
