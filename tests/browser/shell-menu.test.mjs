// The Shell's opt-in narrow menu (`narrowNavigation: 'menu'`), in a real page
// that owns the open state and re-renders like a dom.js product: hidden behind
// a labelled button below 768px, unchanged above it; axe clean closed and open
// in both themes; keyboard: the button toggles, Escape closes and returns focus,
// following a link routes and closes; no horizontal page scroll. Products that
// do not opt in keep the strip (shell.test.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { assets } from './harness.mjs';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Shell menu test</title>
<style>${assets.tokens}</style><style>${assets.core}</style><style>body{margin:0}</style>
<script>${assets.script}</script></head><body><div id="host"><div id="app"></div></div><script>
'use strict';
const S = window.StackUI;
const params = new URLSearchParams(location.search);
window.state = { open: false, route: '#/chat', toggles: [] };
// ?below=1: the shell sits below the host's own content in a positioned container (an extension panel).
if (params.get('below')) { const host = document.getElementById('host'); host.style.position = 'relative'; const bar = document.createElement('div'); bar.id = 'host-bar'; bar.style.height = '120px'; bar.textContent = 'Host content'; host.before(bar); }
window.preference = S.initThemePreference(window);
const items = [
  { id: 'chat', label: 'Chat', href: '#/chat', order: 0 },
  { id: 'today', label: 'Today', href: '#/today', order: 1 },
  { id: 'tasks', label: 'Tasks', href: '#/tasks', order: 2 },
  { id: 'projects', label: 'Projects', href: '#/projects', group: 'More', order: 3 },
  { id: 'settings', label: 'Settings', href: '#/settings', group: 'More', order: 4 },
];
function render() {
  const app = document.getElementById('app');
  const page = document.createElement('div');
  page.append(S.dom.PageHeader({ title: state.route.slice(2) }));
  app.replaceChildren(S.dom.Shell({
    product: { name: 'PersonalOS', homeHref: '#/chat', mark: 'P' }, mainId: 'view',
    navigation: items.map((item) => ({ ...item, current: item.href === state.route })),
    ...(params.get('mode') === 'strip' ? {} : { narrowNavigation: 'menu' }),
    ...(params.get('toggle') === 'none' ? {} : {
      navigationOpen: state.open,
      onNavigationToggle: (open) => { state.toggles.push(open); state.open = open; render(); },
    }),
    onNavigate: (href) => { state.route = href; render(); S.focusMain('view'); },
    theme: { preference: window.preference, onChange: (value) => { window.preference = S.setThemePreference(value, window); } },
    children: page,
  }));
  // A re-render replaces the button: keep focus on it as a real product would.
  if (window.__refocus) { document.getElementById(window.__refocus)?.focus(); window.__refocus = null; }
}
render();
</script></body></html>`;

let server;
let origin;
let browser;
before(async () => {
  server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(PAGE);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function open({ width = 400, colorScheme = 'light', query = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/${query}`);
  await page.waitForSelector('.stack-shell');
  return { context, page, errors };
}

