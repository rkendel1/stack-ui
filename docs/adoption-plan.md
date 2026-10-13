# Stack UI adoption plan

Status: **proposed** (PR1). Sequencing assumes one maintainer and small PRs.

## 1. Canonical package and repository ownership

**Decision: a new, neutral repository, `rkendel1/stack-ui` (this repository),
owned by the platform owner, containing three packages:**

| Package (scope provisional) | Ships | Distribution |
|---|---|---|
| `@stack-ui/tokens` | `css/tokens.css` (light + dark), `css/tokens-light.css` (light only, for light-only products), `src/tokens.json` | npm, public, provenance |
| `@stack-ui/core` | `src/`: `core.css`, `states.js`, `view.js`, `dom.js` (ES2020 modules, zero deps); `classic/stack-ui-core.js` (classic-script build, global `StackUI`) | npm, plus a GitHub release asset `stack-ui-static-{version}.tar.gz` with `SHA256SUMS` for vendoring |
| `@stack-ui/react` | React 18/19 components over `core` | npm, public; peers `react` and `@stack-ui/core` (the product owns the single copy of core it already installs for `core.css`) |

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
  `compute:crates/compute-environment/ui/index.html`).
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
  `FELTDB_ALLOWED_ORIGINS`), open Studio with `?connect=<server>`
  (`flow_db:packages/studio/src/main.tsx`), and seed a state resource with
  revisions over HTTP as `flow_db:e2e/studio-control-plane.test.mjs` does, so the
  history tab is reachable. Add a
  `test:browser` script (the existing `test` script only globs
  `test/*.test.mjs`), and a CI step after the existing Chromium install.

**Changes PR2 is allowed to make in products, and nothing else:** UI source
files and styles; Compute's three UI asset constants; Compute's `api()` reading
headers already sent and the `request_id` of an error body it already parses;
Studio's package manifest, one extracted component and tests; CI steps for the
new tests. No server handlers, schemas, API routes, API-client methods or new
requests.

**As built (PR2):** generated package files live in `css/` and `classic/`, not
`dist/`, because FeltDB's repository check rejects any tracked `dist/` path.
Until the packages are on npm (D9), FeltDB vendors them as unpacked package
directories (its policy forbids committed tarballs) and depends on them with
`file:` paths; Compute vendors the static release. Studio, being light-only,
imports `tokens-light.css` rather than pinning a theme attribute, so embedding
Studio never brings dark rules into a host page.

### 2.3 Acceptance criteria (all testable)

Design-system repository
1. `tokens.css` passes the contrast test for every declared pair in both themes (contract §3.4).
2. Boundary check passes: no network APIs, no product imports, no storage beyond theme (product-shell §5).
3. For each of the 11 components, the React render and the `dom.js` render of the same fixture produce identical DOM (normalized `outerHTML` equality).
4. axe reports zero serious or critical violations on the component gallery in light and dark.
5. `states.js` unit tests: every value of each mapped source field resolves to a tone; `VerificationBadge` with empty `checks` cannot render `verified`; Compute deployment `rolled_back` resolves to `critical` and `complete`/`active` keep distinct labels; an unmapped value renders `unknown` tone with the raw value as label.
6. Packages have zero runtime dependencies (`react` and `@stack-ui/core` are peers of `@stack-ui/react`).

Compute
7. `cargo test --workspace --locked` passes, with `parity.rs` unchanged and `service_ui.rs` changed only as criterion 11 requires.
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

### 2.4 Second slice: the shell and list components (PR3)

PR3 builds the shell and the list components in this repository and adopts
them in the two products PR2 already validated. Both hosts are needed: Compute
renders through `dom.js` from a classic script with hash routes, Studio through
React with `react-router` history routes. Version 0.2.0 of all three packages.

#### 2.4.1 PR3 scope (exact)

**PR3a — this repository**
- `view.js`: `Shell`, `Breadcrumbs`, `Tabs` and `TabPanel`, `DataTable`,
  `FilterBar`, `Pagination` (18 components in all). Each renders in React and
  `dom.js` from one view tree, as in PR2.
- `theme.js`: the theme preference (`system | light | dark`), the only value
  any package stores (product-shell §2). Every storage access is wrapped, so a
  page whose storage throws still starts.
