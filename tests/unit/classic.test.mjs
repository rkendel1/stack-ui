// The classic build Compute vendors: strict, one frozen global, same API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as states from '../../packages/core/src/states.js';
import * as view from '../../packages/core/src/view.js';

const bundle = readFileSync(new URL('../../packages/core/classic/stack-ui-core.js', import.meta.url), 'utf8');

const load = () => {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(bundle, context);
  return context.StackUI;
};

test('the bundle begins with a use-strict directive prologue', () => {
  const firstStatement = bundle.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  assert.ok(firstStatement.startsWith("'use strict';"), firstStatement.slice(0, 40));
});

test('the bundle runs in strict mode', () => {
  // A strict script throws on assignment to an undeclared variable.
  const context = vm.createContext({});
  context.window = context;
  assert.throws(() => vm.runInContext(`${bundle}\nundeclaredVariable = 1;`, context), /not defined/);
});

test('it exposes one frozen global with the module API', () => {
  const StackUI = load();
  assert.ok(Object.isFrozen(StackUI));
  for (const name of ['resolve', 'verification', 'verificationOf', 'freshnessOf', 'StatusIndicator', 'VerificationBadge', 'toDom', 'dom', 'formatTime']) {
    assert.equal(typeof StackUI[name] === 'function' || typeof StackUI[name] === 'object', true, name);
  }
  // Objects from another realm have different prototypes; compare their data.
  assert.deepEqual(JSON.parse(JSON.stringify(StackUI.resolve('compute.health', 'healthy'))), states.resolve('compute.health', 'healthy'));
  assert.deepEqual(
    JSON.parse(JSON.stringify(StackUI.StatusIndicator({ field: 'compute.health', value: 'unhealthy' }))),
    JSON.parse(JSON.stringify(view.StatusIndicator({ field: 'compute.health', value: 'unhealthy' }))),
  );
});

test('it leaks nothing else into the page', () => {
  const context = vm.createContext({});
  context.window = context;
  const before = new Set(Object.keys(context));
  vm.runInContext(bundle, context);
  const added = Object.keys(context).filter((key) => !before.has(key));
  assert.deepEqual(added, ['StackUI']);
});

// The stateless build: the same API without the theme preference, for products
// that keep no browser storage (AppPort services' pages).
const stateless = readFileSync(new URL('../../packages/core/classic/stack-ui-core-stateless.js', import.meta.url), 'utf8');

test('the stateless build names no browser storage and has no theme preference', () => {
  assert.doesNotMatch(stateless, /localStorage|sessionStorage|indexedDB/);
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(stateless, context);
  const StackUI = context.StackUI;
  assert.ok(Object.isFrozen(StackUI));
  assert.equal(StackUI.initThemePreference, undefined);
  assert.equal(StackUI.setThemePreference, undefined);
  for (const name of ['dom', 'toDom', 'confirmAction', 'formDialog', 'openDialog', 'focusMain', 'Shell', 'DataTable', 'TextField', 'ConfirmAction', 'formatTime']) {
    assert.ok(StackUI[name], `stateless build exposes ${name}`);
  }
  // Everything it does expose is the full build's, unchanged.
  const full = load();
  for (const name of Object.keys(StackUI)) assert.ok(name in full, `${name} is in the full build`);
  assert.deepEqual(Object.keys(full).filter((name) => !(name in StackUI)).sort(),
    ['THEME_PREFERENCES', 'THEME_STORAGE_KEY', 'applyThemePreference', 'initThemePreference', 'readThemePreference', 'setThemePreference', 'storeThemePreference']);
});
