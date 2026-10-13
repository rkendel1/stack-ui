# Stack UI audit

PR1 deliverable. Read-only inspection of the default branch of every repository
that carries Stack product UI or the contracts it consumes. Nothing in those
repositories was built, installed, or changed.

**Citation form.** `repo:path[:line[-line]]`, relative to that repository's root.
`scripts/check-citations.mjs` checks every citation in `docs/` against sibling
checkouts. **[V]** = verified in code at the cited place. **[A]** = assumption.
**[U]** = unknown, not verifiable from source.

## 1. Repository inventory

| Product | Repository (branch @ commit) | Languages / build | Package manager |
|---|---|---|---|
| Compute | `rkendel1/compute` (main @ `dfc73d3`) | Rust workspace (Cargo), 3 private npm packages in `packages/` | Cargo; npm per package |
| FeltDB | `rkendel1/flow_db` (main @ `3ff984c`) | Rust + TypeScript monorepo | npm workspaces (lockfile v3) |
| AppPort core, SDK, protocol | `rkendel1/appport` (main @ `96508cd`) | TypeScript | pnpm |
| AppPort services | `rkendel1/appport-services` (main @ `4b076c5`) | TypeScript, Express | npm |
| AuthBoundry | `rkendel1/authboundry` (main @ `fece4c4`) | Rust server + TS SDK + Next.js portal | npm, 3 independent lockfiles, no workspaces |
| AppBoundry | `rkendel1/appboundry` (main @ `4e50aeb`) | TypeScript monorepo | pnpm (`packageManager: pnpm@10.33.0`) |

Repository identity findings that change the plan:

- **[V] AppPort core and SDK live in `rkendel1/appport`, not in `appport-services`.**
  It publishes 17 public `@appport/*` packages, including `@appport/core` 1.0.4,
  `@appport/sdk` 1.1.23 and `@appport/protocol` 1.0.3 (`appport:packages/protocol/package.json`).
  `appport-services` depends only on the published protocol
  (`appport-services:package.json`) and has its runtime entry at
  `appport-services:src/runtime/appport.ts:258`.
- **[V] `rkendel1/appboundry` is a diverged copy of the AppPort monorepo plus the
  AppBoundry product layer.** Its root package is `appport-monorepo` and its
  `repository` points at `rkendel1/appport` (`appboundry:package.json`). Its
  `@appport/core` and `@appport/protocol` are private 1.0.0 copies
  (`appboundry:packages/core/package.json`, `appboundry:packages/protocol/package.json`)
  that predate the published 1.0.3 protocol and lack its UI module.
  AppBoundry-specific code is `appboundry:packages/appboundry`, `appboundry:packages/cli`,
  `appboundry:apps/cloud-platform`, `appboundry:apps/cloud-portal` and `appboundry:studio`.
- **[V] No repository is a design system.** None publishes tokens or components
  for another product, and no CODEOWNERS file exists in any of the six.

## 2. Frontend inventory

