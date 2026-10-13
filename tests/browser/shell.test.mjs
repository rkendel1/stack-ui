// The shell and the interactive components in a real page served from a real
// origin: skip link, current page, theme preference that persists, tabs,
// table sorting and row selection, filters and pagination by keyboard, and
// axe at 1280px, 640px (1280px at 200% zoom) and 320px (400% zoom).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { assets, CANONICAL } from './harness.mjs';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Shell test</title>
<style>${assets.tokens}</style><style>${assets.core}</style><style>body{margin:0} main{max-width:1180px;margin:0 auto}</style>
<script>${assets.script}</script></head><body><div id="app"></div><script>${CANONICAL}
'use strict';
const S = window.StackUI;
window.calls = [];
const record = (name) => (...args) => window.calls.push([name, ...args.filter((a) => typeof a !== 'object')]);
window.preference = S.initThemePreference(window);
const content = document.createElement('div');
content.append(
  S.dom.Breadcrumbs({ items: [{ label: 'Environments', href: '#/environments' }, { label: 'preprod' }] }),
  S.dom.PageHeader({ title: 'preprod', eyebrow: 'Environment' }),
  // A row whose content is wider than a phone: it must scroll in place, not widen the page.
  (() => { const wide = document.createElement('div'); wide.style.display = 'flex'; wide.style.overflowX = 'auto'; for (let i = 0; i < 12; i += 1) { const b = document.createElement('button'); b.type = 'button'; b.textContent = "Action " + i; b.style.flex = '0 0 auto'; wide.append(b); } return wide; })(),
  S.dom.Tabs({ label: 'Sections', idPrefix: 'env', active: 'overview', panelId: 'env-panel', onSelect: record('tab'),
    tabs: [{ id: 'overview', label: 'Overview' }, { id: 'logs', label: 'Logs' }, { id: 'receipts', label: 'Receipts', disabled: true }, { id: 'events', label: 'Events' }] }),
  S.dom.TabPanel({ id: 'env-panel', idPrefix: 'env', active: 'overview', children: [
    S.dom.FilterBar({ label: 'Filter deployments', idPrefix: 'deploy', applied: 1, result: '2 deployments match',
      onSubmit: record('submit'), onClear: record('clear'), onChange: record('change'),
      filters: [{ id: 'status', label: 'Status', type: 'select', value: '', options: [{ value: '', label: 'Any status' }, 'active', 'failed'] },
        { id: 'project', label: 'Project', value: '' }] }),
    S.dom.DataTable({ label: 'Deployments', sort: { column: 'when', direction: 'descending' }, onSort: record('sort'),
      columns: [{ id: 'project', header: 'Project', sortable: true }, { id: 'status', header: 'Status' }, { id: 'when', header: 'When', sortable: true }],
      rows: [
        { key: 'web', cells: { project: 'web', status: S.dom.StatusIndicator({ field: 'compute.deployment.status', value: 'active' }), when: '2 minutes ago' }, onSelect: () => window.calls.push(['row', 'web']), selected: true, attrs: { 'data-row': 'web' } },
        { key: 'api', cells: { project: 'api', status: S.dom.StatusIndicator({ field: 'compute.deployment.status', value: 'rolled_back' }), when: '1 hour ago' }, onSelect: () => window.calls.push(['row', 'api']), attrs: { 'data-row': 'api' } },
      ] }),
    S.dom.Pagination({ summary: '2 shown', hasPrevious: false, hasNext: true, onPrevious: record('previous'), onNext: record('next') }),
  ] }),
);
document.getElementById('app').append(S.dom.Shell({
  product: { name: 'Compute', homeHref: '#/', mark: 'C' }, mainId: 'view',
  navigation: [
    { id: 'home', label: 'Home', href: '#/', order: 0 },
    { id: 'envs', label: 'Environments', href: '#/environments', group: 'Manage', order: 1, current: true },
    { id: 'domains', label: 'Domains', href: '#/domains', group: 'Manage', order: 2 },
    { id: 'services', label: 'Services', href: '#/services', group: 'Manage', order: 3 },
  ],
  activityHref: '#/events', otherProducts: [{ id: 'feltdb', name: 'FeltDB Studio', href: 'https://studio.example' }],
  account: (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'stack-button stack-button--ghost stack-button--sm'; b.textContent = 'Token'; return b; })(),
  theme: { preference: window.preference, onChange: (value) => { window.preference = S.setThemePreference(value, window); } },
  children: content,
}));
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

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width || 1280, height: 900 }, colorScheme: options.colorScheme || 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/`);
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

for (const width of [1280, 640, 320]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`shell at ${width}px (${colorScheme}): axe clean, no horizontal page scroll, navigation reachable`, async () => {
      const { context, page, errors } = await open({ width, colorScheme });
      try {
        assert.deepEqual(await axe(page), []);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 0, `page overflows by ${overflow}px`);
        // Every navigation link can be reached (by scrolling the nav strip on narrow screens).
        const reachable = await page.$$eval('.stack-shell__nav a', (links) => links.every((link) => {
          link.scrollIntoView();
          const box = link.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && box.right <= window.innerWidth + 1;
        }));
        assert.ok(reachable, 'every navigation link is reachable');
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
}

test('the skip link is the first stop and moves focus to the main landmark without changing the route', async () => {
  const { context, page } = await open();
  try {
    // A hash-routed product: following "#view" as a link would change the route.
    await page.evaluate(() => { location.hash = '#/environments/preprod'; });
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'stack-shell__skip');
    assert.ok(await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0), 'the skip link is visible when focused');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'view');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'MAIN');
    assert.equal(await page.evaluate(() => location.hash), '#/environments/preprod', 'the route is unchanged');
  } finally {
    await context.close();
  }
});

test('exactly one navigation item is the current page', async () => {
  const { context, page } = await open();
  try {
    const current = await page.$$eval('.stack-shell__nav [aria-current="page"]', (nodes) => nodes.map((n) => n.textContent));
    assert.deepEqual(current, ['Environments']);
    assert.equal(await page.getAttribute('.stack-shell__nav', 'aria-label'), 'Compute navigation');
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.locator('header.stack-shell__bar').count(), 1);
  } finally {
    await context.close();
  }
});

test('the theme preference applies at once, persists across reloads, and system follows the OS again', async () => {
  const { context, page } = await open({ colorScheme: 'light' });
  try {
    const surface = () => page.evaluate(() => getComputedStyle(document.querySelector('.stack-shell__bar')).backgroundColor);
    assert.equal(await surface(), 'rgb(255, 255, 255)');
    await page.selectOption('#view-theme', 'dark');
    assert.equal(await page.getAttribute('html', 'data-stack-theme'), 'dark');
    assert.notEqual(await surface(), 'rgb(255, 255, 255)');
    await page.reload();
    await page.waitForSelector('.stack-shell');
    assert.equal(await page.getAttribute('html', 'data-stack-theme'), 'dark', 'the choice survives a reload');
    assert.equal(await page.inputValue('#view-theme'), 'dark', 'the control shows the stored choice');
    await page.selectOption('#view-theme', 'system');
    assert.equal(await page.getAttribute('html', 'data-stack-theme'), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('stack-ui.theme')), null);
    assert.equal(await surface(), 'rgb(255, 255, 255)');
  } finally {
    await context.close();
  }
});

test('a page whose storage throws still starts, and the theme control still works for the session', async () => {
  const { context, page, errors } = await open();
  try {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    await page.reload();
    await page.waitForSelector('.stack-shell');
    assert.equal(await page.inputValue('#view-theme'), 'system');
    await page.selectOption('#view-theme', 'light');
    assert.equal(await page.getAttribute('html', 'data-stack-theme'), 'light');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('tabs: arrows and Home/End move focus over enabled tabs, Enter selects', async () => {
  const { context, page } = await open();
  try {
    await page.focus('#env-tab-overview');
    assert.equal(await page.getAttribute('#env-tab-overview', 'tabindex'), '0');
    assert.equal(await page.getAttribute('#env-tab-logs', 'tabindex'), '-1');
    const focused = () => page.evaluate(() => document.activeElement.id);
    await page.keyboard.press('ArrowRight');
    assert.equal(await focused(), 'env-tab-logs');
    // Focus moves; the tab stop stays on the selected tab.
    assert.equal(await page.getAttribute('#env-tab-overview', 'tabindex'), '0');
    assert.equal(await page.getAttribute('#env-tab-logs', 'tabindex'), '-1');
    await page.keyboard.press('ArrowRight');
    assert.equal(await focused(), 'env-tab-events', 'the disabled tab is skipped');
    await page.keyboard.press('ArrowRight');
    assert.equal(await focused(), 'env-tab-overview', 'focus wraps');
    await page.keyboard.press('End');
    assert.equal(await focused(), 'env-tab-events');
    await page.keyboard.press('Home');
    assert.equal(await focused(), 'env-tab-overview');
    await page.keyboard.press('ArrowRight');
    assert.deepEqual(await page.evaluate(() => window.calls), [], 'moving focus does not select');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.calls), [['tab', 'logs']]);
    assert.equal(await page.getAttribute('#env-panel', 'aria-labelledby'), 'env-tab-overview');
    assert.equal(await page.getAttribute('#env-tab-overview', 'aria-controls'), 'env-panel');
  } finally {
    await context.close();
  }
});

test('table: sorting is announced and clickable; rows select by click, Enter and Space; one cell per header', async () => {
  const { context, page } = await open();
  try {
    const sorts = await page.$$eval('th[aria-sort]', (nodes) => nodes.map((n) => [n.textContent.replace(/[▲▼↕]/g, ''), n.getAttribute('aria-sort')]));
    assert.deepEqual(sorts, [['Project', 'none'], ['When', 'descending']]);
    await page.click('th:has-text("Project") button');
    await page.focus('tr[data-row="web"]');
    await page.keyboard.press('Enter');
    await page.focus('tr[data-row="api"]');
    await page.keyboard.press(' ');
    await page.click('tr[data-row="web"] td:nth-child(3)');
    assert.deepEqual(await page.evaluate(() => window.calls), [['sort', 'project'], ['row', 'web'], ['row', 'api'], ['row', 'web']]);
    assert.equal(await page.getAttribute('tr[data-row="web"]', 'aria-current'), 'true', 'the open row is the current one');
    assert.equal(await page.getAttribute('tr[data-row="api"]', 'aria-current'), null);
    assert.equal(await page.locator('tr[aria-selected]').count(), 0, 'no aria-selected outside a grid');
    const shape = await page.$$eval('.stack-table__table', (tables) => tables.map((table) => ({
      headers: table.querySelectorAll('thead th').length,
      rows: Array.from(table.querySelectorAll('tbody tr')).map((row) => row.children.length),
    })));
    for (const table of shape) for (const cells of table.rows) assert.equal(cells, table.headers);
  } finally {
    await context.close();
  }
});

test('filters: labelled controls, Enter submits without navigating, Clear clears, result is a status', async () => {
  const { context, page } = await open();
  try {
    await page.getByLabel('Project').fill('web');
    await page.getByLabel('Status').selectOption('failed');
    await page.getByLabel('Project').press('Enter');
    await page.getByRole('button', { name: 'Clear' }).click();
    const calls = await page.evaluate(() => window.calls);
    assert.deepEqual(calls.filter(([name]) => name === 'submit'), [['submit']]);
    assert.deepEqual(calls.filter(([name]) => name === 'clear'), [['clear']]);
    assert.ok(calls.some(([name, id, value]) => name === 'change' && id === 'project' && value === 'web'));
    assert.ok(calls.some(([name, id, value]) => name === 'change' && id === 'status' && value === 'failed'));
    assert.equal(page.url(), `${origin}/`, 'submitting did not navigate or add a query string');
    assert.equal(await page.getAttribute('.stack-filter__result', 'role'), 'status');
    assert.equal(await page.getAttribute('form.stack-filter', 'role'), 'search');
  } finally {
    await context.close();
  }
});

test('client-side routing: ordinary clicks are routed, modified clicks stay links, other products are never routed', async () => {
  const { context, page } = await open();
  try {
    await page.evaluate(() => {
      const routed = [];
      window.routed = routed;
      const frame = window.StackUI.dom.Shell({
        product: { name: 'Studio', homeHref: '/' }, mainId: 'routed-main', onNavigate: (href) => routed.push(href),
        navigation: [{ id: 'data', label: 'Data', href: '/data?connect=x' }],
        otherProducts: [{ id: 'compute', name: 'Compute', href: '#compute' }],
      });
      document.body.append(frame);
    });
    await page.click('#routed-main >> xpath=preceding::a[text()="Data"][1]');
    await page.click('.stack-shell__product >> nth=1');
    assert.deepEqual(await page.evaluate(() => window.routed), ['/data?connect=x', '/']);
    assert.equal(new URL(page.url()).pathname, '/', 'routed clicks did not load a page');
    const modified = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find((a) => a.textContent === 'Data');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
      link.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(modified, false, 'a modified click is left to the browser');
    await page.click('a:has-text("Compute") >> nth=-1');
    assert.deepEqual(await page.evaluate(() => window.routed), ['/data?connect=x', '/'], 'links to other products are not routed');
  } finally {
    await context.close();
  }
});

test('pagination: previous is disabled at the start, next pages forward, no invented totals', async () => {
  const { context, page } = await open();
  try {
    assert.equal(await page.isDisabled('[data-page="previous"]'), true);
    await page.click('[data-page="next"]');
    assert.deepEqual(await page.evaluate(() => window.calls), [['next']]);
    assert.doesNotMatch(await page.textContent('.stack-pagination'), /of \d|page \d+ of/i);
  } finally {
    await context.close();
  }
});
