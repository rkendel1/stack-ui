// Compile-only check of @stack-ui/react's declarations: `pnpm check:types`.
import {
  Shell, DataTable, Tabs, TabPanel, FilterBar, Pagination, Breadcrumbs, StatusIndicator, VerificationBadge,
  setThemePreference, initThemePreference, focusMain, type ThemePreference,
} from '@stack-ui/react';

export const shell = Shell({
  product: { name: 'Compute', homeHref: '#/' },
  navigation: [{ id: 'home', label: 'Home', href: '#/', current: true }],
  theme: { preference: 'dark', onChange: (preference: ThemePreference) => setThemePreference(preference) },
  children: StatusIndicator({ field: 'compute.health', value: 'healthy' }),
});
export const table = DataTable({
  label: 'Deployments',
  columns: [{ id: 'project', header: 'Project', sortable: true }],
  rows: [{ key: 'web', cells: { project: 'web' }, onSelect: () => undefined }],
  sort: { column: 'project', direction: 'ascending' },
  onSort: (column: string) => column,
});
export const tabs = Tabs({ tabs: [{ id: 'a', label: 'A', disabled: true, reason: 'Not yet' }], active: 'a', onSelect: (id: string) => id });
export const panel = TabPanel({ id: 'p', active: 'a' });
export const filters = FilterBar({ filters: [{ id: 'f', label: 'Field', type: 'select', options: ['a', { value: 'b', label: 'B' }] }], onChange: (id: string, value: string) => `${id}${value}` });
export const pages = Pagination({ hasNext: true, onNext: () => undefined, summary: '8 shown' });
export const crumbs = Breadcrumbs({ items: [{ label: 'Home', href: '#/' }, { label: 'Here' }] });
export const badge = VerificationBadge({ state: 'verified', checks: ['Hash'] });
export const start: ThemePreference = initThemePreference();
// @ts-expect-error: a table needs its accessible name.
export const unnamed = DataTable({ columns: [], rows: [] });
// @ts-expect-error: rows are keyed by column id, not positional arrays.
export const positional = DataTable({ label: 'T', columns: [], rows: [['a']] });
focusMain('studio-main');

// ---- PR4 ----
import { TextField, Select, Form, Dialog, ConfirmAction, confirmAction, formDialog } from '@stack-ui/react';

export const field = TextField({ name: 'name', label: 'Key name', required: true, hint: 'Shown in lists', onChange: (value: string) => value });
export const area = TextField({ name: 'payload', label: 'Payload JSON', multiline: true, rows: 6 });
export const choice = Select({ name: 'priority', label: 'Priority', options: ['normal', { value: 'high', label: 'High' }], value: 'normal' });
export const form = Form({ label: 'Create API key', submitLabel: 'Create API key', busy: false, onSubmit: (event) => event.preventDefault(), children: field });
export const dialog = Dialog({ title: 'Edit', open: true, onClose: () => undefined });
export const confirm = ConfirmAction({ title: 'Revoke key?', consequences: ['Callers are refused'], confirmLabel: 'Revoke API key', requireText: 'ci', open: false });
export const asked: Promise<boolean> = confirmAction({ title: 'Delete?', confirmLabel: 'Delete file record', action: async () => undefined });
export const values: Promise<Record<string, string> | null> = formDialog({ title: 'Rename', fields: [{ name: 'name', label: 'File name', required: true }] });
// @ts-expect-error: a field needs a visible label.
export const unlabelled = TextField({ name: 'x' });
// @ts-expect-error: a confirmation must name its action.
export const unnamedConfirm = ConfirmAction({ title: 'Sure?' });

// ---- PR5 ----
import { EvidenceSummary } from '@stack-ui/react';
export const evidence = EvidenceSummary({
  title: 'Decision evidence', outcome: StatusIndicator({ field: 'authboundry.decision.recorded', value: 'deny' }),
  claims: [{ label: 'Principal', value: 'agent:ci', mono: true }, { label: 'Contract', value: 'v3', verification: 'verified', checks: ['Snapshot hash'] }],
  source: 'Recorded by AuthBoundry', recordedAt: 1760306400000,
});
// @ts-expect-error: a claim's verification is one of the four states.
export const badClaim = EvidenceSummary({ claims: [{ label: 'X', verification: 'probably' }] });
