#!/usr/bin/env node
// Records what a release contains, so any product's vendored copy can be identified by
// checksum rather than by the version string it claims (scripts/check-registry.mjs):
//   releases/<version>/static.SHA256SUMS    the static release (package-static.mjs)
//   releases/<version>/packages.SHA256SUMS  the vendored packages (vendor-packages.mjs)
// Run after `pnpm build` and `node scripts/package-static.mjs`.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8')).version;
const dir = join(root, 'releases', version);
mkdirSync(dir, { recursive: true });
copyFileSync(join(root, 'release', `stack-ui-static-${version}`, 'SHA256SUMS'), join(dir, 'static.SHA256SUMS'));
const vendored = mkdtempSync(join(tmpdir(), 'stack-ui-manifest-'));
execFileSync('node', [join(root, 'scripts/vendor-packages.mjs'), vendored], { stdio: 'ignore' });
copyFileSync(join(vendored, 'SHA256SUMS'), join(dir, 'packages.SHA256SUMS'));
rmSync(vendored, { recursive: true, force: true });
console.log(`releases/${version}: static.SHA256SUMS, packages.SHA256SUMS`);
