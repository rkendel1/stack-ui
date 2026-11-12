// A React page over @stack-ui/react's charts, bundled by charts.test.mjs: the
// product owns which series are hidden; the chart measures its container.
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, Sparkline } from '@stack-ui/react';

function App() {
  const [hidden, setHidden] = useState([]);
  const series = [
    { id: 'i', label: 'Income', data: [{ x: 'Jan', y: 9 }, { x: 'Feb', y: 11 }] },
    { id: 'e', label: 'Expenses', data: [{ x: 'Jan', y: 7 }, { x: 'Feb', y: 8 }] },
  ].map((s) => ({ ...s, hidden: hidden.includes(s.id) }));
  return h('div', { id: 'react-host', style: { width: '560px' } },
    h(BarChart, {
      title: 'Income and expenses', attrs: { id: 'react-chart' }, series,
      onToggleSeries: (id) => setHidden((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id])),
    }),
    h(Sparkline, { label: 'Balance', attrs: { id: 'react-spark' }, data: [{ x: 'a', y: 1 }, { x: 'b', y: 3 }] }));
}
const mountPoint = document.createElement('div');
document.getElementById('root').appendChild(mountPoint);
createRoot(mountPoint).render(h(App));
