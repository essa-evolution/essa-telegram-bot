# ESSA First Live Intelligence Boundary

Phase: `21S-A`

Status: `READY_FOR_LIVE_SCRIPT_GENERATION`, but `LIVE_EXECUTION_NOT_AUTHORIZED`.

This phase prepares ESSA to the exact boundary before the first potentially billable external `SCRIPT_GENERATE` call. No live request was made.

## Why This Boundary Exists

The next real milestone is the first controlled external intelligence execution inside the existing Production Goal-to-Content workflow:

`ProductionGoal -> ContentBrief -> SCRIPT_GENERATE -> ProductionScriptArtifact -> Script Quality Review -> ExecutionFrontier advances -> STOP before VOICE_RENDER`

The hard constraint for today is zero paid provider calls. ESSA may prepare, price, scope, validate and prove the route. ESSA may not send a prompt to a paid model.

## Architecture Path

The future execution path must remain:

`Production Workflow -> SCRIPT_GENERATE capability -> Intelligence Router -> selected provider/model route -> ExecutionGateway / approval boundary -> external provider`

It must not become:

`Production Workflow -> hardcoded provider SDK`

Reused canonical architecture:

- Intelligence Fabric
- Intelligence Router
- provider/model registry
- provider health
- cost policy
- Capability Fabric
- ExecutionGateway boundary
- Scoped Approval Tokens
- ProductionGoal
- ProductionIntent
- ExecutionWorkflow
- ExecutionFrontier
- Goal-to-Content Workflow Foundation
- Lisa Character Core
- Lisa Production Profile

## Provider Independence

The selected route is a first-proof recommendation only, not a permanent ESSA default. Provider/model provenance is internal execution metadata. Normal user-facing product UI may remain provider-independent, but material approval must clearly disclose which external provider/model may receive data and incur cost.

## Provider Audit

Discovered provider registry states:

- `local`: executable local provider, zero cost, not sufficient for live script generation.
- `openai`: architecture-only provider with GPT-5.6 Luna/Terra/Sol profiles; future route can become ready only with credential, approval and cost guard.
- `z-ai`: research-only/watch profile, not selectable for user tasks.
- `anthropic`: architecture-only optional profile sourced from production agent provider registry; not selected for first proof.

Credential presence is checked only as `CREDENTIAL_PRESENT` or `CREDENTIAL_ABSENT`. Secret values must never be printed or stored.

## Candidate Route

Recommended first live route:

- Provider: `openai`
- Model: `gpt-5.6-luna`
- Reasoning effort: `low`
- Max external attempts: `1`
- Automatic paid fallback: `false`

Why this route:

- It is already represented in ESSA's provider/model registry.
- Official pricing is verified and low enough for a tiny but meaningful script proof.
- It is sufficient for a bounded first script generation where the primary goal is proving the governed execution path.
- Terra and Sol remain available as higher-cost candidates, but should not be automatic fallbacks for the first billable proof.

## Current Pricing

Verified OpenAI GPT-5.6 prices at research time:

| Model | Input / 1M tokens | Cached input / 1M tokens | Output / 1M tokens | Context | Max output |
|---|---:|---:|---:|---:|---:|
| `gpt-5.6-luna` | `$0.20` | `$0.02` | `$1.20` | `1,050,000` | `128,000` |
| `gpt-5.6-terra` | `$2.00` | `$0.20` | `$12.00` | `1,050,000` | `128,000` |
| `gpt-5.6-sol` | `$4.00` | `$0.40` | `$20.00` | `1,050,000` | `128,000` |

Sources:

- `https://developers.openai.com/api/docs/models`
- `https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/`

Unknown pricing must fail closed.

## Cost Protection

First proof bounds:

- Max requests: `1`
- Max external attempts: `1`
- Max input tokens: `6000`
- Max output tokens: `4500`
- Proposed spending ceiling: `$0.01`
- Estimated max cost on `gpt-5.6-luna`: `$0.0066`

If estimated max cost exceeds the approved spending ceiling, ESSA must reject the execution before provider contact.

## Approval Semantics

The future approval must be single-use and scoped to:

- one workflow
- one workflow version
- `STEP_2_SCRIPT_GENERATE`
- `SCRIPT_GENERATE`
- `openai`
- `gpt-5.6-luna`
- max request count `1`
- max input/output bounds
- max spending ceiling
- expiration
- no paid fallback

