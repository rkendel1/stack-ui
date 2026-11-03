# Decisions

Status of each entry: **Decided** (recommended, PR1 asks for approval),
**Deferred** (to a named PR), or **Open** (needs the owner's input).

## Material decisions

### D1 — The design system lives in a new neutral repository — Decided
- **Decision:** `rkendel1/stack-ui`, created for this PR, owned by the platform owner.
- **Alternatives:** (a) packages in `rkendel1/appport`: rejected; FeltDB depends
  on no `@appport/*` package and would gain one, and the application boundary
  would also own presentation. (b) packages in one product repository: rejected;
  makes other products depend on a product, and Compute cannot publish npm
  packages from Cargo. (c) copy-paste per product: the current state; produced
  the drift in audit §5.

### D2 — Framework-neutral core, React as a thin binding — Decided
- **Why:** three of five product UIs have no framework (Compute, AppPort
  services, AppBoundry), and Compute has no build step (audit §2).
- **Alternatives:** React-only library (excludes three products); Web Components
  (requires JS for styling-only adoption, and server-rendered pages would need
  hydration; reconsider for interactive widgets in PR3 if `dom.js` grows).

### D3 — State is shown on independent axes — Decided
- Condition, operation outcome, goal, verification, freshness, capability
  (contract §6.1). **Why:** every product already distinguishes at least two of
  these (Compute complete/active/converged; FeltDB committed/integrity;
  AppBoundry active/verified) and every UI flattens them (audit §5.4).
- **Alternative:** a single status colour scale; rejected because it forces the
  inference of verification from health.

### D4 — Mappings are keyed by source field, not string — Decided
- **Why:** identical words differ by field (Compute `ready` is an in-progress
  release phase and also verified readiness, audit §5.2; Compute job `timed_out`
  is a definite failure while a request timeout is an unknown outcome).

### D5 — Shell builds on `AppPort/ui/1`; it links out, never embeds — Decided
- **Why:** a published, validated, tested protocol already exists
  (`appport:packages/protocol/src/ui.ts`, Compute host). Embedding would need a
  shared session or runtime; the brief forbids both.
- **Alternatives:** iframe or micro-frontend host (new runtime layer, auth
  coupling); a new registry service (new authority).

### D6 — Token values are finalized in PR2a, not PR1 — Deferred (PR2a)
- PR1 fixes names, categories, contrast thresholds and direction (contract §3).
  Values are chosen against rendered Compute and Studio screens.

### D7 — FeltDB's two Studios — Open
- `packages/studio` (architecturally governed, ships in `@feltdb/core`) vs
  `website/app/studio/page.tsx` (hosted). PR2 adopts in `packages/studio`.
  Whether the website Studio is replaced, embedded or kept is a FeltDB product
  decision.

### D8 — Dynamic product directory — Deferred (after PR6)
- `otherProducts` is static per deployment until at least three products
  publish `AppPort/ui/1` contributions.

### D9 — npm scope and repository name — Open (unchanged in 0.6.0)
- `@stack-ui/*` is a placeholder. Scope availability was not checked.
  Candidates: a new scope, or publishing under an existing owned scope.
- 0.6.0 describes the system publicly as "the Boundry design foundation (Stack
  UI)" in documentation only. Package names, CSS class prefixes (`stack-`),
  custom properties (`--stack-*`), the storage key and the global `StackUI`
  are unchanged. A rename would be breaking for six vendored consumers, so it
  waits for the owner's decision on the scope (for example `@boundry/ui`) and
  then ships as one major release with a migration note.

### D10 — AppBoundry's AppPort packages — Open (outside this programme, affects PR6)
- `rkendel1/appboundry` carries private 1.0.0 copies of `@appport/core` and
  `@appport/protocol` diverged from `rkendel1/appport` (published 1.0.4 / 1.0.3).
  PR6 needs only CSS, so it is not blocked, but AppBoundry cannot publish an
  `AppPort/ui/1` contribution until it consumes the published protocol.

### D11 — Visual regression — Deferred again (PR3 → after PR4)
- **Decision:** no screenshot baselines yet. Layout and accessibility are
  asserted instead: axe in both themes at 1280 and 640px in each product and
  also at 320px on the design-system shell page, no page-level horizontal
  scroll, and DOM parity between React and `dom.js`.
- **Why:** baselines are only stable when they are recorded on the same image
  that compares them. Font rasterization differs between a developer machine
  and the GitHub runner image, and the token font stack falls back to system
  fonts, so baselines recorded here would fail in CI for reasons unrelated to
  the code. Doing it properly means pinning a webfont in the gallery and
  recording baselines from a CI job, which is worth doing once a third product
  (AppPort services, PR4) consumes the components.
