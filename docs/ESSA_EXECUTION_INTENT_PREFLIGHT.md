# ESSA Execution Intent Draft & Preflight

Phase 21K bridges Product Discovery, Product Knowledge, Capability Fabric and Execution Preview into a canonical `ExecutionIntentDraft`, then evaluates that draft through a preflight-only decision.

## Boundary

Phase 21K never executes capabilities. It does not call model providers, activate providers, make payments, publish, deploy, mutate databases, send outreach, scrape, crawl, generate media, generate websites, or dispatch Creator Network jobs.

All Phase 21K results keep:

- `executionEnabled: false`
- `executionPerformed: false`
- `providerCalls: 0`
- `externalModelCalls: 0`
- `paymentActions: 0`
- `publishActions: 0`
- `deployActions: 0`

## Contract

`ExecutionIntentDraft` captures the selected product and capability, required/optional capabilities, input readiness, dependency order, execution class, local/intelligence/provider steps, activation requirements, cost class, approvals, policy checks, expected artifacts, verification plan, rollback plan, source versions and freshness.

## Preflight

`ExecutionPreflightDecision` answers whether the future intent is allowed in principle, what blocks it, which inputs/approvals/activations are required, and what the next safe action is. Even if an intent is allowed in principle, Phase 21K still returns `executableNow: false`.

## UI

Product Discovery can expose `Подготовить к запуску` as a read-only action. It creates/previews a draft and preflight section. It must not present a normal launch action in Phase 21K.

## Lead Intelligence

`BUSINESS_DISCOVERY` can produce a valid draft and preflight. Live source activation is blocked, and outreach remains separately disabled.
