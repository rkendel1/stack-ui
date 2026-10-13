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
