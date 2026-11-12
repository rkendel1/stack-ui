// Charts (docs/charts.md): structure, data contract, states, formatting and
// layout, checked on the view trees every renderer draws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AreaChart, BarChart, CHARTS, DonutChart, LineChart, Sparkline, StackedBarChart,
  formatChartValue, niceTicks, normalizeSeries,
} from '../../packages/core/src/charts.js';
import { toHtml } from '../../packages/core/src/html.js';

// ---- helpers over trees -------------------------------------------------------
const all = (tree, pred, out = []) => {
  if (Array.isArray(tree)) { for (const t of tree) all(t, pred, out); return out; }
  if (!tree || typeof tree !== 'object' || !tree.t) return out;
  if (pred(tree)) out.push(tree);
  for (const c of tree.c) all(c, pred, out);
  return out;
};
const hasClass = (name) => (n) => String(n.a.class || '').split(' ').includes(name);
const text = (tree) => (Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : tree && tree.c ? text(tree.c) : '');
const tableRows = (tree) => all(tree, (n) => n.t === 'tr').map((tr) => tr.c.filter((c) => c && c.t).map(text));
const deepFreeze = (v) => { if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; };
const series = (id, label, ys, xs = ['Jan', 'Feb', 'Mar', 'Apr']) => ({ id, label, data: ys.map((y, i) => ({ x: xs[i], y })) });

const usd = { style: 'currency', currency: 'USD' };

test('every chart type renders a captioned figure with a plot, a legend where useful, and a data table', () => {
  const two = [series('a', 'Income', [1, 2, 3, 4]), series('b', 'Expenses', [2, 1, 2, 1])];
  for (const [Chart, kind] of [[LineChart, 'line'], [AreaChart, 'area'], [BarChart, 'bar'], [StackedBarChart, 'bar']]) {
    const t = Chart({ title: 'T', description: 'D', series: two });
    assert.equal(t.t, 'figure');
    assert.equal(t.a['data-chart'], kind);
    assert.equal(t.a['data-chart-state'], 'ready');
    assert.equal(text(all(t, hasClass('stack-chart__title'))), 'T');
    assert.equal(all(t, (n) => n.t === 'svg').length, 1);
    assert.equal(all(t, hasClass('stack-chart__legend-item')).length, 2);
    assert.equal(all(t, hasClass('stack-chart__series')).length, 2);
    assert.deepEqual(tableRows(t)[0], ['Category', 'Income', 'Expenses']);
  }
  const donut = DonutChart({ title: 'Mix', series: [series('m', 'Spend', [5, 3, 2])] });
  assert.equal(all(donut, hasClass('stack-chart__slice')).length, 3);
  const spark = Sparkline({ label: 'Trend', data: [{ x: 1, y: 1 }, { x: 2, y: 3 }] });
  assert.equal(spark.a.class, 'stack-sparkline');
  assert.deepEqual(Object.keys(CHARTS), ['LineChart', 'AreaChart', 'BarChart', 'StackedBarChart', 'DonutChart', 'Sparkline']);
});

test('a single series has no legend unless asked; legend: false hides it', () => {
  assert.equal(all(LineChart({ title: 'T', series: [series('a', 'A', [1, 2])] }), hasClass('stack-chart__legend')).length, 0);
  assert.equal(all(LineChart({ title: 'T', legend: true, series: [series('a', 'A', [1, 2])] }), hasClass('stack-chart__legend')).length, 1);
  assert.equal(all(LineChart({ title: 'T', legend: false, series: [series('a', 'A', [1]), series('b', 'B', [2])] }), hasClass('stack-chart__legend')).length, 0);
});

