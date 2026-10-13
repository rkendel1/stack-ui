// Criterion 3: for every component, the React render and the dom.js render of
// the same fixture produce identical DOM.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Stack from '@stack-ui/react';
import { FIXTURES, COMPONENT_NAMES, withHandlers, REPLACE_SOURCE } from '../fixtures.mjs';
import { openPage } from './harness.mjs';

let browser;
let page;
before(async () => {
  ({ browser, page } = await openPage());
  await page.addScriptTag({ content: REPLACE_SOURCE });
});
after(async () => browser && browser.close());

test('every component has at least one fixture', () => {
  const covered = new Set(FIXTURES.map(([name]) => name));
  assert.deepEqual(COMPONENT_NAMES.filter((name) => !covered.has(name)), []);
  assert.equal(COMPONENT_NAMES.length, 24);
});

for (const [index, [name, props]] of FIXTURES.entries()) {
  test(`${name} #${index}: React and dom.js render identical DOM`, async () => {
    const markup = renderToStaticMarkup(createElement(Stack[name], withHandlers(props, () => {})));
    const [fromReact, fromDom] = await page.evaluate(({ name, props, markup }) => {
      const resolved = window.__withHandlers(props, () => {});
      const template = document.createElement('template');
      template.setHTMLUnsafe ? template.setHTMLUnsafe(markup) : (template.innerHTML = markup); // test-only parse of React's output
      const reactNode = template.content.firstElementChild;
      const domNode = window.StackUI.dom[name](resolved);
      return [window.__canon(reactNode), window.__canon(domNode)];
    }, { name, props, markup });
    assert.deepEqual(fromDom, fromReact);
  });
}

test('dom.js wires event handlers and React-free pages can click them', async () => {
  const clicks = await page.evaluate(() => {
    let count = 0;
    const button = window.StackUI.dom.Button({ label: 'Go', onClick: () => { count += 1; } });
    document.body.appendChild(button);
    button.click();
    const disabled = window.StackUI.dom.Button({ label: 'No', disabled: true, onClick: () => { count += 100; } });
    document.body.appendChild(disabled);
    disabled.click();
    const retry = window.StackUI.dom.ErrorPanel({ message: 'x', onRetry: () => { count += 10; } });
    document.body.appendChild(retry);
    retry.querySelector('button').click();
    return count;
  });
  assert.equal(clicks, 11);
});

test('slot content passes through: DOM nodes in dom.js, elements in React', async () => {
  const markup = renderToStaticMarkup(createElement(Stack.PageHeader, {
    title: 'Overview', status: createElement(Stack.StatusIndicator, { field: 'compute.health', value: 'healthy' }),
  }));
  const [fromReact, fromDom] = await page.evaluate((markup) => {
    const t = document.createElement('template');
    t.setHTMLUnsafe ? t.setHTMLUnsafe(markup) : (t.innerHTML = markup);
    const status = window.StackUI.dom.StatusIndicator({ field: 'compute.health', value: 'healthy' });
    const header = window.StackUI.dom.PageHeader({ title: 'Overview', status });
    return [window.__canon(t.content.firstElementChild), window.__canon(header)];
  }, markup);
  assert.deepEqual(fromDom, fromReact);
});
