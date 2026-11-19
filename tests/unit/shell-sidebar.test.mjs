// The Shell's sidebar: rich rows (detail, meta, action) and the wide-screen collapse toggle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Shell } from '../../packages/core/src/view.js';

const find = (tree, match, found = []) => {
  if (!tree || typeof tree !== 'object') return found;
  if (Array.isArray(tree)) { tree.forEach((child) => find(child, match, found)); return found; }
  if (match(tree)) found.push(tree);
  (tree.c || []).forEach((child) => find(child, match, found));
  return found;
};
const cls = (name) => (n) => typeof n.a?.class === 'string' && n.a.class.split(' ').includes(name);
const product = { name: 'Radar', homeHref: '#/' };

test('a row carries detail and meta inside its link, and its action beside the link (never inside it)', () => {
  const action = { t: 'button', a: { type: 'button' }, c: ['Track'] };
  const tree = Shell({ product, family: false, navigation: [{ id: 'a', label: 'Appwrite', detail: 'appwrite.io', meta: '16,359', href: '#/a', action }] });
  const entry = find(tree, cls('stack-shell__nav-entry'))[0];
  assert.ok(entry.a.class.includes('stack-shell__nav-entry--action'));
  const link = find(entry, (n) => n.t === 'a')[0];
  assert.equal(find(link, cls('stack-shell__nav-detail')).length, 1);
  assert.equal(find(link, cls('stack-shell__nav-meta')).length, 1);
  assert.equal(find(link, (n) => n.t === 'button').length, 0, 'no button inside a link');
  assert.equal(find(find(entry, cls('stack-shell__nav-action'))[0], (n) => n.t === 'button').length, 1);
});

test('the collapse toggle exists only when the product owns the state, and says what it does', () => {
  assert.equal(find(Shell({ product, family: false, navigation: [] }), cls('stack-shell__sidebar-button')).length, 0);
  const seen = [];
  const open = Shell({ product, family: false, navigation: [], mainId: 'm', onSidebarToggle: (v) => seen.push(v) });
  const button = find(open, cls('stack-shell__sidebar-button'))[0];
  assert.equal(button.a['aria-expanded'], 'true');
  assert.equal(button.a['aria-label'], 'Hide sidebar');
  assert.equal(button.a['aria-controls'], 'm-nav');
  assert.equal(find(open, (n) => n.t === 'nav' && n.a.id === 'm-nav').length, 1);
  button.on.click();
  const closed = Shell({ product, family: false, navigation: [], mainId: 'm', sidebarCollapsed: true, sidebarLabel: 'competitors', onSidebarToggle: (v) => seen.push(v) });
  assert.ok(closed.a.class.includes('stack-shell--collapsed'));
  const again = find(closed, cls('stack-shell__sidebar-button'))[0];
  assert.equal(again.a['aria-expanded'], 'false');
  assert.equal(again.a['aria-label'], 'Show competitors');
  again.on.click();
  assert.deepEqual(seen, [true, false]);
});
