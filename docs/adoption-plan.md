# Stack UI adoption plan

Status: **proposed** (PR1). Sequencing assumes one maintainer and small PRs.

## 1. Canonical package and repository ownership

**Decision: a new, neutral repository, `rkendel1/stack-ui` (this repository),
owned by the platform owner, containing three packages:**

| Package (scope provisional) | Ships | Distribution |
|---|---|---|
| `@stack-ui/tokens` | `tokens.css`, `tokens.json` | npm, public, provenance |
| `@stack-ui/core` | `core.css`, `states.js`, `dom.js` (ES2020 modules, zero deps), `stack-ui-core.js` (classic-script build, global `StackUI`) | npm, plus a GitHub release asset `stack-ui-static-{version}.tar.gz` with `SHA256SUMS` for vendoring |
| `@stack-ui/react` | React 18/19 components over `core` | npm, public, peer `react` |

Why this location (evidence in `docs/audit.md`):

- **No existing repository fits.** None is a design system; each product repo
  owns one product's authority.
- **Not AppPort.** `rkendel1/appport` already owns the `AppPort/ui/1`
  composition protocol and publishes public packages, but FeltDB depends on no
  `@appport/*` package. Placing presentation there would add a FeltDB → AppPort
  dependency and make the application boundary also own presentation. AppPort
  keeps the protocol; the design system consumes its shape without importing it.
- **Not any product repo.** Compute's UI cannot publish npm packages from its
  Cargo workflow; FeltDB, AuthBoundry and AppBoundry would each make the others
  depend on a product.
- **Neutral and dependency-free.** The new repository depends on no product,
  and every product consumes static files or a thin binding. It adds a
  build-time dependency to each adopting product and **no runtime or service
  dependency** between products.

Tooling for the new repository: pnpm (matches AppPort/AppBoundry), TypeScript
for `react` only, plain ES modules for `core`, Node ≥ 20, Playwright for
browser tests. Release: tag → CI build → npm publish with provenance (the
`@appport/*` precedent) → GitHub release with static assets and checksums.

PR1 lands these documents here. The packages arrive in PR2a.

## 2. Initial vertical slice: Compute + FeltDB (PR2)

### 2.1 Validation of the pair

| Requirement | Compute | FeltDB | Verdict |
|---|---|---|---|
| Real UI to adopt | Control plane SPA (`compute:crates/compute-environment/ui/app.js`) | Studio control plane (`flow_db:packages/studio/src/app.tsx`) | ✓ |
| Exercises its domain | Operational state, execution, freshness | Durable state, integrity verification, capability | ✓ genuinely different domains and stacks (vanilla vs React) |
| Browser test harness | Playwright against a real daemon (`compute:packages/compute-ui-e2e`) | **None for Studio**; e2e is HTTP-only (`flow_db:e2e/studio-control-plane.test.mjs`) | PR2 adds a Playwright suite to `packages/studio`; FeltDB CI already installs Chromium (`flow_db:.github/workflows/ci.yml`) |
| Safe integration | UI is a pure API client, parity-tested (`compute:crates/compute-environment/tests/parity.rs:79`) | Studio boundary check forbids storage access and mocks (`flow_db:tools/check-studio-boundary.mjs`) | ✓ both mechanically guarded |
| Constraint | No build step; must vendor static files | Studio already has 4 palettes; global CSS | Scope changes to one screen each |

Compute and FeltDB are the right first pair. The one gap (FeltDB Studio has no
browser tests) is small and is closed inside PR2.

### 2.2 PR2 scope (exact)

PR2 is three PRs, merged in order:

**PR2a — `stack-ui` packages (design-system repository)**
- `tokens`: every category in contract §3.2, light and dark, final values for
  surfaces, text, border, focus, action and status tones.
- `core` components: `StatusIndicator`, `VerificationBadge`, `FreshnessLabel`,
  `Unavailable`, `Loading`, `EmptyState`, `ErrorPanel`, `MetadataList`,
  `ResourceIdentity`, `PageHeader`, `Button` (primary, secondary, danger).
