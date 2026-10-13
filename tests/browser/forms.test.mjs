// Fields, forms and dialogs in a real page served from a real origin, through
// the classic build exactly as a framework-free product uses them: labels and
// descriptions wired by id, forms that submit without navigating, and the
// confirm and form dialogs — modal, keyboard-operable, focus returned, busy
// while the product's request runs, its error shown in place, axe clean.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { assets } from './harness.mjs';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Forms test</title>
<style>${assets.tokens}</style><style>${assets.core}</style>
<style>body{margin:0;padding:16px;background:var(--stack-color-bg-canvas);color:var(--stack-color-text-default);font-family:var(--stack-font-family-sans)}</style>
<script>${assets.script}</script></head><body><main id="app"><h1>Forms</h1></main><script>
'use strict';
const S = window.StackUI;
window.results = [];
window.submits = 0;
// Each action fails while window.fail is set, so a test can show an error and then a retry.
window.fail = false;
const action = async (values) => {
  window.calls = (window.calls || 0) + 1;
  await new Promise((done) => setTimeout(done, Number(window.delay || 0)));
  if (window.fail) { const error = new Error('The key is in use by a running job'); error.code = 'CONFLICT'; throw error; }
  return values;
};
const app = document.getElementById('app');
app.append(S.dom.Form({
  label: 'Create API key', submitLabel: 'Create API key',
  onSubmit: (event) => { window.submits += 1; window.lastValues = Object.fromEntries(new FormData(event.target)); },
  children: [
    S.dom.TextField({ name: 'name', label: 'Key name', required: true, hint: 'Shown in lists and audit records.' }),
    S.dom.TextField({ id: 'var-name', name: 'variable', label: 'Variable', value: 'lower', error: 'Use capital letters.' }),
    S.dom.Select({ name: 'environment', label: 'Environment', options: ['production', 'staging'], value: 'staging' }),
    S.dom.TextField({ name: 'payload', label: 'Payload JSON', multiline: true, value: '{}' }),
  ],
}));
const trigger = (id, label, run) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = label; b.addEventListener('click', run); app.append(b); };
trigger('ask-plain', 'Revoke', async () => { window.results.push(await S.confirmAction({ id: 'revoke', title: 'Revoke API key ci?', confirmLabel: 'Revoke API key', consequences: ['Callers using this key are refused from then on.', 'A revoked key cannot be restored.'] })); });
trigger('ask-typed', 'Delete', async () => { window.results.push(await S.confirmAction({ id: 'delete', title: 'Delete DATABASE_URL?', confirmLabel: 'Delete variable', requireText: 'DATABASE_URL', consequences: ['The application no longer receives this value.'], action })); });
trigger('ask-form', 'Rename', async () => { window.results.push(await S.formDialog({ id: 'rename', title: 'Rename file record', description: 'The stored content is not touched.', submitLabel: 'Rename', fields: [{ name: 'name', label: 'File name', required: true, value: 'report.pdf' }, { name: 'kind', label: 'Kind', options: ['document', 'image'], value: 'image' }], action })); });
</script></body></html>`;

let server;
let origin;
let browser;
before(async () => {
  server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(PAGE);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width || 1024, height: 800 }, colorScheme: options.colorScheme || 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/`);
  await page.waitForSelector('form.stack-form');
  return { context, page, errors };
}

async function axe(page) {
  await page.addScriptTag({ content: assets.axe });
  const result = await page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return el ? (el.id || el.getAttribute('data-dialog-cancel') && 'cancel' || el.getAttribute('data-dialog-confirm') && 'confirm' || el.tagName.toLowerCase()) : null;
});
const results = (page) => page.evaluate(() => window.results);

