#!/usr/bin/env node
// Verifies the product logos in assets/brand (sources.json): every listed file exists and
// matches its recorded sha256, and no unlisted image sits in assets/brand/products. With
// --root <dir with the product checkouts>, it also reports any original whose source in its
// product repository has changed, so stack-ui's copy can be refreshed. Zero dependencies.
//   node scripts/check-brand-assets.mjs [--root <dir>]
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(here, 'assets/brand');
const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
const root = rootIndex >= 0 ? resolve(args[rootIndex + 1]) : null;
const sources = JSON.parse(readFileSync(join(assets, 'sources.json'), 'utf8'));
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

const failures = [];
const notes = [];
const listed = new Set();
for (const entry of sources.products) {
  const file = join(assets, entry.file);
  listed.add(entry.file);
  if (!existsSync(file)) { failures.push(`${entry.file}: missing`); continue; }
  if (sha(file) !== entry.sha256) failures.push(`${entry.file}: differs from its recorded sha256 (update sources.json only together with the file)`);
  if (entry.origin === 'original' && root) {
    const [repo, path] = entry.source.split(/:(.*)/s);
    const at = join(root, repo, path);
    if (!existsSync(at)) notes.push(`${entry.file}: source ${entry.source} not found under ${root}`);
    else if (sha(at) !== entry.sha256) failures.push(`${entry.file}: ${entry.source} has changed in ${repo}; copy the new logo here and update sources.json`);
  }
}
for (const name of sources.boundry.files) if (!existsSync(join(assets, name))) failures.push(`${name}: missing (node scripts/render-brand-png.mjs)`);
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
for (const file of walk(join(assets, 'products'))) {
  const rel = relative(assets, file).split('\\').join('/');
  if (!listed.has(rel)) failures.push(`${rel}: not listed in sources.json`);
}
for (const note of notes) console.log(`note: ${note}`);
if (failures.length) {
  console.error(`brand assets check failed (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`brand assets: ${sources.products.length} product logos and ${sources.boundry.files.length} Boundry files verified${root ? ', originals match their product repositories' : ''}`);
