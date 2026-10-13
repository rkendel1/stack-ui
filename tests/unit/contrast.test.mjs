// Contract §3.4: every declared pair meets its contrast threshold in both themes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../../packages/tokens/src/tokens.json', import.meta.url), 'utf8'));

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const backgrounds = ['color-bg-canvas', 'color-bg-surface', 'color-bg-raised', 'color-bg-sunken'];
const TONES = ['positive', 'progress', 'attention', 'critical', 'neutral', 'unknown'];
const pairs = [];
for (const text of ['color-text-default', 'color-text-muted', 'color-text-subtle', 'color-text-link']) {
  for (const bg of backgrounds) pairs.push([text, bg, 4.5]);
}
pairs.push(['color-text-default', 'color-bg-code', 4.5]);
for (const bg of backgrounds) {
  pairs.push(['color-border-strong', bg, 3], ['focus-ring-color', bg, 3]);
  for (const tone of TONES) pairs.push([`color-status-${tone}-glyph`, bg, 3]);
  for (const kind of ['verified', 'unverified']) pairs.push([`color-evidence-${kind}-glyph`, bg, 3]);
}
for (const tone of TONES) pairs.push([`color-status-${tone}-fg`, `color-status-${tone}-bg`, 4.5]);
for (const kind of ['verified', 'unverified']) pairs.push([`color-evidence-${kind}-fg`, `color-evidence-${kind}-bg`, 4.5]);
pairs.push(['color-notice-info-fg', 'color-notice-info-bg', 4.5]);
// Selected table rows put body text on the progress background.
pairs.push(['color-text-default', 'color-status-progress-bg', 4.5]);
// Field errors and the required marker put critical text straight on a page,
// form or dialog background. (An invalid control's border uses the critical
// glyph colour, already held to 3:1 on every background above.)
for (const bg of backgrounds) pairs.push(['color-status-critical-fg', bg, 4.5]);
for (const intent of ['primary', 'secondary', 'danger']) {
  for (const s of ['bg', 'bg-hover', 'bg-active']) pairs.push([`color-action-${intent}-fg`, `color-action-${intent}-${s}`, 4.5]);
}
pairs.push(['color-text-on-accent', 'color-action-primary-bg', 4.5]);
// Primary and danger buttons must stand apart from the surface they sit on (non-text, 3:1).
for (const bg of ['color-bg-canvas', 'color-bg-surface']) {
  pairs.push(['color-action-primary-bg', bg, 3], ['color-action-danger-bg', bg, 3]);
}

for (const theme of ['light', 'dark']) {
  test(`every declared pair meets its threshold (${theme})`, () => {
    const failures = [];
    for (const [fg, bg, min] of pairs) {
      const a = tokens[theme][fg];
      const b = tokens[theme][bg];
      assert.ok(a && b, `${theme}: missing ${a ? bg : fg}`);
      const r = ratio(a, b);
      if (r < min) failures.push(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
    }
    assert.deepEqual(failures, [], `${theme} contrast failures:\n${failures.join('\n')}`);
  });
}

test('the pair list covers every declared pair', () => {
  assert.equal(pairs.length, 85, 'update this count when pairs are added or removed');
});

test('the light-only stylesheet carries no dark values and no colour scheme', async () => {
  const { readFileSync: read } = await import('node:fs');
  const light = read(new URL('../../packages/tokens/css/tokens-light.css', import.meta.url), 'utf8');
  assert.doesNotMatch(light, /prefers-color-scheme|data-stack-theme|color-scheme/);
  for (const [key, value] of Object.entries(tokens.light)) {
    assert.ok(light.includes(`--stack-${key}: ${value};`), `${key} missing from tokens-light.css`);
  }
  for (const key of Object.keys(tokens.dark)) {
    if (tokens.dark[key] !== tokens.light[key]) assert.ok(!light.includes(`--stack-${key}: ${tokens.dark[key]};`), `${key} has its dark value`);
  }
});
