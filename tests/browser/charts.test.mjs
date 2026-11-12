// Charts in a real browser (docs/charts.md): layout at the container's width and
// redraw on resize (framework-free and React), no overflow at 320px, keyboard
// focus reveals each value's tooltip inside the plot, and series colours come
// from the theme tokens in light and dark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { openPage } from './harness.mjs';

const MONTHS = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'];
const CHART_PROPS = {
  LineChart: { title: 'Revenue', xType: 'time', format: { style: 'currency', currency: 'USD', divisor: 100 },
    series: [{ id: 'r', label: 'Revenue', data: MONTHS.map((x, i) => ({ x, y: 1_000_000 + i * 150_000 })) }, { id: 't', label: 'Target with a long series name', data: MONTHS.map((x, i) => ({ x, y: 1_100_000 + i * 90_000 })) }] },
  AreaChart: { title: 'Cash flow', series: [{ id: 'c', label: 'Net cash', data: ['Jan', 'Feb', 'Mar', 'Apr'].map((x, i) => ({ x, y: [300, -120, 450, 80][i] })) }] },
  BarChart: { title: 'Income and expenses', series: [{ id: 'i', label: 'Income', data: ['January', 'February', 'March'].map((x, i) => ({ x, y: [9, 11, 10][i] })) }, { id: 'e', label: 'Expenses', data: ['January', 'February', 'March'].map((x, i) => ({ x, y: [7, 8, 12][i] })) }] },
  StackedBarChart: { title: 'Composition', orientation: 'horizontal', series: [{ id: 's', label: 'Services', data: [{ x: 'An extremely long category label that must not overflow its card', y: 24 }, { x: 'Q2', y: 28 }] }, { id: 'p', label: 'Products', data: [{ x: 'Q2', y: 9 }] }] },
  DonutChart: { title: 'Expenses by category', series: [{ id: 'd', label: 'Spend', data: [{ x: 'Contractors and subcontracted professional services', y: 9 }, { x: 'Rent', y: 6 }, { x: 'Software', y: 2 }] }] },
};

async function mount(page, width) {
  await page.evaluate(({ props, width }) => {
    const root = document.getElementById('root');
    root.replaceChildren();
    window.__charts = {};
    for (const [name, p] of Object.entries(props)) {
      const box = document.createElement('div');
      box.style.cssText = `width:${width}px;max-width:100%`;
      box.dataset.chart = name;
      root.appendChild(box);
      window.__charts[name] = window.StackUI.mountChart(box, name, p);
    }
  }, { props: CHART_PROPS, width });
}

test('framework-free charts lay out at their container width and redraw when it changes', async () => {
  const { browser, page } = await openPage({ width: 1200 });
  try {
    await mount(page, 900);
    const widths = () => page.evaluate(() => [...document.querySelectorAll('[data-chart]')].map((box) => {
      const svg = box.querySelector('.stack-chart__svg');
      return { name: box.dataset.chart, viewBox: Number(svg.getAttribute('viewBox').split(' ')[2]), plot: box.querySelector('.stack-chart__plot').clientWidth };
    }));
    for (const w of await widths()) {
      if (w.name === 'DonutChart') continue; // a donut keeps its own size beside its legend
      assert.equal(w.viewBox, w.plot, `${w.name} is laid out at its plot width`);
    }
    await page.evaluate(() => { for (const box of document.querySelectorAll('[data-chart]')) box.style.width = '400px'; });
    await page.waitForFunction(() => Number(document.querySelector('[data-chart="LineChart"] .stack-chart__svg').getAttribute('viewBox').split(' ')[2]) <= 400);
    for (const w of await widths()) if (w.name !== 'DonutChart') assert.equal(w.viewBox, w.plot, `${w.name} redrew at 400px`);
    await page.evaluate(() => window.__charts.LineChart.update({ title: 'Updated', series: [] }));
    assert.equal(await page.textContent('[data-chart="LineChart"] .stack-chart__title'), 'Updated');
    await page.evaluate(() => window.__charts.LineChart.destroy());
    assert.equal(await page.evaluate(() => document.querySelector('[data-chart="LineChart"]').childElementCount), 0);
  } finally {
    await browser.close();
  }
});

