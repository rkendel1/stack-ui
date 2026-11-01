# Portfolio assessment (Phase 0, 2026-11-01)

This is a repository and dependency map of every Boundry surface with a real user-facing interface.
Evidence is cited as `repo:path:line`. It complements `docs/audit.md`, which covers the application UIs
in depth.

## 1. Surfaces

| Product | Surface | Repository / path | Framework | Deploy | Domain (verified 2026-11-01) | Stack UI before this programme |
|---|---|---|---|---|---|---|
| Boundry | Company site | `boundry` | Static HTML from one Node script | Vercel (`vercel.json`) | boundry.company ✓ | none |
| FeltDB | Marketing site, hosted Studio, app, admin | `flow_db:website/` | Next 16 | Vercel (`website/vercel.json`) | feltdb.com ✓ (`website/app/layout.tsx:44`) | none |
| FeltDB | Studio control plane (packaged) | `flow_db:packages/studio` | Vite + React | ships in `@feltdb/core` | — | 0.2.0 (`packages/studio/package.json:86-88`) |
| FeltKit | Marketing site | `feltkit-website-request` | Next 16, Tailwind 4, shadcn | Vercel (no config in repo) | getfeltkit.com ✓ | none |
| FeltKit | Local dashboard | `feltkit:packages/sdk/dashboard` | Vite + React | served at `/_feltkit/` | — | none |
| AppBoundry | Marketing site and cloud portal | `appboundry:apps/cloud-platform` | Next 16 (marketing), vanilla SPA (portal) | Vercel + Fly | appboundry.com ✓ | portal 0.5.0 (`public/vendor/stack-ui/VERSION`) |
| AuthBoundry | Marketing, login, portal | `authboundry:apps/web` | Next 15 + Tailwind | Vercel + Fly | authboundry.com ✓ | 0.4.0 (`apps/web/package.json:23-25`) |
| AppPort | Packaged management pages | `appport-services:src/configuration/ui.ts` | server-sent HTML + `dom.js` | inside services | — | 0.3.0 stateless |
| AppPort | Protocol, no site | `appport` | — | npm | none (`appport.dev` is used only as a schema namespace) | — |
| Compute | Environment control plane | `compute:crates/compute-environment/ui` | vanilla, embedded in the binary | binary | — | 0.2.0 |
| AppWorks | Workspace pages | `appworks:packages/workspace/ui` | vanilla | package | — | 0.5.0 |
| AgentBoundry | — | none found | — | — | agentboundry.com did **not** resolve | — |

**Not changed by this programme:** `stack-agent` is a Rust command-line tool with no web UI, and nothing in it
names AgentBoundry. `appport` has no UI. `compute` and the back-end-only Fly services have no marketing
surface. Back-end-only repositories were not modified.

## 2. Findings

1. **Only boundry.company presents the company.** No product site mentioned Boundry or linked to a sibling
   product. The one exception is FeltKit, which links to feltdb.com
   (`feltkit-website-request:components/architecture-section.tsx:48`).
2. **Themes were inconsistent.** FeltDB's site was light-only (no `prefers-color-scheme` in
   `website/app/*.css`). AppBoundry's marketing site was dark-only (`public/styles.css:1`). FeltKit was
   forced dark by default (`app/layout.tsx:41`). AuthBoundry and Boundry followed the OS, and each used a
   different storage key (`theme`, `authboundry-theme`, `data-theme`, `data-stack-theme`).
3. **Five independent header and footer implementations:** `boundry:src/build.mjs:122-162`,
   `feltkit-website-request:components/site-{header,footer}.tsx`,
   `authboundry:apps/web/components/shared/SiteHeader.tsx`, `authboundry:apps/web/components/shared/SiteFooter.tsx`,
   `flow_db:website/app/page.tsx:157,312` (plus per-page blog navs), and
   `appboundry:apps/cloud-platform/app/page.jsx:8,19`.
4. **Four theme toggles:** `feltkit-website-request:components/theme-toggle.tsx`,
   `authboundry:apps/web/components/shared/ThemeToggle.tsx`, `feltkit:packages/sdk/dashboard/src/ui.tsx:210`,
   and `boundry:src/build.mjs:129,167`.
5. **The Stack UI version spread is 0.2.0 to 0.5.0** across six consumers. Each one upgrades by vendoring, as
   an ordinary product PR.
6. **Accents and fonts differ:** green or Georgia (FeltDB), cyan or Inter (AppBoundry), blue or Arial
   (FeltKit), slate (AuthBoundry), and a neutral system font (Boundry).

## 3. Duplication and what it justified

| Pattern | Real uses found | Decision |
|---|---|---|
| Site header and footer | 5 (finding 3) | **Shared** `SiteHeader` and `SiteFooter` (0.6.0) |
| Theme toggle | 4 (finding 4) | **Shared** `ThemeSwitch`, plus `THEME_INIT_SCRIPT` |
| Alert / notice | 4: `appboundry:apps/cloud-platform/public/styles.css` `.notice`, `authboundry:apps/web/components/applications/ApplicationDiscovery.tsx` (`role=alert`), `feltkit:…/dashboard/src/ui.tsx:68` `ErrorBox`, `flow_db:packages/studio/src/components/RouteErrorBoundary.tsx` | **Shared** `Alert` |
| Checkbox | 5 products use raw `type=checkbox` (feltkit dashboard, flow_db website and studio, authboundry `ApplicationConsole.tsx`, appboundry `public/app.js`) | **Shared** `Checkbox` and `FieldGroup` |
| Timeline / history | 2: `appboundry:apps/cloud-platform/public/portal.css`, `feltkit:…/dashboard/src/styles.css` | **Shared** `ActivityTimeline` |
| Drawer | 2: `feltkit:…/dashboard/src/ui.tsx:163-178`, `flow_db:website/app/studio/page.tsx:2471` | **Deferred** (D26): neither surface uses Stack UI yet, so there is no consumer to prove the contract against |
| Action / account menu | 1: `flow_db:website/app/studio/page.tsx:619` | **Deferred** (D26): one use |
| Skeleton | 0 | **Deferred** (D26): no use |
| Notification (toast) | 0 found | **Deferred** (D26) |
| Status pills | 4 local copies (`feltkit` dashboard `ui.tsx:23`, `flow_db` studio `primitives.tsx:23` `cp-pill`, `authboundry` `ApplicationConsole.tsx:182`, `appboundry` `.badge`) | Already shared (`StatusIndicator`); migration belongs to each product's next adoption |

## 4. Dependency order

```
stack-ui 0.6.0 (tokens + brand, core, react)
  ├── boundry           (static release, esm/ + css)          ── no runtime coupling
  ├── feltkit-website   (vendored @stack-ui/* file: deps)     ── no runtime coupling
  ├── authboundry web   (0.4.0 → 0.6.0 vendored file: deps)   ── no runtime coupling
  ├── appboundry site   (0.5.0 static → 0.6.0 static)         ── no runtime coupling
  └── flow_db website   (vendored file: deps)                 ── no runtime coupling
```

Every link is a build-time file dependency on a checksummed release. No product calls another product at
runtime, and the footer's links are ordinary hyperlinks.
