// The chart showcase (examples/charts) builds from the public API and is a
// usable, accessible page in light and dark and at phone width.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { assets } from './harness.mjs';

const root = new URL('../../', import.meta.url);
execFileSync(process.execPath, ['examples/charts/build.mjs'], { cwd: root, stdio: 'ignore' });
const page = readFileSync(new URL('examples/charts/dist/index.html', root), 'utf8');

for (const [colorScheme, width] of [['light', 1280], ['dark', 1280], ['light', 390]]) {
  test(`showcase: renders every chart type with no errors, no serious axe violations, no page scroll (${colorScheme}, ${width}px)`, async () => {
    const browser = await chromium.launch();
    try {
      const tab = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
      const errors = [];
      tab.on('pageerror', (e) => errors.push(e.message));
      tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await tab.setContent(page);
      await tab.waitForSelector('.stack-chart__svg');
      const kinds = await tab.evaluate(() => [...new Set([...document.querySelectorAll('[data-chart]')].map((f) => f.dataset.chart))].sort());
      assert.deepEqual(kinds, ['area', 'bar', 'donut', 'line']);
      assert.ok(await tab.locator('.stack-sparkline').count() >= 3);
      assert.match(await tab.textContent('body'), /Illustrative sample data/);
      for (const state of ['loading', 'error', 'empty', 'unsupported']) assert.ok(await tab.locator(`[data-chart-state="${state}"]`).count() >= 1, state);
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      await tab.addScriptTag({ content: assets.axe });
      const violations = await tab.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`));
      assert.deepEqual(violations, []);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
