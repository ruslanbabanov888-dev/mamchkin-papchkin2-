import { cp, copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'android-res');
const target = resolve(root, 'android/app/src/main/res');

const required = [
  'ic_launcher.png',
  'ic_launcher_round.png',
  'ic_launcher_foreground.png'
];

for (const file of required) {
  const path = resolve(root, file);
  try {
    await (await import('node:fs/promises')).access(path);
  } catch {
    throw new Error(`Missing required launcher asset: ${file}`);
  }
}

await mkdir(target, { recursive: true });

for (const entry of await readdir(source, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  await cp(resolve(source, entry.name), resolve(target, entry.name), {
    recursive: true,
    force: true
  });
}

// The foreground is a PNG resource. Remove the old XML wrapper with the
// same resource name to avoid Android resource-name collisions.
await rm(resolve(target, 'drawable/ic_launcher_foreground.xml'), { force: true });
await mkdir(resolve(target, 'drawable-nodpi'), { recursive: true });
await copyFile(
  resolve(root, 'ic_launcher_foreground.png'),
  resolve(target, 'drawable-nodpi/ic_launcher_foreground.png')
);

// Use the supplied standard and round artwork in every density bucket.
// Android scales the 512px source cleanly for the launcher.
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const dir = resolve(target, `mipmap-${density}`);
  await mkdir(dir, { recursive: true });
  await copyFile(resolve(root, 'ic_launcher.png'), resolve(dir, 'ic_launcher.png'));
  await copyFile(resolve(root, 'ic_launcher_round.png'), resolve(dir, 'ic_launcher_round.png'));
}

console.log('Installed Rose Gold standard, round and adaptive launcher icons.');
