// The conformance checker every Boundry build runs: a page built with the
// shared header, footer and theme passes; each kind of drift fails by name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
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

// ---- Applications (--app): the Shell, not the website header and footer ----------------

const shellPage = (props = {}, { product = 'appboundry', script = true, extra = '' } = {}) => `<!doctype html><html lang="en" data-stack-product="${product}"><head>${script ? `<script>${THEME_INIT_SCRIPT}</script>` : ''}</head><body>
${html.Shell({ product: { id: product, name: 'AppBoundry', homeHref: '/' }, theme: { preference: 'system' }, navigation: [{ label: 'Applications', href: '/apps', current: true }], children: 'Applications', ...props })}
${extra}</body></html>`;
const app = (body) => site({ 'index.html': body });
const checkApp = (dir, extra = {}) => checkConformance({ product: 'appboundry', app: true, html: [join(dir, 'out')], css: [], tokens, ...extra });
const coreBuild = readFileSync(new URL('../../packages/core/classic/stack-ui-core.js', import.meta.url), 'utf8');

test('an application in the shared Shell passes --app with no SiteFooter', async () => {
  assert.deepEqual(await checkApp(app(shellPage())), []);
  // The same page is not a website: site mode still asks for the family footer.
  const dir = app(shellPage());
  const file = join(dir, 'out', 'index.html');
  assert.deepEqual(await checkConformance({ product: 'appboundry', html: [join(dir, 'out')], css: [], tokens }),
    [`${file}: missing the shared SiteFooter (the Boundry family footer): render SiteFooter({ product: { id } })`]);
});

test('the Shell theme control carries data-stack-theme-control in the view, html and React bindings', async () => {
  assert.match(html.Shell({ product: { id: 'appboundry', name: 'AppBoundry' }, theme: { preference: 'dark' } }),
    /<select class="stack-shell__theme" id="stack-main-theme" data-stack-theme-control="">/);
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { Shell } = await import('@stack-ui/react');
  const body = renderToString(createElement(Shell, { product: { id: 'authboundry', name: 'AuthBoundry' }, theme: { preference: 'system', onChange() {} }, navigation: [] }, 'Portal'));
  assert.match(body, /<select class="stack-shell__theme" id="stack-main-theme" data-stack-theme-control=""/);
  // A server-rendered React Shell (text split by <!-- --> markers) passes --app.
  const dir = app(`<!doctype html><html data-stack-product="authboundry"><head><script>${THEME_INIT_SCRIPT}</script></head><body>${body}</body></html>`);
  assert.deepEqual(await checkConformance({ product: 'authboundry', app: true, html: [join(dir, 'out')], css: [], tokens }), []);
});

test('an inlined stack-ui-core.js or theme script does not count as a theme control (site and app modes)', async () => {
  assert.ok(coreBuild.includes('data-stack-theme-control'), 'the classic build names the attribute this test is about');
  const inlined = `<script>${coreBuild}</script><script>document.querySelectorAll('[data-stack-theme-control]')</script>`;
  // A Shell rendered without a theme control, in a page that inlines the foundation build.
  const appBody = shellPage({ theme: null }, { extra: inlined });
  const appFailures = await checkApp(app(appBody));
  assert.equal(appFailures.length, 1, appFailures.join('\n'));
  assert.match(appFailures[0], /missing the shared theme control.*an inlined script does not count/);
  const siteBody = page({ theme: false }).replace('</body>', `${inlined}</body>`);
  const siteFailures = await checkConformance({ product: 'feltdb', html: [join(site({ 'index.html': siteBody }), 'out')], css: [], headerFamily: true, tokens });
  assert.equal(siteFailures.length, 1, siteFailures.join('\n'));
  assert.match(siteFailures[0], /missing the shared theme control/);
  // Nor does the attribute's name in a comment, a template, another attribute's value, or a non-control.
  for (const decoy of [
    '<!-- <select data-stack-theme-control></select> -->',
    '<template><select data-stack-theme-control=""></select></template>',
    '<p title="data-stack-theme-control">Theme</p>',
    '<div data-stack-theme-control=""></div>',
  ]) {
    const failures = await checkApp(app(shellPage({ theme: null }, { extra: decoy })));
    assert.ok(failures.some((f) => /theme control/.test(f)), decoy);
  }
});

test('a product frame marked data-stack-shell, with a theme control, <main> and the family link, passes --app', async () => {
  const frame = (parts) => `<!doctype html><html lang="en" data-stack-product="appboundry"><head><script>${THEME_INIT_SCRIPT}</script></head><body>
<div class="portal" data-stack-shell>${parts}</div></body></html>`;
  const theme = html.ThemeSwitch({ id: 'portal-theme', preference: 'system' });
  const family = '<a class="boundry-family" href="https://boundry.company" title="AppBoundry is a Boundry product"><span>A Boundry product</span></a>';
  const main = '<main id="main">Deployments</main>';
  assert.deepEqual(await checkApp(app(frame(theme + family + main))), []);
  const cases = [
    [frame(theme + family + main).replace(' data-stack-shell', ''), /missing the app shell/],
    [frame(theme + family + '<div id="main">x</div>'), /no <main> landmark/],
    [frame(theme + main + '<a href="https://boundry.company">Boundry</a>'), /does not carry "A Boundry product"/],
    [frame(theme + main + '<a href="https://example.com">A Boundry product</a>'), /does not carry "A Boundry product"/],
    [frame(family + main), /theme control/],
    [frame(theme + family + main).replace(`<script>${THEME_INIT_SCRIPT}</script>`, ''), /pre-paint theme script/],
    [frame(theme + family + main).replace(' data-stack-product="appboundry"', ''), /data-stack-product="appboundry"/],
  ];
  for (const [body, expected] of cases) {
    const failures = await checkApp(app(body));
    assert.ok(failures.some((f) => expected.test(f)), `${expected}: ${failures.join('; ')}`);
  }
});

test('a Shell without the Boundry family fails --app', async () => {
  const failures = await checkApp(app(shellPage({ family: false })));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0], /does not carry "A Boundry product" linking to https:\/\/boundry\.company/);
});

test('--app on the command line; --app with --company is refused', async () => {
  const cli = new URL('../../packages/core/bin/conformance.mjs', import.meta.url).pathname;
  const ok = app(shellPage());
  assert.match(execFileSync('node', [cli, '--product', 'appboundry', '--app', '--html', join(ok, 'out'), '--tokens', tokens]).toString(), /passed/);
  const bad = app(shellPage({ theme: null }));
  assert.throws(() => execFileSync('node', [cli, '--product', 'appboundry', '--app', '--html', join(bad, 'out'), '--tokens', tokens], { stdio: 'pipe' }), /theme control/);
  assert.deepEqual(await checkConformance({ company: true, app: true, html: [join(ok, 'out')], css: [], tokens }),
    ['arguments: --app is for a product application; the company site has no app mode']);
});
