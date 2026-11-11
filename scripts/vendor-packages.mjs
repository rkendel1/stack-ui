#!/usr/bin/env node
// Vendors the three packages into a product, unmodified, until they are published to
// npm (docs/decisions.md D9): `npm pack` of each package, unpacked into
// <target>/{tokens,core,react}, with SHA256SUMS over every file. The product depends on
// them with `file:` paths and checks SHA256SUMS in its build or tests.
//   node scripts/vendor-packages.mjs <product>/vendor/stack-ui
// Run `pnpm build` first. A README.md already in the target is kept.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!target) { console.error('usage: node scripts/vendor-packages.mjs <target directory>'); process.exit(2); }
const out = resolve(target);
const packed = mkdtempSync(join(tmpdir(), 'stack-ui-pack-'));
const versions = new Set();
for (const name of ['tokens', 'core', 'react']) {
  const dir = join(root, 'packages', name);
  versions.add(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version);
  const file = execFileSync('pnpm', ['pack', '--pack-destination', packed], { cwd: dir }).toString().trim().split('\n').pop();
  rmSync(join(out, name), { recursive: true, force: true });
  mkdirSync(join(out, name), { recursive: true });
  // -m: give the files the current time. With the archive's times, a re-vendored file of the same
  // size can look unchanged to git's stat cache and the old bytes stay committed.
  execFileSync('tar', ['-xzmf', resolve(dir, file), '-C', join(out, name), '--strip-components=1']);
}
rmSync(packed, { recursive: true, force: true });
if (versions.size !== 1) throw new Error(`packages must release together: ${[...versions].join(', ')}`);
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const sums = walk(out)
  .map((file) => relative(out, file).split('\\').join('/'))
  .filter((file) => file !== 'SHA256SUMS' && file !== 'README.md')
  .sort()
  .map((file) => `${createHash('sha256').update(readFileSync(join(out, file))).digest('hex')}  ${file}`);
writeFileSync(join(out, 'SHA256SUMS'), `${sums.join('\n')}\n`);
console.log(`vendored @stack-ui ${[...versions][0]} into ${out}: ${sums.length} files`);
