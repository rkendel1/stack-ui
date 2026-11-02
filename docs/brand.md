# Boundry brand specification

Status: **0.6.0**. Normative words: **must**, **must not**, **should**, **may**.
This is the brand layer of the shared design foundation. The component and state
rules in `docs/design-system-contract.md` still apply; nothing here overrides them.

> One company. One shared design foundation. Distinct product identities.
> Independent product experiences.

## 1. Layers

| Layer | Owns | Lives in |
|---|---|---|
| **Foundation** | Type, spacing, surfaces, radii, focus, action, status, evidence: everything that means the same thing in every product | `packages/tokens/src/tokens.json` → `--stack-*` |
| **Company identity** | The Boundry mark, brand ink, company accent, the portfolio and the "Boundry family" relationship | `packages/tokens/src/brand.json` (`company`), `packages/core/src/brand.js` (`PORTFOLIO`), `packages/tokens/brand/*.svg` |
| **Product identity** | One accent per product (light and dark), the product's mark/logo, name and voice | `brand.json` (`products`) → `[data-stack-product="<id>"]`; logos stay in the product repository |
| **Product experience** | Domain screens, visualizations, workflows | Product repositories only (§6) |

The foundation is shared, identity is declared, and experience belongs to each product.

## 2. The Boundry mark and wordmark

- **Mark:** two bands that form a B, with a horizontal gradient from navy to Boundry blue.
  It is shipped as `brand/boundry-mark.svg` for light backgrounds, `brand/boundry-mark-reversed.svg` for dark
  backgrounds, and `brand/boundry-favicon.svg`, which switches with the colour scheme. In components it is the
  `BrandMark` view, which draws its gradient from `--stack-brand-mark-start/end`, so it follows the theme.
- **Provenance:** the shipped SVG is a **vector redraw** of the logo the owner supplied on 2026-11-01. It was
  checked by eye against that image (same geometry, same gradient direction), but it is not the master
  artwork. **When the owner commits the master SVG, it replaces these files unchanged.** No tests depend on the
  path data.
- **PNG files:** `assets/brand/` holds the mark (512 and 1024px, square) and the full logo (mark,
  wordmark and ™), each in a light-background and a dark-background version, all on transparent
  backgrounds. They are for documents, decks and profiles; products use the SVGs and `BrandMark`. They are
  rendered from the SVGs by `node scripts/render-brand-png.mjs`. Their wordmark is set in Inter Display
  ExtraBold as a stand-in until the master wordmark is committed (D29). Re-render them when the artwork
  changes.
- **Wordmark:** "Boundry" set in a heavy geometric sans, ink `#0b1538`, followed by ™. Until a licensed
  wordmark file is supplied, interfaces set the name in the system sans at weight 700 next to the mark. They
  do not imitate the wordmark's letterforms with another font.
- **Clear space:** at least the height of one band (about a third of the mark's height) on every side.
  **Minimum size:** 16 px tall on screen.
- **Must not:** recolour the mark in a product accent, put it on a photograph without a solid plate, stretch it,
  or animate the gradient.

## 3. Colour

### 3.1 Company

| Token | Light | Dark | Use |
|---|---|---|---|
| `--stack-brand-ink` | `#0b1538` | `#e6ebf7` | Wordmark and corporate headings (≥ 7:1 on every surface, tested) |
| `--stack-brand-accent` | `#0a5ce8` | `#8ab4ff` | Company accent; the default `--stack-product-accent` |
| `--stack-brand-mark-start` / `-end` | `#0b1538` → `#0a64ff` | `#dbe5ff` → `#3d86ff` | Mark gradient (each stop ≥ 3:1 on every surface, tested) |

The platform action blue (`--stack-color-action-primary-bg`, link and focus colours) was moved from `#2f5bd8` to
the Boundry blue family in 0.6.0 (D28). Every product's primary button is therefore the company blue, and
product accents never take over actions.

### 3.2 Product accents

| Product | id | Light | Dark |
|---|---|---|---|
| FeltDB | `feltdb` | `#18754a` | `#42e58d` |
| FeltKit | `feltkit` | `#0b7f6e` | `#3fd8c4` |
| AppBoundry | `appboundry` | `#6a3fd0` | `#b49cf5` |
| AuthBoundry | `authboundry` | `#8a4b36` | `#e09a80` |
| AppPort | `appport` | `#2f6584` | `#7fb3d1` |

FeltDB (green), FeltKit (teal) and AppBoundry (violet) take their accent from their own logo and website
(D30). AuthBoundry and AppPort have no accent of their own yet, so they keep the values first
published on boundry.company. All values live here. boundry.company reads them from the vendored release.

- Set `data-stack-product="<id>"` on `<html>` (a whole site or app) or on any element. Inside it,
  `--stack-product-accent` and `--stack-product-accent-fg` take the product's values for the current theme.
- Every accent is ≥ 4.5:1 on canvas, surface and raised backgrounds in both themes, so it may be used for text
  such as an eyebrow or the current nav underline. Text on an accent fill uses `--stack-product-accent-fg`
  (≥ 4.5:1). All of this is tested in `tests/unit/brand.test.mjs`.
- **Identity is never state.** Accents **must not** colour status, evidence, verification, alerts or
  actions. A test fails if any of those rules in `core.css` references a brand token. Another test renders a
  critical status and a primary button inside a product scope and asserts they are identical to the same
  components outside it.

### 3.3 Semantic colours

These are unchanged. They are the contract's tones (positive, progress, attention, critical, neutral,
unknown), evidence (verified, unverified) and info notices. They mean the same thing in every product and
every theme.

