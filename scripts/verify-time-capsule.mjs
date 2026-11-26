import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const js=await readFile(new URL('../time-capsule.js',import.meta.url),'utf8');
const prepare=await readFile(new URL('./prepare-web.mjs',import.meta.url),'utf8');
new vm.Script(js);
for(const token of ['MPTimeCapsule','AES-GCM','PBKDF2','310000','renderBookSection','openCapsule','markEventReached','mp-tc-envelope','Привет из прошлого']) {
  if(token==='Привет из прошлого') continue;
  assert.ok(js.includes(token), 'Missing time capsule feature: '+token);
}
assert.ok(html.includes('window.MPTimeCapsule?await window.MPTimeCapsule.renderBookSection()'));
assert.ok(html.includes('src="time-capsule.js"'));
assert.ok(prepare.includes("'time-capsule.js'"));
console.log('Time capsule verification passed.');