test('legends follow the supplied series in order; hidden series stay in the legend but leave plot and table', () => {
  const t = LineChart({ title: 'T', series: [series('z', 'Zeta', [1, 2]), { ...series('a', 'Alpha', [3, 4]), hidden: true }, series('m', 'Mu', [5, 6])] });
  assert.deepEqual(all(t, hasClass('stack-chart__legend-label')).map(text), ['Zeta', 'Alpha', 'Mu']);
  assert.equal(all(t, hasClass('stack-chart__legend-item--hidden')).length, 1);
  assert.deepEqual(all(t, hasClass('stack-chart__series')).map((g) => g.a['data-series']), ['z', 'm']);
  assert.deepEqual(tableRows(t)[0], ['Category', 'Zeta', 'Mu']);
  // Colours stay with the series: hiding one does not recolour the others.
  assert.ok(String(all(t, hasClass('stack-chart__series'))[1].a.class).includes('stack-chart__s3'));
});

test('legend toggles are buttons reporting their pressed state and calling back with the series id', () => {
  const calls = [];
  const t = BarChart({ title: 'T', onToggleSeries: (id) => calls.push(id), series: [series('a', 'A', [1]), { ...series('b', 'B', [2]), hidden: true }] });
  const buttons = all(t, (n) => n.t === 'button');
  assert.deepEqual(buttons.map((b) => b.a['aria-pressed']), ['true', 'false']);
  buttons[1].on.click();
  assert.deepEqual(calls, ['b']);
});

test('null and missing values are gaps: lines split, isolated points are marked, the table says —', () => {
  const t = LineChart({ title: 'T', series: [series('a', 'A', [1, null, 3, 4]), series('b', 'B', [5, 6], ['Jan', 'Mar'])] });
  const [a, b] = all(t, hasClass('stack-chart__series'));
  assert.equal(all(a, hasClass('stack-chart__line')).length, 1, 'Mar–Apr is one segment');
  assert.equal(all(a, hasClass('stack-chart__point')).length, 1, 'Jan stands alone: marked');
  assert.equal(all(b, hasClass('stack-chart__point')).length, 2, 'B has values in Jan and Mar only');
  assert.deepEqual(tableRows(t).slice(1), [['Jan', '1', '5'], ['Feb', '—', '—'], ['Mar', '3', '6'], ['Apr', '4', '—']]);
  assert.equal(all(t, (n) => n.a['data-missing'] === 'true').length, 3);
});

test('x order is deterministic: categories in first-seen order, time and numbers ascending', () => {
  assert.deepEqual(normalizeSeries('T', [series('a', 'A', [1, 2], ['b', 'a']), series('c', 'C', [3], ['z'])]).keys, ['b', 'a', 'z']);
  const time = normalizeSeries('T', [{ id: 'a', label: 'A', data: [{ x: '2026-03-01', y: 1 }, { x: '2026-01-01', y: 2 }] }], 'time');
  assert.deepEqual(time.keys, [Date.parse('2026-01-01'), Date.parse('2026-03-01')]);
  assert.deepEqual(time.series[0].y, [2, 1]);
  const t = LineChart({ title: 'T', xType: 'time', series: [{ id: 'a', label: 'A', data: [{ x: '2026-02-01', y: 1 }, { x: '2026-01-01', y: 2 }] }] });
  assert.deepEqual(tableRows(t).slice(1).map((r) => r[0]), ['Jan 2026', 'Feb 2026']);
  const daily = LineChart({ title: 'T', xType: 'time', series: [{ id: 'a', label: 'A', data: [{ x: '2026-01-15', y: 1 }] }] });
  assert.deepEqual(tableRows(daily)[1][0], '2026-01-15');
});

