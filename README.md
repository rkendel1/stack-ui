# stack-ui

Shared design system for the Stack products: Compute, FeltDB, AppPort,
AuthBoundry and AppBoundry. It owns presentation and interaction behaviour; it
owns no product state, authorization or execution.

This repository currently contains the PR1 audit and contract. No packages are
published yet.

| Document | Contents |
|---|---|
| [docs/audit.md](docs/audit.md) | What exists today in each product, with repository evidence |
| [docs/design-system-contract.md](docs/design-system-contract.md) | Tokens, components, interaction patterns, accessibility, state and evidence semantics, versioning |
| [docs/product-shell.md](docs/product-shell.md) | Shared shell as a UI composition contract |
| [docs/adoption-plan.md](docs/adoption-plan.md) | Package ownership, the Compute + FeltDB slice (PR2), migration order, CI |
| [docs/decisions.md](docs/decisions.md) | Decisions, alternatives, open and deferred questions |

## Checking citations

Every `repo:path:line` citation in `docs/` can be checked against local
checkouts of the product repositories placed next to this one:

```sh
node scripts/check-citations.mjs            # expects ../compute, ../flow_db, …
node scripts/check-citations.mjs --root DIR
```