test('at a 320px viewport no chart, legend, label or table overflows its container', async () => {
  const { browser, page } = await openPage({ width: 320 });
  try {
    await mount(page, 9999);
    await page.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = true; });
    const overflow = await page.evaluate(() => {
      const bad = [];
      for (const box of document.querySelectorAll('[data-chart]')) {
        const limit = box.getBoundingClientRect().right + 0.5;
        for (const el of box.querySelectorAll('.stack-chart__svg, .stack-chart__legend, .stack-chart__header, .stack-chart__table-wrap, text')) {
          if (el.getBoundingClientRect().right > limit) bad.push(`${box.dataset.chart}: ${el.getAttribute('class') || el.tagName} ${el.textContent.slice(0, 30)}`);
        }
      }
      return { bad, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.deepEqual(overflow.bad, []);
    assert.equal(overflow.page, 0, 'no horizontal page scroll');
  } finally {
    await browser.close();
  }
});

test('keyboard: Tab reaches each value, its tooltip shows inside the plot, and the data table is reachable', async () => {
  for (const colorScheme of ['light', 'dark']) {
    const { browser, page } = await openPage({ colorScheme, width: 1000 });
    try {
      await mount(page, 700);
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => {
        const el = document.activeElement;
        const tip = el.querySelector('.stack-chart__tip');
        const svg = el.ownerSVGElement.getBoundingClientRect();
        const box = el.querySelector('.stack-chart__tip-box').getBoundingClientRect();
        const hidden = [...document.querySelectorAll('.stack-chart__tip')].filter((t) => t !== tip && getComputedStyle(t).visibility === 'visible').length;
        return { cls: el.getAttribute('class'), label: el.getAttribute('aria-label'), visible: getComputedStyle(tip).visibility, inside: box.left >= svg.left - 0.5 && box.right <= svg.right + 0.5 && box.top >= svg.top - 0.5, others: hidden, text: tip.textContent };
      });
      assert.equal(first.cls, 'stack-chart__target', colorScheme);
      assert.equal(first.visible, 'visible');
      assert.equal(first.others, 0, 'only the focused tooltip shows');
      assert.ok(first.inside, 'tooltip stays inside the chart');
      assert.match(first.label, /^Jan 2026: Revenue \$10,000\.00, Target with a long series name \$11,000\.00$/);
      assert.match(first.text, /Revenue: \$10,000\.00/);
      // The last value's tooltip flips to the left instead of leaving the chart.
      for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
      const last = await page.evaluate(() => {
        const el = document.activeElement;
        const svg = el.ownerSVGElement.getBoundingClientRect();
        const box = el.querySelector('.stack-chart__tip-box').getBoundingClientRect();
        return { label: el.getAttribute('aria-label'), inside: box.right <= svg.right + 0.5 && box.left >= svg.left - 0.5 };
      });
      assert.match(last.label, /^Jun 2026/);
      assert.ok(last.inside);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'stack-chart__data-summary', 'then the data table');
      // Focus is visible: the focused target draws a ring in the focus colour.
      await page.keyboard.press('Shift+Tab');
      const ring = await page.evaluate(() => {
        const area = document.activeElement.querySelector('.stack-chart__target-area');
        return [getComputedStyle(area).stroke, getComputedStyle(document.documentElement).getPropertyValue('--stack-focus-ring-color').trim()];
      });
      assert.equal(ring[0], hexToRgb(ring[1]));
    } finally {
      await browser.close();
    }
  }
});

test('series colours, text and grid follow the theme tokens in light and dark', async () => {
  const seen = {};
  for (const [colorScheme, theme] of [['light', null], ['dark', null], ['light', 'dark']]) {
    const { browser, page } = await openPage({ colorScheme, width: 1000 });
    try {
      if (theme) await page.evaluate((t) => document.documentElement.setAttribute('data-stack-theme', t), theme);
      await mount(page, 600);
      const colours = await page.evaluate(() => {
        const token = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        return {
          line: getComputedStyle(document.querySelector('[data-chart="LineChart"] .stack-chart__line')).stroke,
          second: getComputedStyle(document.querySelector('[data-chart="LineChart"] [data-series="t"] .stack-chart__line')).stroke,
          tick: getComputedStyle(document.querySelector('.stack-chart__tick')).fill,
          tokens: [token('--stack-color-chart-1'), token('--stack-color-chart-2'), token('--stack-color-text-muted')],
        };
      });
      assert.equal(colours.line, hexToRgb(colours.tokens[0]));
      assert.equal(colours.second, hexToRgb(colours.tokens[1]));
      assert.equal(colours.tick, hexToRgb(colours.tokens[2]));
      seen[theme || colorScheme] = colours.line;
    } finally {
      await browser.close();
    }
  }
  assert.notEqual(seen.light, seen.dark, 'the palette changes with the theme');
});

test('the React binding measures its container, redraws on resize, and toggles series through the product', async () => {
  const entry = fileURLToPath(new URL('./charts-react-app.mjs', import.meta.url));
  const bundled = await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  const { browser, page } = await openPage({ width: 1000 });
  try {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addScriptTag({ content: bundled.outputFiles[0].text });
    const box = () => page.evaluate(() => Number(document.querySelector('#react-chart .stack-chart__svg').getAttribute('viewBox').split(' ')[2]));
    await page.waitForFunction(() => document.querySelector('#react-chart .stack-chart__svg'));
    await page.waitForFunction(() => Number(document.querySelector('#react-chart .stack-chart__svg').getAttribute('viewBox').split(' ')[2]) === document.querySelector('#react-chart .stack-chart__plot').clientWidth);
    assert.equal(await box(), 560);
    await page.evaluate(() => { document.getElementById('react-host').style.width = '360px'; });
    await page.waitForFunction(() => Number(document.querySelector('#react-chart .stack-chart__svg').getAttribute('viewBox').split(' ')[2]) === 360);
    // Legend toggles call the product, which hides the series.
    await page.click('#react-chart .stack-chart__legend-toggle >> nth=1');
    await page.waitForFunction(() => !document.querySelector('#react-chart [data-series="e"].stack-chart__series'));
    assert.equal(await page.getAttribute('#react-chart .stack-chart__legend-toggle >> nth=1', 'aria-pressed'), 'false');
    assert.ok(await page.evaluate(() => document.querySelector('#react-spark svg').getAttribute('aria-label').startsWith('Balance:')));
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
