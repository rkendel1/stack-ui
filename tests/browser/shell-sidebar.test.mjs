// The Shell's sidebar in a real page that owns the collapsed state: rows with long labels, counts and
// actions never extend past the sidebar's edge; the toggle hides it on wide screens and the page takes the
// width; axe is clean in both states; no horizontal page scroll at 320px.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { assets } from './harness.mjs';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sidebar test</title>
<style>${assets.tokens}</style><style>${assets.core}</style><style>body{margin:0}</style>
<script>${assets.script}</script></head><body><div id="app"></div><script>
'use strict';
const S = window.StackUI;
window.state = { collapsed: false };
const track = () => S.dom.Button({ label: 'Track', size: 'sm', onClick: () => {} });
const wide = () => { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'A product control that is much wider than any sidebar could be'; b.style.whiteSpace = 'nowrap'; return b; };
function render() {
  const app = document.getElementById('app');
  const main = document.createElement('div'); main.textContent = 'Report';
  app.replaceChildren(S.dom.Shell({
    product: { name: 'Radar', homeHref: '#/' }, family: false, mainId: 'main',
    sidebarCollapsed: window.state.collapsed, onSidebarToggle: (v) => { window.state.collapsed = v; render(); },
    navigation: [
      { id: 'sum', label: 'Summary', detail: 'All competitors, on demand', href: '#/', current: true },
      { id: 'solid', label: 'Solidjs', detail: 'solidjs.com', meta: '32', href: '#/solid', group: 'Competitors' },
      { id: 'appwrite', label: 'Appwrite', detail: 'appwrite.io', meta: '16,359', href: '#/appwrite', group: 'Competitors' },
      { id: 'rn', label: 'React Native', detail: 'named by Appwrite', href: '#/rn', group: 'Worth tracking', action: track() },
      { id: 'ext', label: 'Code Extensions That Replace Entire Dev Tools', detail: 'named by Appwrite', href: '#/ext', group: 'Worth tracking', action: track() },
      { id: 'long', label: 'Supercalifragilisticexpialidociousproductnamewithoutspaces', detail: 'an-extremely-long-domain-name-without-any-breaks.example.com', meta: '1,234,567', href: '#/long', group: 'Worth tracking', action: track() },
      { id: 'wide', label: 'Custom backend', href: '#/wide', group: 'Worth tracking', action: wide() },
    ],
    children: main,
  }));
}
render();
</script></body></html>`;

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => browser && browser.close());

async function open(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.setContent(PAGE);
  await page.waitForSelector('.stack-shell');
  return page;
}
const escapes = (page) => page.evaluate(() => {
  const nav = document.querySelector('.stack-shell__nav').getBoundingClientRect();
  return Array.from(document.querySelectorAll('.stack-shell__nav-entry, .stack-shell__nav-entry *'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > nav.right + 0.5; })
    .map((el) => `${el.tagName}.${el.className} ${Math.round(el.getBoundingClientRect().right)} > ${Math.round(nav.right)}`);
});

test('wide screen: no row, label, count or action extends past the sidebar', async () => {
  const page = await open(1280);
  try {
    assert.deepEqual(await escapes(page), []);
    // Short rows keep their action on the row: the Track button sits beside its label, inside the sidebar.
    const { label, button } = await page.evaluate(() => {
      const row = document.querySelector('a[href="#/rn"]').closest('li');
      return { label: row.querySelector('.stack-shell__nav-label').getBoundingClientRect().top, button: row.querySelector('button').getBoundingClientRect().top };
    });
    assert.ok(Math.abs(label - button) < 20, 'action on the same line as a short row');
  } finally { await page.close(); }
});

test('the toggle hides the sidebar, the page takes the width, and it comes back', async () => {
  const page = await open(1280);
  try {
    const before = await page.evaluate(() => document.querySelector('.stack-shell__main').getBoundingClientRect().width);
    await page.getByRole('button', { name: 'Hide sidebar' }).click();
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.stack-shell__nav')).display), 'none');
    const after = await page.evaluate(() => document.querySelector('.stack-shell__main').getBoundingClientRect().width);
    assert.ok(after > before + 150, `main ${before} → ${after}`);
    const show = page.getByRole('button', { name: 'Show sidebar' });
    assert.equal(await show.getAttribute('aria-expanded'), 'false');
    await show.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.stack-shell__nav')).display), 'block');
    assert.deepEqual(await escapes(page), []);
  } finally { await page.close(); }
});

for (const collapsed of [false, true]) {
  test(`axe: no serious or critical violations (sidebar ${collapsed ? 'hidden' : 'shown'})`, async () => {
    const page = await open(1280);
    try {
      if (collapsed) await page.getByRole('button', { name: 'Hide sidebar' }).click();
      await page.addScriptTag({ content: assets.axe });
      const violations = (await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations))
        .filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
      assert.deepEqual(violations, []);
    } finally { await page.close(); }
  });
}

test('320px: no horizontal page scroll; the toggle is not offered (the narrow strip or menu applies)', async () => {
  const page = await open(320);
  try {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.stack-shell__sidebar-button')).display), 'none');
  } finally { await page.close(); }
});
