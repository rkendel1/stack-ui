# Stack product shell

Status: **built** (PR3; proposed in PR1). The shell is a **UI composition contract**: a page
layout, a navigation model and a discovery convention. It is not a runtime,
service, gateway, database or control plane. Each product renders the shell in
its own pages, from its own deployment.

## 1. What the shell is

```
┌──────────────────────────────────────────────────────────────────────┐
│ [product mark] Product name   │ search (if product supports) │ theme │ user │  ← stack-shell__bar
├───────────────┬──────────────────────────────────────────────────────┤
│ Product nav   │ Breadcrumbs: Product › Environment test › Workload api│
│  (this        │ PageHeader: eyebrow · title · status · actions       │
│   product's   │ FreshnessLabel (when the product reports freshness)  │
│   surfaces)   │                                                      │
│               │ page content (product-owned)                         │
│ ─────────     │                                                      │
│ Other Stack   │                                                      │
│ products      │                                                      │
│  (links out)  │                                                      │
│ Activity ↗    │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

Parts (`core.css` classes; `Shell` renders the same structure from React and
from `dom.js`): `stack-shell`, `__skip` (skip link, first focus stop), `__bar`
(landmark `header`) with `__product`, `__context`, `__search`, `__end`
(`__prefs` holding the `__theme` select, then `__account`); `__body` with
`__nav` (landmark `nav`, named "<product> navigation"), `__nav-group`,
`__nav-heading`, `__nav-item` (`aria-current="page"`), `__switcher`,
`__activity`; and `__main` (landmark `main`, `tabindex=-1` so focus can move
there on a route change).

Breadcrumbs, the page header and freshness are page content the product
renders inside `__main` with `Breadcrumbs`, `PageHeader` and `FreshnessLabel`;
the shell does not take them as configuration, because they change per page
and the product already renders them there.

Below 768px the navigation becomes a horizontal strip under the bar that
scrolls on its own; the page itself never scrolls sideways (tested at 640 and
320px).

## 2. Navigation and resource-context conventions

- **Product navigation** lists the current product's surfaces only, grouped and
  ordered as the product declares. It highlights the current surface (AppPort
  services currently never does, `appport-services:src/configuration/ui.ts:5`).
- **Product switcher** ("Other Stack products") is a list of links to other
  products' entry routes. Following one is a normal navigation to another
  origin; no state, token or identity is passed.
- **Breadcrumbs** express the resource hierarchy as the product defines it:
  `Product › Collection › Resource › Sub-resource`. Each crumb is a real link.
  Labels use resource names; ids appear in `ResourceIdentity`, not crumbs.
- **URLs** are the product's own. Shareable URLs identify the resource and the
  tab (`#/environments/{e}/projects/{p}/{tab}` in Compute, `/applications/[id]/evidence`
  in AuthBoundry). The shell does not impose a URL scheme.
