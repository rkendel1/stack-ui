#!/usr/bin/env node
// Packages the files a no-build product vendors (docs/adoption-plan.md §1):
//   release/stack-ui-static-<version>/{tokens.css, core.css, stack-ui-core.js,
//   stack-ui-core-stateless.js, VERSION, SHA256SUMS}
// and a .tar.gz of that directory. Run after `pnpm build`. Zero dependencies
// (tar from the system).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8')).version;
const tokensVersion = JSON.parse(readFileSync(join(root, 'packages/tokens/package.json'), 'utf8')).version;
if (version !== tokensVersion) throw new Error(`tokens ${tokensVersion} and core ${version} must release together`);

const name = `stack-ui-static-${version}`;
const out = join(root, 'release', name);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const files = {
  // The license travels with every copy (MIT, D38).
  'LICENSE': 'LICENSE',
  'tokens.css': 'packages/tokens/css/tokens.css',
  'core.css': 'packages/core/src/core.css',
  'stack-ui-core.js': 'packages/core/classic/stack-ui-core.js',
  // The same without the theme preference, for products that store nothing.
  'stack-ui-core-stateless.js': 'packages/core/classic/stack-ui-core-stateless.js',
  // Light-only tokens, for products drawn in one theme while they migrate.
  'tokens-light.css': 'packages/tokens/css/tokens-light.css',
  // Identity (docs/brand.md): the token source and the Boundry mark files.
  'brand/brand.json': 'packages/tokens/src/brand.json',
  'brand/boundry-mark.svg': 'packages/tokens/brand/boundry-mark.svg',
  'brand/boundry-mark-reversed.svg': 'packages/tokens/brand/boundry-mark-reversed.svg',
  'brand/boundry-favicon.svg': 'packages/tokens/brand/boundry-favicon.svg',
  // ES modules for sites built ahead of time in Node (html.js renders the
  // shared header and footer to HTML; docs/decisions.md D23).
  'esm/states.js': 'packages/core/src/states.js',
  'esm/brand.js': 'packages/core/src/brand.js',
  'esm/view.js': 'packages/core/src/view.js',
  'esm/html.js': 'packages/core/src/html.js',
  'esm/theme.js': 'packages/core/src/theme.js',
  // Run by every adopting build (docs/release.md, Conformance).
  'conformance.mjs': 'packages/core/bin/conformance.mjs',
};
for (const target of Object.keys(files)) mkdirSync(dirname(join(out, target)), { recursive: true });
for (const [target, source] of Object.entries(files)) copyFileSync(join(root, source), join(out, target));
// esm/ holds ES modules: say so, so Node loads them without guessing.
writeFileSync(join(out, 'esm/package.json'), '{ "type": "module" }\n');
files['esm/package.json'] = null;
writeFileSync(join(out, 'VERSION'), `${version}\n`);
const sums = Object.keys(files).sort()
  .map((file) => `${createHash('sha256').update(readFileSync(join(out, file))).digest('hex')}  ${file}`)
  .join('\n');
writeFileSync(join(out, 'SHA256SUMS'), `${sums}\n`);
execFileSync('tar', ['-czf', `${name}.tar.gz`, name], { cwd: join(root, 'release') });
console.log(`${out}\n${sums}`);
