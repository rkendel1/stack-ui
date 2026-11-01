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

// 0.6.0: brand, marketing and new components.
import { Alert, Checkbox, FieldGroup, ActivityTimeline, SiteHeader, SiteFooter, ThemeSwitch, BrandMark, PORTFOLIO, THEME_INIT_SCRIPT } from '@stack-ui/react';
export const alert = Alert({ tone: 'attention', title: 'Read only', children: 'Writes are paused.' });
export const box = Checkbox({ label: 'Include archived', checked: true, onChange: (checked: boolean) => checked });
export const group = FieldGroup({ legend: 'Scopes', children: box });
export const timeline = ActivityTimeline({ items: [{ at: '2026-10-01T00:00:00Z', summary: 'Grant created', actor: 'ops' }], hasMore: true });
export const header = SiteHeader({ product: { id: 'feltdb' }, navigation: [{ label: 'Docs', href: '/docs' }], theme: { preference: 'system' } });
export const footer = SiteFooter({ product: { id: 'feltkit' }, columns: [{ title: 'Product', links: [{ label: 'Docs', href: '/docs' }] }], year: 2026 });
export const themeSwitch = ThemeSwitch({ preference: 'dark' });
export const mark = BrandMark({ title: 'Boundry' });
export const company: string = PORTFOLIO.company.href + THEME_INIT_SCRIPT;
export const shellFamily = Shell({ product: { id: 'feltdb', name: 'FeltDB', homeHref: '/' }, navigation: [], family: true });
// @ts-expect-error: a checkbox needs its visible label.
export const unlabelled = Checkbox({ checked: true });
// @ts-expect-error: success is a state, not an alert tone.
export const successAlert = Alert({ tone: 'positive' });
// Server components import the theme script from core (no React), typed.
import { THEME_INIT_SCRIPT as coreScript, type ThemePreference as CorePreference } from '@stack-ui/core/theme';
export const serverScript: string = coreScript;
export const corePreference: CorePreference = 'system';
