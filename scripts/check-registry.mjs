#!/usr/bin/env node
// Checks the portfolio adoption registry (docs/registry.json) against checkouts of the
// product repositories, and regenerates its table in docs/adoption-report.md.
//
//   node scripts/check-registry.mjs --root <dir containing the product repositories> [--write]
//
// For every surface with a vendored copy it identifies the release the copy actually is,
// by checksum against releases/<version>/{static,packages}.SHA256SUMS (a version string
// alone does not identify bytes), and checks the claimed version, the build-time
// conformance wiring and the declared product id. A claim that disagrees with the
// repository fails the check. Without a manifest for a version (releases before 0.6.0)
// the VERSION or package.json version is reported as "unverified".
// Zero dependencies.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : join(here, '..'));
const write = args.includes('--write');
const registry = JSON.parse(readFileSync(join(here, 'docs/registry.json'), 'utf8'));

const parse = (text) => new Map(text.trim().split('\n').filter(Boolean).map((line) => {
  const [digest, path] = line.split(/\s+/);
  return [path, digest];
}));
const manifests = existsSync(join(here, 'releases')) ? readdirSync(join(here, 'releases')).map((version) => ({
  version,
  static: parse(readFileSync(join(here, 'releases', version, 'static.SHA256SUMS'), 'utf8')),
  packages: parse(readFileSync(join(here, 'releases', version, 'packages.SHA256SUMS'), 'utf8')),
})) : [];

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/// Which release a vendored directory is: every file in the release manifest present and
/// identical, except files the registry explicitly records as known differences.
function identify(dir, integration, known = []) {
  const kind = integration === 'static' ? 'static' : 'packages';
  const candidates = [];
  for (const manifest of manifests) {
    const differs = [];
    let present = 0;
    for (const [path, digest] of manifest[kind]) {
      const file = join(dir, path);
      // A static release may be vendored in part (a product copies only the files it serves);
      // every file it does carry must be the release's. Vendored packages must be complete.
      if (!existsSync(file)) { if (kind === 'packages') differs.push(path); continue; }
      present += 1;
      if (sha(file) !== digest) differs.push(path);
    }
    if (!present) continue;
    candidates.push({ version: manifest.version, differs, unexplained: differs.filter((path) => !known.includes(path)), size: manifest[kind].size });
  }
  // An exact match (every difference explained) wins over any near match; otherwise report
  // the closest release, with the files that differ.
  // Files that did not change between releases match several of them: then the copy's own
  // VERSION decides, if it is one of the matches; otherwise the newest match.
  const exacts = candidates.filter((c) => !c.unexplained.length);
  if (exacts.length) {
    const versionFile = join(dir, integration === 'static' ? 'VERSION' : 'core/package.json');
    const claimed = existsSync(versionFile)
      ? (integration === 'static' ? readFileSync(versionFile, 'utf8').trim() : JSON.parse(readFileSync(versionFile, 'utf8')).version)
      : null;
    const newest = (a, b) => b.version.localeCompare(a.version, undefined, { numeric: true });
    const exact = exacts.find((c) => c.version === claimed) || exacts.sort(newest)[0];
    return { version: exact.version, differs: exact.differs };
  }
  const near = candidates.filter((c) => c.unexplained.length < c.size / 2).sort((a, b) => a.unexplained.length - b.unexplained.length)[0];
  if (near) return { version: near.version, differs: near.differs, unexplained: near.unexplained };
  const versionFile = integration === 'static' ? join(dir, 'VERSION') : join(dir, 'core/package.json');
  const claimed = existsSync(versionFile)
    ? (integration === 'static' ? readFileSync(versionFile, 'utf8').trim() : JSON.parse(readFileSync(versionFile, 'utf8')).version)
    : null;
  return { version: claimed, unverified: true, differs: [] };
}

const failures = [];
const rows = [];
for (const s of registry.surfaces) {
  const repo = join(root, s.repo);
  const present = existsSync(repo);
  let commit = '—';
  let observed = '—';
  let conformance = s.conformance ? 'claimed' : 'none';
  if (present) {
    try { commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch { commit = 'not a git checkout'; }
    if (s.vendor) {
      const dir = join(repo, s.vendor);
      if (!existsSync(dir)) failures.push(`${s.id}: vendored copy not found at ${s.repo}/${s.vendor}`);
      else {
        const found = identify(dir, s.integration, s.knownDifferences || []);
        observed = found.unverified ? `${found.version ?? '?'} (no manifest: unverified)` : `${found.version}${found.differs.length ? ` (differs: ${found.differs.join(', ')})` : ''}`;
        if (found.unexplained) {
          failures.push(`${s.id}: the vendored copy is not release ${found.version}: ${found.unexplained.join(', ')} differ (modified, or a different build): re-vendor the release, or record them in knownDifferences`);
        } else if (found.unverified && manifests.some((m) => m.version === found.version)) {
          failures.push(`${s.id}: the vendored copy claims ${found.version} but matches no release manifest: re-vendor the release`);
        } else if (found.version !== s.version) {
          failures.push(`${s.id}: registry says ${s.version}, the repository has ${found.version ?? 'an unknown copy'}`);
        }
      }
    }
    if (s.conformance) {
      const file = join(repo, s.conformance.file);
      const wired = existsSync(file) && readFileSync(file, 'utf8').includes(s.conformance.contains);
      conformance = wired ? 'wired' : 'MISSING';
      if (!wired) failures.push(`${s.id}: conformance not wired (${s.conformance.file} should contain "${s.conformance.contains}")`);
    }
    if (s.product && s.productIn) {
      const file = join(repo, s.productIn);
      if (!existsSync(file) || !readFileSync(file, 'utf8').includes(`data-stack-product="${s.product}"`) && !readFileSync(file, 'utf8').includes(`id: '${s.product}'`)) {
        failures.push(`${s.id}: ${s.productIn} does not declare product ${s.product}`);
      }
    }
  } else if (s.status !== 'not-applicable') {
    commit = 'checkout not found';
  }
  rows.push(`| ${s.surface} | \`${s.repo}\` | **${s.status}** | ${observed} | ${s.integration} | ${commit} | ${conformance} | ${s.themes || '—'} | ${s.accessibility || '—'} | ${s.responsive || '—'} | ${s.baseline || '—'} | ${s.remaining || '—'} |`);
}

const table = [
  '<!-- registry:start (generated by scripts/check-registry.mjs from docs/registry.json; do not edit) -->',
  '| Surface | Repository | Status | Foundation (verified by checksum) | Integration | Checked commit | Build conformance | Themes | Accessibility | Responsive | Baseline issues | Remaining |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows,
  '<!-- registry:end -->',
].join('\n');

const counts = registry.surfaces.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});
console.log(`registry: ${registry.surfaces.length} surfaces · ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ')}`);
if (write) {
  const reportPath = join(here, 'docs/adoption-report.md');
  const report = readFileSync(reportPath, 'utf8');
  const next = report.replace(/<!-- registry:start[\s\S]*?registry:end -->/, table);
  if (next === report && !report.includes('registry:start')) throw new Error('docs/adoption-report.md has no registry markers');
  writeFileSync(reportPath, next);
  console.log('docs/adoption-report.md: registry table regenerated');
}
if (failures.length) {
  console.error(`registry check failed (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('registry check: every claim matches the repositories');