## 3.3a Product logos

Every product's logo is kept in `assets/brand/products/<id>/`. `assets/brand/sources.json` records each
file's origin and checksum.

- **Originals** are copied unmodified from the product's repository, and the source is recorded as
  `repo:path`.
- **Derived marks** are square, transparent, 512px crops of the mark from a logo that also carries a
  wordmark. They exist for FeltDB and AppBoundry; the crop box is recorded.

| Product | Full logo | Mark |
|---|---|---|
| FeltDB | `feltdb-logo-dark.png` (white wordmark; dark backgrounds only) | `feltdb-mark.png` (derived) |
| FeltKit | `feltkit-logo.png` (light), `feltkit-logo-dark.png` (dark) | `feltkit-mark.png` |
| AppBoundry | `appboundry-logo.png` (light), `appboundry-logo-dark.png` (dark) | `appboundry-mark.png` (derived; light backgrounds) |
| AuthBoundry | none in any repository | `authboundry-mark.png` (light backgrounds) |
| AppPort | none in any repository | `appport-mark.png` |

`node scripts/check-brand-assets.mjs --root <product checkouts>` verifies the files. It also reports any
original that has changed in its product repository, so the copy here can be refreshed. The unit tests run
the same check without `--root`.

**Gaps**, recorded in `sources.json`:

- FeltDB has no light-background full logo.
- AuthBoundry and AppPort have no logo with a wordmark.

## 4. Typography, spacing, surfaces

- **Typeface:** the system sans stack, plus mono for identifiers. There is no web-font download, because
  Compute's binary and offline consoles require that (contract §3.5). Product sites may load a display face
  for their own headlines only. Shared components never depend on one.
- **Scale:** application sizes `xs`–`2xl` (12–24 px), and marketing sizes `3xl` (30 px), `4xl` (40 px) and
  `display` (fluid, 36–60 px, line-height 1.08). Weights are 400, 500, 600 and 700. Headlines use
  `--stack-letter-spacing-tight` (−0.02em).
- **Spacing:** a 4 px base (`space-1` … `space-24`). Marketing sections use 48–96 px vertical rhythm.
- **Width:** `--stack-size-content-max` is 1180 px, and prose is held to `--stack-size-prose-max` (68ch).
- **Surfaces and radii:** canvas, surface, raised and sunken backgrounds. Radii are 4, 6, 10 and pill. Borders
  are 1 px. Shadows are reserved for overlays.

## 5. Themes

Every Boundry site and product surface **must** offer light and dark:

1. The default is the visitor's operating-system setting (`prefers-color-scheme`).
2. The visitor **may** choose System, Light or Dark with `ThemeSwitch` (sites) or the shell's theme control
   (apps). The choice is stored under `stack-ui.theme` for that origin and applied as `data-stack-theme`.
3. Pages rendered ahead of time put `THEME_INIT_SCRIPT` in `<head>`, so a stored choice applies before
   first paint (tested).
4. A product that also drives Tailwind's `dark` class sets both from the same preference (AuthBoundry does
   this today).
5. A product that stores nothing in the browser uses the stateless build and follows the OS only (D15).

## 6. Product identity and UX

Each product keeps its own name, logo, accent, voice and domain-specific screens. The shared foundation
supplies the frame and the vocabulary of states. Per-product UX direction is in
`docs/product-identities.md`.

## 7. The Boundry family on every surface

| Surface | Required | Provided by |
|---|---|---|
| Product website header | Product identity leads; "A Boundry product" links to https://boundry.company | `SiteHeader({ product: { id } })` |
| Product website footer | "Part of the Boundry family of products", the mark, every portfolio product with the current one marked, a link to boundry.company, "<Product> is a Boundry product" in the legal line | `SiteFooter({ product: { id } })` |
| Company website | The Boundry mark and name lead; footer lists every product | `SiteHeader()`, `SiteFooter()` without `product` |
| Authenticated product UI (shell) | "A Boundry product" link in the bar; "Other Boundry products" with every sibling and "About Boundry" in the navigation | `Shell({ product: { id } })` (opt out with `family: false`) |

**Links are only to verified destinations.** On 2026-11-01, boundry.company, feltdb.com, getfeltkit.com,
appboundry.com and authboundry.com resolved and served HTTPS. AppPort has no public site, so it links to
its entry on boundry.company/ecosystem until it has one. Changing a link is a one-line edit in `packages/core/src/brand.js`.

## 8. Iconography

The text-glyph decision stands (D12): status glyphs are text, and every glyph sits beside a word. The only
shared SVG is the Boundry mark. Product logos and illustrations are product-owned.

## 9. Accessibility

WCAG 2.2 AA, as in contract §8. The brand layer adds:

- contrast tests for every identity colour;
- axe runs on the marketing components in both themes and with a forced theme;
- a skip link in `SiteHeader`;
- navigation that wraps and scrolls inside itself at 320 px, with no page-level horizontal scroll (tested at
  320, 768 and 1280 px);
- no menu that hides links behind JavaScript.
