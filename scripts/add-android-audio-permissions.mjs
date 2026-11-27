import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
let xml = await readFile(manifestPath, 'utf8');
const permissions = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS'
];
const missing = permissions.filter(permission => !xml.includes('android:name="' + permission + '"'));
if (missing.length) {
  const declarations = missing.map(permission => '    <uses-permission android:name="' + permission + '" />').join('\n');
  if (!/<application\b/.test(xml)) throw new Error('AndroidManifest.xml does not contain an application element');
  xml = xml.replace(/<application\b/, declarations + '\n    <application');
  await writeFile(manifestPath, xml, 'utf8');
}
for (const permission of permissions) {
  if (!xml.includes('android:name="' + permission + '"')) throw new Error('Missing Android permission: ' + permission);
}
console.log('Android microphone and audio-routing permissions are present.');
