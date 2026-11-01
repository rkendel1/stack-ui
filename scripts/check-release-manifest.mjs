#!/usr/bin/env node
// A version's contents never change once recorded: the build must match
// releases/<version>/{static,packages}.SHA256SUMS. A change to released files needs a
// new version (then `node scripts/release-manifest.mjs` records it). Run after
// `pnpm build` and `node scripts/package-static.mjs`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8')).version;
const dir = join(root, 'releases', version);
if (!existsSync(dir)) {
  console.error(`releases/${version} is missing: run node scripts/release-manifest.mjs to record this version's contents`);
  process.exit(1);
}
const vendored = mkdtempSync(join(tmpdir(), 'stack-ui-check-'));
execFileSync('node', [join(root, 'scripts/vendor-packages.mjs'), vendored], { stdio: 'ignore' });
const pairs = [
  ['static', readFileSync(join(root, 'release', `stack-ui-static-${version}`, 'SHA256SUMS'), 'utf8')],
  ['packages', readFileSync(join(vendored, 'SHA256SUMS'), 'utf8')],
];
rmSync(vendored, { recursive: true, force: true });
const failures = [];
for (const [kind, built] of pairs) {
  const recorded = readFileSync(join(dir, `${kind}.SHA256SUMS`), 'utf8');
  if (built !== recorded) {
    const want = new Set(recorded.trim().split('\n'));
    const changed = built.trim().split('\n').filter((line) => !want.has(line)).map((line) => line.split(/\s+/)[1]);
    failures.push(`${kind}: ${changed.join(', ') || 'files removed'} differ from releases/${version}/${kind}.SHA256SUMS`);
  }
}
if (failures.length) {
  console.error(`Release ${version} would not match what was recorded for it:\n  ${failures.join('\n  ')}\nBump the version of all three packages and record the new release.`);
  process.exit(1);
}
console.log(`release ${version}: the build matches its recorded manifest`);