| Product | UI surface (entry) | Framework | Styling / tokens | Theme | Tests touching UI |
|---|---|---|---|---|---|
| Compute | Control plane SPA, compiled into the binary and served at `/ui/` (`compute:crates/compute-environment/src/api.rs:242-244`) | None: vanilla DOM, no build step (`compute:crates/compute-environment/ui/app.js`) | One CSS file, 12 custom properties (`compute:crates/compute-environment/ui/app.css:1-32`) | Light + dark via `prefers-color-scheme` | Playwright browser suite (`compute:packages/compute-ui-e2e/package.json`), UI/API parity test |
| FeltDB | Studio control plane (`flow_db:packages/studio/src/app.tsx:99-111`) | React 18/19, react-router 7, Vite 8 | Global CSS, 4 overlapping token sets | Light only (one component dark) | Logic tests and HTTP e2e; no DOM rendering |
| FeltDB | Hosted site "Studio" (`flow_db:website/app/studio/page.tsx`, 4,942 lines) | Next.js 16, React 19 | 42 CSS files; 767 hex literals, 70 `var(--…)` uses | Light only | None for UI |
| AppPort services | 10 server-rendered management pages (`appport-services:src/configuration/ui.ts:13`) | None: HTML template strings, inline scripts | One inline CSS string, hard-coded hex (`appport-services:src/configuration/ui.ts:3`) | Light only | Route and discovery contract tests |
| AppPort core | None (headless libraries, CLI); example page only | — | — | — | — |
| AuthBoundry | Customer portal + marketing (`authboundry:apps/web`) | Next.js 15.5 App Router, React 19 | Tailwind 3.4, empty `theme.extend` (`authboundry:apps/web/tailwind.config.ts`) | Light + dark (class); toggle absent in portal | `node --test` source-text assertions; not run in CI |
| AuthBoundry | Rust sign-in pages (`authboundry:crates/server/src/ui.rs`), CLI Studio (`authboundry:crates/cli/src/studio.rs`) | Server-rendered strings | Separate hex palettes | Mixed | None |
| AppBoundry | Cloud portal UI (`appboundry:apps/cloud-platform/public/app.js`, ~99 KB) inside a Next 16 shell (`appboundry:apps/cloud-platform/app/portal-shell.jsx`) | None for the product UI: HTML strings into `innerHTML`, hash routing | Global CSS, 9 tokens (`appboundry:apps/cloud-platform/public/styles.css`) | Dark only | String/structure assertions only |
| AppBoundry | Local studio (`appboundry:studio/src/index.ts`) | Server-rendered strings | 4 token sets with different names | Two light+dark, two dark-only | String assertions |

**[V] Nobody uses a component library or an icon library.** All five products
use Unicode glyphs or inline SVG for icons. No Radix, shadcn, Headless UI, MUI or
CSS-in-JS dependency exists in any manifest.

**[V] Framework compatibility.** Two products' primary UIs are React
(FeltDB Studio, AuthBoundry portal). Three are framework-free: Compute
(no build step, assets embedded with `include_str!`), AppPort services
(server-rendered strings) and AppBoundry (string templates). A React-only
design system would leave three of five products unable to adopt it.

### Representative screens inspected

- **Compute** environment detail, version evidence, computer reality panel
  (`compute:crates/compute-environment/ui/app.js:133-145`) and the 28 journey
  screenshots in `compute:docs/product-surface/README.md`, generated by
  `the_whole_product_from_one_command` (`compute:crates/compute-cli/tests/product_journey.rs`).
  Status is a glyph plus a text label, coloured on the glyph only
  (`compute:crates/compute-environment/ui/app.js:101-104`, `compute:crates/compute-environment/ui/app.css:100-103`).
- **FeltDB** Studio Data browser (`flow_db:packages/studio/src/control-plane/Data.tsx`),
  Operations (`flow_db:packages/studio/src/control-plane/Operations.tsx:15-21`)
  and State workbench (`flow_db:packages/studio/src/control-plane/State.tsx`),
  where revision integrity is shown as plain text (`flow_db:packages/studio/src/control-plane/State.tsx:274`).
- **AppPort services** jobs, API keys and overview pages, and the screenshots in
  `appport-services:docs/screenshots/`.
- **AuthBoundry** delegations list (`authboundry:apps/web/app/(portal)/delegations/page.tsx`),
  decision detail (`authboundry:apps/web/components/applications/DecisionDetail.tsx`),
  settings (`authboundry:apps/web/app/(portal)/settings/page.tsx`).
- **AppBoundry** applications, deployments and activity/evidence views in
  `appboundry:apps/cloud-platform/public/app.js` (`applications()`, `deployments()`, `activity()`).

## 3. Service interfaces a shared UI may consume

Only existing, supported interfaces. The design system calls none of them;
products do.

