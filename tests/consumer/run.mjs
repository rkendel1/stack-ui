#!/usr/bin/env node
// Consumer integration check (docs/charts.md §Verification): pack the three
// packages exactly as they would be published, install the tarballs into a
// fresh project outside the workspace, then typecheck, bundle and render a
// consumer app that imports only public entry points. Needs the npm registry
// for react, react-dom, typescript and esbuild.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const dir = mkdtempSync(join(tmpdir(), 'stack-ui-consumer-'));
const run = (cmd, args, cwd = dir) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
const keep = process.argv.includes('--keep');
try {
  for (const p of ['tokens', 'core', 'react']) run('pnpm', ['pack', '--pack-destination', dir], join(root, 'packages', p));
  const tarballs = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.tgz')).map((f) => [`@stack-ui/${f.match(/^stack-ui-(\w+)-/)[1]}`, `file:./${f}`]));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'stack-ui-consumer', private: true, type: 'module',
    dependencies: { ...tarballs, react: '19.2.0', 'react-dom': '19.2.0' },
    devDependencies: { typescript: '5.6.3', esbuild: '0.24.0', '@types/react': '19.2.0', '@types/react-dom': '19.2.0' },
  }, null, 2));
  cpSync(join(here, 'app.tsx'), join(dir, 'app.tsx'));
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, jsx: 'react-jsx', module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2020', skipLibCheck: false, types: [] }, files: ['app.tsx', 'css.d.ts'] }));
  writeFileSync(join(dir, 'css.d.ts'), "declare module '*.css';\n// @stack-ui/core/html ships no type declarations (pre-existing; docs/charts.md, "Not supported").\ndeclare module '@stack-ui/core/html' { export const html: Record<string, (props: object) => string>; }\n");
  run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error']);
  run('npx', ['tsc', '-p', '.']);
  console.log('consumer: types resolve from the packed packages');
  run('npx', ['esbuild', 'app.tsx', '--bundle', '--platform=browser', '--format=esm', '--outfile=dist/app.js', '--loader:.css=css', '--log-level=error']);
  console.log('consumer: browser bundle builds (CSS from @stack-ui/tokens and @stack-ui/core)');
  run('npx', ['esbuild', 'app.tsx', '--bundle', '--platform=node', '--format=esm', '--outfile=dist/ssr.mjs', '--loader:.css=empty', '--external:react', '--external:react-dom', '--log-level=error']);
  const { markup, staticHtml } = await import(pathToFileURL(join(dir, 'dist/ssr.mjs')).href);
  for (const kind of ['line', 'bar', 'area', 'donut']) if (!markup.includes(`data-chart="${kind}"`)) throw new Error(`consumer: ${kind} chart missing from rendered markup`);
  if (!markup.includes('stack-sparkline') || !markup.includes('$1,234.56')) throw new Error('consumer: sparkline or formatting missing');
  if (!staticHtml.startsWith('<figure class="stack-chart stack-chart--line"')) throw new Error('consumer: html renderer did not produce a chart');
  console.log(`consumer: server render OK (${markup.length} chars, 6 charts); static html renderer OK`);
} finally {
  if (keep) console.log(`kept ${dir}`); else rmSync(dir, { recursive: true, force: true });
}