- `dom.js`: `focusMain(id)`, for a product to call after it routes.
- `core.css`: styles for the new parts; below 768px the shell navigation
  becomes a horizontal strip that scrolls on its own, so the page never does.
- `@stack-ui/react`: the new components; form controls bind as React
  controlled inputs when a handler is given; TypeScript declarations for every
  component, checked by `pnpm check:types` against a usage file that includes
  `@ts-expect-error` cases.
- `.browserslistrc` records the supported browsers (§5).

**PR3b — Compute adopts (classic script, `dom.js`)**
- The shell replaces the page header in `compute:crates/compute-environment/ui/index.html`
  and is rendered by `compute:crates/compute-environment/ui/app.js`: product
  link, the Work/Manage mode switcher in the context slot, the daemon and
  token controls in the account slot, the theme control, and the existing
  surfaces as navigation, keeping their `data-nav` hooks and mode classes.
- After each hash route the main landmark takes focus (`focusMain`).
- Every breadcrumb trail renders through `Breadcrumbs`; the project tabs
  through `Tabs` and `TabPanel`; the environment page's four tables (software,
  processes, deployments, projects) through `DataTable`, with their existing
  `data-*` hooks.
- `app.css` honours the theme preference (`data-stack-theme`) as well as the
  operating system.
- The vendored static release moves to 0.2.0 with new `SHA256SUMS`.

**PR3c — FeltDB Studio adopts (React)**
- `flow_db:packages/studio/src/app.tsx` renders Studio inside `Shell`: its
  Operate and Design navigation with the current page marked, the namespace
  in the context slot and Studio's existing search in the search slot. Links
  keep the connection query string and route in place through `onNavigate`;
  the main landmark takes focus on a route change. Studio is light-only, so it
  offers no theme control.
- The Data page's record list becomes `FilterBar`, `DataTable` and
  `Pagination` with loading, error, no-match and empty states; the Operations
  commit list becomes `FilterBar` and `DataTable`, with filters applied on
  submit rather than per keystroke; the Overview collections table becomes a
  `DataTable`.
- Studio's `Tabs` primitive renders the shared `Tabs` and the `TabPanel` it
  controls, so every tablist in Studio has a labelled panel.
- Studio CSS fixes found by the new axe runs: muted text and the primary
  button meet 4.5:1; the page grid no longer grows past the viewport, and long
  identifiers wrap.
- Browser tests share one harness (`flow_db:packages/studio/test/browser/support.mjs`).

**Changes PR3 is allowed to make in products, and nothing else:** UI source,
styles and markup; vendored design-system files; browser tests. No server
handlers, schemas, API routes, API-client methods or new requests. Compute's
`ROUTES` and FeltDB's router are unchanged.

#### 2.4.2 Acceptance criteria (all testable)

Design-system repository
1. For each of the 18 components, the React and `dom.js` renders of the same fixtures are identical DOM, including fixtures that pass handlers. Handlers are behaviour, not markup: their `dom.js` behaviour is tested here (criteria 3–9) and their React behaviour in Studio's browser test (criterion 16).
2. axe reports zero serious or critical violations on the gallery in light, dark and both forced themes, and on a shell page at 1280, 640 and 320px in light and dark, with no horizontal page scroll and the current navigation item visible.
3. The skip link is the first focus stop and moves focus to the main landmark without changing a hash route; exactly one navigation item has `aria-current="page"`.
4. The theme preference applies at once and persists across reloads; with storage that throws, the page starts and the control still works for the session.
5. Tabs: arrow keys, Home and End move focus over enabled tabs only, without moving the tab stop off the selected tab; Enter selects.
6. DataTable: sort state is exposed by `aria-sort`; selectable rows select by click, Enter and Space; the open row is `aria-current="true"` (never `aria-selected`, which needs a grid); a missing cell shows `—`, never a default.
7. FilterBar: every control has a visible label; Enter submits without navigating or changing the URL; Clear calls the product's `onClear`; the result line is a `status`.
8. `onNavigate` routes ordinary clicks; modified clicks stay normal links; other products' links are never routed.
9. Pagination never invents a total: previous is disabled at the start and next only when the product says there is more.
10. `pnpm check:types`, the boundary check (storage allowed only in `theme.js`) and the contrast test (81 pairs) pass.

