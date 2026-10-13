// @stack-ui/react behaviour in a real browser, where static parity cannot
// look: a field with onChange but no value is free to type in, and modal
// dialogs follow state — Esc asks the product, a busy confirmation stays open
// (even if the browser closes it), and focus returns to the trigger.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { assets } from './harness.mjs';

let server;
let origin;
let browser;
before(async () => {
  const bundled = await build({
    entryPoints: [fileURLToPath(new URL('./react-app.mjs', import.meta.url))],
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'silent',
  });
  const script = bundled.outputFiles[0].text;
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>React test</title>
<style>${assets.tokens}</style><style>${assets.core}</style></head><body><div id="root"></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(page);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function open() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/`);
  await page.waitForSelector('#app');
  return { context, page, errors };
}
const log = (page) => page.evaluate(() => window.log);

test('a field with onChange and no value is free to type in', async () => {
  const { context, page, errors } = await open();
  try {
    await page.getByLabel('Free field').pressSequentially('abc');
    assert.equal(await page.inputValue('#stack-field-free'), 'abc');
    assert.equal(await page.textContent('#free-echo'), 'abc');
    assert.deepEqual(errors, [], 'no React warnings about controlled inputs');
  } finally {
    await context.close();
  }
});

test('ConfirmAction: typed text enables confirm; busy ignores Esc and survives a forced close; Esc then asks the product', async () => {
  const { context, page, errors } = await open();
  try {
    await page.click('#ask');
    const dialog = page.locator('dialog#react-confirm');
    await page.waitForFunction(() => document.querySelector('dialog#react-confirm')?.matches(':modal'));
    assert.equal(await page.getByRole('alertdialog', { name: 'Revoke API key ci?' }).count(), 1);
    const confirm = dialog.locator('[data-dialog-confirm]');
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByLabel('Type ci to confirm').fill('ci');
    assert.equal(await confirm.isDisabled(), false);
    await confirm.click();
    await dialog.locator('[data-dialog-confirm][aria-busy="true"]').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate((d) => d.open), true, 'Esc does nothing while busy');
    // The browser may close a modal itself; a busy one is shown again.
    await dialog.evaluate((d) => d.close());
    await page.waitForFunction(() => document.querySelector('dialog#react-confirm').open);
    assert.deepEqual(await log(page), [['confirm']]);

    await page.evaluate(() => window.finishRequest());
    await dialog.locator('[data-dialog-cancel]:not([disabled])').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog#react-confirm').open);
    assert.deepEqual(await log(page), [['confirm'], ['cancel']]);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ask', 'focus returns to the trigger');

    // Reopening starts with empty typed text.
    await page.click('#ask');
    await page.waitForFunction(() => document.querySelector('dialog#react-confirm').open);
    assert.equal(await dialog.getByLabel('Type ci to confirm').inputValue(), '');
    assert.equal(await confirm.isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('Dialog: Esc calls onClose, and a close the browser makes itself is reported too', async () => {
  const { context, page, errors } = await open();
  try {
    await page.click('#edit');
    await page.waitForFunction(() => document.querySelector('dialog#react-dialog')?.matches(':modal'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog#react-dialog').open);
    assert.deepEqual(await log(page), [['close']]);
    await page.click('#edit');
    await page.waitForFunction(() => document.querySelector('dialog#react-dialog').open);
    await page.locator('dialog#react-dialog').evaluate((d) => d.close());
    await page.waitForFunction(() => window.log.length === 2);
    assert.deepEqual(await log(page), [['close'], ['close']]);
    // State agrees with the screen: the next open shows it again.
    await page.click('#edit');
    await page.waitForFunction(() => document.querySelector('dialog#react-dialog').open);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