- **Revisit when:** PR4 lands, or sooner if a visual regression slips past
  review.

### D12 — Icons stay as text glyphs — Decided (PR3)
- **Decision:** the sort indicators (`▲ ▼ ↕`), status glyphs and the shell's
  product mark stay as text, marked `aria-hidden` where a word already says the
  same thing. No SVG icon set.
- **Why:** PR3 added tables and tabs but no menus, and every glyph sits next to
  text that carries the meaning, so an icon set would add assets and a
  licensing choice without changing what anyone can read. Revisit when a
  component needs an icon with no text beside it.

### D13 — Search is a product slot — Decided (PR3)
- **Decision:** the shell's `search` is a slot the product fills with its own
  control. A shared search component (input, result list, keyboard model) is
  deferred.
- **Why:** of the two hosts only Studio has a search, and its behaviour
  (entity paths, flow names) is its own. One implementation is not enough to
  design a shared component from. Revisit when a second product exposes a
  supported search interface.

### D14 — Server-delivered pages render in the browser — Decided (PR4)
- **Decision:** AppPort services' pages are HTML documents its server sends
  with the design system inlined and a JSON page description; the browser
  renders the shell, forms and tables with `dom.js`. The design system has no
  server-side HTML string renderer.
- **Why:** every page's content is read from the product's API in the
  browser, so only the frame could be rendered on the server; a second
  renderer that writes markup strings would need its own escaping and its
  own parity tests to save a frame that appears a moment earlier. The JSON
  description is escaped so it cannot end its script element (tested).
- **Revisit when:** a product needs pages that work without JavaScript.

### D15 — A stateless classic build — Decided (PR4)
- **Decision:** the static release ships `stack-ui-core-stateless.js` beside
  the full build: the same API without `theme.js`. A product that keeps
  nothing in browser storage vendors it, omits the shell's theme control and
  follows the operating system's colour scheme, which `tokens.css` already
  does.
- **Why:** AppPort services tests that its pages, including the credential
  page, contain no browser storage code at all. The theme preference is
  optional (product-shell §2), so the build that includes it must be too.

