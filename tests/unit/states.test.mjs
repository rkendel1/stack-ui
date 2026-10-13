// Criterion 5: state semantics.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TONES, fields, valuesOf, resolve, verification, verificationOf, freshnessOf, capability, humanize,
} from '../../packages/core/src/states.js';
import { VerificationBadge, StatusIndicator, EvidenceSummary } from '../../packages/core/src/view.js';

const text = (tree) => (typeof tree === 'string' || typeof tree === 'number' ? String(tree)
  : Array.isArray(tree) ? tree.map(text).join('') : tree && tree.c ? tree.c.map(text).join('') : '');

test('every value of every mapped condition field resolves to a real tone', () => {
  for (const field of fields().condition) {
    for (const value of valuesOf(field)) {
      const result = resolve(field, value);
      assert.ok(result.mapped, `${field}.${value} unmapped`);
      assert.ok(TONES.includes(result.tone), `${field}.${value} → ${result.tone}`);
      assert.ok(result.label, `${field}.${value} has no label`);
    }
  }
});

test('the slice maps exactly the source values of the enums it cites', () => {
  // Spot checks against the source enums (docs/design-system-contract.md §6.3).
  assert.deepEqual(valuesOf('compute.health'), ['healthy', 'unhealthy', 'unknown']);
  assert.deepEqual(new Set(valuesOf('compute.deployment.status')), new Set([
    'active', 'complete', 'pending', 'starting', 'ready', 'network_ready', 'switching', 'draining', 'failed', 'rolled_back']));
  assert.deepEqual(new Set(valuesOf('compute.rollout.status')), new Set(['applying', 'active', 'failed', 'superseded']));
  assert.equal(valuesOf('compute.job.status').length, 13);
  assert.equal(valuesOf('compute.computer.observed').length, 11);
});

// Value sets copied from the source enums, so a mapping that drifts from its
// source fails here rather than rendering `unknown` on a product page.
const SOURCE = {
  // compute: crates/compute-environment/src/model.rs `ActualState`
  'compute.environment.actual_state': ['pending', 'starting', 'running', 'stopping', 'stopped', 'completed', 'failed', 'denied', 'degraded'],
  // compute: crates/compute-environment/src/status.rs `ReadinessState`
  'compute.environment.readiness': ['created', 'starting', 'ready', 'degraded', 'unavailable', 'failed'],
  // compute: crates/compute-core/src/computers.rs `ReadinessState` (process)
  'compute.process.readiness': ['starting', 'ready', 'unready'],
  // compute: crates/compute-core/src/computers.rs `ComputerStatus`
  'compute.computer.status': ['pending', 'provisioning', 'running', 'stopping', 'stopped', 'resuming', 'failed', 'destroying', 'destroyed', 'expired', 'unreachable', 'lost'],
  // compute: `ObservedProcess::status` (starting ready unready running stopped exited failed),
  // the daemon's default `pending`, and the machine's observed words when it is not running.
  'compute.process.state': ['pending', 'starting', 'ready', 'unready', 'running', 'stopped', 'exited', 'failed',
    'unverified', 'unreachable', 'lost', 'stopping', 'destroyed', 'expired'],
  // compute: crates/compute-state/src/model.rs `VersionStatus`
  'compute.version.status': ['publishing', 'published', 'failed'],
  // compute: crates/compute-core/src/jobs.rs `JobStatus`
  'compute.job.status': ['created', 'accepted', 'queued', 'waiting_for_capacity', 'reserved', 'admitted', 'preparing',
    'running', 'succeeded', 'failed', 'cancelled', 'timed_out', 'rejected'],
  // compute: packages/compute-appport/src/computers.ts `ComputerReality.observed`
  'compute.computer.observed': ['starting', 'running', 'unverified', 'reconciling', 'unreachable', 'lost', 'stopping',
    'stopped', 'failed', 'destroyed', 'expired'],
  // flow_db: crates/feltdb-server/src/main.rs `/health/ready` state
  'feltdb.health.ready_state': ['healthy', 'recovering', 'degraded', 'unavailable'],
  // authboundry: crates/authz/src/policy.rs decision
  'authboundry.decision.live': ['allow', 'deny'],
  'authboundry.decision.recorded': ['allow', 'deny'],
  // authboundry: crates/server/src/control_routes.rs delegation status
  'authboundry.delegation.status': ['active', 'pending', 'expired', 'revoked'],
  // authboundry: apps/web/lib/applications.ts `ApplicationStatus`
  'authboundry.application.status': ['awaiting_contract', 'active', 'disabled'],
  // appport-services: src/jobs/models.ts `JobStatus`
  'appport.job.status': ['scheduled', 'pending', 'running', 'retrying', 'completed', 'failed'],
  // appport-services: src/notifications/models.ts `NotificationStatus`
  'appport.notification.status': ['pending', 'delivered', 'failed', 'read', 'acknowledged', 'expired'],
  // appport-services: booleans the pages read from `revokedAt`, `disabledAt`, `enabled`
  'appport.api_key.revoked': ['false', 'true'],
  'appport.webhook.disabled': ['false', 'true'],
  'appport.schedule.enabled': ['true', 'false'],
  // appport-services: `ConfigurationSecretView.configured` is the literal `true`
  'appport.configuration.secret.configured': ['true'],
};

