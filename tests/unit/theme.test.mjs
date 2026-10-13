// The theme preference never breaks a page, whatever storage does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readThemePreference, storeThemePreference, applyThemePreference, setThemePreference, THEME_STORAGE_KEY,
} from '../../packages/core/src/theme.js';

const memory = () => {
  const values = new Map();
  return { getItem: (k) => (values.has(k) ? values.get(k) : null), setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k), values };
};
const element = () => {
  const attrs = new Map();
  return { setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k), get: (k) => attrs.get(k) ?? null };
};

test('a stored preference round-trips; system clears it', () => {
  const scope = { localStorage: memory() };
  assert.equal(readThemePreference(scope), 'system');
  assert.equal(storeThemePreference('dark', scope), true);
  assert.equal(readThemePreference(scope), 'dark');
  assert.equal(storeThemePreference('system', scope), true);
  assert.equal(scope.localStorage.values.has(THEME_STORAGE_KEY), false);
});

test('an unknown stored value reads as system', () => {
  const scope = { localStorage: memory() };
  scope.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
  assert.equal(readThemePreference(scope), 'system');
});

test('a throwing storage accessor, getItem or setItem never throws out', () => {
  const blocked = {};
  Object.defineProperty(blocked, 'localStorage', { get() { throw new Error('SecurityError'); } });
  assert.equal(readThemePreference(blocked), 'system');
  assert.equal(storeThemePreference('dark', blocked), false);
  const broken = { localStorage: { getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } } };
  assert.equal(readThemePreference(broken), 'system');
  assert.equal(storeThemePreference('dark', broken), false);
  const root = element();
  assert.equal(setThemePreference('dark', broken, root), 'dark');
  assert.equal(root.get('data-stack-theme'), 'dark', 'the choice still applies for the session');
});

test('applying light or dark sets the attribute; system removes it; anything else is system', () => {
  const root = element();
  applyThemePreference('light', root);
  assert.equal(root.get('data-stack-theme'), 'light');
  applyThemePreference('system', root);
  assert.equal(root.get('data-stack-theme'), null);
  assert.equal(setThemePreference('neon', { localStorage: memory() }, root), 'system');
  assert.equal(root.get('data-stack-theme'), null);
});
