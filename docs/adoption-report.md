# Adoption report — Boundry design foundation (0.6.0)

Status as of 2026-11-01. Every repository has its own branch `claude/ecstatic-pasteur-p27hvs` and can be
reviewed and merged independently. **Merge order:** stack-ui first, because every other branch vendors its
0.6.0 release. The other branches have no dependency on each other.

"Verified" means the command was run and its result is quoted. "Not run" says why.

## rkendel1/stack-ui — the foundation (0.6.0)

- **Changed:**
  - The brand layer: `tokens/src/brand.json`, `--stack-brand-*`, and the product accent scoped by
    `[data-stack-product]`.
  - The Boundry mark: `tokens/brand/*.svg` and `BrandMark`.
  - The portfolio in `core/src/brand.js`: FeltDB, FeltKit, AppBoundry, AuthBoundry and AppPort.
    AgentBoundry is removed; it is not a product.
  - Marketing tokens. The platform blue now matches the Boundry blue (D28).
  - `Shell` carries the Boundry family (D27).
  - `html.js` renders components to HTML at build time (D23).
  - SVG support in `dom.js`.
  - `THEME_INIT_SCRIPT`, plus types for `@stack-ui/core/theme`.
  - The React binding is a `'use client'` module.
  - The shared header and footer are hardened against product stylesheets that style bare elements.
  - The static release now carries `esm/`, `brand/`, `tokens-light.css` and `conformance.mjs`.
- **New:**
  - Components: `SiteHeader`, `SiteFooter`, `ThemeSwitch`, `BrandMark`, `Alert`, `Checkbox`, `FieldGroup`
    and `ActivityTimeline`.
  - Marketing layout classes.
  - The conformance checker `bin/conformance.mjs`, run by every adopting build.
  - Docs: `brand.md`, `product-identities.md`, `portfolio-assessment.md`, `release.md`,
    `building-with-the-foundation.md` and `AGENTS.md`.
- **Tests:** `pnpm test`: 72 unit and 141 browser tests pass. The browser tests cover React/DOM parity,
  HTML/DOM parity, axe in four theme combinations, keyboard use, layout at 320, 768 and 1280px, identity
  colour tests, and resistance to hostile product element styles.
- **Deferred:**
  - ActionMenu, Drawer, Skeleton and Notification (D26).
  - The npm scope and rename (D9).
  - The master logo file (D29).
  - Owner confirmation of the product accents (D30).

## rkendel1/boundry — boundry.company

- **Changed:**
  - Foundation: vendored static release, with the build verifying checksums.
  - Header and footer: the shared `SiteHeader` and `SiteFooter`, rendered to HTML at build time.
  - The Boundry mark replaces the placeholder logo and favicon.
  - Themes: System, Light or Dark.
  - Product accents come from the foundation.
  - Each product shows its real logo, cropped from its own repository.
  - AgentBoundry is removed; the "Execution" foundation is now attributed to AppBoundry.
  - The founder section uses the approved text.
- **Enforced by:** Vercel `buildCommand` and `.github/workflows/ci.yml` run the build, `src/check.mjs` and
  `conformance.mjs --company`.
- **Verified:**
  - All 7 pages pass the site check and conformance.
  - axe has no serious or critical violations in light, dark and forced dark at 1280px, nor at 320px.
  - No horizontal scroll at 320px.
  - The theme choice persists across a reload.
- **Outstanding:**
  - Contact email (placeholder).
  - Product development statuses (all null).
  - Founder portrait.

## rkendel1/feltkit-website-request — getfeltkit.com

- **Changed:**
  - Vendored `@stack-ui` packages.
  - The shared `SiteFooter`.
  - "A Boundry product" in the header.
  - The theme now defaults to the system (it was forced dark) and uses the shared preference and
    `ThemeSwitch`.
  - The old footer CSS is removed.
- **Product-specific:** logo, navigation, hero, and every section and colour (`--felt-*`).
- **Enforced by:** `pnpm build`, which runs `next build`, then checksums and conformance.
- **Verified:** build and conformance pass. axe shows the same 2 contrast findings per page as the
  unmodified site (`.agent-step` titles and documents hero links, both product-owned); nothing new.
- **Outstanding:** those two pre-existing contrast findings.

## rkendel1/feltkit — FeltKit dashboard (`/_feltkit/`)

- **Changed:**
  - Vendored packages, bundled as devDependencies.
  - The dashboard palette maps onto foundation tokens, with FeltKit's teal accent.
  - Shared `Loading`, `EmptyState`, `ErrorPanel` and `StatusIndicator`.
  - The shared theme preference, applied before first paint by a CSP-safe file.
  - The Boundry family link in the sidebar.
