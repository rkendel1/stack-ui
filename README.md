# stack-ui

Shared design system for the Stack products: Compute, FeltDB, AppPort,
AuthBoundry and AppBoundry. It owns presentation and interaction behaviour; it
owns no product state, authorization or execution.

## Packages

| Package | What it ships |
|---|---|
| `@stack-ui/tokens` | `tokens.css` (custom properties, light + dark), `tokens-light.css` (light only, for products drawn light-only) and `tokens.json` |
| `@stack-ui/core` | Component structure, field-keyed state semantics, a framework-free DOM renderer, `core.css`, and `stack-ui-core.js` (a strict classic-script build exposing `window.StackUI`) |
| `@stack-ui/react` | React 18/19 components that render the same DOM as the core renderer (peers: `react`, `@stack-ui/core`) |

Twenty-three components: `StatusIndicator`, `VerificationBadge`, `FreshnessLabel`,
`Unavailable`, `Loading`, `EmptyState`, `ErrorPanel`, `MetadataList`,
`ResourceIdentity`, `PageHeader`, `Button`, `Breadcrumbs`, `Tabs`, `TabPanel`,
`DataTable`, `FilterBar`, `Pagination`, the product `Shell`
([docs/product-shell.md](docs/product-shell.md)), `TextField`, `Select`, `Form`,
`Dialog` and `ConfirmAction`, plus `confirmAction` and `formDialog` helpers that
replace `confirm()` and `prompt()` on framework-free pages. The theme preference
(`theme.js`) is the only value any package stores; `stack-ui-core-stateless.js`
is the classic build without it. State mappings cover the Compute
and FeltDB fields the first adopting screens render
(`packages/core/src/states.js`). Not published to npm yet (scope: D9).

### Using it

React:

```jsx
import '@stack-ui/tokens/tokens.css';
import '@stack-ui/core/core.css';
import { StatusIndicator, VerificationBadge } from '@stack-ui/react';

<StatusIndicator field="compute.deployment.status" value="rolled_back" />
<VerificationBadge state="verified" checks={['Content matches revision id']} />
```

No framework, no build (vendor `release/stack-ui-static-<version>/`):

```js
const el = StackUI.dom.StatusIndicator({ field: 'compute.health', value: 'healthy' });
parent.appendChild(el);
```

## Development

```sh
pnpm install
pnpm test            # build, boundary check, type check, unit tests, browser tests (Chromium + axe)
node scripts/package-static.mjs   # release/stack-ui-static-<version>{/,.tar.gz} with SHA256SUMS
```

Browser tests use `playwright-core`; install Chromium with
`pnpm exec playwright-core install chromium` (CI does this).

| Document | Contents |
|---|---|
| [docs/audit.md](docs/audit.md) | What exists today in each product, with repository evidence |
| [docs/design-system-contract.md](docs/design-system-contract.md) | Tokens, components, interaction patterns, accessibility, state and evidence semantics, versioning |
| [docs/product-shell.md](docs/product-shell.md) | Shared shell as a UI composition contract |
| [docs/adoption-plan.md](docs/adoption-plan.md) | Package ownership, the Compute + FeltDB slices (PR2, PR3), AppPort services (PR4), migration order, CI |
| [docs/decisions.md](docs/decisions.md) | Decisions, alternatives, open and deferred questions |

## Checking citations

Every `repo:path:line` citation in `docs/` can be checked against local
checkouts of the product repositories placed next to this one:

```sh
node scripts/check-citations.mjs            # expects ../compute, ../flow_db, …
node scripts/check-citations.mjs --root DIR
```
