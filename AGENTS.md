# Guidance for coding agents

This repository is the Boundry design foundation. Every Boundry website and product UI is built on it:
see [docs/building-with-the-foundation.md](docs/building-with-the-foundation.md).

- Read `docs/design-system-contract.md` (components, states, accessibility) and `docs/brand.md` (identity)
  before changing anything.
- Keep the architecture: a framework-neutral core (`view.js` trees), thin bindings, no network, no
  product state. Storage is used only by `theme.js`.
- Every change keeps `pnpm test` green: build, boundary check, types, unit, and browser (parity, axe in
  both themes, keyboard, responsive, brand).
- New components need two real product uses (record them in `docs/decisions.md`). Identity tokens never
  colour state.
- Release by bumping all three packages together. Then run `node scripts/package-static.mjs`.