async function axe(page) {
  await page.addScriptTag({ content: assets.axe });
  const result = await page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const visible = (page, selector) => page.$eval(selector, (el) => {
  const box = el.getBoundingClientRect();
  return getComputedStyle(el).display !== 'none' && box.width > 0 && box.height > 0;
});
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [400, 320]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`menu at ${width}px (${colorScheme}): closed and open are axe clean, labelled, and never scroll sideways`, async () => {
      const { context, page, errors } = await open({ width, colorScheme });
      try {
        const button = page.getByRole('button', { name: 'Menu' });
        assert.equal(await button.getAttribute('aria-expanded'), 'false');
        assert.equal(await button.getAttribute('aria-controls'), 'view-nav');
        assert.equal(await visible(page, '.stack-shell__nav'), false, 'closed: the navigation is hidden');
        const size = await button.boundingBox();
        assert.ok(size.width >= 44 && size.height >= 44, `a 44px target (${size.width}x${size.height})`);
        assert.deepEqual(await axe(page), []);
        assert.ok((await overflow(page)) <= 0);

        await button.click();
        assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'true');
        assert.equal(await visible(page, '.stack-shell__nav'), true, 'open: the navigation is shown');
        const links = await page.$$eval('#view-nav a', (all) => all.map((a) => {
          const box = a.getBoundingClientRect();
          return { label: a.textContent, inside: box.width > 0 && box.left >= 0 && box.right <= window.innerWidth + 1 };
        }));
        assert.deepEqual(links.map((l) => l.label), ['Chat', 'Today', 'Tasks', 'Projects', 'Settings']);
        assert.ok(links.every((l) => l.inside), 'every link is on screen, stacked, not in a strip');
        assert.equal(await visible(page, '.stack-shell__nav-heading'), true, 'group headings are shown in the menu');
        assert.deepEqual(await axe(page), []);
        assert.ok((await overflow(page)) <= 0);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
}

test('keyboard: Enter on the button opens, Tab reaches the first link, Escape closes and returns focus to the button', async () => {
  const { context, page } = await open();
  try {
    await page.focus('#view-menu-button');
    await page.evaluate(() => { window.__refocus = 'view-menu-button'; });
    await page.keyboard.press('Enter');
    assert.equal(await page.getAttribute('#view-menu-button', 'aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'view-menu-button');
    // The bar's other controls come first; tab until the first navigation link.
    let reached = false;
    for (let i = 0; i < 8 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => document.activeElement.closest('#view-nav') !== null);
    }
    assert.ok(reached, 'the open navigation is in the tab order');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Chat');
    await page.keyboard.press('Escape');
    assert.equal(await page.getAttribute('#view-menu-button', 'aria-expanded'), 'false');
    assert.equal(await visible(page, '.stack-shell__nav'), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'view-menu-button', 'focus returns to the button');
    assert.deepEqual(await page.evaluate(() => window.state.toggles), [true, false]);
  } finally {
    await context.close();
  }
});

test('Escape on the menu button closes the open menu', async () => {
  const { context, page } = await open();
  try {
    await page.evaluate(() => { window.__refocus = 'view-menu-button'; });
    await page.click('#view-menu-button');
    assert.equal(await page.getAttribute('#view-menu-button', 'aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'view-menu-button');
    await page.keyboard.press('Escape');
    assert.equal(await page.getAttribute('#view-menu-button', 'aria-expanded'), 'false');
    assert.equal(await visible(page, '.stack-shell__nav'), false);
  } finally {
    await context.close();
  }
});

test('a shell placed below host content keeps its skip link hidden until it is focused', async () => {
  const { context, page } = await open({ query: '?below=1' });
  try {
    const hidden = () => page.$eval('.stack-shell__skip', (el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return box.width === 0 || box.height === 0 || getComputedStyle(el).clipPath === 'inset(50%)' || !el.contains(hit);
    });
    assert.ok(await hidden(), 'not shown over the host content');
    await page.focus('.stack-shell__skip');
    assert.equal(await page.$eval('.stack-shell__skip', (el) => getComputedStyle(el).clipPath), 'none', 'shown when focused');
  } finally {
    await context.close();
  }
});

test('following a link in the open menu routes, closes the menu and moves focus to the page', async () => {
  const { context, page } = await open();
  try {
    await page.click('#view-menu-button');
    await page.click('#view-nav >> text=Tasks');
    assert.equal(await page.evaluate(() => window.state.route), '#/tasks');
    assert.equal(await page.getAttribute('#view-menu-button', 'aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'view');
    await page.click('#view-menu-button');
    assert.equal(await page.getAttribute('#view-nav a[aria-current="page"]', 'href'), '#/tasks');
  } finally {
    await context.close();
  }
});

test('at desktop width the menu button is hidden and the navigation is the usual sidebar', async () => {
  for (const colorScheme of ['light', 'dark']) {
    const { context, page } = await open({ width: 1280, colorScheme });
    try {
      assert.equal(await visible(page, '#view-menu-button'), false);
      assert.equal(await visible(page, '.stack-shell__nav'), true);
      const nav = await page.$eval('.stack-shell__nav', (el) => el.getBoundingClientRect().width);
      assert.ok(nav >= 200 && nav <= 240, `sidebar width ${nav}`);
      assert.deepEqual(await axe(page), []);
    } finally {
      await context.close();
    }
  }
});

test('without opting in, or without a toggle, the narrow navigation stays the scrolling strip', async () => {
  for (const query of ['?mode=strip', '?toggle=none']) {
    const { context, page } = await open({ query });
    try {
      assert.equal(await page.$('.stack-shell__menu-button'), null, `${query}: no menu button`);
      assert.equal(await page.$eval('.stack-shell', (el) => el.className), 'stack-shell');
      assert.equal(await page.$eval('.stack-shell__nav-list', (el) => getComputedStyle(el).display), 'flex', `${query}: the strip`);
      assert.equal(await visible(page, '.stack-shell__nav'), true);
    } finally {
      await context.close();
    }
  }
});