- `core` ships ES modules and one classic-script build, `stack-ui-core.js`,
  exposing a single global `StackUI`, for pages without a module loader
  (Compute loads `app.js` as a classic script,
  `compute:crates/compute-environment/ui/index.html:32`).
- `states.js`: the axes of contract §6.1 and mappings for exactly the source
  fields the two adopted screens render:
  - Compute: computer observed reality, `ActualState` with Health (the
    `status()` helper, `compute:crates/compute-environment/ui/app.js:156-162`),
    `DeploymentStatus`, `RolloutStatus`, process readiness (`processState`,
    `compute:crates/compute-environment/ui/app.js:108-120`), build outcome
    (`compute:crates/compute-environment/ui/app.js:571`), `X-Compute-State`.
  - Before PR2a is cut, every `state(…)` call on the environment page is
    listed and checked against these mappings; anything still unmapped is added
    or the PR is blocked, so no element on the migrated page renders `unknown`
    by omission.
  - FeltDB: overview lease-clock health (boolean `lease_clock_healthy`,
    `flow_db:packages/studio/src/control-plane/Overview.tsx:47`),
    `integrity_verified`, `CapabilityStatus`.
- `react` bindings for the same 11 components.
- Not in PR2: shell, tables, lists, forms, dialogs, menus, timeline.

**PR2b — Compute adopts on the environment detail page** (`environmentView`,
`compute:crates/compute-environment/ui/app.js:539`)
- Vendor `tokens.css`, `core.css`, `stack-ui-core.js` into
  `crates/compute-environment/ui/vendor/stack-ui/` with `VERSION` and
  `SHA256SUMS`. Prepend them to the existing asset constants with
  `concat!(include_str!(…), …)` (`compute:crates/compute-environment/src/api.rs:242-244`),
  so the UI still loads exactly `/ui/app.css` and `/ui/app.js`: no new served
  path and no new API route. The script constant is
  `concat!("'use strict';\n", include_str!("…/stack-ui-core.js"), include_str!("../ui/app.js"))`:
  `app.js` declares `'use strict'` as its first statement
  (`compute:crates/compute-environment/ui/app.js:7`), which would stop being a
  directive once anything is prepended, so the served script carries its own
  prologue and stays strict.
- Replace the page's status rendering, fact tiles and reality panel styling
  with `StatusIndicator`, `MetadataList`, `ErrorPanel` and `ResourceIdentity`.
  Keep the `state` class, the existing labels and all `data-*` hooks so current
  selectors keep passing. `status()` is shared with the project page, whose
  header is asserted with `.title .state:has-text("Running")`
  (`compute:packages/compute-ui-e2e/src/control-plane.test.mjs:135`); changing
  `status()` changes both pages, which is intended and covered by that test.
- In `api()`, read the `X-Compute-State` / `X-Compute-State-As-Of` headers the
  daemon already sends and show `FreshnessLabel` on the page.
- The shared `STATES` table stays for screens not yet migrated; the migrated
  page resolves tones through `StackUI.states` by field.

**PR2c — FeltDB adopts on Studio `/overview` and `/state`**
- Add `@stack-ui/tokens`, `@stack-ui/core` CSS and `@stack-ui/react` to
  `packages/studio`; import tokens before existing CSS; scope nothing global.
- `/overview` (`flow_db:packages/studio/src/control-plane/Overview.tsx`), using
  only the data it already loads (`/v1/control-plane/overview`,
  `/v1/control-plane/replication`): `PageHeader`; lease clock via
  `StatusIndicator`; `MetadataList` for `Stat` blocks (keeps the "— never 0"
  rule); `Unavailable` replacing the local primitive's visuals.
- `/state` (`flow_db:packages/studio/src/control-plane/State.tsx`): the
  history-tab note for an unsupported capability
  (`flow_db:packages/studio/src/control-plane/State.tsx:376-377`) renders through
  `Unavailable`; the committed card
  (`flow_db:packages/studio/src/control-plane/State.tsx:267-276`) moves into an
  exported `CommittedRevision` component that shows `VerificationBadge` with one
  check, "Content matches revision id", from `integrity_verified`
  (`flow_db:crates/feltdb-server/src/control_plane.rs:630-643`).