| Product | Interface | Evidence |
|---|---|---|
| Compute | `compute.api@1`, 149 `(method, path)` routes in `ROUTES` | `compute:crates/compute-environment/src/api.rs:25`, `compute:crates/compute-environment/src/api.rs:30-240` |
| Compute | Error envelope `{kind, message, request_id}`; freshness headers `X-Compute-State: live\|cached\|stale` and `X-Compute-State-As-Of` | `compute:crates/compute-environment/src/api.rs:536-541`, `compute:crates/compute-environment/src/api.rs:469`, `compute:docs/feltdb.md` |
| Compute | Typed TS mirror of status vocabulary in `@compute/appport` (private) | `compute:packages/compute-appport/src/types.ts`, `compute:packages/compute-appport/src/computers.ts` |
| FeltDB | Server-declared capabilities `available\|partial\|unsupported`, 43 ids | `flow_db:crates/feltdb-server/src/control_plane.rs:99`, `flow_db:packages/studio/src/utils/control-plane-api.ts:21` |
| FeltDB | Control-plane, state, data, health routes (single axum router) | `flow_db:crates/feltdb-server/src/main.rs:9077-9135`, `flow_db:crates/feltdb-server/src/main.rs:9566-9582` |
| FeltDB | Stable error `code`s; "a timeout is uncertain, not proof of failure" | `flow_db:docs/reference/public-api.md` |
| AppPort | `AppPort/ui/1` UI contribution protocol, discovery at `GET /v1/ui` | `appport:packages/protocol/src/ui.ts` |
| AppPort services | `SURFACES` contribution and management routes | `appport-services:src/runtime/ui.ts:47-58`, `appport-services:src/runtime/management.ts` |
| AuthBoundry | `/_authboundry/*` control routes, hand-rolled router | `authboundry:crates/server/src/control_routes.rs:54-325` |
| AuthBoundry | Decision evidence record `ApplicationAuthorizationEvidence` | `authboundry:crates/storage/src/control_plane.rs:167` |
| AppBoundry | Portal API (~60 routes) and `/api/snapshot` read model | `appboundry:apps/cloud-portal/src/server.ts:301-612` |

**[V] `AppPort/ui/1` is already the cross-product navigation contract.**
A product publishes `{protocol, product, surfaces[], navigation[], composition}`
at `GET /v1/ui`; hosts validate it as untrusted data and link to the product's
own pages. Compute implements the host side (`compute:crates/compute-environment/src/service_ui.rs`,
`compute:docs/service-ui.md`) with a browser test that nothing a service sends can
execute in Compute (`compute:packages/compute-ui-e2e/src/service-ui.test.mjs`).
AppPort services implements the product side (`appport-services:src/runtime/ui.ts:47-58`).
The shell contract (`docs/product-shell.md`) builds on this rather than replacing it.

## 4. Reuse rather than rebuild

| Asset | Where | Why it matters |
|---|---|---|
| Status renderer: glyph + text, colour on the glyph, glyph `aria-hidden` | `compute:crates/compute-environment/ui/app.js:101-104` | Satisfies "colour is never the only signal"; becomes the `StatusIndicator` contract |
| Honest-unavailable primitives `Capable`, `Unavailable`, `PartialNotice`, `Loading`, `Failure`, `Empty`, `Stat` (em dash, never a fabricated zero) | `flow_db:packages/studio/src/control-plane/primitives.tsx:15-113` | Semantics of the shared async-state and capability components |
| Capability matrix generated from the server and checked in CI-able script | `flow_db:docs/reference/studio-capability-matrix.md`, `flow_db:tools/studio-capability-matrix.mjs` | Model for per-product "which controls exist" coverage |
| Mechanical UI boundary check (no storage access, no mocks) | `flow_db:tools/check-studio-boundary.mjs` | Model for enforcing Phase 3 rules |
| Review-then-GO confirmation, observed-vs-desired reality panel, step list with evidence | `compute:crates/compute-environment/ui/app.js`, journey screenshots | Interaction patterns 2, 5, 6 and 8 |
| Browser harness against a real daemon | `compute:packages/compute-ui-e2e/src/control-plane.test.mjs` | Template for cross-product browser and a11y tests |
| No-`innerHTML` rule enforced by test | `compute:crates/compute-environment/tests/service_ui.rs` | Security baseline for framework-free bindings |
| `AppPort/ui/1` + `validateUiContribution` | `appport:packages/protocol/src/ui.ts` | Shell navigation and discovery |
| Decision evidence field set | `authboundry:crates/storage/src/control_plane.rs:167` | Evidence summary content for authorization |
| Explicit "configured is not executed / not verified" product copy | `appboundry:apps/cloud-platform/public/app.js` (`deployments()`, `evidence()`) | Evidence semantics already understood by the product |