- **Verified:**
  - Build and typecheck pass.
  - `npm test`: 198 pass, 1 fail. The failure is the `create-feltkit` starter test, which also fails on
    main.
  - axe is clean on Overview, Activity, Data, Services and Settings in light and dark against the running
    tasks example.
- **Outstanding:**
  - Screen-level adoption: tables, forms, and the dashboard's local `Badge` and `.error-box` uses inside
    screens.
  - Drawer, once promoted (D26).

## rkendel1/authboundry — site and portal (apps/web)

- **Changed:**
  - Upgraded 0.4.0 → 0.6.0.
  - The shared `SiteFooter`.
  - "A Boundry product" in the header and the portal sidebar.
  - The shared theme preference and `ThemeSwitch` on the site, sign-in page and portal; Tailwind's `dark`
    class follows it.
  - The mobile header fits at 320px.
- **Enforced by:** `npm run build`, which runs conformance on 22 marketing pages. This build runs in
  `portal.yml` CI.
- **Verified:**
  - Unit tests: 12/12.
  - Portal browser suite against a real authority: 12/12, including axe in light and dark, the shared
    theme and the family link.
  - Marketing axe findings are the same 4 product-content contrast issues as the unmodified site.
- **Outstanding:**
  - Those 4 contrast issues (`text-green-600`, `text-slate-500` on the home and product pages).
  - The portal's own sidebar is still not the shared `Shell` (D18).

## rkendel1/appboundry — marketing page and cloud portal (apps/cloud-platform)

- **Changed:**
  - Static release 0.5.0 → 0.6.0.
  - The marketing page was dark-only; it now follows the system with System, Light or Dark.
  - Black and white logos switch with the theme.
  - The shared `SiteFooter` and `ThemeSwitch` via `esm/html.js`.
  - "A Boundry product" in the bar.
- **Enforced by:** `npm run build`, which runs conformance (Vercel); `test/stack-ui.test.ts` runs in the
  root `pnpm test`.
- **Verified:**
  - Build and conformance pass.
  - axe is clean in light, dark and forced dark at 1280px and at 320px, with no overflow.
  - `test/stack-ui.test.ts`: 5/5, including every portal field still mapped.
- **Not run:** the portal browser suite. It needs a workspace install, which fails on main because
  `pnpm-lock.yaml` is out of date (`@feltdb/core` 0.15.0 vs 0.16.1).

## rkendel1/appport-services — packaged management pages

- **Changed:**
  - Static release 0.3.0 → 0.6.0.
  - The shell declares `appport`: the accent, "A Boundry product" and the sibling products.
  - Theme choice (System, Light, Dark) for the open page, never stored: the pages still keep nothing in
    the browser.
- **Verified:**
  - `npm test`: 357/357.
  - `npm run test:browser`: 14/14, including axe in light and dark at 1280 and 640px, navigation still
    exactly the mounted routes, the theme choice stores nothing, and the family link.

## rkendel1/flow_db — FeltDB website homepage

- **Changed:**
  - Vendored packages.
  - Homepage only:
    - "A Boundry product" in the header, which is now a `<header>`.
    - The shared `SiteFooter`.
    - Light and dark via the shared preference; it was light-only.
  - `AGENTS.md` UI guidance.
- **Enforced by:** `npm run site:build`, which runs checksums and conformance (Vercel).
- **Verified:**
  - Build and conformance pass.
  - axe is clean at 1280px in light, dark and forced dark. The old footer's contrast failure is fixed.
- **Outstanding:**
  - At 320px the homepage still overflows by 64px, with unfocusable code scroll regions. This was the case
    before this change.
  - Blog, docs, playground, hosted Studio, app and admin pages are not yet on the foundation and are still
    light-only.
  - `packages/studio` is still on 0.2.0.

## Not yet adopted

| Surface | State | Next step |
|---|---|---|
| FeltDB `packages/studio` | stack-ui 0.2.0, light-only | Upgrade to 0.6.0, `Shell({ product: { id: 'feltdb' } })`, both themes |
| FeltDB hosted Studio, app, admin (`website/app/studio` and others) | No foundation; 40 global stylesheets | Decide D7 (which Studio users reach) first, then adopt the shell |
| Compute environment UI | stack-ui 0.2.0 | Upgrade (no product id: Compute is not in the public portfolio) |
| AppWorks workspace pages | 0.5.0 | Upgrade |
| AppWorks recipe studio | No foundation | Adopt |
