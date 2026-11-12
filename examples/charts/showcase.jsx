// The chart showcase: a living reference built only from @stack-ui/react's
// public exports. Every number on this page is illustrative sample data,
// generated deterministically below; none of it describes a real business.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AreaChart, BarChart, DonutChart, LineChart, Sparkline, StackedBarChart, ThemeSwitch, PageHeader, Alert,
  formatChartValue, readThemePreference, setThemePreference,
} from '@stack-ui/react';

// ---- Illustrative data (deterministic) -----------------------------------------
const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}-01`);
const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/// Amounts are in cents, as an accounting system would hold them; charts only present them.
const revenue = [1_840_000, 1_920_000, 2_110_000, 2_050_000, 2_380_000, 2_460_000, 2_210_000, 2_590_000, 2_720_000, 2_680_000, 2_940_000, 3_100_000];
const expenses = [1_510_000, 1_480_000, 1_620_000, 1_890_000, 1_710_000, 1_830_000, 1_950_000, 1_760_000, 2_010_000, 2_230_000, 1_980_000, 2_150_000];
const services = revenue.map((r) => Math.round(r * 0.72));
const usd = { style: 'currency', currency: 'USD', divisor: 100, maximumFractionDigits: 0 };
const usdCents = { style: 'currency', currency: 'USD', divisor: 100 };
const series = (id, label, ys, xs = MONTHS) => ({ id, label, data: ys.map((y, i) => ({ x: xs[i], y })) });

const REVENUE = [series('revenue', 'Revenue', revenue), series('target', 'Plan', revenue.map((_, i) => 1_900_000 + i * 100_000))];
const QUARTER = LABELS.slice(0, 6);
const INCOME_EXPENSES = [series('income', 'Income', revenue.slice(0, 6), QUARTER), series('expenses', 'Expenses', expenses.slice(0, 6), QUARTER)];
// Net cash: revenue − expenses, with a missing month (no statement imported for July).
const NET = [series('net', 'Net cash flow', revenue.map((r, i) => (i === 6 ? null : r - expenses[i] - (i % 4 === 1 ? 600_000 : 0))))];
const CATEGORIES = [['Contractors', 912_000], ['Rent', 600_000], ['Software & subscriptions', 241_500], ['Travel', 183_200], ['Meals', 46_800], ['Office supplies', 0]];
const EXPENSE_MIX = [{ id: 'spend', label: 'Spend', data: CATEGORIES.map(([x, y]) => ({ x, y })) }];
const COMPOSITION = [series('services', 'Services', services.slice(0, 4), ['Q1', 'Q2', 'Q3', 'Q4']), series('products', 'Products', revenue.slice(0, 4).map((r, i) => r - services[i]), ['Q1', 'Q2', 'Q3', 'Q4']), series('refunds', 'Refunds', [-42_000, -18_000, -61_000, -9_000], ['Q1', 'Q2', 'Q3', 'Q4'])];
const MARGIN = [series('margin', 'Gross margin', revenue.map((r, i) => (r - expenses[i]) / r))];
const BALANCES = [
  ['1010 Business Checking', [4_210_000, 4_480_000, 4_390_000, 4_820_000, 5_110_000, 4_960_000, null, 5_380_000]],
  ['1000 Cash on Hand', [20_000, 20_000, 18_500, 18_500, 18_500, 21_000, 21_000, 21_000]],
  ['2100 Business Credit Card', [380_000, 412_000, 298_000, 455_000, 401_000, 377_000, 520_000, 341_000]],
];

function Card({ title, note, children, wide }) {
  return (
    <section className={`showcase-card${wide ? ' showcase-card--wide' : ''}`} aria-label={title}>
      {children}
      {note ? <p className="showcase-note">{note}</p> : null}
    </section>
  );
}

function App() {
  const [preference, setPreference] = useState(() => readThemePreference());
  const [hidden, setHidden] = useState([]);
  const toggle = (id) => setHidden((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return (
    <main className="showcase" id="main">
      <PageHeader eyebrow="Stack UI" title="Charts" description="LineChart, BarChart, AreaChart, DonutChart, StackedBarChart and Sparkline from @stack-ui/react." actions={<ThemeSwitch id="showcase-theme" preference={preference} onChange={(p) => { setPreference(p); setThemePreference(p); }} />} />
      <Alert tone="info" title="Illustrative sample data">Every figure on this page is generated sample data for demonstrating the components. It describes no real business.</Alert>

      <h2 className="showcase-h2">The six chart types</h2>
      <div className="showcase-grid">
        <Card title="Revenue over time" note="LineChart · time axis · two series · currency (cents in, dollars out) · Plan differs by dash, not only colour.">
          <LineChart title="Revenue over time" description="Monthly revenue against plan, 2026" xType="time" format={usd} series={REVENUE} points />
        </Card>
        <Card title="Income and expenses" note="BarChart · grouped · legend toggles owned by the page (try them).">
          <BarChart title="Monthly income versus expenses" format={usd} onToggleSeries={toggle} series={INCOME_EXPENSES.map((s) => ({ ...s, hidden: hidden.includes(s.id) }))} />
        </Card>
        <Card title="Cash flow over time" note="AreaChart · negative months below zero · July is missing (a gap, and — in the table).">
          <AreaChart title="Net cash flow" xType="time" format={usd} series={NET} />
        </Card>
        <Card title="Expense categories" note="DonutChart · zero-value category listed, not drawn · centre shows the total.">
          <DonutChart title="Expenses by category" description="Year to date" format={usdCents} series={EXPENSE_MIX} />
        </Card>
        <Card title="Revenue composition" note="StackedBarChart · positive stacks up, refunds stack down.">
          <StackedBarChart title="Revenue composition by quarter" format={usd} series={COMPOSITION} />
        </Card>
        <Card title="Account balance trend" note="Sparkline · inline · endpoints marked · a missing value leaves a gap.">
          <table className="showcase-table">
            <caption className="stack-visually-hidden">Account balances</caption>
            <thead><tr><th scope="col">Account</th><th scope="col">Last 8 months</th><th scope="col">Balance</th></tr></thead>
            <tbody>
              {BALANCES.map(([name, ys]) => {
                const last = [...ys].reverse().find((y) => y !== null);
                return (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td><Sparkline label={`${name} balance`} endpoints format={usdCents} data={ys.map((y, i) => ({ x: i, y }))} xType="number" width={120} height={28} /></td>
                    <td className="showcase-num">{formatChartValue(last, usdCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <h2 className="showcase-h2">Formatting, orientation and states</h2>
      <div className="showcase-grid">
        <Card title="Percentages" note="LineChart · percent format · zeroBaseline: false fits the axis to the data.">
          <LineChart title="Gross margin" xType="time" format={{ style: 'percent' }} zeroBaseline={false} series={MARGIN} />
        </Card>
        <Card title="Horizontal bars" note="BarChart · orientation horizontal · long labels shortened on the axis, whole in the table.">
          <BarChart title="Spend by category" orientation="horizontal" format={usd} series={[{ id: 'spend', label: 'Spend', data: CATEGORIES.slice(0, 5).map(([x, y]) => ({ x, y })) }]} />
        </Card>
        <Card title="Empty" note="No values to show: the caption stays, the plot is replaced.">
          <BarChart title="Revenue by product" emptyTitle="No product revenue yet" emptyBody="It appears when the first product invoice is issued." series={[]} />
        </Card>
        <Card title="Loading" note="loading: true.">
          <LineChart title="Revenue over time" loading series={[]} />
        </Card>
        <Card title="Error" note="error: { message, code }; onRetry offers a retry.">
          <AreaChart title="Net cash flow" error={{ message: 'The report could not be computed.', code: 'UNAVAILABLE' }} onRetry={() => {}} series={[]} />
        </Card>
        <Card title="Unsupported data" note="A donut cannot show negative parts: it says so instead of hiding them.">
          <DonutChart title="Net revenue by channel" format={usd} series={[{ id: 'n', label: 'Net', data: [{ x: 'Direct', y: 1_200_000 }, { x: 'Refunds', y: -40_000 }] }]} />
        </Card>
      </div>

      <h2 className="showcase-h2">Responsive layouts</h2>
      <p className="showcase-lead">Charts lay themselves out at the width they are given. Resize the window: labels thin out instead of overlapping.</p>
      <Card title="Full width" wide>
        <LineChart title="Revenue over time (full width)" xType="time" format={usd} series={REVENUE} table="visible" />
      </Card>
      <div className="showcase-narrow">
        <Card title="Compact card, 300px">
          <BarChart title="Income versus expenses" format={usd} series={INCOME_EXPENSES} />
        </Card>
        <Card title="Compact card, 300px">
          <DonutChart title="Expenses" format={usd} series={EXPENSE_MIX} />
        </Card>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
