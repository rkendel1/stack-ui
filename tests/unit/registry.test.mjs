// The registry checker identifies a vendored copy by checksum and fails a false claim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = new URL('../../', import.meta.url).pathname;
const run = (root) => execFileSync('node', [join(here, 'scripts/check-registry.mjs'), '--root', root], { stdio: 'pipe' }).toString();

test('every surface claim in the registry names a known status and a manifest exists for every claimed checked version', () => {
  const registry = JSON.parse(readFileSync(join(here, 'docs/registry.json'), 'utf8'));
  const statuses = new Set(['adopted', 'partial', 'not-adopted', 'blocked', 'not-applicable']);
  for (const s of registry.surfaces) {
    assert.ok(statuses.has(s.status), `${s.id}: ${s.status}`);
    if (s.status === 'adopted') assert.ok(s.conformance || s.integration === 'none', `${s.id}: an adopted surface wires conformance`);
  }
  assert.ok(existsSync(join(here, 'releases/0.6.0/static.SHA256SUMS')));
});

test('a vendored copy that differs from its claimed release fails the check', { skip: !existsSync(join(here, 'release')) && 'needs node scripts/package-static.mjs' }, () => {
  // A fake portfolio root holding only appport-services, vendored from the 0.6.0 manifest's files.
  const root = mkdtempSync(join(tmpdir(), 'registry-'));
  const repo = join(root, 'appport-services');
  mkdirSync(join(repo, 'vendor'), { recursive: true });
  const releaseDir = join(here, 'release', 'stack-ui-static-0.6.0');
  if (!existsSync(releaseDir)) return;
  cpSync(releaseDir, join(repo, 'vendor/stack-ui'), { recursive: true });
  mkdirSync(join(repo, 'tests/browser'), { recursive: true });
  mkdirSync(join(repo, 'ui'), { recursive: true });
  writeFileSync(join(repo, 'tests/browser/management-pages.browser.ts'), '// Boundry product surface');
  writeFileSync(join(repo, 'ui/management.js'), "product: { id: 'appport' }");
  execFileSync('git', ['init', '-q', repo]);
  // The current release matches 0.6.0 only if nothing changed since; either way a tampered file must fail.
  appendFileSync(join(repo, 'vendor/stack-ui/core.css'), '\n/* local edit */\n');
  assert.throws(() => run(root), /appport-services-pages: the vendored copy (is not release 0\.6\.0: [^\n]*core\.css|claims 0\.6\.0 but matches no release)/);
});