Compute
11. Existing tests pass unchanged: `stack_ui`, `service_ui`, `headless` and `parity` in `compute-environment`; `work_mode_ui` and `product_journey` in `compute-cli`; and the existing browser suite in `packages/compute-ui-e2e`.
12. A new browser test (`compute:packages/compute-ui-e2e/src/shell.test.mjs`) shows the surfaces with one current item, the mode switcher, the skip link on an environment page leaving the route alone, focus at the new page after routing, the theme preference changing Compute's own colours, keyboard tabs (focus stays on a chosen tab) and table rows, and axe clean at 1280 and 640px in light and dark.
13. Vendored files match `SHA256SUMS`, and the forbidden-API scan still covers the vendored script.

FeltDB
14. `npm test --workspace @feltdb/studio`, `npm run check:studio` and `npm run check:repository` pass.
15. The PR2 browser test still passes on the shared harness.
16. A new browser test against a real `feltdb-server` with a deployed application of 55 records shows: one current navigation item; navigation without a reload that keeps the connection parameters and moves focus to the main landmark; the skip link; the first page of 50 records, the next page of 5 and back; an owner filter returning exactly the matching records with a result line; a no-match state; Clear restoring the list; a row opened from the keyboard and marked current; keyboard tabs with a single tab stop after arrowing and clicking; and the Operations commit list with its filters. A list shows only the response to its current request (collection, page and filters), so it never counts or shows the previous filter's rows while the next read runs.
17. axe zero serious or critical on `/overview`, `/data`, `/operations` and `/state` at 1280 and 640px, with no horizontal page scroll and the current navigation item visible.

Both
18. The diff touches only what §2.4.1 allows.
19. 200% zoom: a 1280px window at 200% zoom lays out as a 640px viewport, which criteria 2, 12 and 17 test. The 400% case (WCAG 1.4.10 reflow, a 320px viewport) is tested on the design-system shell page (criterion 2) only; the products' own pages at 320px are left to their next adoption PRs.

### 2.5 Third slice: forms, confirmation and AppPort services (PR4)

PR4 adds what server-delivered management pages need — labelled fields, a
form, dialogs and destructive-action confirmation — and adopts the design
system in AppPort services' ten packaged pages. It is the first product with
no framework and no client build: pages are HTML documents its Express router
already serves. Version 0.3.0 of all three packages.

#### 2.5.1 PR4 scope (exact)

**PR4a — this repository**
- `view.js`: `TextField` (input or textarea), `Select`, `Form`, `Dialog`,
  `ConfirmAction` (23 components in all). A field's label is always visible
  and is its accessible name; hint and error are wired with
  `aria-describedby`; an error sets `aria-invalid`. `Form` submits without
  navigating and keeps the browser's own constraint checks. `ConfirmAction`
  is an `alertdialog` that lists the product's stated consequences, names the
  action on its button, and with `requireText` stays disabled until that text
  is typed (contract §7.8).
- `dom.js`: `openDialog` (modal, focus returned on close), `confirmAction`
  and `formDialog`, which replace `confirm()` and `prompt()`. With an `action`,
  the dialog stays open and busy while the product's request runs, cannot be
  closed with Esc meanwhile, shows the product's error and code in place, and
  closes only on success.
- `@stack-ui/react`: the new components; `Dialog` and `ConfirmAction` open as
  modals while `open` is true, and `ConfirmAction` keeps its typed text unless
  the product controls it.
- `states.js`: mappings for the AppPort fields the pages render (contract §6.3).
- `core.css`: fields, forms and dialogs; `hidden` hides any `stack-*`
  component; below 768px the navigation strip no longer stretches to fill a
  short page.
- A **stateless classic build** (`stack-ui-core-stateless.js`, decisions D15):
  the full API without the theme preference, for products that keep nothing
  in browser storage. Both builds ship in the static release.

**PR4b — AppPort services adopts (server-delivered pages)**
- The page template in `appport-services:src/configuration/ui.ts` inlines the
  vendored `tokens.css`, `core.css` and stateless build, the package's own
  `ui/management.css` and `ui/management.js`, and a JSON description of the
  page. No route is added.
