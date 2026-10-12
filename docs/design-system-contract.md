# Stack design-system contract

Status: **proposed** (PR1). Normative words: **must**, **must not**, **should**, **may**.
Evidence for every constraint below is in `docs/audit.md`.

## 1. Principles

1. **Presentation, not authority.** The design system renders what a product
   tells it. It never fetches, caches, filters, authorizes or infers product state.
2. **Truthful states.** A UI shows what the product's response and evidence
   establish, and no more. Submitted is not succeeded; running is not verified;
   unknown is shown as unknown. (Adopted from FeltDB Studio's rule that an
   unavailable capability "renders unavailable; does not synthesize",
   `flow_db:docs/reference/public-api.md`.)
3. **Framework-neutral core.** Three of five products have no UI framework.
   The contract is defined as CSS custom properties, CSS classes with a fixed
   DOM structure, and plain data tables. Framework bindings are thin layers.
4. **Never colour alone.** Every state carries a text label; colour and glyph
   are redundant reinforcement (the Compute pattern,
   `compute:crates/compute-environment/ui/app.js:101-104`).
5. **Domain stays with products.** Shared components expose slots for domain
   content; they do not model domains.
6. **Incremental adoption.** Each product adopts one screen at a time with no
   flag day and no shared deployment.

## 2. Packages (proposed)