### D16 — Dialog state lives in the renderer, not the view — Decided (PR4)
- **Decision:** `Dialog` and `ConfirmAction` are stateless view trees like
  every component. Opening a modal and the typed confirmation text belong to
  the renderer: the `dom.js` helpers own the DOM they create (and also run the
  product's `action`, with its busy and error states), and the React binding
  opens the modal from `open` and keeps the typed text in state, while `busy`
  and `error` stay the product's props.
- **Why:** a view tree cannot call `showModal()`, and changing attributes a
  renderer owns underneath it is the bug PR3 fixed in Tabs. Keeping the view
  stateless keeps React and `dom.js` renders identical (criterion 1).

### D17 — Evidence without a check is a record — Decided (PR5)
- **Decision:** `EvidenceSummary` shows a claim's verification only when the
  product checked it. A summary with no checked claim says "Recorded facts ·
  not independently verified".
- **Why:** an AuthBoundry decision record is what the evaluator saw and
  concluded; nothing on it is re-checked when the page shows it (contract
  §6.3). Drawing it with verification badges would claim checks nobody made;
  leaving the distinction unstated would let a reader assume them.

### D18 — The AuthBoundry portal keeps its own shell for now — Resolved 2026-11-03
- **Resolution (2026-11-03):** the owner asked for every post-sign-in experience on the foundation. The portal now
  renders in the shared `Shell`: capability-filtered navigation and per-application scoping are unchanged, the
  application-context switcher sits in the `context` slot, and navigation becomes a scrolling strip below 768px
  (rkendel1/authboundry#136).
- **Original decision:**
- **Decision:** PR5 draws the portal's sidebar with the tokens and adds
  `aria-current`, but does not replace it with the shared `Shell`.
- **Why:** the portal's navigation projects capabilities, scopes links to one
  application, and has an application-context switcher with its own stored
  selection; moving those into `Shell` slots is a change to how people move
  through the portal, which PR5's scope (statuses, errors, evidence) does not
  include. The sidebar is fixed-width and not yet responsive.

### D19 — Stale portal tests are reported, not rewritten — Decided (PR5)
- **Decision:** the portal CI runs the five unit-test files that pass on
  `main` and the new browser tests. The source-text tests that already fail
  (`application-console`, `application-discovery`, `portal-navigation`) and
  the four that need a running portal on a fixed port are left out, and
  reported to the owner.
- **Why:** they fail without this PR. One of them
  (`portal-navigation`) expects members not to see `/authority`,
  `/credentials` and `/developer`, which they now do; whether that is a
  regression or a stale test is a security question for the AuthBoundry
  owner, not something a UI PR should settle by editing the assertion.

### D20 — `public/app.js` is the AppBoundry portal's source — Decided (PR6)
- **Decision:** the cloud portal client is edited as the hand-written file it
  is; PR6 changes it in place and adds no build step.
- **Why:** nothing in the repository generates it (no bundler config, no
  script writes it, and the single squashed history has no source beside it),
  and four test files assert its text. Introducing a build would be a second
  change riding on a UI adoption.

### D21 — String-rendered pages serialize stack-ui's DOM output — Decided (PR6)
- **Decision:** a page that renders HTML strings gets each state from
  `StackUI.dom.<Component>(props).outerHTML` (the AppBoundry portal's
  `status()` and `verifiedBy()` helpers), never from markup it writes itself.
- **Why:** it is the same `createElement`/`textContent` path as every other
  product, the browser does the escaping, and the parity test can compare a
  page's states with `StackUI.dom` exactly. A screen that moves off strings
  returns a view tree and is mounted by `toDom` (the executions screen first).

### D22 — Conformance has a mapping but no portal view — Decided (PR6)
- **Decision:** `appboundry.conformance.status` is mapped and tested, but the
  cloud portal shows no conformance badge.
- **Why:** conformance reports are produced by the CLI
  (`appboundry:packages/cli/src/conformance.ts`) and no portal route returns
  them; showing one would need a server change, which PR6 does not make.

### D23 — Static sites render the shared components to HTML at build time — Decided (0.6.0)
- **Decision:** `@stack-ui/core/html` (`html.js`) serializes view trees to
  HTML text, so a site built ahead of time in Node can include `SiteHeader`
  and `SiteFooter`. The output parses to exactly the DOM `dom.js` builds, and
  a browser test checks this for every fixture. Every text node and attribute
  is escaped, and handlers are dropped. It is not in the classic build.
- **Why:** this is the "revisit when" of D14. Marketing sites must read and
  navigate with JavaScript off, and boundry.company is generated by a
  zero-dependency Node script. Hand-copying the footer's markup into each
  site would be a fifth copy of the drift `portfolio-assessment.md` §2
  documents. React sites need no serializer, because server rendering is
  the binding.

### D24 — Identity has one home, separate from semantics — Decided (0.6.0)
- **Decision:** company and product identity live in `tokens/src/brand.json`
  (colours) and `core/src/brand.js` (`PORTFOLIO`: names, categories, links).
  They are exposed as `--stack-brand-*` and as `--stack-product-accent`
  scoped by `[data-stack-product]`. Status, evidence, notice and action
  styles must not reference them, and a test enforces this.
- **Alternatives:** per-product theme files that override `--stack-*`
  (rejected: they would let a product recolour shared states, which contract
  §3.6 forbids), or keeping the accents in the boundry site (rejected: the
  sites and shells that need them cannot depend on a website repository).

### D25 — The portfolio links only to verified destinations — Decided (0.6.0)
- **Decision:** a product's `href` is its own domain only where that domain
  was checked to serve HTTPS (2026-11-01: feltdb.com, getfeltkit.com,
  appboundry.com, authboundry.com, boundry.company). AppPort (no site)
  links to its boundry.company ecosystem entry. (AgentBoundry, first listed
  here, is not a Boundry product and was removed, owner 2026-11-01.)
- **Revisit when:** AppPort publishes a site. The change is one line
  in `brand.js`.

### D26 — ActionMenu, Drawer, Skeleton and Notification stay deferred — Decided (0.6.0)
- **Decision:** they are not implemented in 0.6.0. These components ship:
  `Alert` (4 local copies), `Checkbox`/`FieldGroup` (5 products with raw
  checkboxes), `ActivityTimeline` (2), and the header, footer and theme
  switch (5 and 4).
- **Why:** the contract promotes a component when two products need it.
  ActionMenu has one use (FeltDB's account menu), Skeleton none, and
  Notification none. Drawer has two uses (the FeltKit dashboard and FeltDB's
  hosted Studio), but neither surface consumes Stack UI yet, so nothing
  could prove the shared contract in a real product.
- **Revisit when:** the FeltKit dashboard or the hosted FeltDB Studio adopts
  the shell (Drawer); a second product needs a resource menu (ActionMenu).

### D27 — Portfolio products' shells carry the Boundry family by default — Decided (0.6.0)
- **Decision:** `Shell({ product: { id } })` with a portfolio id adds "A
  Boundry product" (linking to boundry.company) to the bar, and lists every
  sibling product plus "About Boundry" under "Other Boundry products". It
  also sets `data-stack-product`, so the mark takes the product accent. A
  product passes `otherProducts` to choose its own list, or `family: false`
  to omit the family. A shell without a portfolio id (Compute) is unchanged.
- **Why:** the owner asked that every surface, applications included, shows
  that it belongs to Boundry and links to the company. D8's static list
  remains the mechanism. Its source is now the shared portfolio instead of
  each deployment's configuration.

### D28 — The platform blue is the Boundry blue — Decided (0.6.0)
- **Decision:** light action, link and focus colours move from `#2f5bd8` to
  `#0a5ce8` (hover `#084dc4`, active `#063fa3`). Dark mode moves to `#6ea3ff`
  and `#8ab4ff`. Status tones are unchanged.
- **Why:** contract §3.5 already called for "one blue platform accent", and
  the company mark now defines it. All contrast pairs still pass (tested).
  Under §9 this is a patch-level visual change, applied in a minor release.

### D29 — The mark is a vector redraw until the master file is committed — Open
- The owner supplied the logo as an image in conversation. The SVG in
  `tokens/brand/` was drawn to match it and checked by eye. The owner should
  commit the master artwork (SVG preferred) and the wordmark, and confirm
  the dark-background (reversed) gradient, which was derived, not supplied.

### D30 — Product accents follow each product's existing identity — Decided, owner to confirm (0.6.0)
- **Decision:** FeltDB's accent is green (`#18754a` / `#42e58d`, its site's
  `--green` and text green), FeltKit's is teal (`#0b7f6e` / `#3fd8c4`, the
  teal of its logo and site), and AppBoundry's is violet (`#6a3fd0` /
  `#b49cf5`, from its logo). AuthBoundry and AppPort keep boundry.company's
  values, because they have no accent of their own.