test('invalid input fails predictably with a TypeError that names the problem', () => {
  const bad = [
    [{ series: 'nope' }, /series must be an array/],
    [{ series: [{ id: '', label: 'A', data: [] }] }, /non-empty string id/],
    [{ series: [series('a', 'A', [1]), series('a', 'B', [2])] }, /used twice/],
    [{ series: [{ id: 'a', data: [] }] }, /needs a label/],
    [{ series: [{ id: 'a', label: 'A', data: [{ x: 'Jan', y: Number.NaN }] }] }, /finite number or null/],
    [{ series: [{ id: 'a', label: 'A', data: [{ x: 'Jan', y: Infinity }] }] }, /finite number or null/],
    [{ series: [{ id: 'a', label: 'A', data: [{ x: 'Jan', y: '12' }] }] }, /finite number or null/],
    [{ series: [{ id: 'a', label: 'A', data: [{ x: 'Jan', y: 1 }, { x: 'Jan', y: 2 }] }] }, /two points at x/],
    [{ series: [{ id: 'a', label: 'A', data: [{ x: {}, y: 1 }] }] }, /invalid x/],
    [{ xType: 'time', series: [{ id: 'a', label: 'A', data: [{ x: 'yesterday', y: 1 }] }] }, /not a time/],
    [{ xType: 'weekly', series: [] }, /xType must be/],
  ];
  for (const [props, message] of bad) assert.throws(() => LineChart({ title: 'T', ...props }), (e) => e instanceof TypeError && message.test(e.message), JSON.stringify(props));
  assert.throws(() => DonutChart({ title: 'T', series: [series('a', 'A', [1]), series('b', 'B', [2])] }), /exactly one series/);
  assert.throws(() => Sparkline({ data: [] }), /needs a label/);
});

test('inputs are never mutated, and the same input always renders the same output', () => {
  const props = deepFreeze({ title: 'T', xType: 'time', format: usd, series: [{ id: 'a', label: 'A', data: [{ x: '2026-02-01', y: 2 }, { x: '2026-01-01', y: null }] }, series('b', 'B', [1, 2], ['2026-01-01', '2026-02-01'])] });
  const snapshot = JSON.stringify(props);
  for (const Chart of [LineChart, AreaChart, BarChart, StackedBarChart]) {
    const a = toHtml(Chart(props));
    assert.equal(toHtml(Chart(props)), a, `${Chart.name} is deterministic`);
  }
  DonutChart(deepFreeze({ title: 'D', series: [series('d', 'D', [3, 1])] }));
  Sparkline(deepFreeze({ label: 'S', data: [{ x: 1, y: 2 }] }));
  assert.equal(JSON.stringify(props), snapshot);
});

test('formatting: currency, minor units, percent, compact, functions, large and missing values', () => {
  assert.equal(formatChartValue(1234.5, usd), '$1,234.50');
  assert.equal(formatChartValue(123456, { ...usd, divisor: 100 }), '$1,234.56');
  assert.equal(formatChartValue(-98765432, { ...usd, divisor: 100 }), '-$987,654.32');
  assert.equal(formatChartValue(12_345_678_901_234, usd), '$12,345,678,901,234.00');
  assert.equal(formatChartValue(1_500_000, { ...usd, compact: true }), '$1.5M');
  assert.equal(formatChartValue(15_000, { ...usd, compact: true }), '$15K');
  assert.equal(formatChartValue(999.95, { compact: true }), '1K', 'rounding picks the unit');
  assert.equal(formatChartValue(0.256, { style: 'percent' }), '25.6%');
  assert.equal(formatChartValue(0.25, { style: 'percent', maximumFractionDigits: 0 }), '25%');
  assert.equal(formatChartValue(1.005, usd), '$1.01');
  assert.equal(formatChartValue(-0.001, usd), '$0.00', 'no negative zero');
  assert.equal(formatChartValue(1000, { style: 'currency', currency: 'JPY' }), '¥1,000');
  assert.equal(formatChartValue(5, { style: 'currency', currency: 'SEK' }), 'SEK 5.00');
  assert.equal(formatChartValue(1234.5678), '1,234.57');
  assert.equal(formatChartValue(3, { suffix: ' h' }), '3 h');
  assert.equal(formatChartValue(7, (v) => `#${v}`), '#7');
  assert.equal(formatChartValue(null, usd), '—');
  // The format reaches tooltips, the table and the axis (compact for large values).
  const t = BarChart({ title: 'T', format: { ...usd, divisor: 100 }, series: [series('a', 'A', [1_250_000, 0])] });
  assert.deepEqual(tableRows(t)[1], ['Jan', '$12,500.00']);
  assert.ok(all(t, hasClass('stack-chart__tick')).map(text).includes('$10K'));
  assert.match(all(t, hasClass('stack-chart__target'))[0].a['aria-label'], /A \$12,500\.00/);
});