- Studio primitives keep their exported names and props; they render shared
  components internally, so no consumer of `@feltdb/core/studio` breaks.
- Add `packages/studio/test/browser/*.test.mjs` (Playwright). Harness, all
  configuration and no product code: build the app (`vite build --mode app`),
  start `feltdb-server` with the Studio origin allowed (`--allow-origin` /
  `FELTDB_ALLOWED_ORIGINS`), open Studio with `?authority=<server>`
  (`flow_db:packages/studio/src/main.tsx`), and seed a state resource with
  revisions over HTTP as `flow_db:e2e/studio-control-plane.test.mjs` does, so the
  history tab is reachable. Add a
  `test:browser` script (the existing `test` script only globs
  `test/*.test.mjs`), and a CI step after the existing Chromium install.

**Changes PR2 is allowed to make in products, and nothing else:** UI source
files and styles; Compute's three UI asset constants; Compute's `api()` reading
headers already sent; Studio's package manifest, one extracted component and
tests; CI steps for the new tests. No server handlers, schemas, API routes,
API-client methods or new requests.

### 2.3 Acceptance criteria (all testable)

Design-system repository
1. `tokens.css` passes the contrast test for every declared pair in both themes (contract §3.4).
2. Boundary check passes: no network APIs, no product imports, no storage beyond theme (product-shell §5).
3. For each of the 11 components, the React render and the `dom.js` render of the same fixture produce identical DOM (normalized `outerHTML` equality).
4. axe reports zero serious or critical violations on the component gallery in light and dark.
5. `states.js` unit tests: every value of each mapped source field resolves to a tone; `VerificationBadge` with empty `checks` cannot render `verified`; Compute deployment `rolled_back` resolves to `critical` and `complete`/`active` keep distinct labels; an unmapped value renders `unknown` tone with the raw value as label.
6. Packages have zero runtime dependencies (`react` is a peer).

Compute
7. `cargo test --workspace --locked` passes, including `parity.rs` and `service_ui.rs` unchanged.
8. Existing browser suites pass unchanged: `packages/compute-ui-e2e` `npm test`, `work_mode_ui`, `product_journey`.
9. New browser assertions on the environment page: every `.state` element has non-empty visible text and a `data-tone` attribute; the header status of a running environment has `data-tone="positive"`; a `FreshnessLabel` is present; axe reports zero serious/critical violations in light and dark (`page.emulateMedia({ colorScheme })`).
10. A JS unit test shows `FreshnessLabel` renders "Stale · as of …" for `X-Compute-State: stale`; the existing Rust test `reads_say_how_fresh_they_are` (`compute:crates/compute-environment/tests/availability.rs:311`) remains the authority that the header is produced.
11. A Rust test checks vendored files against `SHA256SUMS`, asserts the served script starts with `'use strict';`, and extends the forbidden-API scan of `the_ui_never_parses_markup_or_runs_code_from_a_service` (`compute:crates/compute-environment/tests/service_ui.rs:360-364`) to the vendored JS. `ROUTES` is unchanged and the UI is still served from `/ui/`, `/ui/app.js`, `/ui/app.css` only.

FeltDB
12. `npm run check:studio` and `npm test --workspace @feltdb/studio` pass.
13. New Playwright tests against a real `feltdb-server`: `/overview` shows lease-clock health as text plus `data-tone` (a single server is always healthy; the degraded mapping is covered by the `states.js` unit tests); on `/state` the history tab shows the `Unavailable` note for `state.branch.heads`, which the server declares unsupported (`flow_db:crates/feltdb-server/src/control_plane.rs:256-261`), and no disabled control in its place.
14. A Studio unit test renders `CommittedRevision` with `react-dom/server` for `integrity_verified: true` ("Verified · Content matches revision id") and `false` ("Verification failed").
15. axe zero serious/critical on `/overview` and `/state` in light and dark.
16. `npm run build:packages` and `test:acceptance` pass; the `@feltdb/core` tarball still includes Studio.

