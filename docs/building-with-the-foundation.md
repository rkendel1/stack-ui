# Building a Boundry surface

**Every Boundry website and product interface is built on this design foundation.** This applies to new
sites, new products and new screens, and to work done by people or by agents. The rule is enforced by the
conformance check in each product's build, not by convention.

## Starting a new surface

1. **Vendor the release.** A no-build or static site vendors `stack-ui-static-<version>/`. A React or
   Next.js project vendors `packages/{tokens,core,react}` as `file:` dependencies. Each keeps a
   `SHA256SUMS` file (`docs/release.md`).
2. **Declare the product:** `data-stack-product="<portfolio id>"` on `<html>`. A new product first gets its
   accent in `tokens/src/brand.json` and its entry in `core/src/brand.js` (a minor release).
3. **Load the foundation first:** `tokens.css`, then `core.css`, then the product's own stylesheet.
4. **Themes:** put `THEME_INIT_SCRIPT` in `<head>` and render `ThemeSwitch` (sites) or the `Shell` theme
   control (apps). The default follows the system, and the visitor may choose Light or Dark.
5. **Family:** use `SiteFooter({ product: { id } })` on every site page, plus "A Boundry product" in the
   header (`SiteHeader`, or the product's own header linking to https://boundry.company). Apps use
   `Shell({ product: { id } })`.
6. **States and evidence:** use the shared components and the field mappings in `core/src/states.js`.
   Never use local badges for status, verification or freshness.
7. **Run conformance in the build,** so a failure fails the build:

   ```sh
   # static release
   node vendor/stack-ui/conformance.mjs --product <id> --html <built pages> --css <product's own css> --require-header-family
   # vendored packages
   node vendor/stack-ui/core/bin/conformance.mjs --product <id> --html <built pages> --css <product's own css> --require-header-family
   ```

   The company site uses `--company` instead of `--product`.

## What stays the product's

Domain screens, data visualizations, editors, logos, copy, routing, data access, authentication and
deployment. Compose shared components inside them. Promote a pattern to the foundation only when a second
product needs it (contract §9).

## When the foundation lacks something

Do not fork a shared component or override `--stack-*` tokens or `.stack-*` state styles; conformance
rejects both. Build the piece as a product extension (`--<product>-*` tokens, `<product>-*` classes). If a
second product needs it, propose it to `rkendel1/stack-ui` with both use cases.
