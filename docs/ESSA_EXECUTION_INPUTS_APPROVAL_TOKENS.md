# ESSA Execution Inputs And Scoped Approval Tokens

Phase 21M adds the read-only interaction layer between Preflight and future Execution:

`PREFLIGHT -> RESOLVE KNOWN INPUTS -> IDENTIFY TRULY MISSING INPUTS -> COLLECT INPUTS -> VALIDATE -> NORMALIZE -> RE-PREFLIGHT -> PRESENT MATERIAL APPROVALS -> USER DECIDES -> ISSUE SCOPED APPROVAL TOKENS -> VERIFY TOKEN/INTENT CONSISTENCY -> READY_FOR_FUTURE_EXECUTION`

Then it stops. `executionEnabled:false` and `executionPerformed:false` remain hard boundaries.

## Architecture Audit

Reused components:

- `ExecutionPreview` provides capability input requirements, costs, provider requirements and approval plan.
- `ExecutionIntentDraft` provides intent identity, input snapshot, missing input state, activation requirements, approvals, rollback and disabled execution guards.
- `preflightExecutionIntentDraft(...)` remains the canonical preflight engine.
- `approvalTypes` from 21K are mapped into 21M approval request types rather than replaced.
- `CREATOR_FIRST_SYSTEM_PRINCIPLE` supplies `RESOLVE BEFORE ASK`, `SYSTEM_PREPARES_USER_DECIDES` and no redundant input behavior.
- Product Knowledge explains the flow without claiming execution is live.

Duplicate systems avoided: Phase 21M does not create PreflightV2, an execution engine, a provider router, a payment authority, a publishing authority or cryptographic production authorization infrastructure.

## Resolve Before Ask

Before asking the user, ESSA inspects the current `ExecutionIntentDraft`, Preflight, bounded project/workspace context, current known user values, previous safe reusable references and safe local derivations.

Input source types:

- `USER_PROVIDED_CURRENT`
- `USER_PROVIDED_PREVIOUS`
- `PROJECT_CONTEXT`
- `WORKSPACE_CONTEXT`
- `SYSTEM_DERIVED`
- `CAPABILITY_DEFAULT`
- `SAFE_INFERENCE`
- `EXTERNAL_REFERENCE_FUTURE`
- `UNKNOWN`

`SAFE_INFERENCE` cannot silently replace material authority. Deriving video duration from local metadata is safe; inferring an advertising budget from a past spend is not.

## ExecutionInputResolution

`ExecutionInputResolution` records requirement id, input key, requirement type, status, value/reference, normalized value, source type, source ref, confidence, confirmation requirement, sensitivity, materiality, freshness, validation state and reason.

Resolution states:

- `RESOLVED`
- `RESOLVED_CONFIRMATION_REQUIRED`
- `MISSING`
- `INVALID`
- `AMBIGUOUS`
- `STALE`
- `CONFLICTING`
- `UNAVAILABLE`

The resolver separates known, derivable, reusable, optional, missing and material-confirmation-required inputs.

## Input Collection

`ExecutionInputCollectionRequest` contains required inputs, optional inputs, already resolved inputs, derived questions, reason for each question, estimated user effort and Creator-First summary.

`ExecutionInputQuestion` is derived from input requirements. It includes prompt, expected type, required flag, choices/ranges/format hint, why it is needed, consequence if missing, sensitivity class, confirmation-only flag, skip policy and default source if confirmation is appropriate.

No random free-form questioning is introduced.

Input batching is supported: multiple simple non-sensitive missing values can be presented together.

## Materiality And Sensitivity

Input materiality:

- `NON_MATERIAL`: subtitle style, output filename, thumbnail ratio.
- `MATERIAL`: target audience, public brand name, campaign objective.
- `HIGH_IMPACT`: budget, legal identity, payment authorization, publishing account, contractual choice.

Sensitivity:

