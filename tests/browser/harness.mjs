// Shared browser harness: a Chromium page with tokens.css, core.css and the
// classic core build loaded, exactly as a framework-free product page would.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
export const assets = {
  tokens: read('../../packages/tokens/css/tokens.css'),
  core: read('../../packages/core/src/core.css'),
  script: read('../../packages/core/classic/stack-ui-core.js'),
  axe: readFileSync(new URL(import.meta.resolve('axe-core/axe.min.js')), 'utf8'),
};

/// Canonical form of a DOM subtree: tag, sorted attributes, merged text.
/// Runs in the page.
export const CANONICAL = `window.__canon = function canon(node) {
  if (node.nodeType === 3) return node.data;
  if (node.nodeType === 11 || node.nodeType === 9) return Array.from(node.childNodes).map(canon);
  const clone = node.cloneNode(true); clone.normalize();
  const walk = (el) => el.nodeType === 3 ? el.data : {
    tag: el.tagName.toLowerCase(),
    attrs: Array.from(el.attributes).map((a) => [a.name, a.value]).sort((x, y) => x[0] < y[0] ? -1 : 1),
    children: Array.from(el.childNodes).filter((c) => c.nodeType === 1 || c.nodeType === 3).map(walk),
  };
  return walk(clone);
};`;

export async function openPage({ colorScheme = 'light', width = 1024 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 800 }, colorScheme });
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>stack-ui gallery</title></head><body><main id="root"></main></body></html>');
  await page.addStyleTag({ content: assets.tokens });
  await page.addStyleTag({ content: assets.core });
  await page.addStyleTag({ content: 'body{margin:0;padding:16px;background:var(--stack-color-bg-canvas);color:var(--stack-color-text-default);font-family:var(--stack-font-family-sans)} section{margin:12px 0}' });
  await page.addScriptTag({ content: assets.script });
  await page.addScriptTag({ content: CANONICAL });
  return { browser, page };
}
