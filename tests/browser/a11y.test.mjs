// Criterion 4: zero serious or critical axe violations on the component gallery
// in light and dark, plus keyboard focus visibility and narrow-viewport layout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES, REPLACE_SOURCE } from '../fixtures.mjs';
import { openPage, assets } from './harness.mjs';

async function renderGallery(page, theme) {
  await page.addScriptTag({ content: REPLACE_SOURCE });
  await page.evaluate(({ fixtures, theme }) => {
    if (theme) document.documentElement.setAttribute('data-stack-theme', theme);
    const root = document.getElementById('root');
    const h1 = document.createElement('h1');
    h1.textContent = 'Component gallery';
    root.appendChild(h1);
    for (const [name, props] of fixtures) {
      const section = document.createElement('section');
      const label = document.createElement('h2');
      label.textContent = name;
      section.appendChild(label);
      // The Shell owns the page's main landmark, so it is tested on its own
      // page (shell.test.mjs) rather than nested inside the gallery.
      if (name === 'Shell') continue;
      section.appendChild(window.StackUI.dom[name](window.__withHandlers(props, () => {})));
      root.appendChild(section);
    }
  }, { fixtures: FIXTURES, theme });
}

async function axe(page) {
  await page.addScriptTag({ content: assets.axe });
  const result = await page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
}

for (const [colorScheme, theme] of [['light', null], ['dark', null], ['light', 'dark'], ['dark', 'light']]) {
  const name = theme ? `${theme} forced over a ${colorScheme} system` : `${colorScheme} system theme`;
  test(`axe: no serious or critical violations (${name})`, async () => {
    const { browser, page } = await openPage({ colorScheme });
    try {
      await renderGallery(page, theme);
      const expected = theme || colorScheme;
      const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
      assert.equal(scheme, expected, 'the theme applied');
      assert.deepEqual(await axe(page), []);
    } finally {
      await browser.close();
    }
  });
}

test('keyboard focus on a button shows a visible ring', async () => {
  const { browser, page } = await openPage();
  try {
    await renderGallery(page, null);
    await page.keyboard.press('Tab');
    let guard = 0;
    while (guard++ < 40 && !(await page.evaluate(() => document.activeElement.classList.contains('stack-button')))) {
      await page.keyboard.press('Tab');
    }
    const ring = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    assert.notEqual(ring.style, 'none');
    assert.ok(ring.width >= 2, `outline ${ring.width}px`);
  } finally {
    await browser.close();
  }
});

test('at 320px the gallery has no horizontal page scroll', async () => {
  const { browser, page } = await openPage({ width: 320 });
  try {
    await renderGallery(page, null);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `page overflows by ${overflow}px`);
  } finally {
    await browser.close();
  }
});

test('every status in the gallery has visible text, not only colour', async () => {
  const { browser, page } = await openPage();
  try {
    await renderGallery(page, null);
    const empty = await page.evaluate(() => Array.from(document.querySelectorAll('.stack-status, .stack-verification, .stack-freshness'))
      .filter((el) => !el.innerText.replace(/[●◐▲✕○?✓!–◷]/g, '').trim()).length);
    assert.equal(empty, 0);
  } finally {
    await browser.close();
  }
});
