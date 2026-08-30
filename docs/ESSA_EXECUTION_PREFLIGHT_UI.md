# ESSA Execution Preflight UI

Phase 21L adds the read-only user surface for execution transparency before execution.

## Journey

User need -> Product Discovery -> Capability Detail -> Execution Preview -> Prepare for Launch -> ExecutionIntentDraft -> ExecutionGateway Preflight.

Phase 21L stops at Preflight. It does not run tools, providers, payments, publishing, deployment, outreach, or database mutations.

## Source Of Truth

The UI derives from the existing Phase 21J/21K chain:

- `CapabilityExecutionRequest`
- `ExecutionPreview`
- `ExecutionIntentDraft`
- `ExecutionGateway` preflight decision
- Capability Fabric / Product Knowledge / Provider Capability Map

The workspace renderer must not duplicate provider truth or capability availability in browser code.

## View Model

`ExecutionPreflightUiViewModel` includes:

- `intentId`, `traceId`
- `product`, `primaryCapability`
- `userNeed`, `expectedOutcome`
- `status`, `statusLabel`, `executionClass`, `executionClassLabel`
- readiness counts
- required, optional, and missing inputs
- local, intelligence, provider, and blocked steps
- dependencies, availability, activation requirements, cost preview
- approvals, blockers, warnings
- expected artifacts, verification plan, rollback plan
- source versions, freshness, audit summary
- Lisa explanation
- hard execution flags set to false

## Status UX

Status labels are Russian and user-facing:

- `DRAFT`: `ЧЕРНОВИК`
- `INPUT_REQUIRED`: `НУЖНЫ ДАННЫЕ`
- `PREFLIGHT_READY`: `ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА ГОТОВА`
- `PREFLIGHT_BLOCKED`: `ЕСТЬ БЛОКИРОВКИ`
- `APPROVAL_REQUIRED`: `НУЖНО ПОДТВЕРЖДЕНИЕ`
- `PROVIDER_ACTIVATION_REQUIRED`: `НУЖНО ПОДКЛЮЧИТЬ СЕРВИС`
- `PAYMENT_REQUIRED`: `МОЖЕТ ПОТРЕБОВАТЬСЯ ОПЛАТА`
- `STALE_REVALIDATION_REQUIRED`: `НУЖНО ОБНОВИТЬ ДАННЫЕ`
- `READY_FOR_FUTURE_EXECUTION`: `ТЕХНИЧЕСКИ ГОТОВО К БУДУЩЕМУ ЗАПУСКУ`
- `EXECUTION_DISABLED_PHASE_21K`: `ЗАПУСК ПОКА ОТКЛЮЧЕН`

`READY_FOR_FUTURE_EXECUTION` never means execution is currently enabled.

## Execution Classes

The UI translates execution classes into plain language and hides provider/model IDs in normal mode:

- `LOCAL_ONLY`
- `LOCAL_PLUS_INTELLIGENCE`
- `EXTERNAL_PROVIDER_REQUIRED`
- `PAID_PROVIDER_REQUIRED`
- `PUBLISH_REQUIRED`
- `DESTRUCTIVE_OR_HIGH_IMPACT`
- `UNAVAILABLE`
- `ARCHITECTURE_ONLY`

## Inputs

Inputs support text, file, video, audio, image, URL, voice reference, project context, and approval. Each item shows:

- what ESSA needs
- why it is needed
- readiness
- accepted formats
- privacy class

Missing values remain missing. The UI does not invent placeholder values.

## Execution Plan

The preflight surface groups future steps into:

- works inside ESSA / local
- requires intelligence
- requires external provider
- blocked / not ready

No step executes while rendering preflight.

## Activation And Cost

Provider activation statuses explain consequences in user language. There is no activation button in Phase 21L.

Cost preview uses only coarse classes:

- `FREE_LOCAL`
- `LOCAL_COMPUTE`
- `EXTERNAL_PROVIDER_REQUIRED`
- `PAID_PROVIDER_REQUIRED`
- `PRICE_REVALIDATION_REQUIRED`
- `UNKNOWN`

No provider prices are invented.

## Approvals

Approvals are separate from blockers and warnings. Approval types include user input, cost, provider activation, payment, publish, destructive/high-impact, external account, legal/policy review, and human review.

Every approval has `autoApproved:false`.

## Blockers And Warnings

Blockers are shown under `ЧТО МЕШАЕТ ЗАПУСКУ`. Warnings remain visually separate and must not look like hard failures.

Common blockers include missing inputs, provider activation, payment, architecture-only capability, stale knowledge, live source activation, high-impact approval, and `EXECUTION_DISABLED_PHASE_21K`.

## Artifacts And Verification

The UI shows expected artifacts and verification plans for fixtures:

- `BOOK_COVER`: `ImageArtifact`, `CoverArtifact`, `CoverBrief`
- `WEBSITE_GENERATE`: `SiteProject`, `BuildArtifact`, `VerificationReport`
- `VIDEO_EDIT`: `TranscriptArtifact`, `EditPlan`, `RenderArtifact`
- `VOCAL_REPLACE`: `StemArtifacts`, `VoiceArtifact`, `MixArtifact`, `MasterArtifact`
- `BUSINESS_DISCOVERY`: lead intelligence and review artifacts

Verification plans are read-only descriptions. Browser, media, visual, rights, source, and freshness checks are not executed by the preflight page.

## Rollback

Rollback is represented as:

- `ROLLBACK_READY`
- `LIMITED_ROLLBACK`
- `NO_ROLLBACK`
- `NOT_APPLICABLE`

The UI must not promise reversibility for publishing, payment, external account, or high-impact work.

## Audit And Provenance

The debug section exposes:

- intent and trace ids
- product and capability ids
- source versions and freshness
- context economy
- preflight decision
- execution flags and zero-call counters

No secrets are included.

## Product Discovery Navigation

Canonical route:

`#product-discovery/preflight/<capabilityId>`

Execution Preview's `Подготовить к запуску` action navigates to this route and does not execute anything.

## Lisa Product Guide

Lisa explanation is generated from the local preflight view model. It references the task, missing inputs, provider requirement, and current disabled boundary without an LLM call.

## Responsive Behavior

The readiness summary, status labels, blockers, approvals, steps, and debug section wrap on tablet/mobile. Debug uses a collapsed semantic `details` element with `aria-expanded`.

## Execution Boundary

Hard flags remain:

- `executionEnabled:false`
- `toolExecutionEnabled:false`
- `providerExecutionEnabled:false`
- `paymentEnabled:false`
- `publishEnabled:false`
- `deployEnabled:false`
- `executionPerformed:false`
- `providerCalls:0`
- `externalModelCalls:0`
- `capabilityExecutionCount:0`
- `paymentActions:0`
- `publishActions:0`
- `deployActions:0`

The exact boundary before real execution is still `EXECUTION_DISABLED_PHASE_21K`.

## Future Activation Path

The smallest safe next phase is to keep preflight read-only and add explicit user-supplied input collection plus approval-token modeling. Provider activation, payment, publishing, live discovery, and execution queues remain separate future work.