## 5. Evidence-backed inconsistencies

1. **Five visual languages, no shared tokens.** Accent is blue `#2f5bd8` in
   Compute (`compute:crates/compute-environment/ui/app.css:7`), Bootstrap blue
   `#007bff` and a separate green palette in FeltDB Studio
   (`flow_db:packages/studio/src/index.css:6`, `flow_db:packages/studio/src/control-plane/control-plane.css`),
   Tailwind slate in AuthBoundry, cyan `#55e6d2` on a dark-only canvas in
   AppBoundry (`appboundry:apps/cloud-platform/public/styles.css`), and hard-coded
   greys in AppPort services (`appport-services:src/configuration/ui.ts:3`).
   AuthBoundry alone has four (portal, `authboundry:crates/server/src/ui.rs`,
   `authboundry:crates/cli/src/studio.rs`, `authboundry:templates/email-verification.html`);
   AppBoundry's studio has four token sets with different names
   (`--accent/--bad/--fg` vs `--cyan/--red/--text`), and its explorer copies the
   portal stylesheet byte for byte (`appboundry:examples/appboundry-explorer/public/styles.css`).
2. **Status tones contradict across and within products.**
   - Compute keys its status map by bare string (`STATES`,
     `compute:crates/compute-environment/ui/app.js:56-96`). `ready` is a warning
     there because it is an in-progress release phase
     (`compute:crates/compute-environment/ui/app.js:99`), yet `ready` is the
     verified good value of environment readiness
     (`compute:crates/compute-environment/src/status.rs:655`) and of process
     readiness, which the UI already has to special-case
     (`compute:crates/compute-environment/ui/app.js:110-113`). A string-keyed map
     cannot represent both; this is why the contract keys mappings by field.
   - AppBoundry has no danger badge, so failures render amber
     (`appboundry:apps/cloud-platform/public/styles.css`).
   - AuthBoundry renders delegation `pending` and `expired` red, the same as
     `revoked` (`authboundry:apps/web/components/applications/ApplicationConsole.tsx:167`),
     and as raw unstyled text on the global list (`authboundry:apps/web/app/(portal)/delegations/page.tsx`).
   - Values outside `STATES` are remapped ad hoc at each call site before
     rendering: version `published`/`publishing` and build `succeeded` become
     `complete`/`pending`/`deploying` (`compute:crates/compute-environment/ui/app.js:571`,
     `compute:crates/compute-environment/ui/app.js:1429`), process `unready`
     becomes `unhealthy` (`compute:crates/compute-environment/ui/app.js:112`),
     and job states (`queued`, `cancelled`, `timed_out`, `rejected`) appear only
     as plain text (`compute:crates/compute-environment/ui/app.js:1008`). The tone
     of a state is decided in many places rather than one.
3. **Success, casing and naming drift.** Success is `complete`, `completed`,
   `succeeded`, `published`, `active` in Compute; `completed` vs `delivered` in
   AppPort services (`appport-services:src/jobs/models.ts:5`, `appport-services:src/webhooks/models.ts:40`).
   Case is mixed within single unions in AppBoundry
   (`verified|CONTRACT_MISMATCH|IDENTITY_MISMATCH`, `appboundry:packages/core/src/contract-attestation.ts:30`)
   and across layers in AuthBoundry (`allow` on the wire, `ALLOW` in the portal,
   `AUTHORIZED` in the SDK).