test('loading, error and empty states replace the plot and keep the caption', () => {
  const loading = LineChart({ title: 'Revenue', loading: true, series: [] });
  assert.equal(loading.a['data-chart-state'], 'loading');
  assert.equal(loading.a['aria-busy'], 'true');
  assert.equal(all(loading, (n) => n.a.role === 'status').length, 1);
  const failed = LineChart({ title: 'Revenue', loading: true, error: { message: 'Boom', code: 'X1' }, onRetry: () => {}, series: [] });
  assert.equal(failed.a['data-chart-state'], 'error', 'error wins over loading');
  assert.equal(all(failed, (n) => n.a.role === 'alert').length, 1);
  assert.match(text(failed), /Boom/);
  assert.equal(all(failed, (n) => n.t === 'button').length, 1, 'retry offered');
  const empty = BarChart({ title: 'Revenue', series: [series('a', 'A', [null, null])], emptyTitle: 'No revenue yet' });
  assert.equal(empty.a['data-chart-state'], 'empty');
  assert.match(text(empty), /No revenue yet/);
  assert.equal(all(empty, (n) => n.t === 'svg').length, 0);
  for (const t of [loading, failed, empty]) assert.equal(text(all(t, hasClass('stack-chart__title'))), 'Revenue');
  assert.equal(LineChart({ title: 'T', series: [] }).a['data-chart-state'], 'empty');
});

test('layout follows the given width: viewBox, tick density and label thinning', () => {
  const months = Array.from({ length: 24 }, (_, i) => `Month ${i + 1}`);
  const props = { title: 'T', series: [{ id: 'a', label: 'A', data: months.map((x, i) => ({ x, y: i * 1000 })) }] };
  const wide = BarChart({ ...props, width: 1000 });
  const narrow = BarChart({ ...props, width: 280 });
  const box = (t) => all(t, (n) => n.t === 'svg')[0].a.viewBox;
  assert.equal(box(wide).split(' ')[2], '1000');
  assert.equal(box(narrow).split(' ')[2], '280');
  const labels = (t) => all(t, (n) => n.t === 'g' && hasClass('stack-chart__axis--category')(n))[0].c.filter(Boolean).length;
  assert.ok(labels(narrow) < labels(wide), `narrow ${labels(narrow)} < wide ${labels(wide)}`);
  assert.ok(labels(narrow) >= 2);
  const height = (t) => Number(box(t).split(' ')[3]);
  assert.ok(height(narrow) >= 180 && height(wide) <= 420);
  assert.equal(box(BarChart({ ...props, width: 600, height: 250 })), '0 0 600 250');
  assert.equal(box(BarChart({ ...props, width: 600, aspectRatio: 3 })), '0 0 600 200');
  assert.ok(Number(box(BarChart({ ...props, width: 20 })).split(' ')[2]) >= 120, 'a minimum width keeps it legible');
});

test('long labels are shortened on the axis and kept whole in the table and tooltip', () => {
  const long = 'Professional services and consulting revenue from enterprise customers';
  const t = BarChart({ title: 'T', width: 360, orientation: 'horizontal', series: [series('a', 'A', [5, 3], [long, 'Short'])] });
  const axis = all(t, hasClass('stack-chart__axis--category'))[0];
  const shown = text(axis.c[0]);
  assert.ok(shown.endsWith('…') && shown.length < long.length, shown);
  assert.equal(tableRows(t)[1][0], long);
  assert.match(all(t, hasClass('stack-chart__target'))[0].a['aria-label'], new RegExp(long));
});