- **Why:** the brief says each product keeps its own accent. The muted
  umber, ochre and forest values on boundry.company matched none of the
  real logos (blue-teal, blue-teal-green, and navy-blue-violet). FeltKit's
  blue primary was not chosen because it equals the company blue, so the
  product would be indistinguishable from Boundry. AppBoundry's site cyan
  was not chosen because it is nearly identical to FeltKit's teal; violet,
  also from its logo, keeps the two apart.
- **Owner to confirm:** these are identity choices. Changing one is a patch
  release, gated by the contrast tests.

### D31 — A version's contents are recorded and never change — Decided (0.6.1)
- **Decision:** `releases/<version>/{static,packages}.SHA256SUMS` record exactly what a version
  contains. CI fails when a build differs from its version's manifest
  (`scripts/check-release-manifest.mjs`). `scripts/check-registry.mjs` identifies the release each
  product vendors by checksum.
- **Why:** "0.6.0" named more than one set of files: two products vendored it before its type
  declarations were added. Until packages are published, a version string alone cannot tell a reviewer
  what a product runs.

### D32 — "Execution" on boundry.company is capability execution — Recommended, owner to decide
- **Finding:** AppBoundry executes one authorized capability per request and records it. It does not run
  agents. The agent loop is in stack-agent, and Compute is the agent-neutral machine; neither is a
  Boundry product. See `docs/execution-ownership.md`.
- **Recommendation:** rename the site's "Execution" foundation "Capability execution" (AppBoundry with
  AppPort). Describe no Boundry product as an agent runtime unless the owner brings one into the
  portfolio.

## Verified facts versus unresolved questions

| Verified (see audit citations) | Unresolved |
|---|---|
| Compute UI is vanilla JS embedded in the binary; 149 API routes; parity-tested | Whether a stale condition can be induced from the browser harness (acceptance 10 uses a unit test + the existing Rust test) |
| FeltDB Studio is React with honest-unavailable primitives; no browser tests | Which Studio users reach (D7); driving a reconciliation through the UI in a browser test (PR2 tests the committed card by server rendering instead) |
| AppPort core/SDK/protocol are in `rkendel1/appport`; `AppPort/ui/1` is published | Whether `appport()` serves management HTML (Compute docs say no) |
| AuthBoundry portal is Next + Tailwind with no tokens; not in CI | Runtime behaviour of `/authorization` (shape mismatch verified in source only) |
| AppBoundry portal is a 99 KB string-template SPA, dark only, two badge tones | `public/app.js` is hand-written (D20) |
| No a11y or visual regression tests anywhere | Real keyboard/screen-reader behaviour (nothing was run) |

## Intentionally deferred until implementation

- Exact token values and the product-mark treatment (PR2a).
- Icon set: evaluated in PR3 and kept as glyphs (D12).
- Data table virtualization, charting, diff viewers (product-owned until two
  products need the same one).
- Internationalization: all products are English-only today; components accept
  product-supplied text so localization stays possible.
- Hygiene items found during the audit (AuthBoundry committed credentials and
  `node_modules`, stale lockfiles and docs) are reported to owners, not fixed here.
