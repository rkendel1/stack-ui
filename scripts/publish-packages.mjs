#!/usr/bin/env node
// Publishes @stack-ui/tokens, core and react to npm at the version in packages/core.
//   npm run publish:packages              build, verify, then publish
//   npm run publish:packages -- --dry-run do everything except upload
// The token comes from NPM_TOKEN in the environment or .env.local (never written to disk
// outside a temporary npmrc that is deleted afterwards). Provenance needs CI, so local
// publishes have none; the tag-triggered release workflow adds it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry-run');
const order = ['tokens', 'core', 'react'];
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const out = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts }).trim();
const fail = (m) => { console.error(`publish:packages: ${m}`); process.exit(1); };

let token = process.env.NPM_TOKEN;
const envFile = join(root, '.env.local');
if (!token && existsSync(envFile)) {
  const m = readFileSync(envFile, 'utf8').match(/^NPM_TOKEN=(.*)$/m);
  if (m) token = m[1].trim().replace(/^["']|["']$/g, '');
}
if (!token) fail('NPM_TOKEN is not set (environment or .env.local)');

const pkgs = order.map((n) => JSON.parse(readFileSync(join(root, 'packages', n, 'package.json'), 'utf8')));
const version = pkgs[0].version;
if (pkgs.some((p) => p.version !== version)) fail('the three packages are not at the same version');
if (pkgs.some((p) => p.license === 'UNLICENSED')) fail('a package is still UNLICENSED');
if (out('git', ['status', '--porcelain', '--untracked-files=no'])) fail('the working tree has uncommitted changes: commit first');

const tmp = mkdtempSync(join(tmpdir(), 'stack-ui-publish-'));
const npmrc = join(tmp, 'npmrc');
writeFileSync(npmrc, `//registry.npmjs.org/:_authToken=${token}\n`, { mode: 0o600 });
const env = { ...process.env, NPM_CONFIG_USERCONFIG: npmrc };
try {
  console.log(`npm user: ${out('npm', ['whoami'], { env })}`);
  const todo = [];
  for (const p of pkgs) {
    let published = '';
    try { published = out('npm', ['view', `${p.name}@${version}`, 'version'], { env, stdio: ['ignore', 'pipe', 'ignore'] }); } catch {}
    if (published) console.log(`${p.name}@${version} is already on npm: skipped`);
    else todo.push(p.name.split('/')[1]);
  }
  if (!todo.length) fail(`everything at ${version} is already published; bump the version`);
  run('pnpm', ['build']);
  run('node', ['scripts/check-boundary.mjs']);
  run('pnpm', ['check:release']);
  for (const n of todo) {
    console.log(`\n${dry ? 'dry run: ' : ''}publishing @stack-ui/${n}@${version}`);
    run('pnpm', ['publish', '--access', 'public', '--no-git-checks', ...(dry ? ['--dry-run'] : [])], { cwd: join(root, 'packages', n), env });
  }
  console.log(dry ? '\nDry run complete: nothing was uploaded.' : `\nPublished ${todo.map((n) => `@stack-ui/${n}`).join(', ')} at ${version}.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