test('large datasets render; past 60 categories marks stop being tab stops and the table carries the values', () => {
  const data = Array.from({ length: 500 }, (_, i) => ({ x: Date.UTC(2025, 0, 1) + i * 86400000, y: Math.round(1000 + 300 * Math.sin(i / 20)) }));
  const t = LineChart({ title: 'Daily', xType: 'time', series: [{ id: 'd', label: 'Daily', data }] });
  assert.equal(all(t, hasClass('stack-chart__target')).length, 500);
  assert.equal(all(t, (n) => n.a.tabindex !== undefined).length, 0);
  assert.equal(tableRows(t).length, 501);
  assert.match(all(t, (n) => n.t === 'svg')[0].a['aria-label'], /data table/);
  const few = LineChart({ title: 'Few', series: [series('a', 'A', [1, 2, 3])] });
  assert.equal(all(few, (n) => n.a.tabindex === '0').length, 3);
});

test('negative and zero values: bars grow from the zero line, stacks split by sign, zero draws nothing', () => {
  const t = BarChart({ title: 'T', width: 400, height: 300, series: [series('a', 'A', [10, -5, 0])] });
  const zero = all(t, hasClass('stack-chart__zero'));
  assert.equal(zero.length, 1);
  const zeroY = Number(zero[0].a.y1);
  const rects = all(t, hasClass('stack-chart__bar'));
  assert.equal(rects.length, 2, 'the zero value has no bar');
  assert.ok(Number(rects[0].a.y) + Number(rects[0].a.height) <= zeroY + 0.01, 'positive above zero');
  assert.ok(Math.abs(Number(rects[1].a.y) - zeroY) < 0.01, 'negative starts at zero and goes down');
  assert.deepEqual(tableRows(t)[3], ['Mar', '0']);
  const stacked = StackedBarChart({ title: 'S', width: 400, height: 300, series: [series('p', 'P', [4]), series('n', 'N', [-2]), series('q', 'Q', [3])] });
  const [p, n, q] = all(stacked, hasClass('stack-chart__series')).map((g) => all(g, hasClass('stack-chart__bar'))[0].a);
  const zy = Number(all(stacked, hasClass('stack-chart__zero'))[0].a.y1);
  assert.ok(Math.abs(Number(p.y) + Number(p.height) - zy) < 0.01, 'first positive sits on zero');
  assert.ok(Math.abs(Number(q.y) + Number(q.height) - Number(p.y)) < 0.01, 'second positive sits on the first');
  assert.ok(Math.abs(Number(n.y) - zy) < 0.01, 'negative hangs below zero');
  const area = AreaChart({ title: 'A', series: [series('c', 'Cash', [3, -2, 1])] });
  assert.equal(all(area, hasClass('stack-chart__area')).length, 1);
});

test('single-point datasets are visible', () => {
  for (const Chart of [LineChart, AreaChart]) {
    const t = Chart({ title: 'T', series: [series('a', 'A', [42], ['Only'])] });
    assert.equal(all(t, hasClass('stack-chart__point')).length, 1, Chart.name);
  }
  assert.equal(all(BarChart({ title: 'T', series: [series('a', 'A', [42], ['Only'])] }), hasClass('stack-chart__bar')).length, 1);
  assert.equal(all(Sparkline({ label: 'S', data: [{ x: 1, y: 3 }] }), hasClass('stack-sparkline__point')).length, 1);
});

