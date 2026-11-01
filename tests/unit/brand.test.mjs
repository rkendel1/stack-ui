// docs/brand.md: company and product identity tokens are legible in both
// themes, generated for every product, and never used to express state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The WCAG ratio, as in contrast.test.mjs (importing that file would run its tests twice).
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const tokens = JSON.parse(read('../../packages/tokens/src/tokens.json'));
const brand = JSON.parse(read('../../packages/tokens/src/brand.json'));
const css = read('../../packages/tokens/css/tokens.css');
const lightCss = read('../../packages/tokens/css/tokens-light.css');
const core = read('../../packages/core/src/core.css');
const products = Object.keys(brand.products).filter((id) => !id.startsWith('$'));

const surfaces = ['color-bg-canvas', 'color-bg-surface', 'color-bg-raised'];

for (const theme of ['light', 'dark']) {
  test(`identity colours are legible as text and as a fill (${theme})`, () => {
    const failures = [];
    const accents = { company: brand.company[theme]['brand-accent'], ...Object.fromEntries(products.map((id) => [id, brand.products[id][theme]])) };
    for (const [id, accent] of Object.entries(accents)) {
      for (const bg of surfaces) {
        const r = ratio(accent, tokens[theme][bg]);
        if (r < 4.5) failures.push(`${id} accent on ${bg}: ${r.toFixed(2)}`);
      }
      const on = ratio(brand.onAccent[theme], accent);
      if (on < 4.5) failures.push(`text on ${id} accent: ${on.toFixed(2)}`);
    }
    for (const bg of surfaces) {
      const ink = ratio(brand.company[theme]['brand-ink'], tokens[theme][bg]);
      if (ink < 7) failures.push(`brand ink on ${bg}: ${ink.toFixed(2)} < 7`);
      // The mark is a graphic: both ends of its gradient stand apart from the page (3:1).
      for (const stop of ['brand-mark-start', 'brand-mark-end']) {
        const r = ratio(brand.company[theme][stop], tokens[theme][bg]);
        if (r < 3) failures.push(`${stop} on ${bg}: ${r.toFixed(2)} < 3`);
      }
    }
    assert.deepEqual(failures, []);
  });
}

test('every product accent is generated for both themes and both theme switches', () => {
  for (const id of products) {
    for (const theme of ['light', 'dark']) {
      const value = brand.products[id][theme];
      const count = css.split(`--stack-product-accent: ${value};`).length - 1;
      // light: default + explicit light switch; dark: OS dark + explicit dark switch
      assert.ok(count >= 2, `${id} ${theme} accent appears ${count} times`);
    }
    assert.ok(lightCss.includes(`[data-stack-product="${id}"] { --stack-product-accent: ${brand.products[id].light};`), `${id} missing from tokens-light.css`);
    assert.ok(!lightCss.includes(brand.products[id].dark), `${id} dark accent leaked into tokens-light.css`);
  }
});

test('identity never expresses state: status, evidence, notice and action styles use no brand token', () => {
  const offenders = [];
  for (const match of core.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (!/stack-(status|verification|freshness|evidence|alert|error|button|unavailable|timeline__status)/.test(selector)) continue;
    if (/--stack-(product|brand)-/.test(match[2])) offenders.push(selector);
  }
  assert.deepEqual(offenders, []);
});

test('brand ids are the product ids the shared portfolio lists', async () => {
  const { PORTFOLIO } = await import('../../packages/core/src/brand.js');
  assert.deepEqual(PORTFOLIO.products.map((p) => p.id).sort(), [...products].sort());
});