| Package | Contents | Runtime deps | Consumers |
|---|---|---|---|
| `tokens` | `tokens.css` (custom properties, light + dark), `tokens-light.css` (light only), `tokens.json` | none | all |
| `core` | `core.css` (component classes), `states.js` (pure tone/label/glyph resolution), `view.js` (each component's DOM structure as a plain tree), `dom.js` (renders those trees with `createElement`/`textContent`, never markup parsing), and `stack-ui-core.js`, a strict-mode classic-script build of all three exposing one global `StackUI` | none | all; vendored by Compute |
| `react` | Thin React 18/19 components rendering the same `view.js` trees | peers `react`, `@stack-ui/core` | FeltDB Studio, AuthBoundry portal |

Final package names, scope and repository are in `docs/adoption-plan.md` §1
and `docs/decisions.md` (D1, D9).

## 3. Token taxonomy

### 3.1 Naming

`--stack-{category}-{role}[-{variant}][-{state}]`, lowercase, hyphenated.

- Categories: `color`, `font`, `text` (type scale), `space`, `size`, `radius`,
  `border`, `shadow`, `z`, `motion`, `focus`.
- **Semantic only.** Components reference semantic tokens. A palette layer
  (`--stack-palette-blue-600`, …) exists inside `tokens.css` and **must not** be
  referenced by product or component code.
- JSON mirror uses the same path: `color.status.critical.fg`.

### 3.2 Categories

| Category | Tokens (role list) |
|---|---|
| Surfaces | `color-bg-canvas`, `color-bg-surface`, `color-bg-raised`, `color-bg-sunken`, `color-bg-overlay`, `color-bg-code` |
| Text | `color-text-default`, `color-text-muted`, `color-text-subtle`, `color-text-inverse`, `color-text-link`, `color-text-on-accent` |
| Borders | `color-border-default`, `color-border-strong`, `color-border-subtle` |
| Focus | `focus-ring-color`, `focus-ring-width` (≥2px), `focus-ring-offset` |
| Intent (actions) | `color-action-primary-{bg,fg,bg-hover,bg-active}`, `color-action-secondary-*`, `color-action-danger-*` |
| Status (tones) | `color-status-{positive,progress,attention,critical,neutral,unknown}-{fg,bg,border,glyph}` |
| Evidence | `color-evidence-verified-*`, `color-evidence-unverified-*` (distinct from `positive`; see §6) |
| Information | `color-notice-info-*` for informational `Alert`/`Notification` only; not a state tone and not accepted by `StatusIndicator` |
| Typography | `font-family-sans` (system stack), `font-family-mono`; `text-{xs,sm,md,lg,xl,2xl}-{size,line}`; `font-weight-{regular,medium,semibold}` |
| Spacing | `space-{0,1,2,3,4,5,6,8,10,12}` on a 4px base |
| Sizing | `size-control-{sm,md,lg}` (min 32/36/44px), `size-icon-{sm,md}` |
| Radii | `radius-{sm,md,lg,pill}` |
| Borders | `border-width-{thin,thick}` |
| Elevation | `shadow-{raised,overlay}`, `z-{sticky,dropdown,overlay,toast}` |
| Breakpoints | `bp-{sm,md,lg,xl}` = 640/768/1024/1280px (JSON + documented media queries; custom properties cannot be used in media queries) |
| Motion | `motion-duration-{fast,base}`, `motion-ease-standard`; all zeroed under `prefers-reduced-motion: reduce` |

### 3.3 Themes

- `tokens.css` defines light on `:root`, dark under
  `@media (prefers-color-scheme: dark)` scoped by
  `:root:not([data-stack-theme="light"])`, and explicit `[data-stack-theme="dark"]`
  / `[data-stack-theme="light"]` overrides. A product that already has a theme
  switch (AuthBoundry: `class` strategy) sets the attribute; one that follows
  the OS (Compute) does nothing.
- Every semantic token **must** have a value in both themes.

### 3.4 Contrast requirements (testable)

- Text tokens on any `bg` token they are paired with: ≥ 4.5:1 (`text-subtle`
  ≥ 4.5:1 too; it is not a "disabled" colour).
- `status-*-glyph`, `border-strong`, `focus-ring-color` on adjacent surfaces: ≥ 3:1.
- `status-*-fg` on `status-*-bg`: ≥ 4.5:1.
- A token test in the design-system repository computes every declared pair in
  both themes and fails below threshold. (Current Compute warning glyph measures
  2.95:1 and FeltDB `--warning-color` 1.63:1; audit §5.8.)

### 3.5 Initial visual direction (values not final)

Neutral, quiet, information-dense: system font stack (the body font of Compute,
AppPort services and AuthBoundry today; AppBoundry prefers Inter and FeltDB's
control plane uses Georgia headings, both of which move to the product-mark
slot; no web-font download, which Compute's offline binary requires), white
/ near-white surfaces in light and near-black in dark, one blue platform accent
(close to Compute `#2f5bd8` and AppBoundry studio `#315bea`, both already
≥ 4.5:1 on white), monospace for identifiers and digests. Product identity
appears only in the shell's product mark slot, never in status colours.

Migration needed per product (detail in `docs/adoption-plan.md`): AppBoundry
moves from dark-only to both themes; FeltDB's green/Georgia control-plane
styling and AppBoundry's cyan become product-mark accents, not UI tokens.
Final values are decided in PR2 against rendered screenshots (`docs/decisions.md` D6).

### 3.6 Ownership

- `--stack-*` tokens are owned by the design system. Products **must not**
  redefine them except by setting `data-stack-theme`.
- Products **may** define `--{product}-*` tokens for domain-only visuals
  (e.g. FeltDB diff added/removed, AppBoundry `--stream`). They **must not**
  use them to express shared states.
- Token changes follow §9 versioning; removing or renaming a token is breaking.

## 4. Component API conventions

Apply to every component, in every binding.

- **Structure.** Each component has a documented root class `stack-{name}`,
  BEM-style parts `stack-{name}__{part}` and modifiers `stack-{name}--{mod}`.
  The DOM structure is part of the contract so framework-free products can
  render it by hand; the `react` binding renders the same structure.
- **Props / attributes.** Names in camelCase (React) map 1:1 to `data-*`
  attributes in plain DOM (`tone` ↔ `data-tone`). Enumerations are lowercase
  `snake_case` strings.
- **States are props, not internal fetches.** Components receive `status`,
  `error`, `items`; they never receive a URL or a client.
- **Slots for domain content.** `title`, `meta`, `actions`, `children`,
  `detail`. A product puts domain content in slots; it does not fork components.
- **Text is supplied by the product.** Components ship no product copy beyond
  generic defaults ("Loading", "Retry") that can be overridden.
- **Test hooks.** Components pass through `data-*` attributes untouched so
  existing selectors (`data-go`, `data-reality`, …) keep working.
- **No `innerHTML`.** Framework-free helpers build nodes with
  `createElement` and `textContent`, matching Compute's tested rule.

## 5. Component inventory (initial)

Required states apply to every listed component; "A11y" lists the minimum the
component guarantees by construction.

| Component | Purpose | Key API | Required states | A11y | Extension points |
|---|---|---|---|---|---|
| `Button` | Trigger an action | `variant: primary\|secondary\|danger\|ghost`, `size`, `busy`, `disabled` | default, hover, focus-visible, active, disabled, busy | Native `<button>`; `busy` sets `aria-busy` and keeps the label; ≥ 32px target | Leading/trailing icon slot |
| `ActionMenu` | Secondary actions on a resource | `items[{id,label,danger,disabled,reason}]` | closed, open, item disabled with reason | Menu button pattern; arrow keys; Esc closes; returns focus | Item `reason` text shown for disabled items |
| `TextField`, `Select`, `Checkbox`, `FieldGroup` | Form controls | `label` (required), `hint`, `error`, `required`, `readOnly` | empty, filled, invalid, read-only, disabled | Visible `<label>`; `aria-describedby` for hint and error; never placeholder-as-label | Field `adornment` slot (units, copy button) |
| `List` | Non-tabular resource lists (cards, compact rows) | `items`, `renderItem`, `rowHref` | loading, empty, no-match, error, unavailable, populated | `<ul>`/`<ol>` semantics; item is one link target | Item content slot |
| `DataTable` | Tabular resource lists | `columns[{id,header,sortable,align}]`, `rows`, `sort`, `onSort`, `selection`, `rowHref` | loading, empty, error, unavailable, populated, partial page | `<table>` semantics; `aria-sort`; header count = cell count (enforced in tests) | Cell renderers; row actions column |
| `FilterBar` | Filter and search lists | `filters[]`, `query`, `onChange` | idle, applied (count shown), no-match | Labelled controls; result count in `aria-live=polite` | Product filter controls |
| `Pagination` | Cursor or page navigation | `hasPrev`, `hasNext`, `label` | first, middle, last, unknown total | `nav` with label; does not fabricate totals | — |
| `PageHeader` | Page identity and actions | `eyebrow`, `title`, `description`, `status`, `actions` | default, with status, loading title | One `<h1>` per page | `meta` slot |
| `Breadcrumbs` | Resource context path | `items[{label,href}]` | default, truncated | `nav aria-label="Breadcrumb"`, `aria-current="page"` | — |
| `Tabs` | Sections of one resource | `tabs[{id,label,status?}]`, `active` | default, with badge, disabled with reason | `tablist`/`tab`/`tabpanel`, arrow keys (FeltDB/Compute already use roles) | Tab status badge |
| `Dialog`, `Drawer` | Focused tasks | `title`, `open`, `onClose`, `dismissible` | open, submitting, error | Native `<dialog>` or equivalent focus trap; Esc; focus returns to trigger | Body and footer slots |
| `ConfirmAction` | Destructive and irreversible actions | `title`, `consequences[]`, `confirmLabel`, `requireText?` | review, submitting, outcome (see §7.8) | Dialog rules; confirm button names the action ("Delete environment"), never "OK" | Consequence list content |
| `StatusIndicator` | Show one state value | `tone`, `label`, `glyph?`, `detail?` | all six tones | Text label always rendered; glyph `aria-hidden` | Product-supplied label |
| `VerificationBadge` | Show verification facts | `state: verified\|verification_failed\|not_verified\|not_evaluated`, `checks[]`, `evidenceHref?`, `at?` | four states | Label states the claim ("Verified · 6 checks"); details disclosed on demand | Check list content |
| `FreshnessLabel` | Age and authority of data | `freshness: live\|cached\|stale\|unknown`, `asOf?`, `source?` | four states | Text, never colour only; `<time datetime>` | — |
| `Alert` | Persistent page-level notice | `tone: info\|attention\|critical`, `title`, `actions` | info, attention, critical | `role=status` (info/attention) or `role=alert` (critical) | Body slot |
| `Notification` | Transient outcome message | `tone`, `message`, `action?` | appears, dismissed, timed out | `aria-live`; not the only record of an outcome | — |
| `ErrorPanel` | Failed request with recovery | `title`, `message`, `code?`, `requestId?`, `onRetry?` | retryable, not retryable | `role=alert`; shows product error `code`/`request_id` when supplied | Recovery actions slot |
| `Loading`, `Skeleton` | Pending data | `what` (subject) | short, long (> 10 s shows "Still loading …") | `aria-busy` on region; text alternative | — |
| `EmptyState` | No data exists | `title`, `body`, `action?` | empty, no-match (distinct copy) | Heading level configurable | Illustration slot (optional) |
| `Unavailable` | Capability not supported or partial | `capability`, `status: partial\|unsupported`, `reason` | partial, unsupported | Explained note, **not** a disabled control (FeltDB rule) | Reason text |
| `ResourceIdentity` | Name, kind, id, digest | `kind`, `name`, `id`, `digest?`, `href?` | full, truncated | Full value available (copy action and accessible name); mono font for ids | Kind icon slot |
| `MetadataList` | Key-value facts | `items[{label,value}]` | value, missing (renders `—`, never `0`) | `<dl>` | Value renderers |
| `ActivityTimeline` | Events, audit, history | `items[{at,actor?,summary,status?,href?}]`, `hasMore` | loading, empty, populated, partial (more exist) | `<ol>` with `<time>` | Item detail slot |
| `EvidenceSummary` | What is proven and by what | `claims[{label,verification,checks[],evidenceHref}]` | all verified, mixed, none | Each claim has its own label | Product claim content |
| `StepList` | Multi-step operation progress | `steps[{id,label,status,evidence?}]` | pending, running, succeeded, failed, skipped | `<ol>`; `aria-current="step"` on the running step | Step evidence slot |

Not in the initial inventory: charts, code editors, diff viewers, graph views.
They stay product-owned until two products need the same one.

## 6. State and evidence semantics

### 6.1 Independent axes

A resource's state is shown on **separate axes**. They are never collapsed into
one colour or one word.

| Axis | Values | Meaning | Source rule |
|---|---|---|---|
| **Condition** (tone) | `positive`, `progress`, `attention`, `critical`, `neutral`, `unknown` | How the resource is doing now | Mapped per source field (§6.3) |
| **Operation outcome** | `submitted`, `accepted`, `completed`, `failed`, `cancelled`, `rejected`, `outcome_unknown` | What happened to a request | Only from the product's response (§7) |
| **Goal** | `satisfied`, `unsatisfied`, `not_evaluated` | Whether the desired end state holds | Only where the product models it |
| **Verification** | `verified`, `verification_failed`, `not_verified`, `not_evaluated` | Whether a stated check passed | Only from a product field defined as a check, with the checks listed |
| **Freshness** | `live`, `cached`, `stale`, `unknown` + `asOf` | How current the shown data is | Only from product freshness signals |
| **Capability** | `available`, `partial`, `unsupported` | Whether the product supports the action/view | Only from product capability declarations |

Rules:

1. **Verification is never inferred.** `positive` condition, `completed` outcome,
   an HTTP 2xx, a model's response, or a user's assertion **must not** render as
   `verified`. `VerificationBadge` requires a non-empty `checks[]` to show
   `verified`; with no checks it renders `not_evaluated`.
2. **Completion ≠ goal ≠ verification.** Where a product distinguishes them
   (Compute deployment `complete` vs `active`, environment converged generation,
   requirement `satisfied`; FeltDB `committed` vs `integrity_verified`; AppBoundry
   contract `ACTIVE` vs implementation `verified`), the UI shows each one.
3. **Unknown is a first-class state.** Missing data renders `—` or `unknown`,
   never a default of healthy or zero. A timeout is `outcome_unknown`, not `failed`
   (FeltDB: "A timeout is uncertain, not proof of failure").
4. **Stale is labelled.** Data marked stale or cached by the product shows a
   `FreshnessLabel` with its as-of time.
5. **No invented states.** If a product has no `degraded` value, the shared UI
   does not display one for it.

### 6.2 Tone semantics and default presentation

| Tone | Meaning | Default glyph | Example labels (product supplies) |
|---|---|---|---|
| `positive` | Working as intended | ● | Running, Healthy, Active, Allowed |
| `progress` | Changing toward a target | ◐ | Starting, Deploying, Syncing, Pending approval |
| `attention` | Works with a limitation, or needs a person | ▲ | Degraded, Stale, Draining, Expiring |
| `critical` | Failed or refused; needs action | ✕ | Failed, Denied, Revoked, Non-conforming |
| `neutral` | Inactive by intent; not a problem | ○ | Stopped, Retired, Disabled, Draft |
| `unknown` | Cannot be determined | ? | Unknown, Unverified, Unreachable |

`denied` is `critical` when it is the answer to the user's request and `neutral`
when it is a historical decision being inspected; the mapping table chooses per
field and context.

### 6.3 Source-state mapping (initial; per field, never per bare string)

The same word means different things in different fields (Compute `ready` is a
release phase in progress and also verified environment readiness). Mapping is
keyed by `product.entity.field` and lives in `core/states` as data. Unmapped
values render `unknown` tone with the raw value as label, and a test lists them.

**Compute**
| Field (source) | positive | progress | attention | critical | neutral | unknown |
|---|---|---|---|---|---|---|
| `ActualState` (`compute:crates/compute-environment/src/model.rs:28`) | running, completed | pending, starting, stopping | degraded | failed, denied | stopped | — |
| Environment `ReadinessState` (`compute:crates/compute-environment/src/status.rs:655`) | ready | created, starting | degraded | failed, unavailable | — | — |
| Process readiness (`compute:crates/compute-core/src/computers.rs:836`) | ready | starting | unready | — | — | — |
| Health (`compute:crates/compute-environment/src/status.rs:21`) | healthy | — | — | unhealthy | — | unknown |
| `DeploymentStatus` (`compute:crates/compute-state/src/model.rs:647`) | active, complete | pending, starting, ready, network_ready, switching, draining | — | failed, rolled_back | — | — |
| `VersionStatus` (`compute:crates/compute-state/src/model.rs:489`) | published | publishing | — | failed | — | — |
| `RolloutStatus` (`compute:crates/compute-state/src/model.rs:562`) | active | applying | — | failed | superseded | — |
| Stored `ComputerStatus` (`compute:crates/compute-core/src/computers.rs:51`) | running | pending, provisioning, resuming, stopping, destroying | — | failed, lost | stopped, destroyed, expired | unreachable |
| Process word (`ObservedProcess::status`, `compute:crates/compute-core/src/computers.rs:929-945`, plus `pending` and the machine's observed word when the machine is not running) | ready, running | pending, starting, stopping | unready | failed, lost | stopped, exited, destroyed, expired | unverified, unreachable |
| Job (`compute:crates/compute-core/src/jobs.rs:191`) | succeeded | created, accepted, queued, waiting_for_capacity, reserved, admitted, preparing, running | — | failed, rejected, timed_out | cancelled | — |
| Computer observed (`compute:packages/compute-appport/src/computers.ts:49`) | running | starting, reconciling, stopping | — | failed, lost | stopped, destroyed, expired | unverified, unreachable |
| Requirement check (`compute:crates/compute-core/src/project.rs:327`) | → Goal axis: satisfied / unsatisfied / not_evaluated; `not_required` hides the row | | | | | |
| Response header `X-Compute-State` | → Freshness axis: live / cached / stale + `X-Compute-State-As-Of` | | | | | |

Notes: deployment `complete` and `active` share a tone but keep their labels;
`complete` is also the Outcome of the release operation. `timed_out` is a
definite terminal failure in Compute (the job exceeded its deadline and was
stopped, `compute:crates/compute-core/src/jobs.rs:205-213`), unlike a request
timeout, which is `outcome_unknown`. Stored `ComputerStatus` values
(`compute:packages/compute-appport/src/computers.ts:27-41`) are mapped when a
screen displays them; the UI shows the observed reality today.

**FeltDB**
| Field (source) | positive | progress | attention | critical | neutral | unknown |
|---|---|---|---|---|---|---|
| `/health/ready` `state` (`flow_db:crates/feltdb-server/src/main.rs:10171-10212`) | healthy | recovering | degraded | unavailable | — | — |
| `AuthorityAvailabilityState` (`flow_db:packages/core/src/managed-recovery.ts:331`) | available | recovering | degraded | — | closed | unknown |
| `ProposalStatus` (`flow_db:packages/core/src/proposal.ts:29`) | applied | proposed, validated, previewed, approved | — | rejected | expired | — |
| `ConvergenceStatus` (`flow_db:packages/core/src/convergence.ts:8`) | → Goal: converged = satisfied; diverged, blocked, partially_converged = unsatisfied; pending, checking = not_evaluated; unverified → Verification `not_verified` | | | | | |
| `integrity_verified` (`flow_db:packages/studio/src/utils/control-plane-api.ts:89`) | → Verification: true = verified (check: content hash); false = verification_failed | | | | | |
| Runtime snapshot staleness (`flow_db:packages/core/src/runtime-snapshot.ts:139`) | → Freshness: current = live, stale, unknown | | | | | |
| `CapabilityStatus` (`flow_db:packages/studio/src/utils/control-plane-api.ts:21`) | → Capability axis, unchanged | | | | | |

**AppPort services**
| Field (source) | positive | progress | attention | critical | neutral |
|---|---|---|---|---|---|
| `JobStatus` (`appport-services:src/jobs/models.ts:5`) | completed | scheduled, pending, running, retrying | — | failed | — |
| `WebhookDeliveryStatus` (`appport-services:src/webhooks/models.ts:40`) | delivered | pending, delivering, retrying | — | failed | — |
| `SecretStatus` (`appport-services:src/secrets/models.ts:1`) | active | — | — | revoked | retired |
AppPort health (`appport-services:src/runtime/platform.ts:85`) only ever
answers `{ok: true}`; it has no failed, degraded or starting value. A UI shows
`positive` on that answer and treats no answer as a request failure
(`ErrorPanel`, `outcome_unknown`), never as a reported unhealthy state.

**AuthBoundry**
| Field (source) | positive | progress | attention | critical | neutral | unknown |
|---|---|---|---|---|---|---|
| Decision `allow\|deny` (`authboundry:crates/authz/src/policy.rs:194-204`) | allow | — | — | deny (live check) | deny (historical record) | — |
| `EnforcementOutcome` (`authboundry:dist/server.d.ts:145`) | AUTHORIZED | — | — | DENIED, INVALID_REQUEST | — | AUTHORITY_UNAVAILABLE, AUTHORIZATION_TIMEOUT → outcome_unknown |
| `DelegationStatus` (`authboundry:crates/contract/src/delegation.rs:61`) | active | pending | — | revoked | expired | — |
| `ApplicationStatus` (`authboundry:crates/storage/src/control_plane.rs:60`) | active | awaiting_contract | — | — | disabled | — |

An authorization decision is a recorded fact, not a verification. Decision
evidence (`ApplicationAuthorizationEvidence`) is shown with `EvidenceSummary`
fields, not with `VerificationBadge`.

**AppBoundry**
| Field (source) | positive | progress | attention | critical | neutral | unknown |
|---|---|---|---|---|---|---|
| Application phase (`appboundry:packages/core/src/application-lifecycle.ts:5`) | ACTIVE | DRAFT, VALIDATED, REGISTERED | CHANGE_PROPOSED | — | RETIRED | — |
| Implementation (`appboundry:packages/core/src/application-implementation.ts:26`) | → Verification: verified = verified; failed = verification_failed; stale = not_verified + attention; revoked = critical | | | | | |
| Contract attestation (`appboundry:packages/core/src/contract-attestation.ts:30`) | → Verification: verified = verified; CONTRACT_MISMATCH, IDENTITY_MISMATCH = verification_failed (the failed check is named by the value) | | | | | |
| Conformance report (`appboundry:packages/core/src/application-conformance.ts:57`) | → Verification: CONFORMING = verified (checks = report checks); NON_CONFORMING = verification_failed | | | | | |
| Execution (`appboundry:packages/core/src/appboundry-execution.ts:29`) | COMPLETED | CREATED, MATERIALIZED, RUNNING | — | MATERIALIZATION_FAILED, EXECUTION_FAILED | — | — |

Completing these tables for every field a screen uses is part of each product's
adoption PR, reviewed by that product's owner.

## 7. Interaction patterns

Each pattern names the components it uses and its required outcomes. "Outcome"
uses the Operation axis of §6.1.

1. **Discover and inspect a resource.** List (`DataTable` + `FilterBar` +
   `Pagination`) → detail (`PageHeader` + `Breadcrumbs` + `Tabs` +
   `MetadataList`). States: loading, empty (none exist), no-match (filters),
   error with retry, capability unavailable, stale (with as-of). Row links are
   real links (open in new tab works). Detail shows `ResourceIdentity` with the
   full id copyable. A read that times out shows `ErrorPanel` with Retry (reads
   are safe to retry) and keeps any previously shown data labelled `stale`;
   navigating away cancels the read silently; a resource the product reports as
   not found shows "Not found", not an empty detail page.
2. **Create, edit, save configuration.** Labelled fields; client validation
   only mirrors product rules and never replaces server validation. Save shows
   `busy`; on response: `completed` shows the saved values *as returned by the
   product* (not the form's values); `rejected` shows field errors from the
   product's `code`s; `outcome_unknown` (timeout or network) says the change may
   or may not have applied and offers "Check current state" (re-read), never
   automatic resubmit unless the product supports idempotency keys.
3. **Unsaved changes and cancellation.** Dirty forms warn on navigation away
   and on dialog close. Cancel discards local edits only; it never cancels a
   submitted request. Conflicts (product reports a newer revision) show both
   values and let the user reload or overwrite only if the product allows it
   (Compute's draft/conflict banner). If the user cancels while a save is in
   flight, the dialog closes but the request is not withdrawn: the outcome is
   reported when it arrives, or as `outcome_unknown` if it never does.
4. **Request or inspect authorization.** A control the caller lacks rights for
   is hidden when the product's capability/navigation contract hides it, or
   shown with the product's refusal reason when the user attempted it. A denial
   shows the reason in the operator's language and a link to evidence when the
   product records it. `AUTHORITY_UNAVAILABLE` / timeout is `outcome_unknown`,
   never shown as "denied". The shared UI performs no authorization checks of
   its own.
5. **Start, monitor, inspect execution.** Start → `submitted` → product
   acknowledgement (`accepted`, with id) → progress via the product's stream or
   polling (`StepList`) → terminal outcome. The UI says "Started" only after
   acceptance; it says "Succeeded" only on a product-reported terminal success.
   Lost stream shows `FreshnessLabel stale` and a reconnecting notice. Cancel is
   a request; it shows `cancelled` only when the product confirms.
6. **Verify artifacts, policies, outcomes.** `VerificationBadge` lists the
   checks performed, when, and links to the evidence the product exposes.
   Failed checks list which check failed. "Not evaluated" is shown when no
   check ran. Re-run verification is a normal execution (pattern 5); while it
   runs, the previous result stays visible with its time and is not replaced
   until a new result is reported; a verification run that is cancelled or times
   out leaves the previous result in place and says the new run did not finish.
7. **Recover from failures.** `ErrorPanel` shows the product's message, `code`
   and request id; offers Retry only when the operation is safe to retry
   (reads, or product-declared idempotent writes); otherwise offers re-read and
   a link to activity. Partial failures list what succeeded and what did not.
8. **Confirm destructive operations.** `ConfirmAction` lists consequences the
   product states (e.g. Compute review-then-GO); requires typed confirmation for
   irreversible deletes of named resources; after submit, follows pattern 5
   outcomes. The resource is shown as gone only after the product confirms.
9. **Inspect evidence and activity.** `ActivityTimeline` for events/audit with
   actor and time; `EvidenceSummary` for claims with their checks; links to
   receipts, provenance, decision records the product exposes. Shows
   "Older activity exists" rather than implying completeness when paginated.
   A live stream that drops shows `FreshnessLabel stale` with the time of the
   last event and reconnects; a page fetch that times out keeps loaded items and
   offers "Load more" again; evidence the product does not expose is not shown
   as absent-but-implied ("No receipt recorded" only when the product says so).

Outcome copy defaults (overridable): submitted "Sending…", accepted "Started",
completed "Done", failed "Failed", cancelled "Cancelled", rejected "Not accepted",
outcome_unknown "Result unknown — check current state".

## 8. Accessibility requirements

Target: **WCAG 2.2 AA** for every shared component and every adopted screen.

- Keyboard: all interactive elements reachable and operable; visible focus via
  `focus-ring-*` tokens (Compute defines no focus styles; FeltDB Studio styles
  only some inputs; none is consistent across a product); no keyboard
  traps except modal dialogs, which restore focus.
- Semantics: native elements first; ARIA patterns per component table §5.
- Live regions: outcomes and filter result counts announced politely; critical
  errors via `role=alert`.
- Forms: visible labels; errors linked with `aria-describedby`; required marked
  in text.
- Colour: §3.4 thresholds; never colour alone.
- Motion: honour `prefers-reduced-motion`.
- Targets: ≥ 24×24 CSS px (2.2 AA), controls default 32–36px.
- Responsive: usable at 320 CSS px width and 400% zoom without two-dimensional
  scrolling, except data tables, which scroll horizontally inside their region.
- Tests: axe (or equivalent) with zero serious/critical violations on every
  adopted screen in CI; keyboard path tests for dialogs, menus and tabs.

## 9. Extension and versioning

- **Semver per package.** Breaking: removing or renaming a token, class, part,
  prop or state; changing DOM structure; changing a mapping of an existing
  source value to a different tone. Minor: new components, tokens, mapped values.
  Patch: visual value tuning within contrast rules, bug fixes.
- **Mapping data is versioned with `core`.** A product adding a source state
  adds its mapping in the design-system repository in the same release cycle;
  until then it renders `unknown`.
- **Product extensions** live in the product repository, use `--{product}-*`
  tokens and `{product}-*` classes, and compose shared components. Promotion to
  shared requires two products using it.
- **Deprecation:** one minor release with a console warning (React) or
  documented notice (CSS) before removal in the next major.
- **Compute vendoring:** Compute copies released `tokens.css`, `core.css` and
  the classic-script build `stack-ui-core.js` into its UI directory with a
  version file and checksum test; an upgrade is an ordinary Compute PR.
