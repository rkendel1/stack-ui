// Agent control primitives (docs/decisions.md D39): every state shown is the platform's,
// and every operation stays distinct.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgentControls, AgentStatus, AgentUpdateComposer, AgentUpdateList } from '../../packages/core/src/view.js';
import { resolve, valuesOf } from '../../packages/core/src/states.js';

const find = (tree, match, found = []) => {
  if (!tree || typeof tree !== 'object') return found;
  if (Array.isArray(tree)) { tree.forEach((child) => find(child, match, found)); return found; }
  if (match(tree)) found.push(tree);
  (tree.c || []).forEach((child) => find(child, match, found));
  return found;
};
const text = (tree) => (typeof tree === 'string' || typeof tree === 'number' ? String(tree) : !tree || typeof tree !== 'object' ? '' : Array.isArray(tree) ? tree.map(text).join('') : (tree.c || []).map(text).join(''));
const buttons = (tree) => Object.fromEntries(find(tree, (n) => n.t === 'button' && n.a['data-op']).map((b) => [b.a['data-op'], { disabled: Boolean(b.a.disabled), busy: b.a['aria-busy'] === 'true', handler: Boolean(b.on && b.on.click) }]));
const noop = () => {};
const all = { onSignal: noop, onPause: noop, onResume: noop, onInterrupt: noop, onStop: noop };

test('the platform vocabularies map completely, each update state with its own label', () => {
  assert.deepEqual(valuesOf('appport.agent.phase'), ['running', 'pausing', 'paused', 'interrupted', 'blocked', 'completed', 'stopped']);
  const states = valuesOf('appport.agent.instruction.state');
  assert.deepEqual(states, ['signaled', 'received', 'delivered', 'incorporated', 'conflict', 'withdrawn', 'abandoned']);
  const labels = states.map((s) => resolve('appport.agent.instruction.state', s).label);
  assert.equal(new Set(labels).size, labels.length, 'no two update states look the same');
  assert.match(resolve('appport.agent.instruction.state', 'received').label, /Received/);
  assert.doesNotMatch(resolve('appport.agent.instruction.state', 'received').label, /ncorporat/, 'received never reads as incorporated');
  assert.equal(resolve('appport.agent.phase', 'made_up').tone, 'unknown', 'an unknown phase is never shown as healthy');
});

test('controls: pause, interrupt and stop are separate; what is enabled follows the phase', () => {
  let b = buttons(AgentControls({ phase: 'running', ...all }));
  assert.deepEqual(Object.keys(b), ['signal', 'pause', 'interrupt', 'stop']);
  assert.ok(Object.values(b).every((x) => !x.disabled && x.handler));
  b = buttons(AgentControls({ phase: 'paused', ...all }));
  assert.deepEqual(Object.keys(b), ['signal', 'resume', 'interrupt', 'stop'], 'paused offers resume instead of pause');
  assert.equal(b.resume.disabled, false);
  b = buttons(AgentControls({ phase: 'interrupted', ...all }));
  assert.equal(b.interrupt.disabled, true, 'already interrupted');
  assert.equal(b.resume.disabled, false);
  for (const phase of ['completed', 'stopped', 'not_a_phase']) {
    assert.ok(Object.values(buttons(AgentControls({ phase, ...all }))).every((x) => x.disabled && !x.handler), `${phase}: nothing to steer`);
  }
  b = buttons(AgentControls({ phase: 'running', busy: 'pause', ...all }));
  assert.equal(b.pause.busy, true);
  assert.equal(b.signal.busy, false);
  assert.equal(buttons(AgentControls({ phase: 'running' })).pause.disabled, true, 'no handler, no action');
  // Symbols, each with its operation's name as the accessible name and tooltip.
  const named = find(AgentControls({ phase: 'running', ...all }), (n) => n.t === 'button').map((b) => [b.a['aria-label'], text(b).trim(), b.a.title.split(':')[0]]);
  assert.deepEqual(named.map(([name]) => name), ['Update coming', 'Pause', 'Interrupt', 'Stop']);
  for (const [name, shown, tip] of named) {
    assert.ok(!shown.includes(name), `${name} shows a symbol, not the word`);
    assert.equal(tip, name);
  }
  const worded = find(AgentControls({ phase: 'running', labels: true, ...all }), (n) => n.t === 'button').map((b) => text(b));
  assert.ok(worded.every((t, i) => t.includes(named[i][0])), 'labels: true adds the words');
});

test('status: in-flight work, updates coming and queued, and the hold reason are each stated', () => {
  const tree = AgentStatus({ phase: 'pausing', inFlight: { generations: 1, actions: ['a', 'b'] }, signaled: 1, queued: 2, reason: 'lunch' });
  const t = text(tree);
  assert.match(t, /Pausing/);
  assert.match(t, /1 model call, 2 actions in flight — it finishes before the pause takes effect/);
  assert.match(t, /An update is coming; the agent keeps working/);
  assert.match(t, /2 updates queued for the next checkpoint/);
  assert.match(t, /Reason: lunch/);
  assert.equal(tree.a['data-phase'], 'pausing');
  assert.doesNotMatch(text(AgentStatus({ phase: 'running', reason: 'old reason' })), /Reason/, 'a stale reason is not shown while running');
});

test('updates: each has its state, its place on the path, and what the agent said', () => {
  const items = [
    { instructionId: 'a', state: 'signaled', from: 'user:ada' },
    { instructionId: 'b', state: 'received', text: 'B', from: 'user:ada' },
    { instructionId: 'c', state: 'delivered', text: 'C' },
    { instructionId: 'd', state: 'incorporated', text: 'D', resolution: { note: 'Did D.' } },
    { instructionId: 'e', state: 'conflict', text: 'E', resolution: { note: 'Contradicts step 1.' } },
  ];
  const tree = AgentUpdateList({ items, onWithdraw: noop });
  const rows = find(tree, (n) => n.t === 'li' && n.a.class === 'stack-agent-update');
  assert.deepEqual(rows.map((r) => r.a['data-state']), ['signaled', 'received', 'delivered', 'incorporated', 'conflict']);
  const current = rows.map((r) => (find(r, (n) => n.a && n.a['aria-current'] === 'step')[0] ? text(find(r, (n) => n.a['aria-current'] === 'step')[0]) : null));
  assert.deepEqual(current, ['Coming', 'Received', 'Incorporating', 'Incorporated', null], 'a conflict is off the normal path');
  assert.match(text(rows[0]), /Being written/);
  assert.match(text(rows[3]), /Agent: Did D\./);
  assert.match(text(rows[4]), /Agent: Contradicts step 1\./);
  const withdrawable = rows.map((r) => find(r, (n) => n.a && n.a['data-op'] === 'withdraw').length);
  assert.deepEqual(withdrawable, [1, 1, 0, 0, 0], 'only what the agent has not been given can be withdrawn');
});

test('composer: says the agent keeps working; refuses input once the task has ended', () => {
  const open = AgentUpdateComposer({ value: 'x', signaled: true, onSubmit: noop, onChange: noop });
  assert.match(text(open), /knows an update is coming and keeps working/);
  assert.equal(find(open, (n) => n.t === 'textarea')[0].a.maxlength, '8000');
  const ended = AgentUpdateComposer({ value: '', phase: 'stopped', onSubmit: noop });
  assert.equal(find(ended, (n) => n.t === 'textarea')[0].a.disabled, true);
  assert.match(text(ended), /The task has ended/);
});
