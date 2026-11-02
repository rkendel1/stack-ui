// The logos in assets/brand are exactly what sources.json records.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = new URL('../../', import.meta.url).pathname;

test('every logo matches sources.json and every product has a logo', () => {
  assert.match(execFileSync('node', [join(here, 'scripts/check-brand-assets.mjs')]).toString(), /verified/);
  const sources = JSON.parse(execFileSync('cat', [join(here, 'assets/brand/sources.json')]).toString());
  const products = new Set(sources.products.map((p) => p.product));
  for (const id of ['feltdb', 'feltkit', 'appboundry', 'authboundry', 'appport']) assert.ok(products.has(id), `${id} has a logo`);
});

test('a changed or unlisted logo fails the check', () => {
  const copy = mkdtempSync(join(tmpdir(), 'brand-assets-'));
  cpSync(join(here, 'assets'), join(copy, 'assets'), { recursive: true });
  cpSync(join(here, 'scripts/check-brand-assets.mjs'), join(copy, 'scripts/check-brand-assets.mjs'));
  appendFileSync(join(copy, 'assets/brand/products/feltkit/feltkit-mark.png'), 'x');
  writeFileSync(join(copy, 'assets/brand/products/feltkit/stray.png'), 'x');
  const run = () => execFileSync('node', [join(copy, 'scripts/check-brand-assets.mjs')], { stdio: 'pipe' });
  assert.throws(run, (error) => /feltkit-mark\.png: differs/.test(error.stderr) && /stray\.png: not listed/.test(error.stderr));
});
