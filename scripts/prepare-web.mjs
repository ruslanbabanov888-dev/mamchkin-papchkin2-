import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const webDir = resolve(root, 'www');

// Copy only the audited static app files. Never copy .git, node_modules,
// Android build output, or other development files into the WebView bundle.
const files = [
  'index.html',
  'notes-storage.js',
  'printer.js',
  'time-capsule.js',
  'emblem.png',
  'h-waiting.jpg',
  'h-team.jpg',
  'h-secret.jpg',
  'h-memories.jpg',
  'notes-calm.webp',
  'notes-dreamer.webp',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'privacy.html',
  'agreement.html',
  'sw.js',
  'OFL-Cormorant-Garamond.txt'
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const file of files) {
  await cp(resolve(root, file), resolve(webDir, file));
}

// Include the bundled soundtrack in the Android WebView package.
await cp(resolve(root, 'assets/audio'), resolve(webDir, 'assets/audio'), { recursive: true });

console.log(`Prepared ${files.length} web assets plus soundtrack directory in www/ for Capacitor.`);