test('donut: shares, zero slices listed but not drawn, a full circle, centre text, negatives refused visibly', () => {
  const t = DonutChart({ title: 'Mix', format: { style: 'currency', currency: 'USD', divisor: 100 }, series: [series('m', 'Spend', [7500, 2500, 0], ['Rent', 'Software', 'Meals'])] });
  assert.equal(all(t, hasClass('stack-chart__slice')).length, 2);
  assert.deepEqual(all(t, hasClass('stack-chart__legend-note')).map(text), ['$75.00 · 75.0%', '$25.00 · 25.0%', '$0.00 · 0.0%']);
  assert.equal(text(all(t, hasClass('stack-chart__center-value'))), '$100.00');
  assert.deepEqual(tableRows(t)[0], ['Category', 'Spend', 'Share']);
  const own = DonutChart({ title: 'Mix', centerValue: '$99.99', centerLabel: 'Ledger total', series: [series('m', 'S', [1, 1])] });
  assert.equal(text(all(own, hasClass('stack-chart__center-value'))), '$99.99');
  const full = DonutChart({ title: 'One', series: [series('m', 'S', [5], ['All'])] });
  assert.equal((all(full, hasClass('stack-chart__arc'))[0].a.d.match(/M/g) || []).length, 2, 'two half arcs');
  const neg = DonutChart({ title: 'Net', series: [series('m', 'S', [10, -2], ['Sales', 'Refunds'])] });
  assert.equal(neg.a['data-chart-state'], 'unsupported');
  assert.match(text(neg), /Refunds \(-2\)/);
  assert.equal(all(neg, hasClass('stack-chart__slice')).length, 0);
  assert.equal(DonutChart({ title: 'Z', series: [series('m', 'S', [0, 0])] }).a['data-chart-state'], 'empty');
});

test('sparkline: an image named by its label and summarized in text; gaps; no data', () => {
  const t = Sparkline({ label: 'Checking', format: { style: 'currency', currency: 'USD' }, endpoints: true, data: [{ x: 1, y: 100 }, { x: 2, y: null }, { x: 3, y: 80 }, { x: 4, y: 140 }] });
  const svg = all(t, (n) => n.t === 'svg')[0];
  assert.equal(svg.a.role, 'img');
  assert.equal(svg.a['aria-label'], 'Checking: $100.00 to $140.00, low $80.00, high $140.00, 1 missing');
  assert.equal(t.a['data-trend'], 'up');
  assert.equal(all(t, hasClass('stack-sparkline__endpoint')).length, 2);
  assert.equal(all(t, hasClass('stack-sparkline__line')).length, 1, 'points 3–4');
  const none = Sparkline({ label: 'Savings', data: [] });
  assert.equal(none.a['aria-label'], 'Savings: no data');
});

test('niceTicks covers the data in round steps', () => {
  assert.deepEqual(niceTicks(0, 97, 5), { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] });
  const n = niceTicks(-1234, 5678, 6);
  assert.ok(n.min <= -1234 && n.max >= 5678 && n.ticks.includes(0));
  assert.deepEqual(niceTicks(0, 0).ticks, [0, 0.5, 1]);
  assert.ok(niceTicks(5, 5).ticks.includes(0));
});

test('accessibility structure: figure + caption, a labelled plot group, focusable labelled marks, tooltip hidden from AT', () => {
  const t = LineChart({ title: 'Revenue', series: [series('a', 'A', [1, 2])] });
  assert.equal(t.c[0].t, 'figcaption');
  const svg = all(t, (n) => n.t === 'svg')[0];
  assert.equal(svg.a.role, 'group');
  assert.match(svg.a['aria-label'], /^Revenue\./);
  for (const target of all(t, hasClass('stack-chart__target'))) {
    assert.equal(target.a.role, 'img');
    assert.match(target.a['aria-label'], /: A /);
  }
  assert.ok(all(t, hasClass('stack-chart__tip')).every((n) => n.a['aria-hidden'] === 'true'));
  assert.equal(all(t, (n) => n.t === 'caption').length, 1, 'the table has a caption');
  assert.equal(all(LineChart({ title: 'T', table: 'none', series: [series('a', 'A', [1])] }), (n) => n.t === 'table').length, 0);
  assert.equal(all(LineChart({ title: 'T', table: 'visible', series: [series('a', 'A', [1])] }), (n) => n.t === 'details')[0].a.open, true);
});

test('chart styles use theme tokens only: no literal colours', () => {
  const css = readFileSync(new URL('../../packages/core/src/core.css', import.meta.url), 'utf8');
  const charts = css.slice(css.indexOf('/* Charts (docs/charts.md)'));
  assert.ok(charts.length > 1000);
  assert.deepEqual(charts.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g), null);
  for (let i = 1; i <= 8; i++) assert.match(charts, new RegExp(`--stack-color-chart-${i}\\b`));
});
