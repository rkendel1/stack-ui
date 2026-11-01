# Release readiness — 0.6.1

Status: **ready to tag, not published.** Nothing has been tagged or published to npm. Both need the owner's
explicit authorization.

## What was checked (2026-11-01)

| Check | Result |
|---|---|
| Branch applies to `main` | Rebased onto `main` (d3c19a2) with no conflicts |
| Full suite (`pnpm test`) | Build, boundary check, types, unit tests and browser tests: all pass (numbers in the PR) |
| Packages consumable by an independent project | `pnpm pack` tarballs installed into an empty project outside the workspace. React server rendering, `html.js`, `states`, `brand` and `THEME_INIT_SCRIPT` all work. TypeScript resolves the types under `nodenext` and under `bundler` with a DOM lib. `tokens.css` and `core.css` resolve for bundlers (Node itself cannot import CSS, as expected) |
| Framework-neutral core, thin binding | Unchanged. `core` has no dependencies, and `react` peers on `react` and `@stack-ui/core` only. The boundary check passes (no network, storage outside `theme.js`, markup parsing or product imports) |
| Conformance through the installed bin | **Defect found and fixed.** Run through `node_modules/.bin/stack-ui-conformance` (a symlink), it skipped every check and exited 0. It now compares real paths. A test runs it through a symlink and expects failure |
| Conformance messages | **Improved.** A missing footer was reported as 10 failures, 9 of them consequences of the first. It is now one message that names the fix. Out-of-date family links are reported in one line that points at a stale vendored copy |
| Version identity | **Defect found and fixed.** "0.6.0" named more than one set of files: two products vendored it before the type declarations existed. Each version's contents are now recorded in `releases/<version>/`. CI fails if a build differs from the recorded manifest for its version (`scripts/check-release-manifest.mjs`). The registry identifies each product's copy by checksum |
| Release automation | `.github/workflows/release.yml`. On a `v*` tag it verifies the tag against the package version, runs the full suite, checks the manifest, and attaches the static release and the three package tarballs to a GitHub release. npm publishing is a separate job that runs only when `NPM_PUBLISH` is `true` and `NPM_TOKEN` exists |

## Changes in 0.6.1 (patch)

- The conformance checker works through its installed bin link.
- Conformance reports a missing footer once.
- `releases/0.6.0` and `releases/0.6.1` manifests.
- `scripts/vendor-packages.mjs`: the supported way to vendor the packages until npm.
- The portfolio registry and its checker.

Component APIs, tokens and DOM structure are unchanged from 0.6.0.

## Decisions needed before npm publishing

1. **Scope (D9).** Neither `@stack-ui` nor `@boundry` exists on the npm registry
   (`registry.npmjs.org/-/org/stack-ui/package` answers "Scope not found"). Availability can only be
   confirmed by creating the org under the owner's account. Publishing under `@stack-ui` keeps every
   import in the six consuming products unchanged. Publishing as `@boundry/*` is a rename: a major
   release with a migration note.
2. **License.** All three packages are `"license": "UNLICENSED"`. Publishing public packages with that
   value contradicts "public, provenance" in the adoption plan. Choose a license, or publish as
   restricted packages.
3. **Credentials.** An `NPM_TOKEN` secret and the `NPM_PUBLISH` repository variable.

Until then products vendor the release (the static release, or `scripts/vendor-packages.mjs`). The
temporary vendoring **cannot be eliminated without publishing**. It is checksummed, and the registry
identifies every copy.

## Recommended sequence

1. Merge the stack-ui PR.
2. The owner tags `v0.6.1`. The release workflow creates the GitHub release with its assets. This is
   publishing, so it needs the owner's go-ahead.
3. Each product re-vendors 0.6.1 in its own PR, or, after npm publishing, replaces `file:` dependencies
   with the published version.
4. Run `node scripts/check-registry.mjs --root <checkouts> --write` and commit the regenerated registry.
