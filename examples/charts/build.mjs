#!/usr/bin/env node
// Builds the chart showcase into one self-contained page: examples/charts/dist/index.html.
// It imports only @stack-ui/react's public exports (resolved through the
// workspace exactly as a product resolves the packages).
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const read = (spec) => readFileSync(require.resolve(spec), 'utf8');
const { THEME_INIT_SCRIPT } = await import('@stack-ui/core/theme');
// The version of the core the page was built with (its package.json sits two levels above src/theme.js).
const version = JSON.parse(readFileSync(join(dirname(require.resolve('@stack-ui/core/theme')), '..', 'package.json'), 'utf8')).version;

const bundled = await build({
  entryPoints: [join(here, 'showcase.jsx')], bundle: true, write: false, format: 'iife', platform: 'browser',
  jsx: 'automatic', minify: true, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning',
});
const script = bundled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Charts · Stack UI ${version}</title>
<script>${THEME_INIT_SCRIPT}</script>
<style>${read('@stack-ui/tokens/tokens.css')}</style>
<style>${read('@stack-ui/core/core.css')}</style>
<style>${readFileSync(join(here, 'showcase.css'), 'utf8')}</style>
</head>
<body>
<div id="root"></div>
<script>${script}</script>
</body>
</html>
`;
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'index.html'), page);
console.log(`showcase: examples/charts/dist/index.html (${Math.round(page.length / 1024)} KB, stack-ui ${version})`);
