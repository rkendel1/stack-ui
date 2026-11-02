# stack-ui — the Boundry design foundation

The shared design foundation for Boundry and its products: FeltDB, FeltKit,
AppBoundry, AuthBoundry and AppPort, as well as Compute and AppWorks.
It owns presentation, interaction behaviour, the Boundry brand layer and the
product identities ([docs/brand.md](docs/brand.md)). It owns no product state,
authorization or execution. Package and class names keep the `stack` prefix
until the npm scope is decided (D9).

## Packages

| Package | What it ships |
|---|---|
| `@stack-ui/tokens` | `tokens.css` (custom properties, light + dark, company and product identity), `tokens-light.css` (light only), `tokens.json`, `brand.json`, and the Boundry mark (`brand/*.svg`) |
| `@stack-ui/core` | Component structure, field-keyed state semantics, the Boundry portfolio (`brand.js`), a framework-free DOM renderer, a build-time HTML renderer for static sites (`html.js`), `core.css`, and `stack-ui-core.js` (a strict classic-script build exposing `window.StackUI`) |
| `@stack-ui/react` | React 18/19 components that render the same DOM as the core renderer (peers: `react`, `@stack-ui/core`) |

Thirty-two components. Marketing: `SiteHeader`, `SiteFooter`, `ThemeSwitch` and
`BrandMark`, plus layout classes (`stack-hero`, `stack-section`, `stack-feature-grid`, …).
Application: `Alert`, `Checkbox`, `FieldGroup`, `ActivityTimeline`, `StatusIndicator`, `VerificationBadge`, `FreshnessLabel`,
`Unavailable`, `Loading`, `EmptyState`, `ErrorPanel`, `MetadataList`,
`ResourceIdentity`, `PageHeader`, `Button`, `Breadcrumbs`, `Tabs`, `TabPanel`,
`DataTable`, `FilterBar`, `Pagination`, the product `Shell`
([docs/product-shell.md](docs/product-shell.md)), `TextField`, `Select`, `Form`,
`Dialog`, `ConfirmAction` and `EvidenceSummary`, plus `confirmAction` and `formDialog` helpers that
replace `confirm()` and `prompt()` on framework-free pages. The theme preference
(`theme.js`) is the only value any package stores; `stack-ui-core-stateless.js`
is the classic build without it. State mappings cover the Compute
and FeltDB fields the first adopting screens render
(`packages/core/src/states.js`). Not published to npm yet (scope: D9). Version 0.6.2.

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
| [assets/brand/](assets/brand/sources.json) | The Boundry logo and mark as PNG, and every product's logo, with provenance (`sources.json`, checked by `scripts/check-brand-assets.mjs`) |
| [docs/brand.md](docs/brand.md) | Boundry brand specification: mark, colour, type, themes, product accents, the Boundry family on every surface |
| [docs/product-identities.md](docs/product-identities.md) | Per-product identity and UX direction |
| [docs/portfolio-assessment.md](docs/portfolio-assessment.md) | Every Boundry surface, framework, deploy, domain and Stack UI version; duplication found |
| [docs/adoption-report.md](docs/adoption-report.md) | The portfolio adoption registry (generated from `docs/registry.json`, checked by `scripts/check-registry.mjs`) |
| [docs/release-readiness.md](docs/release-readiness.md) | Release checks, defects fixed, and the decisions publishing needs |
| [docs/execution-ownership.md](docs/execution-ownership.md) | Which product owns which part of "execution", grounded in code |
| [docs/release.md](docs/release.md) | Versioning, release steps, consumption, conformance checklist |
| [docs/building-with-the-foundation.md](docs/building-with-the-foundation.md) | The rule for every new Boundry site or product UI, and the conformance check builds run |
| [docs/audit.md](docs/audit.md) | What exists today in each product, with repository evidence |
| [docs/design-system-contract.md](docs/design-system-contract.md) | Tokens, components, interaction patterns, accessibility, state and evidence semantics, versioning |
| [docs/product-shell.md](docs/product-shell.md) | Shared shell as a UI composition contract |
| [docs/adoption-plan.md](docs/adoption-plan.md) | Package ownership, the Compute + FeltDB slices (PR2, PR3), AppPort services (PR4), the AuthBoundry portal (PR5), migration order, CI |
| [docs/decisions.md](docs/decisions.md) | Decisions, alternatives, open and deferred questions |

## Checking citations

Every `repo:path:line` citation in `docs/` can be checked against local
checkouts of the product repositories placed next to this one:

```sh
node scripts/check-citations.mjs            # expects ../compute, ../flow_db, …
node scripts/check-citations.mjs --root DIR
```
