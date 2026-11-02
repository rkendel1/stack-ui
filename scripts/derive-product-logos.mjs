#!/usr/bin/env node
// Derives product logo files from the originals in assets/brand/products (sources.json
// records which is which). Everything is done in a browser canvas, so the output is
// reproducible from this script alone:
//   - marks cropped from logos that carry a wordmark (FeltDB, AppBoundry);
//   - FeltDB's logo for light backgrounds: its white wordmark recoloured to FeltDB ink;
//   - AuthBoundry's mark for dark backgrounds: its navy parts recoloured light;
//   - AuthBoundry and AppPort logos: the product's own mark beside its name, typeset in
//     Inter Display Bold. No wordmark artwork exists for them; this is a stand-in.
// Needs Chromium (playwright-core) and Inter Display. Run: node scripts/derive-product-logos.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'assets/brand/products');
const dataUrl = (file) => `data:image/png;base64,${readFileSync(join(dir, file)).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
await page.evaluate(() => {
  const load = (src) => new Promise((ok, fail) => { const img = new Image(); img.onload = () => ok(img); img.onerror = fail; img.src = src; });
  const canvasOf = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  // Bounding box of non-transparent pixels.
  const trim = (canvas) => {
    const { width, height } = canvas; const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const out = canvasOf(x1 - x0 + 1, y1 - y0 + 1); out.getContext('2d').drawImage(canvas, -x0, -y0); return out;
  };
  window.derive = {
    // Crop a box, trim, centre on a transparent square of `size` px.
    async squareMark(src, box, size) {
      const img = await load(src);
      const c = canvasOf(box[2] - box[0], box[3] - box[1]); c.getContext('2d').drawImage(img, -box[0], -box[1]);
      const t = trim(c); const side = Math.max(t.width, t.height);
      const out = canvasOf(size, size); const g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
      const s = size / side; g.drawImage(t, (size - t.width * s) / 2, (size - t.height * s) / 2, t.width * s, t.height * s);
      return out.toDataURL('image/png');
    },
    // Recolour pixels matching a rule (within an optional region) to `rgb`, keeping alpha.
    async recolour(src, rule, rgb, region) {
      const img = await load(src); const c = canvasOf(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height); const p = d.data;
      const test = new Function('r', 'g', 'b', 'a', `return ${rule};`);
      for (let y = region ? region[1] : 0; y < (region ? region[3] : c.height); y++) for (let x = region ? region[0] : 0; x < (region ? region[2] : c.width); x++) {
        const i = (y * c.width + x) * 4; if (p[i + 3] && test(p[i], p[i + 1], p[i + 2], p[i + 3])) { p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2]; }
      }
      g.putImageData(d, 0, 0); return c.toDataURL('image/png');
    },
    // The mark beside the product name: mark height 600px, cap height matched to it.
    async lockup(src, name, ink) {
      await document.fonts.load("700 400px 'Inter Display'");
      const img = await load(src); const base = canvasOf(img.width, img.height); base.getContext('2d').drawImage(img, 0, 0);
      const m = trim(base); const markH = 600, markW = m.width * markH / m.height;
      const font = "700 470px 'Inter Display'"; const measure = canvasOf(1, 1).getContext('2d'); measure.font = font;
      const text = measure.measureText(name); const pad = 120, gap = 140;
      const out = canvasOf(Math.ceil(pad * 2 + markW + gap + text.width), markH + pad * 2); const g = out.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(m, pad, pad, markW, markH);
      g.font = font; g.fillStyle = ink; g.textBaseline = 'middle'; g.fillText(name, pad + markW + gap, pad + markH / 2 + 10);
      return out.toDataURL('image/png');
    },
  };
});

const write = async (name, promise) => {
  const url = await promise; writeFileSync(join(dir, name), Buffer.from(url.split(',')[1], 'base64')); console.log(`  ${name}`);
};
const ink = { light: '#0b1538', dark: '#e6ebf7' };
// FeltDB: the mark sits above the wordmark (which starts at y=1570 in the 1606x1992 original).
await write('feltdb/feltdb-mark.png', page.evaluate(([s]) => derive.squareMark(s, [0, 0, 1606, 1570], 512), [dataUrl('feltdb/feltdb-logo-dark.png')]));
await write('feltdb/feltdb-logo.png', page.evaluate(([s]) => derive.recolour(s, 'r > 150 && g > 150 && b > 150', [17, 23, 19], [0, 1570, 1606, 1992]), [dataUrl('feltdb/feltdb-logo-dark.png')]));
// AppBoundry: the hexagon above the wordmark, from the black (light) and white (dark) logos.
await write('appboundry/appboundry-mark.png', page.evaluate(([s]) => derive.squareMark(s, [160, 0, 565, 470], 512), [dataUrl('appboundry/appboundry-logo.png')]));
await write('appboundry/appboundry-mark-dark.png', page.evaluate(([s]) => derive.squareMark(s, [160, 0, 565, 470], 512), [dataUrl('appboundry/appboundry-logo-dark.png')]));
// AuthBoundry: the navy "A" (dark, low-saturation-blue pixels) recoloured for dark backgrounds.
await write('authboundry/authboundry-mark-dark.png', page.evaluate(([s]) => derive.recolour(s, 'Math.max(r, g, b) < 80 && b >= r', [230, 235, 247]), [dataUrl('authboundry/authboundry-mark.png')]));
await write('authboundry/authboundry-logo.png', page.evaluate(([s, i]) => derive.lockup(s, 'AuthBoundry', i), [dataUrl('authboundry/authboundry-mark.png'), ink.light]));
await write('authboundry/authboundry-logo-dark.png', page.evaluate(([s, i]) => derive.lockup(s, 'AuthBoundry', i), [dataUrl('authboundry/authboundry-mark-dark.png'), ink.dark]));
// AppPort: the mark reads on both backgrounds.
await write('appport/appport-logo.png', page.evaluate(([s, i]) => derive.lockup(s, 'AppPort', i), [dataUrl('appport/appport-mark.png'), ink.light]));
await write('appport/appport-logo-dark.png', page.evaluate(([s, i]) => derive.lockup(s, 'AppPort', i), [dataUrl('appport/appport-mark.png'), ink.dark]));
await browser.close();
