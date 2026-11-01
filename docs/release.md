# Release and maintenance

## Versioning

- The three packages (`tokens`, `core`, `react`) release together under one version. `package-static.mjs`
  refuses to package mismatched versions.
- Versioning is semver as in contract §9. **Breaking:** removing or renaming a token, class, part, prop,
  state or portfolio id, changing DOM structure, or remapping a source value to another tone. **Minor:** new
  components, tokens, mappings, portfolio products, or product accents. **Patch:** value tuning within the
  contrast tests, and bug fixes.
- Changes to identity values (accent hex, mark artwork) are patch releases when every contrast test still
  passes.

## Release steps

1. `pnpm test` is green: build, boundary check, types, unit, and browser (parity, axe in four theme
   combinations, keyboard, responsive, brand).
2. Bump all three `package.json` versions and the React peer range. Record the change in `docs/decisions.md`.
3. Run `node scripts/package-static.mjs`, then `node scripts/release-manifest.mjs` to record the
   version's contents in `releases/<version>/` (D31). CI rejects any later change to those files under
   the same version. It writes `release/stack-ui-static-<version>/` and its `.tar.gz`,
   containing:
   - `tokens.css` and `tokens-light.css`;
   - `core.css`;
   - the full and stateless classic builds;
   - `esm/` (`states`, `brand`, `view`, `html`, `theme`) for Node-built static sites;
   - `brand/` (`brand.json` and the mark SVGs);
   - `VERSION` and `SHA256SUMS`.
4. The owner tags `v<version>`. `.github/workflows/release.yml` re-verifies everything and attaches the
   static release and the package tarballs to a GitHub release. npm publishing is opt-in
   (`docs/release-readiness.md`).

## How products consume it

| Product kind | Mechanism | Upgrade |
|---|---|---|
| No build (Compute, AppBoundry portal, AppPort services, AppWorks) | Vendor the static release with its `SHA256SUMS`. A test in the product checks the checksums | An ordinary product PR |
| Node-built static site (boundry.company) | Vendor the static release (`esm/`, CSS, `brand/`). The build imports `esm/html.js` | An ordinary product PR |
| React / Next (FeltDB, FeltKit and AuthBoundry websites, FeltDB Studio) | `node scripts/vendor-packages.mjs <product>/vendor/stack-ui` vendors `{tokens,core,react}` unmodified, with `SHA256SUMS`. The product uses `file:` dependencies until npm publishing | An ordinary product PR |

No product depends on another product at runtime. Portfolio links are plain hyperlinks.

## Conformance every adopting product keeps

Every adopting build runs `conformance.mjs`, which ships in the static release and in `@stack-ui/core` as
`bin/conformance.mjs` (`docs/building-with-the-foundation.md`). It checks the built pages and the product's
own CSS for the items below and fails the build on any of them. These are tested in
`tests/unit/conformance.test.mjs`.

- The vendored files match the release checksums.
- `data-stack-product` is set to the product's portfolio id on the site or app root.
- Light and dark themes follow the OS by default, a theme control is present, and `THEME_INIT_SCRIPT`
  (or an equivalent) runs before first paint.
- The header shows "A Boundry product" and the footer shows the Boundry family (`SiteHeader` and
  `SiteFooter`, or `Shell` for apps).
- No product CSS redefines `--stack-*` tokens or recolours `.stack-status*`, `.stack-verification*`,
  `.stack-alert*` or `.stack-button*`.
- Existing product tests stay green, and the product's own accessibility checks show no new serious or
  critical violations.

## Maintenance

- **Adding a product:** add its accent to `brand.json` (the contrast tests gate it), its entry to `brand.js`,
  and its row to `docs/brand.md` §3.2 and `docs/product-identities.md`. This is a minor release. Every site
  that upgrades lists it automatically.
- **Changing a product's link** (a new domain goes live): verify that it serves HTTPS, edit `brand.js`, and
  ship a patch release.
- Adoption status per repository is tracked in `docs/adoption-report.md`.
