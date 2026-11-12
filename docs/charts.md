# Charts (0.9.0)

Stack UI owns chart presentation. Products own the data and what it means; their
data stores stay authoritative. A chart presents numbers a product has already
computed: it positions marks, sums stacks to place them, and writes text. It
never computes an authoritative value and never mutates its input.

## Why it is here

Ledger (the first FeltKit accounting application) needed revenue, expense,
cash-flow, composition and balance-trend charts. Nothing in the platform drew a
chart: a search of FeltKit, AppBoundry, AppPort, AppPort Services and this
repository found no chart code (2026-11-12). Every application would otherwise
choose and wrap its own library. The contract (§5) kept charts product-owned
until two products need them; the owner promoted them with one real consumer
(Ledger), recorded as D38.

## Architecture

- **Native SVG view trees in `@stack-ui/core/charts`.** The same `{ t, a, c }`
  trees as every other component, so `dom.js`, `html.js`, the classic build and
  `@stack-ui/react` render identical DOM (checked by the parity tests).
- **No dependencies.** `scripts/check-boundary.mjs` allows no runtime
  dependency outside `@stack-ui/*`, and none is needed: the subsystem is ~575
  lines of core code plus ~100 lines of CSS. No third-party type appears in the
  public API.
- **No script needed for interaction.** Each category (or slice) is a
  focusable mark with an accessible name; CSS shows its tooltip on hover and on
  keyboard focus. Static HTML pages get working tooltips.
- **Deterministic.** Text is written by an en-US formatter that does not use
  `Intl` (Node's ICU 78 writes `$15.0K` where Chromium writes `$15K`, which
  changed layout between renderers). Label widths are estimated from character
  counts, coordinates are rounded to two decimals, and identical input gives
  identical output.
- **Responsive.** Layout is computed at a pixel width. `@stack-ui/react` charts
  measure their plot area with `ResizeObserver` and redraw when it changes;
  framework-free pages use `mountChart(el, 'LineChart', props)`. Before
  measurement (and on the server) the `width` prop or 640px is used; the SVG
  scales by `viewBox`. Tick density and category labels thin with width.
- **Themed.** Series use `--stack-color-chart-1 … 8` (new tokens, light and
  dark, each ≥ 3:1 on every background, tested); everything else uses the
  existing text and border tokens. `core.css` contains no literal colours for
  charts (tested).

## API

```jsx
import { LineChart, BarChart, AreaChart, StackedBarChart, DonutChart, Sparkline } from '@stack-ui/react';

<LineChart
  title="Revenue"                       // required: caption and accessible name
  description="Monthly, 2026"
  xType="time"                          // 'category' (default) | 'time' | 'number'
  format={{ style: 'currency', currency: 'USD', divisor: 100 }}   // cents in, dollars out
  series={[{ id: 'revenue', label: 'Revenue', data: [{ x: '2026-01-01', y: 1840000 }, { x: '2026-02-01', y: null }] }]}
/>
```

Framework-free: `StackUI.mountChart(element, 'BarChart', props)` returns
`{ update(props), destroy() }`; `StackUI.dom.BarChart(props)` draws once at a
fixed width. Static sites: `html.BarChart(props)` from `esm/html.js`.

### Data contract

| Type | Fields |
|---|---|
| `ChartSeries` | `id` (unique), `label`, `data: ChartDataPoint[]`, `hidden?`, `palette?` (1–8), `meta?` (ignored) |
| `ChartDataPoint` | `x: string \| number` (category, number, or epoch ms / ISO date for `time`), `y: number \| null` |
| `ChartFormat` | a function, or `{ style: 'number' \| 'currency' \| 'percent', currency, divisor, minimumFractionDigits, maximumFractionDigits, compact, suffix }` |

- **Order:** categories in first-seen order (series order, then point order);
  `time` and `number` ascending.
- **Missing values:** `null`, or an x one series lacks, is missing: a gap in
  lines and areas (an isolated value is marked so it stays visible), no bar,
  `—` in the table and tooltip.
- **Invalid input throws a `TypeError` naming the problem:** non-array series,
  empty or duplicate ids, missing labels, `NaN`/`Infinity`/string values,
  two points at one x, unparseable times, more than one visible donut series.
- **Unrepresentable data is shown as such:** a donut with negative values
  renders a note naming them ("Use a bar chart") instead of drawing them.
- **Percent** expects fractions (0.25 → 25%). **`divisor`** changes only the
  text (minor units → major units).

### Components

| Component | Options beyond the common ones |
|---|---|
| `LineChart` | `points` (mark every value), `zeroBaseline: false` (fit the axis to the data) |
| `AreaChart` | `stacked` (positives up, negatives down) |
| `BarChart` | `orientation: 'vertical' \| 'horizontal'`, `stacked` |
| `StackedBarChart` | `BarChart` with `stacked` |
| `DonutChart` | one series whose x values name slices; `centerValue`, `centerLabel`, `center: false`, `innerRatio`; zero slices are listed, not drawn |
| `Sparkline` | `label` (required), `data`, `endpoints`, `width`, `height`; no axes or legend |

