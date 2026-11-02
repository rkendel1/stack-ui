// The conformance checker every Boundry build runs: a page built with the
// shared header, footer and theme passes; each kind of drift fails by name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { html } from '../../packages/core/src/html.js';
import { THEME_INIT_SCRIPT } from '../../packages/core/src/theme.js';
import { checkConformance } from '../../packages/core/bin/conformance.mjs';

const tokens = new URL('../../packages/tokens/css/tokens.css', import.meta.url).pathname;
const page = ({ product = 'feltdb', footer = true, theme = true, script = true, header = true } = {}) => `<!doctype html><html lang="en"${product ? ` data-stack-product="${product}"` : ''}><head>${script ? `<script>${THEME_INIT_SCRIPT}</script>` : ''}</head><body>
${header ? html.SiteHeader({ product: product ? { id: product } : undefined, theme: theme ? { preference: 'system' } : null }) : ''}
<main id="main"><h1>x</h1></main>
${footer ? html.SiteFooter({ product: product ? { id: product } : undefined, year: 2026 }) : ''}</body></html>`;

function site(pages, css) {
  const dir = mkdtempSync(join(tmpdir(), 'conformance-'));
  mkdirSync(join(dir, 'out'));
  for (const [name, body] of Object.entries(pages)) writeFileSync(join(dir, 'out', name), body);
  if (css) writeFileSync(join(dir, 'site.css'), css);
  return dir;
}

test('a product page built on the foundation passes', async () => {
  const dir = site({ 'index.html': page() }, '.hero { color: var(--stack-product-accent); }');
  assert.deepEqual(await checkConformance({ product: 'feltdb', html: [join(dir, 'out')], css: [join(dir, 'site.css')], headerFamily: true, tokens }), []);
});

test('the company site passes with --company', async () => {
  const dir = site({ 'index.html': page({ product: null }) });
  assert.deepEqual(await checkConformance({ company: true, html: [join(dir, 'out')], css: [], tokens }), []);
});

test('each kind of drift fails by name', async () => {
  const cases = [
    [page({ footer: false }), /SiteFooter/],
    [page({ theme: false }), /theme control/],
    [page({ script: false }), /pre-paint theme script/],
    [page({ header: false }), /header does not carry/],
    [page().replace(/ data-stack-product="feltdb"/g, ''), /data-stack-product="feltdb"/],
  ];
  for (const [body, expected] of cases) {
    const dir = site({ 'index.html': body });
    const failures = await checkConformance({ product: 'feltdb', html: [join(dir, 'out')], css: [], headerFamily: true, tokens });
    assert.ok(failures.some((f) => expected.test(f)), `${expected}: ${failures.join('; ')}`);
  }
});

test('product CSS may not redefine foundation tokens or restyle shared states', async () => {
  const dir = site({ 'index.html': page() }, ':root { --stack-color-action-primary-bg: hotpink; }\n.stack-status--critical .stack-status__glyph { color: green; }');
  const failures = await checkConformance({ product: 'feltdb', html: [join(dir, 'out')], css: [join(dir, 'site.css')], tokens });
  assert.ok(failures.some((f) => /redefines --stack-color-action-primary-bg/.test(f)));
  assert.ok(failures.some((f) => /restyles shared semantics/.test(f)));
});

test('the command line exits non-zero on failure and names an unknown product', () => {
  const dir = site({ 'index.html': page({ footer: false }) });
  const cli = new URL('../../packages/core/bin/conformance.mjs', import.meta.url).pathname;
  assert.throws(() => execFileSync('node', [cli, '--product', 'feltdb', '--html', join(dir, 'out'), '--tokens', tokens], { stdio: 'pipe' }), /SiteFooter/);
  assert.throws(() => execFileSync('node', [cli, '--product', 'nope', '--html', join(dir, 'out'), '--tokens', tokens], { stdio: 'pipe' }), /portfolio id/);
  const ok = site({ 'index.html': page() });
  assert.match(execFileSync('node', [cli, '--product', 'feltdb', '--html', join(ok, 'out'), '--tokens', tokens]).toString(), /passed/);
});

test('a missing footer is reported once, not once per product link', async () => {
  const dir = site({ 'index.html': page({ footer: false }) });
  const failures = await checkConformance({ product: 'feltdb', html: [join(dir, 'out')], css: [], tokens });
  assert.equal(failures.filter((f) => /SiteFooter|family|Boundry product|boundry\.company/.test(f)).length, 1, failures.join('\n'));
});

test('run through a symlinked bin (as npm installs it), failures still exit non-zero', async () => {
  const { symlinkSync } = await import('node:fs');
  const dir = site({ 'index.html': page({ footer: false }) });
  const link = join(dir, 'stack-ui-conformance');
  symlinkSync(new URL('../../packages/core/bin/conformance.mjs', import.meta.url).pathname, link);
  assert.throws(() => execFileSync('node', [link, '--product', 'feltdb', '--html', join(dir, 'out'), '--tokens', tokens], { stdio: 'pipe' }), /SiteFooter/);
});

test('pages rendered by React on the server pass (text nodes separated by comment markers)', async () => {
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { SiteHeader, SiteFooter } = await import('@stack-ui/react');
  const body = renderToString(createElement('div', null,
    createElement(SiteHeader, { product: { id: 'feltdb' }, theme: { preference: 'system' } }),
    createElement(SiteFooter, { product: { id: 'feltdb' }, year: 2026 })));
  assert.match(body, /<!-- -->/, 'the renderer emits comment markers this test is about');
  const dir = site({ 'index.html': `<!doctype html><html data-stack-product="feltdb"><head><script>${THEME_INIT_SCRIPT}</script></head><body>${body}</body></html>` });
  assert.deepEqual(await checkConformance({ product: 'feltdb', html: [join(dir, 'out')], css: [], headerFamily: true, tokens }), []);
});