- The navigation is built from the mounted surfaces (`createUiPages`, the
  same list the `AppPort/ui/1` contribution describes) and marks the current
  page (`appport-services:src/runtime/ui.ts`).
- Every field is labelled; every list is a `DataTable` with one cell per
  header, a status column on the mapped fields, and loading, empty and error
  states; a failed read shows the product's error with Retry instead of an
  empty list.
- Revoke, delete, disable and remove go through `ConfirmAction` (typed name
  for named resources); edits that used `prompt()` use `formDialog`; errors
  that used `alert()` are shown in place.
- The pages store nothing in the browser (the existing Intelligence test keeps
  checking this), so there is no theme control; the colour scheme follows the
  operating system.
- Two corrections where the old page showed something the product does not
  do: the Configuration forms drop an Environment select the server ignored
  (it reads the environment from the query string, which no page sends; the
  page now says it edits production), and an empty optional file content type
  is omitted instead of being sent as `""`, which the product rejected.
- CI for the repository (it had none): unit, contract and package tests, then
  the browser tests.

**Changes PR4 is allowed to make in AppPort services, and nothing else:** the
page template and its assets, the navigation list it is given, package
`files`, tests, docs and CI. No API route, handler, schema, validation or
authorization change; every request a page makes is one the old page made.

#### 2.5.2 Acceptance criteria (all testable)

Design-system repository
1. For each of the 23 components, the React and `dom.js` renders of the same fixtures are identical DOM.
2. Fields: every control's visible label is its accessible name (the required marker is not); hint and error are announced through `aria-describedby`; an error sets `aria-invalid`; no placeholder stands in for a label.
3. Form: Enter submits without navigating or changing the URL, and an empty required field still blocks submit.
4. ConfirmAction through `confirmAction`: a modal `alertdialog` named by its title and described by its consequences; the confirm button names the action; focus starts on Cancel (or the typed-text field); Esc cancels; focus returns to the button that asked.
5. With `requireText`, confirm stays disabled until the exact text is typed; with `action`, the button is busy while it runs, Esc does not close, a failure shows the product's message and code in the dialog and keeps the typed text, and a retry that succeeds closes it.
6. `formDialog`: labelled fields, Enter submits, a failure keeps what was typed and shows the error in place, Cancel resolves `null`.
7. axe reports zero serious or critical violations with each dialog open, in light and dark, at 1024 and 320px, and dialogs fit a 320px screen.
8. The stateless build names no browser storage and exposes the full build's API minus exactly the seven theme names.
9. `hidden` hides a field and a button; on a narrow, tall screen the navigation strip is only as tall as its links.
10. In a bundled React app: a field with `onChange` and no `value` accepts typing without warnings; `ConfirmAction` enables confirm on the typed text, ignores Esc while `busy` and reopens if the browser closes it, then asks the product through `onCancel`; `Dialog` reports Esc and browser closes through `onClose`; focus returns to the trigger. The `dom.js` helpers likewise reopen a busy dialog the browser closed and treat any other such close as a cancel.
11. Contrast (85 pairs, now including critical text on every background), boundary and type checks pass.

AppPort services
12. `npm test` passes (unit, contract and package tests), including the packed-package test that serves `/services` from the installed tarball.
13. Every served page inlines the vendored design system unmodified, and the vendored files match `SHA256SUMS`.
14. The navigation lists exactly the mounted pages: a host mounting two services lists and serves only those two; without configuration, no configuration pages are listed.
15. The page description cannot end its script element (a hostile title stays data).
16. The page scripts never parse markup, evaluate code or touch browser storage, and never call `confirm`, `prompt` or `alert`.
17. In Chromium against the standalone host: each page lists the mounted routes with only itself current, has one `h1`, labels every control and keeps one cell per header; creating an API key shows its secret once and revoking it needs the typed name; a configuration variable is added, edited in a dialog and deleted with typed confirmation; invalid job JSON is refused before sending; the intelligence endpoint field appears only for a custom endpoint; a failed read shows an error with Retry, not "none"; the colour scheme follows the OS and nothing is stored.
18. axe zero serious or critical on every page at 1280 and 640px in light and dark, with no page-level horizontal scroll, and with a confirm dialog and a form dialog open.

Both
19. The diff touches only what §2.5.1 allows.

