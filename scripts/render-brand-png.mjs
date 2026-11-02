#!/usr/bin/env node
// Renders the Boundry mark and logo to PNG (transparent backgrounds) from the SVGs in
// packages/tokens/brand, into assets/brand/. These are files for people (decks, profiles,
// documents); products use the SVGs and BrandMark. The wordmark is set in Inter Display
// ExtraBold as a stand-in until the master wordmark artwork is committed (docs/decisions.md
// D29). Needs Chromium (playwright-core) and the Inter Display font installed.
//   node scripts/render-brand-png.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'packages/tokens/brand');
const out = join(root, 'assets/brand');
mkdirSync(out, { recursive: true });
const mark = readFileSync(join(brand, 'boundry-mark.svg'), 'utf8');
const reversed = readFileSync(join(brand, 'boundry-mark-reversed.svg'), 'utf8');
const sized = (svg, px) => svg.replace('<svg ', `<svg width="${px}" height="${Math.round(px * 315 / 340)}" style="display:block" `);
const page = (body) => `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
async function render(name, body, size) {
  const p = await browser.newPage({ viewport: size || { width: 4000, height: 1000 } });
  await p.setContent(page(body));
  await p.evaluate(() => document.fonts.ready);
  const box = size ? { x: 0, y: 0, ...size } : await (await p.$('body > div')).boundingBox();
  await p.screenshot({ path: join(out, `${name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) } });
  await p.close();
}
// The mark alone on a square canvas with breathing room.
for (const [name, svg] of [['boundry-mark', mark], ['boundry-mark-reversed', reversed]]) {
  for (const size of [1024, 512]) {
    await render(`${name}-${size}`, `<div style="width:${size}px;height:${size}px;display:grid;place-items:center">${sized(svg, Math.round(size * 0.8))}</div>`, { width: size, height: size });
  }
}
// The logo: mark, wordmark and trademark; navy for light backgrounds, near-white for dark.
const logo = (svg, ink) => `<div style="display:flex;align-items:center;gap:150px;padding:120px 160px;width:max-content">${sized(svg, 560)}<span style="font:800 600px/1 'Inter Display','Inter',sans-serif;letter-spacing:-0.012em;color:${ink};position:relative;top:-0.04em">Boundry<sup style="font:600 110px/1 'Inter',sans-serif;letter-spacing:0;vertical-align:top;position:relative;top:0.12em;margin-left:18px">&trade;</sup></span></div>`;
await render('boundry-logo', logo(mark, '#0b1538'));
await render('boundry-logo-reversed', logo(reversed, '#e6ebf7'));
await browser.close();
console.log(`assets/brand: rendered from ${brand}`);