It must not authorize:

- `VOICE_RENDER`
- `AVATAR_RENDER`
- publishing
- deployment
- advertising
- social dispatch
- provider activation
- billing changes
- extra model calls
- unbounded retries

## Data Sent Externally

Future live `SCRIPT_GENERATE` may send only the minimum necessary context:

- ProductionGoal topic/raw goal text
- ContentBrief fields needed for script generation
- Lisa Character Core reference-derived production constraints
- Lisa Production Profile reference-derived production constraints
- format, language, target duration, audience if supplied

Kept local:

- secrets and environment variables
- full repository source
- unrelated memory
- billing/payment data
- voice/avatar rights material not needed for `SCRIPT_GENERATE`

Never sent:

- API keys
- tokens
- private keys
- `.env` contents
- browser profiles
- unrelated repository content

## Privacy And Retention

For the recommended OpenAI API route:

- Training policy: verified. OpenAI states API inputs/outputs are not used to train models by default unless the customer explicitly opts in.
- Retention policy: verified with account-dependent options. Default abuse monitoring logs may be retained up to 30 days. Zero Data Retention or Modified Abuse Monitoring require eligibility/configuration.
- Application state: configurable. Future execution should avoid stored response state when possible and set `store=false` where supported.
- Regional/data residency: unknown or account-dependent for this local proof.

Sources:

- `https://platform.openai.com/docs/models/default-usage-policies-by-endpoint`
- `https://openai.com/business-data/`

## SCRIPT_GENERATE Contract

Inputs derive from canonical artifacts, not duplicated free text:

- `ProductionGoal`
- `ContentBrief`
- Lisa Character Core reference
- Lisa Production Profile reference
- content format
- language
- target duration
- audience if supplied
- tone/style constraints
- safety/product constraints
- topic

The route may not silently create a generic assistant personality. Lisa identity remains ESSA-owned.

## ProductionScriptArtifact

The future artifact contract preserves:

- artifact id
- workflow id/version
- production goal id
- content brief id
- script generation step id
- internal provider/model route provenance
- generation timestamp
- input lineage
- Lisa Character Core and Production Profile references
- script content
- language
- estimated duration
- verification status
- quality review status
- content hash
- parent/derived relationships

Today the artifact remains `PENDING_GENERATION`.

## Quality Verification

Prepared deterministic checks:

- script exists
- non-empty script
- requested language
- topic relevance
- structural completeness
- Character Core binding
- Production Profile binding
- format compliance
- obvious truncation absent
- artifact integrity
- lineage integrity

Any model-based quality review would itself be a separate external intelligence request and requires separate approval.

## Failure Behavior

Fail-closed behavior is prepared for:

- credential absent
- provider disabled
- pricing unknown
- approval absent
- approval expired
- approval wrong workflow
- approval wrong step
- approval wrong provider/model
- cost ceiling exceeded
- attempt count exceeded
- fallback requested but not approved
- missing ProductionGoal input
- missing ContentBrief
- missing Lisa identity binding
- stale workflow version

All fail before external execution.

## ExecutionFrontier Behavior

Today's frontier truth:

- current step: `STEP_2_SCRIPT_GENERATE`
- blocker: `LIVE_PROVIDER_EXECUTION_APPROVAL_REQUIRED`
- state: ready boundary prepared, live execution not authorized
- does not advance to `VOICE_RENDER`

## Tomorrow's Exact Live Procedure

1. Confirm funding/credit availability outside this phase.
2. Confirm `OPENAI_API_KEY` presence without printing the value.
3. Revalidate current pricing from official source.
4. Generate a single scoped approval for the exact workflow/version, `STEP_2_SCRIPT_GENERATE`, `openai/gpt-5.6-luna`, max one request, max `6000` input tokens, max `4500` output tokens, max `$0.01`, no paid fallback.
5. Run the single live `SCRIPT_GENERATE` call through Intelligence Router and ExecutionGateway, not directly from Production code.
6. Store a `ProductionScriptArtifact` with route provenance, lineage and content hash.
7. Run deterministic script quality gate.
8. Stop before `VOICE_RENDER`.

Today's proof:

`artifacts/intelligence/phase21s-a/LiveScriptGenerationReadinessProof.json`
