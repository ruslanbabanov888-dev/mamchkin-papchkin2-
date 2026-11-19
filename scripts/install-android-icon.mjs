import { cp, copyFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'android-res');
const target = resolve(root, 'android/app/src/main/res');

await mkdir(target, { recursive: true });

for (const entry of await readdir(source, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  await cp(resolve(source, entry.name), resolve(target, entry.name), {
    recursive: true,
    force: true
  });
}

await mkdir(resolve(target, 'drawable-nodpi'), { recursive: true });
await copyFile(resolve(root, 'icon-512.png'), resolve(target, 'drawable-nodpi/ic_launcher_foreground.png'));

console.log('Installed standard and round launcher icons with the supplied emblem.');