- **Resource context switchers** (AuthBoundry's application scope switcher,
  Compute's Work/Manage mode) are product slots in `__context`; the shell styles
  them but does not own their state.
- **Search** appears only when the product exposes a supported search interface.
  It is a product slot (`__search`): the product renders its own control, which
  must have an accessible name (Studio: `type="search"`, "Search Studio").
  A standard search component with a result list is deferred until a second
  product has a search interface (D13). No cross-product search exists (no
  supported interface for it).
- **Account** is a product slot (`__account`): session or connection controls
  the product already has (Compute: daemon address and token). The shell holds
  no identity.
- **Activity entry point** links to the product's own activity/audit view where
  one exists (Compute `#/events`, FeltDB `/operations`, AuthBoundry `/audit`,
  AppBoundry `activity`), through `activityHref`. In PR3 neither host uses it:
  both already list that view as an ordinary navigation item (Compute
  "Events", Studio "Operations"), and a second link to the same place would
  only repeat it. There is no aggregated cross-product activity feed.
- **Preferences:** theme (`system | light | dark`, sets `data-stack-theme`,
  stored per product origin in `localStorage` under `stack-ui.theme`, every
  access wrapped in try/catch; `theme.js`) and reduced motion (follows OS).
  Preferences never travel between products. A product drawn in one theme
  only (FeltDB Studio) omits `theme`, and the shell shows no theme control
  rather than one that does nothing. A product that keeps nothing in browser
  storage (AppPort services) omits it too, uses the stateless classic build
  (decisions D15) and follows the operating system's colour scheme.
- **Routing and focus:** a product with client-side routing passes
  `onNavigate(href)`; ordinary left clicks on the product link and navigation
  items call it instead of loading a page, while clicks with a modifier key
  stay normal links and links to other products are never routed. After any
  route change the product calls `focusMain(mainId)` (from `dom.js`, re-exported
  by `@stack-ui/react`) so keyboard and screen-reader users start at the new
  content. Compute calls it after each hash route; Studio on each pathname
  change after the first render.

## 3. Shell integration contract

### 3.1 Inputs a product provides

As built (PR3; `ShellProps` in `@stack-ui/react`, the same props for
`StackUI.dom.Shell`):

```ts
interface ShellProps {
  product: { name: string; homeHref: string; mark?: string };
  navigation: Array<{ id: string; label: string; href: string; group?: string;
                      order?: number; current?: boolean; className?: string;
                      attrs?: Record<string, string> }>;
  context?: Node;            // product slot, e.g. Compute's Work/Manage mode
  search?: Node;             // product slot, only with a supported search
  account?: Node;            // product slot
  theme?: { preference: 'system' | 'light' | 'dark';
            onChange?: (preference) => void } | null;  // omit when one theme
  activityHref?: string; activityLabel?: string; activityCurrent?: boolean;
  otherProducts?: Array<{ id: string; name: string; href: string }>;
  onNavigate?: (href: string) => void;  // client-side routing
  mainId?: string;           // default 'stack-main'; the skip link targets it
  mainAttrs?: Record<string, string>; skipLabel?: string;
  children?: Node;           // the page
}
```

Changes from the PR1 proposal, each because a real host needed it: search
and account are slots rather than data-driven menus (neither product has a
query function or account menu to pass); breadcrumbs and freshness are page
content (above); `product.id` and `version` were dropped (nothing reads them);
`className`/`attrs` on navigation items keep each product's existing test
hooks and mode classes.

The shell renders exactly what it is given. It has no network access, no
default data source and no authorization logic.

### 3.2 Relationship to `AppPort/ui/1`

`AppPort/ui/1` (`appport:packages/protocol/src/ui.ts`) is the existing,
published protocol for one product to *advertise* its UI surfaces to another.
The shell reuses it rather than defining a second registry:

- A product that already publishes `UiContribution` (AppPort services,
  `appport-services:src/runtime/ui.ts:47-58`) may derive `navigation` from it:
  `UiNavigationContribution {label, group, order, surface}` → shell nav item,
  `UiSurface.route` → `href`.
- A host that lists *other* products' pages (Compute's Services page,
  `compute:docs/service-ui.md`) keeps doing so with the existing validation
  (`validateUiContribution`, Compute's stricter `service_ui.rs`) and renders
  links with the shell's styles. It continues to link out, never embed.
- Capability filtering stays where it is: in the contributing product
  (`filterUiContribution`), not in the shell.
- The `otherProducts` list is static configuration per deployment. Neither
  PR3 host passes one yet, since no deployment lists its siblings.
  Discovering it dynamically via `AppPort/ui/1` is deferred (`docs/decisions.md` D8)
  because FeltDB and AuthBoundry do not publish contributions today and no
  supported cross-product directory exists.

### 3.3 Framework-free rendering

Products without a framework render the documented DOM structure with
`core/dom.js` helpers (`createElement`/`textContent`) or by hand. The DOM
structure and class names are the contract; a conformance test in the
design-system repository renders the React shell and the `dom.js` shell from
the same config and compares the resulting trees.

## 4. Independent deployment and incremental adoption

- **Each product ships the shell inside its own build.** Compute embeds the
  vendored CSS/JS in its binary; FeltDB Studio and AuthBoundry bundle the npm
  packages; AppPort services inlines the CSS in its server-rendered pages;
  AppBoundry links the CSS from its Next `public/`.
- **No shared host, iframe, module federation or runtime import** from another
  origin. A product works when every other product is down.
- **Version skew is allowed.** Two products on different design-system minor
  versions look nearly identical and both work. Breaking changes are adopted per
  product on its own schedule.
- **Partial adoption is valid.** A product may adopt tokens only, then
  components, then the shell. A page using the shell next to legacy pages is
  acceptable during migration; the product nav links both.
- **Fallback:** if shared CSS fails to load (it is bundled, so this is a build
  error), pages remain readable semantic HTML.

## 5. Separation between UI composition and product authority

| Concern | Owner | The shell / design system… |
|---|---|---|
| Durable state, history, integrity | FeltDB | renders values products pass in; never reads FeltDB |
| Application/service boundary, UI contribution protocol | AppPort | consumes `AppPort/ui/1` data a product already fetched; does not extend the protocol |
| Authentication, authorization, delegation | AuthBoundry | shows identity label and refusal reasons provided by products; holds no tokens; makes no allow/deny decisions |
| Application boundaries, artifacts, verification | AppBoundry | renders verification results with checks the product supplies |
| Execution | Compute | renders execution progress and outcomes the product reports |
| Presentation and interaction behaviour | Design system | owns tokens, components, states mapping, shell layout |

Prohibited in the design system and shell (mechanically checked in the
design-system repository, modelled on `flow_db:tools/check-studio-boundary.mjs`):

- network calls (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`) in any
  package other than test fixtures;
- imports of any product package (`@feltdb/*`, `@appport/*`, `@authboundry/*`,
  `@compute/*`). The optional `AppPort/ui/1` → nav adapter is structurally typed
  against the published shape and imports nothing, so adopting the shell never
  adds a dependency on AppPort;
- persistent storage other than the theme preference;
- authorization predicates (any function deciding visibility from permissions);
- default values that turn missing data into a healthy or zero state.