### 2.6 Fourth slice: evidence and the AuthBoundry portal (PR5)

PR5 adds `EvidenceSummary` and adopts the design system in the AuthBoundry
portal (`authboundry:apps/web`), the first React + Tailwind product: a Next.js
App Router app whose colours were hard-coded Tailwind utilities. Version
0.4.0 of all three packages.

#### 2.6.1 PR5 scope (exact)

**PR5a — this repository**
- `view.js`: `EvidenceSummary` (24 components in all). Each claim has its own
  label and value; a claim the product checked carries its verification and
  shows a `VerificationBadge`; a claim without one is a recorded fact. The
  summary line says which: "Recorded facts · not independently verified",
  "All N claims verified", or "M of N checked claims verified · K failed · R
  recorded, not checked" (decisions D17). "Not evaluated", including
  "verified" with no check listed, counts as recorded. A missing value
  renders `—`.
- `FilterBar` gains `live`: filters that apply as they change have no Apply
  button.
- `states.js`: `authboundry.decision.live` (a check just made: deny is
  critical), `authboundry.decision.recorded` (history: deny is neutral),
  `authboundry.delegation.status` and `authboundry.application.status`
  (contract §6.3).

**PR5b — the AuthBoundry portal adopts (React + Tailwind)**
- `@stack-ui/*` 0.4.0 vendored as unpacked packages with `file:` dependencies
  and `SHA256SUMS` (`authboundry:apps/web/vendor/stack-ui`); tokens and
  component CSS imported by the root layout.
- Tailwind's `theme.extend.colors.stack` maps to the `--stack-*` variables
  (`authboundry:apps/web/tailwind.config.ts`). The layout's theme script and
  the theme toggle set `data-stack-theme` with the `dark` class, so a stored
  light choice also wins for the shared components on a dark system.
