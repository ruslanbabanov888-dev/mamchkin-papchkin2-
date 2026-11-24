import { build } from 'esbuild';

await build({
  entryPoints: ['src/notes-storage.js'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  outfile: 'www/notes-storage.js',
  minify: true,
  sourcemap: false
});

console.log('Bundled Capacitor Preferences adapter into www/notes-storage.js');