for (const [field, values] of Object.entries(SOURCE)) {
  test(`${field} maps exactly its source values`, () => {
    assert.deepEqual([...valuesOf(field)].sort(), [...values].sort());
  });
}

test('verified cannot be shown without a listed check', () => {
  assert.equal(verification('verified', []).state, 'not_evaluated');
  assert.equal(verification('verified').state, 'not_evaluated');
  assert.equal(verification('verified', ['Content matches revision id']).state, 'verified');
  assert.equal(text(VerificationBadge({ state: 'verified', checks: [] })).includes('Verified'), false);
  assert.match(text(VerificationBadge({ state: 'verified', checks: [] })), /Not evaluated/);
});

test('a failed check cannot be summarized as verified', () => {
  assert.equal(verification('verified', [{ label: 'Hash', status: 'failed' }]).state, 'verification_failed');
});

test('an unknown verification state is not evaluated, never verified', () => {
  assert.equal(verification('looks fine', ['x']).state, 'not_evaluated');
});

test('Compute deployment rolled_back is critical; complete and active keep their own labels', () => {
  assert.equal(resolve('compute.deployment.status', 'rolled_back').tone, 'critical');
  const complete = resolve('compute.deployment.status', 'complete');
  const active = resolve('compute.deployment.status', 'active');
  assert.equal(complete.tone, 'positive');
  assert.equal(active.tone, 'positive');
  assert.notEqual(complete.label, active.label);
});

test('a Compute job that timed out is a definite failure, not an unknown outcome', () => {
  assert.equal(resolve('compute.job.status', 'timed_out').tone, 'critical');
});

test('the same word resolves differently by field', () => {
  assert.equal(resolve('compute.deployment.status', 'ready').tone, 'progress');
  assert.equal(resolve('compute.process.readiness', 'ready').tone, 'positive');
});

test('an unmapped value is unknown and keeps its raw value as label', () => {
  const result = resolve('compute.job.status', 'quantum_entangled');
  assert.equal(result.tone, 'unknown');
  assert.equal(result.label, 'quantum_entangled');
  assert.equal(result.mapped, false);
  const tree = StatusIndicator({ field: 'compute.job.status', value: 'quantum_entangled' });
  assert.equal(tree.a['data-tone'], 'unknown');
  assert.match(text(tree), /quantum_entangled/);
});

test('an unknown field is a programming error, not a silent default', () => {
  assert.throws(() => resolve('compute.nope', 'x'), /unknown field/);
});

test('labels match the words products show today', () => {
  assert.equal(humanize('network_ready'), 'Network ready');
  assert.equal(humanize('rolled_back'), 'Rolled back');
  assert.equal(resolve('feltdb.authority.lease_clock_healthy', false).label, 'Degraded');
  assert.equal(resolve('feltdb.authority.lease_clock_healthy', 'true').label, 'Healthy');
});

