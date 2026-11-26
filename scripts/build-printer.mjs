import { build } from 'esbuild';
await build({entryPoints:['src/printer.js'],bundle:true,platform:'browser',format:'iife',target:['es2020'],outfile:'www/printer.js',minify:true,sourcemap:false});
console.log('Bundled native printer bridge into www/printer.js');
