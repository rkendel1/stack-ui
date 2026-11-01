# Product identities and UX direction

The foundation keeps products recognizably Boundry, and this document keeps each one purpose-built. For every
product it records the accent, what the product's interface is for, which shared components carry its
domain, and what must stay product-owned. A shared component is promoted only when two products need the
same one (contract §9).

Accents and ids are in `docs/brand.md` §3.2. Surfaces and their current adoption are in
`docs/portfolio-assessment.md`.

## FeltDB — durable state (`feltdb`, umber)

- **Optimize for:** inspecting data, collections and schema; operations and history; integrity and evidence;
  administrative workflows.
- **Shared vocabulary:** `MetadataList` for record facts, `ResourceIdentity` for ids and digests,
  `VerificationBadge` for `integrity_verified` (check: content hash), `FreshnessLabel` for snapshot staleness,
  `Unavailable` for capabilities the deployment does not support, and `ActivityTimeline` for operation history.
- **Product-owned:** record and schema browsers, diff viewers, query consoles, the reconciliation view, and
  data-specific visualizations.
- **Voice:** exact and evidential. Say *committed* or *verified*, never "saved!".

## FeltKit — integrated developer platform (`feltkit`, ochre)

- **Optimize for:** projects, creating applications, configuration, services, development loops, builds,
  deployment, managed infrastructure.
- **Shared vocabulary:** `Shell`, `PageHeader`, `Tabs`, `DataTable` for services and deployments, `StepList`
  (when promoted) and `StatusIndicator` for builds and deploys, `Form` and `Checkbox` for configuration,
  `Alert` for environment notices.
- **Product-owned:** the project canvas, code and command blocks, log streaming, and the service topology.
  FeltKit should read as a developer tool, with dense, code-forward screens, not as a generic admin
  dashboard.
- **Voice:** direct and imperative ("Deploy", "Connect FeltDB").

## AppBoundry — application boundaries (`appboundry`, green)

- **Optimize for:** application boundaries, portability, compatibility, conformance, artifact inspection,
  verification evidence.
- **Shared vocabulary:** `EvidenceSummary` and `VerificationBadge` for attestation and conformance
  (`appboundry.*` mappings), `ResourceIdentity` for artifacts and digests, and `ActivityTimeline` for the
  execution ledger.
- **Product-owned:** contract and boundary diagrams, compatibility matrices, artifact explorers.
- **Rule:** compatible is not verified, and verified is not active. Each is shown on its own axis
  (contract §6.1).

## AuthBoundry — authority and delegation (`authboundry`, terracotta)

- **Optimize for:** principals, authority, grants, policies, delegation, authorization decisions, audit
  evidence.
- **Shared vocabulary:** `StatusIndicator` for decisions, with `deny` critical when it answers the user and
  neutral when it is history. `EvidenceSummary` shows decision records, which are recorded facts and never
  "verified" (D17). `ActivityTimeline` is the audit trail. `ConfirmAction` is for revoking.
- **Product-owned:** the policy editor, delegation graphs, and the grant explorer.
- **Rule:** trust comes from explicitness. Every allow or deny names who, what, which policy and when. An
  authority timeout is an unknown outcome, never a denial.

## AgentBoundry — agent execution (`agentboundry`, indigo)

- **Status:** no repository implements it and no site exists (assessment §2). The identity and accent are
  reserved.
- **Direction when it has a UI:** agents, sessions and runs, decisions, tool invocations, capabilities,
  recovery, observability, execution evidence.
- **Rule:** a model's proposed action and an executed action are different records. Proposals render as
  *proposed* (progress or neutral). Only the execution environment's own report renders as *completed*, and
  only its checks render as *verified*.

## AppPort — capability discovery (`appport`, steel blue)

- **Status:** a protocol and libraries, with no public site (assessment §2). AppPort services ships packaged
  management pages, which already use the foundation.
- **Optimize for:** catalogs, contracts, semantic metadata, invocation, integrations, configuration.
- **Rule:** discovering a capability does not authorize invoking it. Catalog views never show an invoke
  action as available unless the caller's authority says so. When authority is unknown, the view says
  unknown.

## Boundry — the company (company blue)

- boundry.company is the corporate destination, not a product. It leads with the mark and the thesis
  ("Boundry builds infrastructure for applications and agents"), presents the portfolio as one architecture,
  and links to every product's own site.
