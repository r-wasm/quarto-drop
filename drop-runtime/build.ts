import { build, context, BuildOptions } from 'esbuild';
import process from 'process';

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

const options: BuildOptions = {
  entryPoints: ['./src/drop-runtime.ts'],
  external,
  bundle: true,
  outdir: '../_extensions/drop',
  minify: true,
  loader: { '.svg': 'text' },
  platform: 'browser',
  format: 'esm',
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
