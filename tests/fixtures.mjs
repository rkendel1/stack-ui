// Component fixtures shared by the DOM-parity and accessibility tests. Props
// named in FUNCTION_PROPS are `true` here and replaced by a no-op handler on
// each side, since functions cannot cross into the browser.
export const FUNCTION_PROPS = ['onClick', 'onRetry'];

export const FIXTURES = [
  ['StatusIndicator', { field: 'compute.health', value: 'healthy' }],
  ['StatusIndicator', { field: 'compute.deployment.status', value: 'rolled_back' }],
  ['StatusIndicator', { field: 'compute.job.status', value: 'not_a_real_state' }],
  ['StatusIndicator', { tone: 'progress', label: 'Releasing · Network ready', className: 'state', attrs: { 'data-x': '1' } }],
  ['StatusIndicator', { field: 'compute.process.state', value: 'ready', detail: 'pid 42 · 1 restart' }],
  ['StatusIndicator', { field: 'feltdb.authority.lease_clock_healthy', value: false }],
  ['VerificationBadge', { state: 'verified', checks: ['Content matches revision id'] }],
  ['VerificationBadge', { state: 'verified', checks: [] }],
  ['VerificationBadge', { state: 'verified', checks: ['Source', 'Build', 'Tests'], at: '2026-10-12T22:00:00Z', evidenceHref: '#evidence' }],
  ['VerificationBadge', { state: 'verification_failed', checks: [{ label: 'Content matches revision id', status: 'failed' }] }],
  ['VerificationBadge', { state: 'not_verified' }],
  ['FreshnessLabel', { freshness: 'live', asOf: '2026-10-12T22:00:00Z' }],
  ['FreshnessLabel', { freshness: 'stale', asOf: '2026-10-12T22:00:00Z' }],
  ['FreshnessLabel', { freshness: 'cached', asOf: 1760306400000, source: 'control plane' }],
  ['FreshnessLabel', { freshness: 'bogus' }],
  ['FreshnessLabel', { freshness: 'stale', asOf: 'not-a-time' }],
  ['VerificationBadge', { state: 'verified', checks: ['Hash'], at: 'garbage' }],
  ['Unavailable', { status: 'unsupported', capability: 'state.branch.heads', reason: 'The state model has no branch refs.' }],
  ['Unavailable', { status: 'partial', capability: 'data.records.history' }],
  ['Unavailable', { status: 'unsupported', capability: 'state.branch.heads', title: 'Named branches', headingLevel: 3 }],
  ['Loading', { what: 'the instance overview' }],
  ['Loading', { what: 'replication health', long: true }],
  ['EmptyState', { title: 'No records yet', body: 'Records appear when an application writes them.' }],
  ['EmptyState', { variant: 'no-match', headingLevel: 3 }],
  ['ErrorPanel', { title: 'Overview unavailable', message: 'The server did not answer.', code: 'state_unavailable', requestId: 'req_123', onRetry: true }],
  ['ErrorPanel', { message: 'Plain failure' }],
  ['MetadataList', { items: [
    { label: 'Records', value: 0 },
    { label: 'Uptime', value: null },
    { label: 'Authority revision', value: 42, hint: 'Monotonic commit order.' },
    { label: 'Machine', value: 'vm-1234', mono: true, attrs: { 'data-fact': 'machine' } },
  ] }],
  ['ResourceIdentity', { kind: 'Environment', name: 'preprod', id: 'env_0123456789abcdef0123', href: '#/environments/preprod' }],
  ['ResourceIdentity', { id: 'short' }],
  ['PageHeader', { eyebrow: 'Operate', title: 'Overview', description: 'Instance, authority and storage.' }],
  ['Button', { label: 'Deploy', variant: 'primary', onClick: true }],
  ['Button', { label: 'Saving', variant: 'secondary', busy: true }],
  ['Button', { label: 'Stop', variant: 'danger', size: 'sm', disabled: true }],
];

export const COMPONENT_NAMES = [
  'StatusIndicator', 'VerificationBadge', 'FreshnessLabel', 'Unavailable', 'Loading', 'EmptyState',
  'ErrorPanel', 'MetadataList', 'ResourceIdentity', 'PageHeader', 'Button',
];

export function withHandlers(props, handler) {
  const out = { ...props };
  for (const name of FUNCTION_PROPS) if (out[name] === true) out[name] = handler;
  return out;
}
