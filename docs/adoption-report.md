# Adoption report — Boundry design foundation (0.6.0)

This report is updated with each repository's PR. "Verified" means a command was run and its output is
cited. Anything not run is listed as outstanding.

## rkendel1/stack-ui — 0.6.0

- **Changed:** brand layer (`tokens/src/brand.json` → `--stack-brand-*` and product accents scoped by
  `[data-stack-product]`); the Boundry mark (`tokens/brand/*.svg`, `BrandMark`); the portfolio
  (`core/src/brand.js`); marketing type and space tokens; platform blue aligned with the Boundry blue
  (D28); `Shell` carries the Boundry family (D27); the build-time HTML renderer (`html.js`, D23); SVG
  namespace support in `dom.js`; the static release now carries `esm/`, `brand/` and `tokens-light.css`.
- **New components:** `SiteHeader`, `SiteFooter`, `ThemeSwitch`, `BrandMark`, `Alert`, `Checkbox`,
  `FieldGroup`, `ActivityTimeline`, plus marketing layout classes. `THEME_INIT_SCRIPT`.
- **Reused:** the view-tree contract, the `dom.js` and React renderers, `theme.js` storage, the contrast
  test harness, and the axe/parity browser harness.
- **Deferred:** ActionMenu, Drawer, Skeleton, Notification (D26). The package rename (D9). The master logo
  file (D29).
- **Tests:** `pnpm test`. Unit and browser results are recorded in the PR description.
