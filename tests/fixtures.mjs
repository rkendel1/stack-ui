// Component fixtures shared by the DOM-parity and accessibility tests. Props
// named in FUNCTION_PROPS are `true` here, at any depth, and are replaced by a
// handler on each side, since functions cannot cross into the browser.
export const FUNCTION_PROPS = ['onClick', 'onRetry', 'onSelect', 'onSort', 'onChange', 'onSubmit', 'onClear', 'onPrevious', 'onNext',
  'onClose', 'onConfirm', 'onCancel', 'onTypedChange', 'onMore'];

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
  ['Breadcrumbs', { items: [{ label: 'Environments', href: '#/environments' }, { label: 'preprod', href: '#/environments/preprod' }, { label: 'web' }] }],
  ['Breadcrumbs', { items: [{ label: 'Home', href: '#/' }], label: 'You are here' }],
  ['Tabs', { label: 'Project sections', idPrefix: 'project', active: 'logs', panelId: 'project-panel', onSelect: true,
    tabs: [{ id: 'overview', label: 'Overview' }, { id: 'logs', label: 'Logs', className: 'active', badge: '3' }, { id: 'receipts', label: 'Receipts', disabled: true, reason: 'No receipts yet' }] }],
  ['Tabs', { tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], active: 'missing', onSelect: true }],
  ['TabPanel', { id: 'project-panel', idPrefix: 'project', active: 'logs', children: 'Logs appear here.' }],
  ['DataTable', { label: 'Deployments', sort: { column: 'when', direction: 'descending' }, onSort: true,
    columns: [{ id: 'project', header: 'Project', sortable: true }, { id: 'status', header: 'Status' }, { id: 'when', header: 'When', sortable: true, align: 'end' }],
    rows: [
      { key: 'a', cells: { project: 'web', status: 'Active', when: '2 minutes ago' }, onSelect: true, attrs: { 'data-project': 'web' } },
      { key: 'b', cells: { project: 'api', status: null, when: '1 hour ago' }, selected: true },
    ] }],
  ['DataTable', { label: 'Records', columns: [{ id: 'id', header: 'id' }], rows: [], emptyTitle: 'No records yet', emptyBody: 'Records appear when written.' }],
  ['DataTable', { label: 'Records', columns: [{ id: 'id', header: 'id' }], rows: [], noMatch: true, noMatchBody: 'Change the filter.' }],
  ['DataTable', { label: 'Records', columns: [{ id: 'id', header: 'id' }], rows: [], loading: true }],
  ['DataTable', { label: 'Records', columns: [{ id: 'id', header: 'id' }], rows: [], error: { message: 'The server did not answer.', code: 'UNAVAILABLE', onRetry: true } }],
  ['DataTable', { label: 'Records', captionVisible: true, loading: true, columns: [{ id: 'id', header: 'id' }], rows: [{ key: 'x', cells: { id: 'x' } }] }],
  ['FilterBar', { label: 'Filter records', idPrefix: 'records', applied: 1, result: '3 records match', onSubmit: true, onClear: true, onChange: true,
    filters: [
      { id: 'field', label: 'Field', type: 'select', value: 'owner', options: [{ value: '', label: 'Any field' }, { value: 'owner', label: 'owner (indexed)' }, 'title'] },
      { id: 'value', label: 'Equals', value: 'alice', placeholder: 'Value' },
    ] }],
  ['FilterBar', { filters: [{ id: 'actor', label: 'Actor' }], onSubmit: true }],
  ['FilterBar', { live: true, label: 'Filter decisions', applied: 1, onClear: true, onChange: true, result: '1 of 2 decisions match', filters: [{ id: 'principal', label: 'Principal', value: 'alice' }] }],
  ['Pagination', { summary: '8 shown · state version 12', hasPrevious: false, hasNext: true, onPrevious: true, onNext: true }],
  ['Pagination', { hasPrevious: true, hasNext: false, onPrevious: true, label: 'Record pages' }],
  ['Shell', { product: { name: 'Compute', homeHref: '#/', mark: 'C' }, mainId: 'view',
    navigation: [
      { id: 'home', label: 'Home', href: '#/', order: 0, current: true },
      { id: 'envs', label: 'Environments', href: '#/environments', group: 'Manage', order: 1, attrs: { 'data-nav': 'environments' } },
      { id: 'events', label: 'Events', href: '#/events', group: 'Manage', order: 2 },
    ],
    activityHref: '#/events', otherProducts: [{ id: 'feltdb', name: 'FeltDB Studio', href: 'https://studio.example' }],
    theme: { preference: 'dark', onChange: true }, children: 'Page content' }],
  ['Shell', { product: { name: 'FeltDB Studio', homeHref: '/' }, navigation: [{ id: 'o', label: 'Overview', href: '/overview', group: 'Operate' }] }],
  ['TextField', { name: 'name', label: 'Key name', required: true, placeholder: 'ci-deployer', hint: 'Shown in lists and audit records.' }],
  ['TextField', { id: 'variable-name', name: 'name', label: 'Name', value: 'DATABASE_URL', pattern: '[A-Z][A-Z0-9_]*', error: 'Use capital letters, digits and underscores.', onChange: true }],
  ['TextField', { name: 'payload', label: 'Payload JSON', multiline: true, rows: 3, value: '{}' }],
  ['TextField', { name: 'size', label: 'Size in bytes', type: 'number', min: 0, readOnly: true, value: 12 }],
  ['Select', { name: 'environment', label: 'Environment', value: 'staging', options: ['production', 'staging', { value: 'development', label: 'Development', disabled: true }] }],
  ['Select', { id: 'priority', name: 'priority', label: 'Priority', hint: 'Urgent interrupts.', options: ['low', 'normal'], onChange: true, disabled: true }],
  ['Form', { label: 'Create API key', submitLabel: 'Create API key', onSubmit: true, children: [{ t: 'p', a: {}, c: ['Fields'] }] }],
  ['Form', { id: 'create', label: 'Queue job', submitLabel: 'Queue job', busy: true, layout: 'inline', onSubmit: true, children: 'Fields' }],
  ['Dialog', { id: 'edit', title: 'Edit value', description: 'Replaces the stored value.', onClose: true, children: 'Body', actions: 'Actions' }],
  ['ConfirmAction', { id: 'revoke', title: 'Revoke API key ci?', confirmLabel: 'Revoke API key', consequences: ['Callers using this key are refused.', 'This cannot be undone.'], onConfirm: true, onCancel: true }],
  ['ConfirmAction', { id: 'delete', title: 'Delete DATABASE_URL?', confirmLabel: 'Delete variable', requireText: 'DATABASE_URL', onConfirm: true, onCancel: true }],
  ['ConfirmAction', { title: 'Disable schedule?', confirmLabel: 'Disable schedule', busy: true, error: { message: 'Not allowed', code: 'FORBIDDEN' }, onConfirm: true, onCancel: true }],
  ['EvidenceSummary', { id: 'decision', title: 'Decision evidence', source: 'Recorded by AuthBoundry', recordedAt: '2026-10-12T22:00:00Z',
    claims: [{ label: 'Principal', value: 'agent:ci', mono: true }, { label: 'Policy', value: null }, { label: 'Claim role', value: 'owner' }] }],
  ['EvidenceSummary', { claims: [
    { label: 'Contract', value: 'v3', verification: 'verified', checks: ['Snapshot hash'] },
    { label: 'Artifact', value: 'sha256:ab12', verification: 'verification_failed', checks: [{ label: 'Digest', status: 'failed' }], evidenceHref: '#e' },
    { label: 'Owner', value: 'ops' },
  ] }],
  ['EvidenceSummary', { title: 'Checks', headingLevel: 3, claims: [{ label: 'Hash', value: 'ok', verification: 'verified', checks: ['Hash'] }, { label: 'Size', value: 0, verification: 'verified', checks: ['Size'] }] }],
  ['Shell', { product: { id: 'feltdb', name: 'FeltDB', homeHref: '/', mark: 'FD' }, mainId: 'family', navigation: [{ id: 'o', label: 'Overview', href: '/' }] }],
  ['Alert', { tone: 'info', title: 'Maintenance window', children: 'Writes pause at 02:00 UTC.' }],
  ['Alert', { tone: 'attention', title: 'Read only', children: 'The authority lease is held elsewhere.', attrs: { 'data-x': '1' } }],
  ['Alert', { tone: 'critical', title: 'Authority unavailable', children: 'Changes cannot be made.' }],
  ['Alert', { tone: 'positive', children: 'Not a tone: falls back to info.' }],
  ['Checkbox', { id: 'archived', name: 'archived', label: 'Include archived', hint: 'Archived records are read-only.' }],
  ['Checkbox', { id: 'terms', name: 'terms', label: 'I understand', required: true, checked: true, error: 'Required to continue', onChange: true }],
  ['Checkbox', { id: 'locked', label: 'Locked', disabled: true, checked: true }],
  ['FieldGroup', { id: 'scopes', legend: 'Scopes', hint: 'Choose at least one.', error: 'Select a scope', required: true }],
  ['ActivityTimeline', { items: [
    { id: 'a', at: '2026-10-12T22:00:00Z', summary: 'Grant created', actor: 'ops@example.com', href: '#grant' },
    { id: 'b', at: 'not-a-time', summary: 'Policy evaluated' },
    { id: 'c', summary: 'Imported record' },
  ], hasMore: true, moreHref: '#older' }],
  ['ActivityTimeline', { items: [], loading: true }],
  ['ActivityTimeline', { items: [], error: 'The audit log did not answer.' }],
  ['ActivityTimeline', { items: [] }],
  ['ActivityTimeline', { items: [{ at: '2026-10-12T22:00:00Z', summary: 'Run started' }], hasMore: true, onMore: true }],
  ['BrandMark', { idPrefix: 'gallery-mark' }],
  ['BrandMark', { idPrefix: 'gallery-mark-titled', title: 'Boundry' }],
  ['ThemeSwitch', { id: 'gallery-theme', preference: 'dark', onChange: true }],
  ['SiteHeader', { mainId: 'company', navigation: [{ label: 'Ecosystem', href: '/ecosystem/', current: true }, { label: 'About', href: '/about/' }], theme: { preference: 'system', onChange: true } }],
  ['SiteHeader', { mainId: 'product', product: { id: 'feltdb' }, navigation: [{ label: 'Docs', href: '/docs' }], actions: 'Sign in' }],
  ['SiteFooter', { id: 'f-company', tagline: 'Infrastructure for applications and agents.', year: 2026, columns: [{ title: 'Company', links: [{ label: 'About', href: '/about/' }] }] }],
  ['SiteFooter', { id: 'f-product', product: { id: 'feltkit' }, year: 2026, legal: 'MIT licensed', columns: [{ title: 'Product', links: [{ label: 'Docs', href: '/docs' }] }] }],
];