Common: `title`, `description`, `headingLevel`, `width`, `height`,
`aspectRatio`, `format`, `axisFormat`, `xFormat`, `xLabel`, `yLabel`, `legend`
(default: shown for two or more series), `grid`, `onToggleSeries(id)` (legend
entries become toggle buttons; the product owns `hidden`), `loading`,
`error` (`string` or `{ message, code, requestId }`, with `onRetry`),
`emptyTitle`, `emptyBody`, `table: 'details' | 'visible' | 'none'`,
`tableLabel`, `className`, `attrs`.

States, in precedence: error → loading → empty (no visible values) → ready.
Every state keeps the caption. `data-chart` and `data-chart-state` mark the
figure.

### Structure

```
figure.stack-chart.stack-chart--{line|area|bar|donut}[data-chart][data-chart-state]
  figcaption.stack-chart__header > .stack-chart__title, .stack-chart__description
  ul.stack-chart__legend > li.stack-chart__legend-item[data-series] (button when toggling)
  div.stack-chart__plot > svg.stack-chart__svg[role=group][aria-label]
    g.stack-chart__axis, g.stack-chart__marks > g.stack-chart__series.stack-chart__sN[data-series]
    g.stack-chart__targets > g.stack-chart__target[tabindex=0][role=img][aria-label] > g.stack-chart__tip[aria-hidden]
  details.stack-chart__data > summary, table.stack-chart__table
span.stack-sparkline[data-trend] > svg[role=img][aria-label]
```

## Accessibility

- The figure is named by its caption; the plot is a labelled group.
- Each category (up to 60) is a tab stop whose accessible name states every
  series' value; its tooltip appears on focus as well as hover and stays inside
  the chart. Beyond 60 categories the marks stop being tab stops and the plot's
  label points to the table.
- Every chart carries its data as a captioned `<table>` in a `<details>`.
- Line series differ by dash pattern as well as colour; legends, tooltips,
  table and donut legend values carry the text. Nothing is conveyed by colour
  alone.
- Sparklines are images whose name states first, last, low, high and missing
  counts.
- axe reports no serious or critical violations in four theme combinations
  (the component gallery) and on the showcase in light, dark and at 390px.

## Verification (2026-11-12)

| Check | Result |
|---|---|
| `pnpm test` (build, boundary, types, unit, browser) | 111 unit, 177 browser, all pass (was 89 and 154) |
| Unit `tests/unit/charts.test.mjs` | 20 tests: rendering, legends, toggles, gaps, ordering, validation, immutability, determinism, formatting, states, sizing, long labels, 500-point data, negative and zero values, single points, donut rules, sparkline, ticks, a11y structure, token-only CSS. Mutation check: disabling label truncation or the zero-bar rule fails the matching tests |
| Browser `tests/browser/charts.test.mjs` | layout at container width and redraw on resize (DOM and React), no overflow at 320px, keyboard tooltips inside the chart (light and dark), colours resolve to the theme tokens, React legend toggles |
| Parity and axe | 15 chart fixtures through React ⇄ DOM and HTML ⇄ DOM parity and the axe gallery |
| Types `tests/types/usage.ts` | chart props and data contract; misuse fails to compile |
| Consumer `pnpm test:consumer` | packs the three packages, installs the tarballs in a fresh project, typechecks, bundles and server-renders six charts via public entry points |
| Showcase `tests/browser/showcase.test.mjs` | builds `examples/charts`, checks every chart type, no errors, no page scroll, axe |

## Size

| Part | Lines (non-blank) |
|---|---|
| `charts.js` (all six charts, scales, formatting, validation) | 575 |
| `charts.d.ts` | 48 |
| Chart CSS in `core.css` | 100 |
| React binding and its types | 41 + 101 |
| Renderer and build wiring | 42 |
| Tokens (16 colours) | 17 |
| Tests (unit 273, browser 233, consumer 71, fixtures/types/contrast 48) | 625 |
| Showcase | 177 |
| Third-party runtime dependencies | 0 |

`charts.js` is 11.4 KB gzipped.

## Not supported (yet)

- Dual axes, log scales, scatter, histograms, heatmaps, annotations, zoom or pan.
- Time axes tick at data points, not calendar boundaries; time text is UTC.
- Formatting is en-US only (the products are English-only today).
- Label widths are estimated, not measured: very wide glyphs can overrun a label's
  slot slightly; labels are truncated with an ellipsis well before that.
- Legend toggles exist for cartesian charts; donut slices cannot be hidden.
- A chart redrawn by `mountChart` on resize loses keyboard focus inside it (the
  React binding reconciles and keeps it).
- `@stack-ui/core/html`, `view` and `dom` still ship no type declarations
  (pre-existing); `@stack-ui/core/charts` does.