- `PUBLIC`
- `INTERNAL`
- `PERSONAL`
- `CONFIDENTIAL`
- `SECRET_REFERENCE_ONLY`

Secrets are not echoed unnecessarily, and raw payment credentials are not collected in the generic input flow.

## Answers, Normalization And Validation

`ExecutionInputAnswer` records question id, requirement id, input key, raw/selected value, user-provided state, timestamp, provenance and confirmation state. It has no execution side effect.

Safe deterministic normalization includes examples such as:

- `500 usd` -> `{ amount: 500, currency: "USD" }`
- `русский` -> `ru`
- `16:9` -> `{ width: 16, height: 9, ratio: "16:9" }`
- `00:01-00:03` -> start/end seconds

Relative dates like `tomorrow` remain ambiguous unless timezone-aware context is available and authorized.

Validation covers requiredness, type/format, enum, range, length, cross-field consistency, dependency presence, freshness, material confirmation and capability constraints.

Cross-field examples:

- time range start must be before end
- time range must fit local media duration when known
- vertical aspect ratio conflicts with a landscape-only target
- missing currency makes budget incomplete/ambiguous

Conflicts between trusted sources return `CONFLICTING`; ESSA does not silently choose.

## ExecutionInputDraft

`ExecutionInputDraft` records resolved, missing, invalid and conflicting inputs, validation summary, completeness, version and timestamps.

Completeness states:

- `COMPLETE`
- `PARTIAL`
- `BLOCKED`
- `INVALID`

Preflight consumes actual input completeness. There is no fake ready state.

## Re-Preflight

Canonical integration remains:

`ExecutionIntentDraft + ExecutionInputDraft -> preflightExecutionIntentDraft(...) -> updated decision`

The existing preflight engine remains the source of blockers and approvals; 21M only supplies resolved input state and removes input-missing blockers when the input draft is complete.

## Approval Discovery

Approvals are derived from existing Preflight and policy gates only:

- cost
- provider activation
- payment
- publish
- deploy
- external account
- destructive/high impact
- legal/policy
- rights/consent
- human review

No arbitrary approvals are created.

## ExecutionApprovalRequest

`ExecutionApprovalRequest` records request id, intent id/version, capability, approval type, scope, reason, action summary, consequence summary, cost class, risk, reversibility, external effect, provider/account/resource refs, expiry, required flag and state.

Before asking approval, ESSA presents:

- what will happen
- why approval is needed
- what external effect exists
- cost class if known
- risk
- reversibility
- scope
- what will not be authorized

Blanket approval is forbidden.

## User Decision

`ExecutionApprovalDecision` supports:

- `APPROVED`
- `REJECTED`
- `DEFERRED`
- `MODIFIED_REQUESTED`

There is no assumed consent.

## Scoped Approval Tokens

`ScopedApprovalToken` is local architecture metadata only. It records token id, approval request id, intent id/version, capability, approval type, scope, constraints, issued-to/by, timestamps, expiry, single-use flag, revocability, status and deterministic authorization fingerprint.

Tokens are narrow, version-bound and revocable. They do not create runtime authority in Phase 21M.

Scope may include specific action, content asset, business, campaign, provider, external account, max cost class, resource, time window and execution plan version.

Token statuses:

- `ACTIVE`
- `CONSUMED_FUTURE`
- `REVOKED`
- `EXPIRED`
- `INVALIDATED`
- `VERSION_MISMATCH`
- `SCOPE_MISMATCH`
- `NOT_YET_VALID`
- `EXECUTION_DISABLED`

Execution cannot consume tokens in this phase.

## Fingerprint And Version Binding

Authorization fingerprint is deterministic over intent id/version, capability, approval type, scope, material parameters, cost class and target/external effect.

If material context changes, the fingerprint changes and reapproval is required. Intent version mismatch invalidates token use.

