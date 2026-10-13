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

### D9 — npm scope and repository name — Open
- `@stack-ui/*` is a placeholder. Scope availability was not checked.
  Candidates: a new scope, or publishing under an existing owned scope.

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

## Verified facts versus unresolved questions

| Verified (see audit citations) | Unresolved |
|---|---|
| Compute UI is vanilla JS embedded in the binary; 149 API routes; parity-tested | Whether a stale condition can be induced from the browser harness (acceptance 10 uses a unit test + the existing Rust test) |
| FeltDB Studio is React with honest-unavailable primitives; no browser tests | Which Studio users reach (D7); driving a reconciliation through the UI in a browser test (PR2 tests the committed card by server rendering instead) |
| AppPort core/SDK/protocol are in `rkendel1/appport`; `AppPort/ui/1` is published | Whether `appport()` serves management HTML (Compute docs say no) |
| AuthBoundry portal is Next + Tailwind with no tokens; not in CI | Runtime behaviour of `/authorization` (shape mismatch verified in source only) |
| AppBoundry portal is a 99 KB string-template SPA, dark only, two badge tones | Whether `public/app.js` has an untracked source |
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
