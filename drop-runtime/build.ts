import { build, context, BuildOptions } from 'esbuild';
import process from 'process';
import fs from 'fs';

let watch = false;
if (process.argv.includes("--watch")) {
  watch = true;
}

const external = [
  'node:child_process',
  'node:crypto',
  'node:fs',
  'node:path',
  'node:url',
  'node:vm',
]

const workerOptions: BuildOptions = {
  entryPoints: ['./src/pyodide-worker.ts'],
  external,
  bundle: true,
  outdir: './src',
  minify: true,
  platform: 'browser',
  format: 'esm',
  logLevel: 'info',
}


const dropOptions: BuildOptions = {
  entryPoints: ['./src/drop-runtime.ts'],
  external,
  bundle: true,
  outdir: '../_extensions/drop',
  minify: true,
  loader: { '.svg': 'text', '.wjs': 'text' },
  platform: 'browser',
  format: 'esm',
  logLevel: 'info',
};

await build(workerOptions);
await fs.promises.rename('src/pyodide-worker.js', 'src/pyodide-worker.wjs');

if (watch) {
  const ctx = await context(dropOptions);
  await ctx.watch();
} else {
  await build(dropOptions);
}
