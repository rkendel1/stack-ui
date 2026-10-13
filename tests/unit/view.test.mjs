// Component structure that needs no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FilterBar } from '../../packages/core/src/view.js';

const find = (tree, match, found = []) => {
  if (!tree || typeof tree !== 'object') return found;
  if (Array.isArray(tree)) { tree.forEach((child) => find(child, match, found)); return found; }
  if (match(tree)) found.push(tree);
  (tree.c || []).forEach((child) => find(child, match, found));
  return found;
};
const submits = (tree) => find(tree, (node) => node.t === 'button' && node.a.type === 'submit');

test('live filters have no Apply button; submitted filters do', () => {
  const filters = [{ id: 'principal', label: 'Principal' }];
  assert.equal(submits(FilterBar({ filters, onSubmit() {} })).length, 1);
  assert.equal(submits(FilterBar({ filters, live: true })).length, 0);
  // Clear still appears once a filter is applied.
  const clear = find(FilterBar({ filters, live: true, applied: 1, onClear() {} }), (node) => node.t === 'button');
  assert.equal(clear.length, 1);
});

test('a live filter form still never navigates on submit', () => {
  const form = FilterBar({ live: true, filters: [{ id: 'principal', label: 'Principal' }] });
  assert.equal(typeof form.on?.submit, 'function');
  let prevented = false;
  form.on.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});