- Statuses: decisions (the decisions, evidence and activity pages, the
  overview, the application console and the decision detail), delegations
  (the global list and the application console) and application status (the
  console header and the shell's context) render `StatusIndicator` on the
  fields above. Pending and expired delegations are no longer red like
  revoked ones.
- Errors render `ErrorPanel`; loading and empty lists `Loading` and
  `EmptyState`; the decisions and evidence lists are `DataTable`s (each
  decision's action is a real link to its evidence), with a live `FilterBar`
  or labelled filters. Muted text and destructive links on the touched
  surfaces use the tokens, so they keep their contrast in dark mode.
- The decision detail shows two `EvidenceSummary` sections (what AuthBoundry
  decided, and the claim snapshot it evaluated), both recorded facts.
- Corrections where a page showed something the authority never said:
  - `/authorization` called `/api/authorization/explain`, whose server route
    returns `{latest_decision, message}` and ignores its inputs
    (`authboundry:crates/server/src/control_routes.rs:4360-4412`), and read
    `decision === "ALLOW"` from it, so it always showed "DENY" with empty
    fields. It now calls `/api/authorization/check`, the check the application
    console already used, and shows its compact decision; a `fail_closed`
    answer is "Result unknown", not "Deny".
  - `/audit` read `principal_id`, `capability`, `application` and an
    upper-case `decision`; the authority sends `principal`, `action`,
    `resource` and a lower-case `decision` that is absent for non-decision
    events (`authboundry:crates/server/src/control_routes.rs:3831-3910`), so
    every row had empty fields and allows were drawn with a cross.
  - The overview counted a failed read as zero (and "Active sessions" as 0
    when the session check failed); those counts are now unknown, and a
    failed read of recent decisions is not "No authorization decisions yet".
    A failed delegation read is an error, not "No delegations".
  - The activity filters were sent to an endpoint that reads only `since` and
    `limit`, so they changed nothing; they now filter what it returned, and an
    application-scoped link says the log cannot be narrowed to an
    application. Rows are keyed by position, because the audit store keeps
    repeated event ids and keying by id left stale rows on screen.
- The portal shell keeps its own layout (decisions D18), drawn with the
  tokens, with `aria-current` on the current link.
- CI for the portal (`authboundry:.github/workflows/portal.yml`): lint, build,
  type-check, the unit tests that pass today, and browser tests that sign in
  through the portal's local login against a real `authboundry` authority
  with data created through its API.

**Changes PR5 is allowed to make in AuthBoundry, and nothing else:** portal
pages, components, styles, Tailwind config, the vendored packages, portal
tests and CI. The two corrected pages call routes the portal already has. No
server, route, schema or API-client change.

#### 2.6.2 Acceptance criteria (all testable)

Design-system repository
1. For each of the 24 components, the React and `dom.js` renders of the same fixtures are identical DOM.
2. `EvidenceSummary` never claims a check that was not made: claims without verification summarise as recorded facts; a mix counts verified and failed; "verified" without a listed check is not counted as verified; a missing value is `—`.
3. A live `FilterBar` has no submit button, still shows Clear when filters are applied, and its form never navigates on submit.
4. The AuthBoundry mappings: a live deny is critical, a recorded deny neutral; pending is progress, expired neutral, revoked critical; an upper-case value is not silently mapped.
5. Unit, browser, contrast (85 pairs), boundary and type checks pass.

AuthBoundry portal
6. `npm run lint`, `npm run build`, `npm run type-check` and `npm run test:unit` pass, including the vendored-file checksums.
7. Against a real authority, signed in through `/login`: decision results carry `data-field="authboundry.decision.recorded"` with Allow positive and Deny neutral; the decisions filters are labelled, live and report "N of M decisions match".
8. Delegations: active is positive, revoked critical.
9. Decision detail: one `h1`; the evidence section is "recorded" with no verification; every field is shown, a missing policy as `—`; the evaluated claims are listed; a decision that does not exist shows an `ErrorPanel`.
10. Authorization test: an allowed check shows Allow (positive), a refused one Deny (critical) with its reason, and links to its decision evidence.
11. Activity: every allow is positive; every authorization decision row names its principal; the Decision filter narrows the rows to exactly the matching ones and its count says so; every filter has a label.
12. Evidence: one cell per header; every filter has a label.
13. The portal's `dark` class and `data-stack-theme` always agree, including a stored light choice on a dark system.
14. axe reports zero serious or critical violations on the decisions, delegations (global and in the application console), decision detail, evidence, activity and overview pages in light and dark, and on the authorization test with a result; no script or React error reaches the console.

Both
15. The diff touches only what §2.6.1 allows.

### 2.7 Fifth slice: the AppBoundry cloud portal (PR6)

PR6 brings the AppBoundry cloud portal (`appboundry:apps/cloud-platform`) onto
the design system: a hand-written, string-template client
(`appboundry:apps/cloud-platform/public/app.js`) inside a Next 16 shell, dark
only, with one `badge()` helper whose only tones were "ok" and "warn". Version
0.5.0 of all three packages; no new component.

#### 2.7.1 PR6 scope (exact)

**PR6a — this repository**
- `states.js`, AppBoundry fields (contract §6.3): `appboundry.lifecycle.phase`,
  `appboundry.execution.status` (the execution ledger the portal lists),
  `appboundry.source.status`, `appboundry.implementation.status` (whether an
  implementation may still be selected), `appboundry.provider.compatible`,
  `appboundry.provider.eligibility`, `appboundry.health.ready`,
  `appboundry.health.check`; and on the verification axis
  `appboundry.implementation.verification`, `appboundry.attestation.status`
  and `appboundry.conformance.status`. Values that are declared but never
  written (`ApplicationSourceStatus` `pending`,
  `ApplicationImplementationStatus` `failed`) are not mapped, so they would
  show as unknown rather than as a guess.
- Decisions D20–D22.

**PR6b — the AppBoundry cloud portal adopts (hand-written client)**
- The 0.5.0 static release vendored unmodified with `SHA256SUMS`
  (`appboundry:apps/cloud-platform/public/vendor/stack-ui`). The layout links
  `tokens.css` and `core.css`; `app.js` imports the classic build before it
  renders.
- Light theme: `appboundry:apps/cloud-platform/public/portal-theme.css` maps
  the portal's nine CSS variables and its hand-coloured surfaces onto the
  tokens, scoped to pages that mount the portal, so the marketing pages and
  the WASM build (which inlines only the four original stylesheets) are
  unchanged. AppBoundry's cyan stays in the logo, which now has a light
  variant. The theme follows the system; Settings → Appearance stores a
  choice (the only thing the design system stores). Keyboard focus is
  visible; nothing styled it before.
- States: every status the portal shows is a `StatusIndicator` or
  `VerificationBadge` built by `@stack-ui/core` and serialized from its DOM
  nodes (D21); `badge()` remains only as a plain label (organization, role,
  event kind). Failures are critical (failed and timed-out executions, failed
  sources, revoked implementations), where everything but success was amber.
- Verification: implementations show their condition and a
  `VerificationBadge` with the three checks their record implies; source
  attestations show a `VerificationBadge` that names the failed check; the
  application page's hard-coded "TRUSTED" card with four ✓ marks is an
  `EvidenceSummary` in which only attestations and implementations count as
  checks. Conformance reports have a mapping but no portal route returns
  them, so the portal does not show one (D22).
- Screen by screen: the executions screen is the first built from
  `@stack-ui/core` view trees (`DataTable`, `StatusIndicator`, `EmptyState`)
  and mounted by `render()`; the other screens keep their string templates.
- Corrections where the portal showed something it had not observed:
  - The sidebar always said "Authority connected · Durable lifecycle online",
    and Settings always showed "HEALTHY" and a green "Platform ready" or
    "RECOVERABLE"; they now come from the read's health checks.
  - The placeholder used while the catalog loads and after a failed read
    reported the runtime, journeys and activity as available and the
    authority as degraded; it now records only that the catalog could not
    be read. Loading is shown as loading, not as unavailable, and counts are
    `—`, not 0; pages that need the catalog say it is unavailable instead
    of "No applications" or "No execution history yet".
  - Implementations were matched with `item.capability === "name@version"`,
    but `capability` is `{name, version}`
    (`appboundry:packages/core/src/application-implementation.ts:29-35`), so
    the implementations view never listed one and the connect page printed
    "[object Object]". Non-verified implementations were hidden.
  - A hosted deployment record was badged "RUNNING" without any observation.
  - The footer named a read time when no read had succeeded.
  - A stale or disconnected source keeps the attestation it had, which no
    longer holds; its verification is shown only while the source is
    connected or failed. A stale implementation's contract-fingerprint check
    is shown as failed.
  - Two crashes: a change link to an unknown application, and
    `history.replaceState` for a signed-in user with no organization (the
    module's `history(id)` view shadows `window.history`).
- CI (`appboundry:.github/workflows/cloud-portal.yml`): `next build`, the
  vendored checksums, the portal unit tests, and browser tests that sign in
  against a real portal API and render every state from fixture records
  shaped like the core types.

**Changes PR6 is allowed to make in AppBoundry, and nothing else:** the
portal client, its stylesheets and layout, the vendored release, portal tests
and CI. No server, route, schema or API-client change.

#### 2.7.2 Acceptance criteria (all testable)

Design-system repository
1. Each AppBoundry field maps exactly the values its source writes; an upper-cased value and a declared-but-unwritten value are unknown.
2. Implementation verified/stale are verified/not verified; revoked is a critical condition with no verification; an attestation mismatch is a failed verification; a conformance report without checks is not evaluated.
3. Unit, browser, contrast, boundary and type checks pass.

AppBoundry portal
4. `next build` passes; the vendored files match `SHA256SUMS`; every state field `app.js` renders is mapped by the vendored release; no tone is passed to `badge()`.
5. On the overview, settings, implementations and executions pages, every `.stack-status[data-field]` has the tone `StackUI.resolve` gives its field and value and, unless the page supplies its own label, equals what `StackUI.dom.StatusIndicator` renders; every tone-only status has that tone's glyph and a label.
6. Implementations: three rows (Current + Verified · 3 checks; Stale + Not verified, its contract-fingerprint check failed; Revoked, no verification badge). A source's attestation is shown only while the source is connected or failed: a stale or disconnected source keeps an attestation that no longer holds.
7. A contract mismatch shows "Verification failed · Contract fingerprint" and a critical source status; no "[object Object]"; a stale source shows no attestation badge. A change link to an unknown application does not take the portal down.
8. Application evidence: "2 of 4 checked claims verified · 1 failed · 2 recorded, not checked" for the fixture (the contract and a stale source are records); "Recorded facts · not independently verified" with no sources.
9. Executions: running progress, succeeded positive, failed and timed out critical, cancelled neutral.
10. A failed catalog read: authority status unknown, counts `—`, the footer says the state was not read, "Applications unavailable", no "No applications" or "No execution history"; Settings shows Not ready (critical). While loading: progress, "Loading the application catalog…", counts `—`.
11. axe reports zero serious or critical violations on eight portal pages in light and dark, with no page errors.
12. The theme follows the system until chosen; the choice sets `data-stack-theme` and the logo variant; only `stack-ui.theme` is added to storage; choosing System removes it.
13. Keyboard focus has a visible outline.
14. The existing app.js source-text tests still pass.

Both
15. The diff touches only what §2.7.1 allows.

## 3. Migration sequence for the remaining products

| Order | Product and scope | Preconditions | Why this order |
|---|---|---|---|
| PR3 | **Shell** in `stack-ui` + adopt in Compute and FeltDB Studio; add `DataTable`, `FilterBar`, `Pagination`, `Tabs`, `Breadcrumbs` (built; §2.4) | PR2 merged | Shell needs two real hosts to validate |
| PR4 | **AppPort services** management pages: inline `tokens.css`/`core.css` in the server-rendered page template; labels on every field; table header/cell parity; current-nav highlight; nav derived from `SURFACES`; `ConfirmAction` replacing `confirm()` (built; §2.5) | Add CI to `appport-services` (none exists; added in PR4) | Smallest UI (10 pages, one template); owns `AppPort/ui/1`; shows the framework-free path for server-rendered HTML |
| PR5 | **AuthBoundry** portal: map Tailwind theme to `--stack-*` variables (`theme.extend.colors` → `var()`), adopt `StatusIndicator` for decisions and delegations, `ErrorPanel`, `EvidenceSummary` on decision detail; fix the `/authorization` result shape (built; §2.6) | Add `apps/web` lint, typecheck, test and build to CI; add Playwright + axe (added in PR5) | React + Tailwind path; authorization and delegation presentation |
| PR6 | **AppBoundry** cloud portal: light theme via tokens; `stack-status` for every state (adds critical); `VerificationBadge` for implementations and attestations, `EvidenceSummary` for application trust; executions as the first `dom.js` screen (built; §2.7) | `apps/cloud-platform` build and a browser test in CI (added in PR6); `public/app.js` is the hand-written source (D20) | Largest and most fragile UI; benefits from every earlier component |
| Later | Remaining Compute and Studio screens; AuthBoundry Rust auth pages and CLI Studio; AppBoundry local studio; FeltDB website Studio (after D7) | — | Lower traffic surfaces |

Out of sequence by design: AppPort core (`rkendel1/appport`) has no product UI
and needs no adoption.

## 4. Testing and CI strategy

**Design-system repository CI (every PR)**
- Unit: `states.js`, `dom.js` (`node --test`).
- Contrast: token pair test (both themes).
- Boundary: static check of package sources (product-shell §5).
- DOM parity: React vs `dom.js` per component.
- Browser: Playwright gallery in light, dark and both forced themes, 320px
  width; axe zero serious/critical; keyboard focus ring. (Built in PR2.)
- Shell page (PR3): axe at 1280, 640 and 320px in light and dark, which also
  covers 200% and 400% zoom (§2.4.2, criterion 19); keyboard tests for the
  skip link, tabs, table rows, filters and routing.
- Dialogs (PR4): keyboard, focus and axe tests for `confirmAction` and
  `formDialog`, and a React behaviour test (a bundled React app) for fields,
  `Dialog` and `ConfirmAction`.
- Still deferred: keyboard tests for menus (none exist yet), and visual
  regression (decisions D11).

**Each adopting product**
- Existing tests unchanged and passing.
- axe on each adopted screen in the product's existing browser job (Compute
  `browser` job; new Studio Playwright job in FeltDB; new jobs in AuthBoundry,
  AppBoundry, AppPort services when they adopt).
- A design-system version check (Compute: checksum test; npm consumers: lockfile).

## 5. Compatibility and release considerations

- **Browsers:** evergreen Chromium, Firefox, Safari (last two versions),
  recorded in `.browserslistrc` (PR3). No transpiler reads it yet: the sources
  use only ES2020 and widely supported CSS.
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