4. **Verification is flattened or absent in the UI.** FeltDB integrity is the
   text "NOT verified" (`flow_db:packages/studio/src/control-plane/State.tsx:274`).
   AppBoundry models configured, contract-active and verified-running separately
   but draws them with two badge colours. AuthBoundry has no verification state
   in the UI.
5. **Freshness is produced but not shown.** Compute's API labels stale responses
   (`compute:crates/compute-environment/src/api.rs:469`) and its `AGENTS.md`
   requires stale state to be labelled, but the UI never reads the header
   (no reference in `compute:crates/compute-environment/ui/app.js`). FeltDB has
   snapshot staleness `current|stale|unknown` (`flow_db:packages/core/src/runtime-snapshot.ts:139`)
   with no shared treatment.
6. **Duplicate UIs inside a product.** FeltDB's two Studios share no code.
   AuthBoundry's `/evidence` and `/decisions` list the same records differently.
7. **Defects visible from source** (runtime not exercised):
   - AuthBoundry `/authorization` compares `result.decision === "ALLOW"`
     (`authboundry:apps/web/app/(portal)/authorization/page.tsx`, line 126 at the audited commit; corrected in PR5) against a
     pass-through of `{latest_decision, message}` (`authboundry:crates/server/src/control_routes.rs:4403-4411`,
     `authboundry:apps/web/app/api/authorization/explain/route.ts`). The check cannot match.
   - FeltDB `KeyManagementPanel` calls `${apiUrl}/api/keys` with raw `fetch`
     (`flow_db:packages/studio/src/components/KeyManagementPanel.tsx:72`) instead of
     Studio's `ControlPlaneApi`, so it bypasses Studio's error-code mapping and the
     route that `check-studio-boundary.mjs` enforces for control-plane code.
   - AppPort services tables render more data cells than headers, and nav links
     unmounted pages (`appport-services:src/configuration/ui.ts:5`, `appport-services:src/configuration/ui.ts:43`).
8. **No accessibility or visual-regression coverage anywhere.** No axe, Storybook,
   screenshot diffing or contrast checks in any repository. Measured contrast of
   current status colours: Compute warning glyph `#c98a08` on white is 2.95:1
   (below the 3:1 non-text minimum); FeltDB `--warning-color` `#ffc107` on white is 1.63:1.
   Placeholder-only form fields on 7 of 10 AppPort services pages (`appport-services:src/configuration/ui.ts:27-53`). One `aria-label`
   in AppBoundry's 99 KB portal.
9. **Frontend CI gaps.** AuthBoundry's portal is not linted, type-checked, tested
   or built in CI (`authboundry:.github/workflows/architecture-invariants.yml`).
   AppBoundry CI does not build `apps/cloud-platform` (`appboundry:.github/workflows/ci.yml`).
   AppPort services has no CI. FeltDB's `check:studio` (`flow_db:package.json:39`)
   is not referenced by any workflow.
10. **Dependency skew on shared contracts.** `@appport/protocol` 1.0.2 in Compute
    (`compute:packages/compute-appport/package.json`), ^1.0.3 in AppPort services,
    private 1.0.0 in AppBoundry. `@feltdb/core` 0.11.0 (AppBoundry), 0.11.7
    (AuthBoundry), 0.11.9 (AppPort services, Compute). `@appport/services` pinned at
    0.4.5, 0.4.6, 0.4.10 and 0.4.11 across repositories.

## 6. Constraints, risks, unknowns

**Constraints [V]**
- Compute's UI has no build step and is embedded with `include_str!`. Anything
  shared must be consumable as static, dependency-free CSS and ES module files
  vendored at a pinned version; Compute cannot add an npm install to `cargo build`.
- Compute forbids `innerHTML`, `eval` and `document.write` by test
  (`compute:crates/compute-environment/tests/service_ui.rs`). Framework-free
  bindings must build DOM with `createElement`/`textContent`.
