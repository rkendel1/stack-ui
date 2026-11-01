# Who owns "execution": recommendation (2026-11-01)

The owner removed AgentBoundry ("there is no AgentBoundry product"). boundry.company then attributed its
"Execution" foundation to AppBoundry. This note checks that attribution against the code. **It changes
nothing by itself.** Applying a recommendation is the owner's decision.

## Responsibilities and their owners in code

| Responsibility | Owner (code) | Evidence |
|---|---|---|
| Application boundaries and portability | **AppBoundry** | Runs an application from its artifact alone (`appboundry:docs/artifact-runtime.md`); "application lifecycle ≠ execution lifecycle" (`appboundry:docs/architecture/appboundry-thesis.md`). FeltKit builds the `.app` artifact |
| Capability discovery and invocation | **AppPort** (protocol) and **AppBoundry** (hosted path: discover → authorize → materialize → execute one capability) | `appport:README.md`; `appboundry:packages/core/src/appboundry-execution.ts`, which "invokes an already materialized capability and records the terminal lifecycle state for that one request. It does not … schedule, host, retry, persist, or supervise applications" |
| Agent runtime and execution | **Not a Boundry product.** The agent loop and tool orchestration are in `stack-agent` (Chip, `stack-agent:docs/architecture.md`). The machine agents run on is Compute: "an agent-neutral execution environment" (`compute:docs/agents.md`). FeltKit runs agent playbooks over FeltDB's `AgentRuntime` | `feltkit:packages/sdk/src/runtime/agent.ts`; `flow_db:packages/core/src/agent-runtime.ts` |
| Delegated authority and authorization | **AuthBoundry** | Agent principals, delegation and agent credentials. AppBoundry's docs: "AuthBoundry stays the authority … AppBoundry stays the enforcement point" (`appboundry:docs/architecture/agent-credentials.md`) |
| Durable state and execution evidence | **FeltDB** for state, including `AgentCheckpoint` and `AgentHandoff` (`flow_db:packages/core/src/agent-state.ts`). Evidence records are product-local: AppBoundry's execution ledger, AppPort's invocation evidence, Compute's receipts, AuthBoundry's decision ids. All are stored in FeltDB, with no shared receipt format | as listed |

## What this means for the portfolio

- AppBoundry executes **capabilities**: one authorized call per request, recorded in its ledger. It does
  **not** execute **agents**. The removed AgentBoundry copy described agent execution, which no Boundry
  product owns today.
- Agent-related responsibilities split across the portfolio as they actually work. Authority over what an
  agent may do belongs to AuthBoundry. Resumable agent state belongs to FeltDB. Capabilities agents
  invoke belong to AppPort and AppBoundry. FeltKit's built-in agent acts only through capabilities.

## Recommendation

1. Rename the boundry.company foundation "Execution" to **"Capability execution"**, owned by **AppBoundry
   (with AppPort)**: "Authorized capabilities executed on demand inside the application boundary, with an
   immutable record of what ran." This matches `appboundry-execution.ts`. The current copy already says
   "Capabilities executed on demand", but the heading overclaims.
2. Do not describe any Boundry product as an agent runtime. If an agent-execution story is wanted on the
   site, that means bringing stack-agent and/or Compute into the portfolio, which is the owner's decision.
3. Portfolio descriptions grounded in the code:
   - **FeltDB:** durable, versioned state with transactions, including agent tasks, checkpoints and
     handoffs.
   - **AppPort:** the open protocol for discovering and invoking application capabilities across
     transports.
   - **AppBoundry:** runs an application from its portable artifact, and executes authorized capabilities
     on demand with an immutable execution ledger.
   - **AuthBoundry:** the authority boundary for identity, authorization and delegation for people,
     services and agents.
   - **FeltKit:** the integrated platform that puts FeltDB, AppPort and AppPort Services together and
     builds AppBoundry artifacts, with a built-in agent that acts only through capabilities.

## Observed but outside this initiative

- `appboundry` carries older copies of the AppPort packages (1.0.0, against appport's 1.3–1.4). This
  relates to D10.
- There is no shared receipt or evidence format across products.

Uncertain: whether FeltDB's `AgentRuntime` is fully exercised by tests. It was not verified here.