Both
17. The diff touches only what §2.2 allows (reviewed per PR; Compute `ROUTES` and FeltDB's router in `crates/feltdb-server/src/main.rs` are unchanged).
18. The same tone renders the same `stack-status` DOM structure in both products (assert class and structure in each product's browser test). Visual sameness is reviewed from screenshots, not asserted.

## 3. Migration sequence for the remaining products

| Order | Product and scope | Preconditions | Why this order |
|---|---|---|---|
| PR3 | **Shell** in `stack-ui` + adopt in Compute and FeltDB Studio; add `DataTable`, `FilterBar`, `Pagination`, `Tabs`, `Breadcrumbs` | PR2 merged | Shell needs two real hosts to validate |
| PR4 | **AppPort services** management pages: inline `tokens.css`/`core.css` in the server-rendered page template; labels on every field; table header/cell parity; current-nav highlight; nav derived from `SURFACES`; `ConfirmAction` replacing `confirm()` | Add CI to `appport-services` (none exists) | Smallest UI (10 pages, one template); owns `AppPort/ui/1`; shows the framework-free path for server-rendered HTML |
| PR5 | **AuthBoundry** portal: map Tailwind theme to `--stack-*` variables (`theme.extend.colors` → `var()`), adopt `StatusIndicator` for decisions and delegations, `ErrorPanel`, `EvidenceSummary` on decision detail; fix the `/authorization` result shape | Add `apps/web` lint, typecheck, test and build to CI; add Playwright + axe | React + Tailwind path; authorization and delegation presentation |
| PR6 | **AppBoundry** cloud portal: add light theme via tokens; replace `badge()` with `stack-status` (adds a critical tone); `VerificationBadge` for implementation and conformance; then screen-by-screen replacement of `public/app.js` views using `dom.js` | Add `apps/cloud-platform` build and a browser test to CI; decide whether `public/app.js` has an untracked source | Largest and most fragile UI; benefits from every earlier component |
| Later | Remaining Compute and Studio screens; AuthBoundry Rust auth pages and CLI Studio; AppBoundry local studio; FeltDB website Studio (after D7) | — | Lower traffic surfaces |

Out of sequence by design: AppPort core (`rkendel1/appport`) has no product UI
and needs no adoption.

## 4. Testing and CI strategy

**Design-system repository CI (every PR)**
- Unit: `states.js`, `dom.js` (`node --test`).
- Contrast: token pair test (both themes).
- Boundary: static check of package sources (product-shell §5).
- DOM parity: React vs `dom.js` per component.
- Browser: Playwright gallery in light, dark, 320px width, 200% zoom; axe zero
  serious/critical; keyboard tests for interactive components.
- Visual regression: Playwright screenshot comparison of the gallery, committed
  baselines, reviewed on change.

**Each adopting product**
- Existing tests unchanged and passing.
- axe on each adopted screen in the product's existing browser job (Compute
  `browser` job; new Studio Playwright job in FeltDB; new jobs in AuthBoundry,
  AppBoundry, AppPort services when they adopt).
- A design-system version check (Compute: checksum test; npm consumers: lockfile).

## 5. Compatibility and release considerations

- **Browsers:** evergreen Chromium, Firefox, Safari (last two versions). No
  product declares a browserslist today; PR2a adds one to `stack-ui`.
- **CSS isolation:** all classes prefixed `stack-`; tokens prefixed `--stack-`.
  No element selectors or resets in `core.css`, so existing global CSS
  (FeltDB `index.css`, AuthBoundry `globals.css` reset) keeps working. Products
  that need a reset keep their own.
- **Tailwind coexistence (AuthBoundry, examples):** Tailwind maps colours to
  `--stack-*` variables; shared components use their own classes, not Tailwind
  utilities.
- **React versions:** peer `^18 || ^19` (FeltDB Studio `^18||^19`, AuthBoundry 19.3).
- **Node:** packages are browser code; tooling needs Node ≥ 20 (product CI uses 20–24; AuthBoundry's release workflow uses 20).
- **Release cadence:** releases on demand; products pin exact versions;
  breaking changes only in majors with a migration note (contract §9).
- **Dependency hygiene to fix separately** (not blocking): `@appport/protocol`
  and `@feltdb/core` skew across repositories (audit §5.10).