export const COMPONENT_NAMES = [
  'StatusIndicator', 'VerificationBadge', 'FreshnessLabel', 'Unavailable', 'Loading', 'EmptyState',
  'ErrorPanel', 'MetadataList', 'ResourceIdentity', 'PageHeader', 'Button',
  'Breadcrumbs', 'Tabs', 'TabPanel', 'DataTable', 'FilterBar', 'Pagination', 'Shell',
  'TextField', 'Select', 'Form', 'Dialog', 'ConfirmAction', 'EvidenceSummary',
  'Alert', 'Checkbox', 'FieldGroup', 'ActivityTimeline', 'BrandMark', 'ThemeSwitch', 'SiteHeader', 'SiteFooter',
];

/// Replaces `true` placeholders with `handler`, at any depth. The same source
/// runs in the browser (see REPLACE_SOURCE), so both sides build equal props.
export function withHandlers(value, handler, keys = FUNCTION_PROPS) {
  if (Array.isArray(value)) return value.map((item) => withHandlers(item, handler, keys));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = keys.includes(key) && entry === true ? handler : withHandlers(entry, handler, keys);
  }
  return out;
}
export const REPLACE_SOURCE = `window.__withHandlers = (function () { const FUNCTION_PROPS = ${JSON.stringify(FUNCTION_PROPS)}; return ${withHandlers.toString()}; })();`;