- FeltDB forbids any second store, cache or policy filter outside FeltDB
  (`flow_db:AGENTS.md`); Compute forbids serving stale state as current
  (`compute:AGENTS.md`). Shared components may not cache product data.
- FeltDB does not depend on any `@appport/*` package. Housing the design system
  in AppPort would add a FeltDB → AppPort dependency.
- Node floors differ: Compute packages `>=20`, AppPort/AppBoundry `>=20`,
  AuthBoundry SDK `>=18`, FeltDB root `>=14` (CI pins 24.9.0). Shared packages
  target ES2020 and Node `>=20` for tooling only.

**Risks**
- AppBoundry's `public/app.js` is minified-style and self-patching (functions
  redefined by string replacement). **[U]** whether an untracked source exists.
  Adoption there should replace screens, not patch them.
- The AppBoundry/AppPort fork divergence means AppBoundry may not consume the
  published `@appport/protocol` UI module without first reconciling packages.
- Hygiene items to fix outside this programme, flagged for security review:
  committed dev credential state (`authboundry:crates/cli/.authboundry/feltdb/local-credentials.json`)
  and committed `node_modules` (`authboundry:node_modules/.package-lock.json`).

**Unknowns [U]**
- **[A]** Which FeltDB Studio users actually reach (`packages/studio` app build vs the website page); the website page is assumed primary for hosted users because `studio-deploy.yml` deploys the website.
- **[A]** The Vercel project roots for AuthBoundry and FeltDB deploys (assumed `apps/web` and `website`).
- Real keyboard and screen-reader behaviour of every UI (nothing was run).
- npm scope availability for the proposed package names.
- Whether AppPort services' HTML pages are mounted by `appport()` itself or only
  by the standalone host (Compute's doc states the latter, `compute:docs/service-ui.md`).

## 7. Component and pattern matrix

● present and reusable · ◐ present, product-local or inconsistent · ○ absent · — not applicable

| Pattern | Compute | FeltDB Studio | AppPort services | AuthBoundry portal | AppBoundry portal |
|---|---|---|---|---|---|
| Semantic colour tokens | ◐ 12 vars | ◐ 4 sets | ○ | ○ | ◐ 9 vars |
| Dark theme | ● | ○ | ○ | ◐ | dark only |
| Status indicator (not colour-only) | ● | ◐ | ○ raw text | ◐ | ◐ 2 tones |
| Loading / empty / error | ◐ | ● | ◐ | ◐ | ◐ |
| Honest unavailable (capability) | ◐ header chip | ● | ◐ mount gating | ◐ nav gating | ◐ unavailable snapshot |
| Freshness / as-of label | ○ (API only) | ◐ | ○ | ○ | ◐ footer |
| Resource identity (id, digest truncation) | ● mono chips | ● `Identity` | ○ | ◐ | ● `short()` |
| Destructive confirmation | ● review→GO dialog | ◐ | ○ `confirm()` | ◐ | ○ `confirm()` |
| Execution progress / steps | ● | ◐ | ○ | — | ◐ |
| Verification with checks shown | ● version evidence | ◐ text | — | ○ | ◐ |
| Evidence / activity timeline | ● events, receipts | ● provenance, transactions | ○ | ● decision evidence | ● activity |
| Authorization presentation | ◐ `authorization_denied` | ◐ | ● capabilities per surface | ● | ◐ |
| `AppPort/ui/1` role | host (links out) | none | contributor | none | none |
| Browser tests | ● | ○ | ○ | ○ | ○ |
| A11y / visual regression | ○ | ○ | ○ | ○ | ○ |

**Integration claims that remain unverified**
- That FeltDB Studio can consume an external stylesheet without visual
  regressions in its four existing palettes (no rendering tests exist).
- That AuthBoundry's portal and AppBoundry's portal can adopt shared CSS
  alongside Tailwind and global CSS respectively without specificity conflicts.
- That `AppPort/ui/1` hosts other than Compute exist; none was found.