test('verification, freshness and capability fields map onto their own axes', () => {
  assert.equal(verificationOf('feltdb.revision.integrity_verified', true, ['Content matches revision id']).state, 'verified');
  assert.equal(verificationOf('feltdb.revision.integrity_verified', false, ['Content matches revision id']).state, 'verification_failed');
  assert.equal(verificationOf('feltdb.revision.integrity_verified', true).state, 'not_evaluated');
  assert.equal(freshnessOf('compute.response.state', 'stale'), 'stale');
  assert.equal(freshnessOf('compute.response.state', 'cached'), 'cached');
  assert.equal(freshnessOf('compute.response.state', undefined), 'unknown');
  assert.equal(capability('partial'), 'partial');
  assert.equal(capability(undefined), 'unsupported');
});

test('mapping tables are immutable', () => {
  assert.throws(() => { 'use strict'; TONES.push('x'); });
});

test('a live deny is critical; the same word on a historical record is neutral', () => {
  assert.equal(resolve('authboundry.decision.live', 'deny').tone, 'critical');
  assert.equal(resolve('authboundry.decision.recorded', 'deny').tone, 'neutral');
  assert.equal(resolve('authboundry.decision.recorded', 'allow').label, 'Allow');
  // The portal once showed pending and expired delegations red, like revoked.
  assert.equal(resolve('authboundry.delegation.status', 'pending').tone, 'progress');
  assert.equal(resolve('authboundry.delegation.status', 'expired').tone, 'neutral');
  assert.equal(resolve('authboundry.delegation.status', 'revoked').tone, 'critical');
  // An upper-case value from another layer is not silently mapped.
  assert.equal(resolve('authboundry.decision.recorded', 'ALLOW').tone, 'unknown');
});

const evidenceText = (props) => text(EvidenceSummary(props));
test('evidence never claims a check that was not made', () => {
  assert.match(evidenceText({ claims: [{ label: 'Principal', value: 'a' }] }), /Recorded facts · not independently verified/);
  assert.equal(EvidenceSummary({ claims: [{ label: 'P', value: 'a' }] }).a['data-evidence'], 'recorded');
  assert.match(evidenceText({ claims: [{ label: 'C', value: 'v', verification: 'verified', checks: ['Hash'] }] }), /^EvidenceVerified/);
  const mixed = EvidenceSummary({ claims: [
    { label: 'C', value: 'v', verification: 'verified', checks: ['Hash'] },
    { label: 'A', value: 'x', verification: 'verification_failed', checks: ['Digest'] },
    { label: 'O', value: 'ops' },
  ] });
  assert.equal(mixed.a['data-evidence'], 'partial');
  assert.match(text(mixed), /1 of 2 checked claims verified · 1 failed · 1 recorded, not checked/);
  // One verified claim beside recorded ones is not "Verified".
  const one = EvidenceSummary({ claims: [{ label: 'C', value: 'v', verification: 'verified', checks: ['Hash'] }, { label: 'O', value: 'ops' }] });
  assert.equal(one.a['data-evidence'], 'partial');
  assert.match(text(one), /1 of 1 checked claims verified · 1 recorded, not checked/);
  // "verified" without a listed check is not evaluated: a record, not a check.
  assert.equal(EvidenceSummary({ claims: [{ label: 'C', value: 'v', verification: 'verified' }] }).a['data-evidence'], 'recorded');
  assert.equal(EvidenceSummary({ claims: [{ label: 'C', value: 'v', verification: 'not_evaluated' }] }).a['data-evidence'], 'recorded');
  // Not verified is a check that did not pass.
  assert.match(evidenceText({ claims: [{ label: 'C', value: 'v', verification: 'not_verified', checks: ['Hash'] }] }), /0 of 1 checked claims verified/);
  assert.match(evidenceText({ claims: [{ label: 'A', value: 'a', verification: 'verified', checks: ['x'] }, { label: 'B', value: 'b', verification: 'verified', checks: ['y'] }] }), /All 2 claims verified/);
  assert.match(evidenceText({ claims: [{ label: 'Policy', value: null }] }), /—/);
});