test('fields: every control has its visible label; hint and error are announced with it', async () => {
  const { context, page, errors } = await open();
  try {
    const controls = await page.$$eval('.stack-field__control', (nodes) => nodes.map((node) => ({
      id: node.id,
      label: document.querySelector(`label[for="${node.id}"]`)?.textContent,
      describedBy: node.getAttribute('aria-describedby'),
      invalid: node.getAttribute('aria-invalid'),
      required: node.required,
    })));
    assert.deepEqual(controls.map((c) => c.label), ['Key name *', 'Variable', 'Environment', 'Payload JSON']);
    assert.equal(controls[0].required, true);
    assert.equal(controls[0].describedBy, 'stack-field-name-hint');
    assert.equal(await page.textContent('#stack-field-name-hint'), 'Shown in lists and audit records.');
    assert.equal(controls[1].invalid, 'true');
    assert.equal(controls[1].describedBy, 'var-name-error');
    assert.equal(await page.getByRole('textbox', { name: 'Key name', exact: true }).getAttribute('placeholder'), null, 'no placeholder stands in for a label');
    // The required marker is visual only: the accessible name is the label's words.
    assert.equal(await page.getByRole('textbox', { name: 'Key name', exact: true }).count(), 1);
    assert.equal(await page.inputValue('#stack-field-payload'), '{}', 'a textarea carries its value as text');
    assert.equal(await page.inputValue('#stack-field-environment'), 'staging');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('hidden hides a component even though its own rule sets display', async () => {
  const { context, page } = await open();
  try {
    const shown = await page.evaluate(() => {
      const field = document.querySelector('.stack-field');
      const button = document.querySelector('.stack-button');
      field.hidden = true;
      button.hidden = true;
      return [getComputedStyle(field).display, getComputedStyle(button).display];
    });
    assert.deepEqual(shown, ['none', 'none']);
  } finally {
    await context.close();
  }
});

test('form: Enter submits without navigating, and the browser still checks required fields', async () => {
  const { context, page } = await open();
  try {
    await page.getByLabel('Key name').press('Enter');
    assert.equal(await page.evaluate(() => window.submits), 0, 'a required field that is empty blocks submit');
    await page.getByLabel('Key name').fill('ci');
    await page.getByLabel('Key name').press('Enter');
    assert.equal(await page.evaluate(() => window.submits), 1);
    assert.deepEqual(await page.evaluate(() => window.lastValues), { name: 'ci', variable: 'lower', environment: 'staging', payload: '{}' });
    assert.equal(page.url(), `${origin}/`, 'no navigation and no query string');
  } finally {
    await context.close();
  }
});

test('confirm: modal, names its action, focus starts on Cancel, Esc cancels and focus returns', async () => {
  const { context, page, errors } = await open();
  try {
    await page.click('#ask-plain');
    const dialog = page.locator('dialog#revoke');
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((d) => d.open && d.matches(':modal')), true, 'shown as a modal');
    assert.equal(await dialog.getAttribute('role'), 'alertdialog');
    assert.equal(await page.getByRole('alertdialog', { name: 'Revoke API key ci?' }).count(), 1);
    assert.deepEqual(await dialog.locator('.stack-confirm__consequences li').allTextContents(), [
      'Callers using this key are refused from then on.', 'A revoked key cannot be restored.']);
    assert.equal(await dialog.locator('[data-dialog-confirm]').textContent(), 'Revoke API key');
    assert.equal(await dialog.getAttribute('aria-describedby'), 'revoke-consequences', 'the consequences are announced with the dialog');
    assert.equal(await focused(page), 'cancel', 'the safe choice has focus');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(await results(page), [false]);
    assert.equal(await focused(page), 'ask-plain', 'focus returns to the button that asked');

    // A close the browser makes itself, when nothing is running, is a cancel.
    await page.click('#ask-plain');
    await dialog.waitFor();
    await dialog.evaluate((d) => d.close());
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(await results(page), [false, false]);

    await page.click('#ask-plain');
    await dialog.waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await focused(page), 'confirm');
    await page.keyboard.press('Enter');
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(await results(page), [false, false, true]);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('confirm with typed text: disabled until it matches; busy while the action runs; its error stays in the dialog', async () => {
  const { context, page, errors } = await open();
  try {
    await page.evaluate(() => { window.fail = true; window.delay = 300; });
    await page.click('#ask-typed');
    const dialog = page.locator('dialog#delete');
    await dialog.waitFor();
    const confirm = dialog.locator('[data-dialog-confirm]');
    assert.equal(await focused(page), 'delete-typed', 'focus starts in the confirmation field');
    assert.equal(await confirm.isDisabled(), true);
    await page.keyboard.type('DATABASE_UR');
    assert.equal(await confirm.isDisabled(), true, 'a near miss is not a match');
    await page.keyboard.type('L');
    assert.equal(await confirm.isDisabled(), false);
    await confirm.click();
    await dialog.locator('[data-dialog-confirm][aria-busy="true"]').waitFor();
    // Esc while the request runs must not close: the request is still in flight.
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate((d) => d.open), true);
    // The browser may close a modal itself; a busy one is shown again.
    await dialog.evaluate((d) => d.close());
    await page.waitForFunction(() => document.querySelector('dialog#delete')?.open);
    const alert = dialog.getByRole('alert');
    await alert.waitFor();
    assert.match(await alert.textContent(), /The key is in use by a running job/);
    assert.match(await alert.textContent(), /CONFLICT/);
    assert.equal(await dialog.evaluate((d) => d.open), true, 'a failure leaves the dialog open');
    assert.deepEqual(await results(page), []);
    assert.equal(await page.inputValue('#delete-typed'), 'DATABASE_URL', 'the typed text is kept for a retry');

    await page.evaluate(() => { window.fail = false; });
    await confirm.click();
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(await results(page), [true]);
    assert.equal(await page.evaluate(() => window.calls), 2);
    assert.equal(await focused(page), 'ask-typed');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('form dialog: labelled fields, Enter submits, error in place, Cancel returns null', async () => {
  const { context, page, errors } = await open();
  try {
    await page.click('#ask-form');
    const dialog = page.locator('dialog#rename');
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((d) => d.matches(':modal')), true);
    assert.equal(await page.getByRole('dialog', { name: 'Rename file record' }).count(), 1);
    assert.equal(await focused(page), 'rename-field-0', 'focus starts in the first field');
    assert.equal(await page.inputValue('#rename-field-0'), 'report.pdf');

    await page.evaluate(() => { window.fail = true; });
    await page.fill('#rename-field-0', 'q3.pdf');
    await page.press('#rename-field-0', 'Enter');
    await dialog.getByRole('alert').waitFor();
    assert.equal(await page.inputValue('#rename-field-0'), 'q3.pdf', 'what was typed survives the failure');

    await page.evaluate(() => { window.fail = false; });
    await dialog.getByRole('button', { name: 'Rename' }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(await results(page), [{ name: 'q3.pdf', kind: 'image' }]);

    await page.click('#ask-form');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(await results(page), [{ name: 'q3.pdf', kind: 'image' }, null]);
    assert.equal(await focused(page), 'ask-form');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

for (const colorScheme of ['light', 'dark']) {
  for (const width of [1024, 320]) {
    test(`axe clean with each dialog open (${colorScheme}, ${width}px), and dialogs fit the screen`, async () => {
      const { context, page } = await open({ colorScheme, width });
      try {
        assert.deepEqual(await axe(page), [], 'the page with its form');
        for (const [button, id] of [['#ask-typed', 'delete'], ['#ask-form', 'rename']]) {
          await page.click(button);
          const dialog = page.locator(`dialog#${id}`);
          await dialog.waitFor();
          // Measure the settled dialog, not its opening fade.
          await dialog.evaluate((d) => Promise.all(d.getAnimations().map((animation) => animation.finished)));
          assert.deepEqual(await axe(page), [], `${id} dialog`);
          const box = await dialog.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${id} dialog fits ${width}px`);
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'detached' });
        }
      } finally {
        await context.close();
      }
    });
  }
}
