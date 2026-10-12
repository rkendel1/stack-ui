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
- Icon set: glyphs remain in PR2; an SVG icon set is evaluated in PR3 when menus
  and tables arrive.
- Data table virtualization, charting, diff viewers (product-owned until two
  products need the same one).
- Internationalization: all products are English-only today; components accept
  product-supplied text so localization stays possible.
- Hygiene items found during the audit (AuthBoundry committed credentials and
  `node_modules`, stale lockfiles and docs) are reported to owners, not fixed here.
