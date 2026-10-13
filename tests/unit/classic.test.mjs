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