Material changes include budget increases, target account changes, publish destination changes, provider changes when provider approval is required, destructive scope expansion, legal scope changes, material content asset changes, payment amount changes and campaign objective changes.

Non-material changes include display label, UI formatting and local presentation title; these may preserve approval.

## Expiry, Revocation And Reuse

Tokens may expire where the approval is time-sensitive. Revocation is supported locally and never requires an explanation.

Default is `singleUse:true`. Reusable tokens must still be bounded, explicit, revocable and version-aware. Unlimited permanent authority is not allowed.

## Dependencies And Grouping

Approval dependencies can represent ordering such as provider activation before paid provider execution, or rights/legal review before publish.

Creator-First allows grouped presentation when several approvals are part of the same material decision, while tokens remain individually traceable.

## Anti-Patterns

Approval anti-patterns:

- `BLANKET_APPROVAL`
- `AMBIGUOUS_SCOPE`
- `HIDDEN_EXTERNAL_EFFECT`
- `HIDDEN_COST`
- `HIDDEN_DESTRUCTIVE_EFFECT`
- `STALE_APPROVAL`
- `VERSION_MISMATCH`
- `SCOPE_EXPANSION`
- `ASSUMED_CONSENT`
- `MICRO_APPROVAL_OVERLOAD`
- `APPROVAL_WITHOUT_CONTEXT`

## UI Surface

The read-only UI model extends the existing Product Discovery / Preflight path:

`#product-discovery/preflight/<capabilityId>`

Sections:

- Input Collection
- Validation
- Approval Review
- Approval Decision
- Future-Ready Summary

The UI shows already-known values, needed values, why each is needed, validation status, approval cards and human-readable token summaries. Opaque token ids are advanced/debug details, not primary UX.

Russian user-facing language is preferred where labels are user-visible.

## Lisa Product Guide

Lisa can say, grounded in the actual input/approval draft:

`Я уже взяла из проекта всё, что знаю. От тебя нужны только два решения.`

and:

`Это подтверждение относится только к этой публикации. Если сумма, аккаунт или план изменятся, ESSA спросит заново.`

No unsupported claims are allowed.

## Auditability And Privacy

`ExecutionInputApprovalAuditArtifact` records intent id/version, input resolution summary, collected input keys, validation summary, approvals required, decisions, token summary, material changes, Creator-First summary and hard execution counters.

It avoids unnecessary raw sensitive values. No secrets are stored in audit artifacts.

## Fixtures

Synthetic fixtures cover:

- BOOK_COVER known title/author/language and missing style/format
- WEBSITE known business/language with missing CTA/domain intent and deferred deploy approval
- VIDEO_TRIM local asset and valid time range
- VOCAL_REPLACE rights/consent approval metadata without processing
- BUSINESS_DISCOVERY blocked by live-source activation
- PUBLISH token bound to content asset X and account Y
- cost expansion from 100 to 500 invalidating approval
- non-material display label change preserving fingerprint
- rejection producing no token
- revocation changing token to `REVOKED`

## Hard Boundary

Even when all inputs are resolved, validations are valid, approvals are approved and scoped tokens are active, Phase 21M returns:

- `READY_FOR_FUTURE_EXECUTION`
- `EXECUTION_DISABLED_PHASE_21M`
- `executionEnabled:false`
- `executionPerformed:false`

No provider calls, external calls, model calls, payments, publishing, deployment or production data mutation occur.

## Future Handoff

The future Execution phase must implement real token persistence/cryptographic authority if needed, secure provider/payment-specific approval channels, runtime token consumption, actual execution gateway handoff, verified rollback, production audit storage and revocation propagation. None of that is active in 21M.

Rollback path: remove `src/capabilities/executionInputApproval.js`, `src/capabilities/executionInputApprovalFixtures.js`, their exports from `src/capabilities/index.js`, the Product Knowledge node `execution_input_approval_tokens`, `scripts/testExecutionInputApprovalTokens.js`, and this document.
