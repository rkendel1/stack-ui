// A product's view of stack-ui: only the published entry points, no workspace
// paths, no private modules. Typechecked, bundled and server-rendered by run.mjs.
import '@stack-ui/tokens/tokens.css';
import '@stack-ui/core/core.css';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AreaChart, BarChart, DonutChart, LineChart, Sparkline, StackedBarChart, formatChartValue,
  type ChartSeries, type ChartFormat,
} from '@stack-ui/react';
import { html } from '@stack-ui/core/html';

const usd: ChartFormat = { style: 'currency', currency: 'USD', divisor: 100 };
const months = ['2026-01-01', '2026-02-01', '2026-03-01'];
const revenue: ChartSeries[] = [{ id: 'rev', label: 'Revenue', data: months.map((x, i) => ({ x, y: [1200000, null, 1500000][i] ?? null })) }];

export function Dashboard() {
  return (
    <main>
      <LineChart title="Revenue" xType="time" format={usd} series={revenue} width={480} />
      <BarChart title="Income vs expenses" format={usd} width={480} series={[
        { id: 'in', label: 'Income', data: [{ x: 'Jan', y: 900000 }] },
        { id: 'out', label: 'Expenses', data: [{ x: 'Jan', y: 700000 }] },
      ]} />
      <AreaChart title="Cash flow" width={480} series={[{ id: 'c', label: 'Net', data: [{ x: 'Jan', y: 3 }, { x: 'Feb', y: -1 }] }]} />
      <StackedBarChart title="Composition" width={480} series={[{ id: 's', label: 'Services', data: [{ x: 'Q1', y: 5 }] }]} />
      <DonutChart title="Expenses" width={300} series={[{ id: 'e', label: 'Spend', data: [{ x: 'Rent', y: 3 }, { x: 'Software', y: 1 }] }]} />
      <p>Balance <Sparkline label="Balance" data={[{ x: 1, y: 1 }, { x: 2, y: 2 }]} /> {formatChartValue(123456, usd)}</p>
    </main>
  );
}

export const markup = renderToStaticMarkup(<Dashboard />);
export const staticHtml = html.LineChart({ title: 'Static', width: 300, series: revenue });
