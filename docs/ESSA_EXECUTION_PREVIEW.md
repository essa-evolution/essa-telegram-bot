# ESSA Execution Preview

Phase 21J connects Product Discovery to future execution planning without executing any capability.

## Discovery To Preview Boundary

Product Discovery can now move from a capability detail to an Execution Preview route:

`#product-discovery/execute/<capabilityId>`

The route creates a provider-independent `CapabilityExecutionRequest`, resolves the capability, builds a `CapabilityCompositionPlan`, classifies local/intelligence/provider requirements, creates an approval plan, and stops before execution.

## CapabilityExecutionRequest

The request contains user need, product id, primary capability id, requested outcome, input requirements, project/task/workflow references, discovery context, user preferences, timestamps, and trace id.

It does not contain provider secrets or provider-specific implementation assumptions.

## ExecutionPreview

The preview contains:

- product and primary capability
- required and optional capabilities
- dependency order
- local steps
- intelligence steps
- provider-dependent steps
- input requirements
- current availability
- activation requirements
- coarse cost class
- exact price status
- approval points
- safety notes
- expected artifacts
- verification plan
- rollback plan
- execution status

Execution status can be `PREVIEW_ONLY`, `READY_FOR_APPROVAL`, `BLOCKED_MISSING_INPUT`, `BLOCKED_CAPABILITY_UNAVAILABLE`, or `BLOCKED_PROVIDER_NOT_ACTIVE`.

## ExecutionInputRequirement

Each input requirement has:

- `requirementId`
- `type`
- `label`
- `required`
- `currentStatus`
- `acceptedFormats`
- `privacyClass`
- `validationRule`
- `description`

Types include `TEXT`, `FILE`, `VIDEO`, `AUDIO`, `IMAGE`, `URL`, `VOICE_REFERENCE`, `PROJECT_CONTEXT`, and `APPROVAL`.

## Local And Provider Classification

Preview steps are classified as:

- `LOCAL_READY`
- `LOCAL_NOT_READY`
- `INTELLIGENCE_REQUIRED`
- `PROVIDER_REQUIRED`
- `PAYMENT_REQUIRED`
- `APPROVAL_REQUIRED`
- `BLOCKED`

Classification is derived from Product Knowledge, Capability Fabric, Capability Composition, Provider Capability Map, Intelligence Fabric dry routing, and policy metadata.

## Cost And Activation Preview

Cost preview is coarse only:

- `FREE_LOCAL`
- `LOCAL_COMPUTE`
- `EXTERNAL_PROVIDER_REQUIRED`
- `PAID_PROVIDER_REQUIRED`
- `PRICE_REVALIDATION_REQUIRED`
- `UNKNOWN`

Exact provider prices are not invented. If live pricing is not verified, `exactPriceStatus` is `REVALIDATION_REQUIRED`.

Activation notes may include local path availability, architecture-only state, provider stack not active, key/payment requirements, and future approval needs.

## Approval Plan

`ExecutionApprovalPlan` always requires explicit user confirmation in Phase 21J. Nothing is auto-approved.

It tracks cost approval, provider activation approval, publish approval, destructive approval, user input requirements, and approval points inherited from capability policy.

## Expected Artifacts

Examples:

- `BOOK_COVER`: `ImageArtifact`, `CoverArtifact`, `CoverBrief`
- `WEBSITE_GENERATE`: `SiteProject`, `BuildArtifact`, `VerificationReport`
- `VIDEO_EDIT`: `TranscriptArtifact`, `EditPlan`, `RenderArtifact`, `VerificationReport`
- `VOCAL_REPLACE`: `StemArtifacts`, `VoiceArtifact`, `MixArtifact`, `MasterArtifact`

No artifact is generated in Phase 21J.

## Verification Plan

Every preview explains how ESSA would verify success later:

- website: browser observation, UI verifier, responsive screenshot check
- video: ffprobe, representative frames, media verifier
- voice/music: rights and voice identity binding, audio artifact verifier
- book cover: format/dimensions, cover brief validation, human visual approval

No verification is executed in Phase 21J.

## Future ExecutionGateway Handoff

The preview can later become AgentToolRequest candidates and an ExecutionIntent, but Phase 21J keeps the future intent `PREVIEW_ONLY`.

Any attempt to execute returns:

`EXECUTION_NOT_ENABLED_PHASE_21J`

Hard guards:

- `executionEnabled=false`
- `providerExecutionEnabled=false`
- `toolExecutionEnabled=false`
- `publishEnabled=false`
- `deployEnabled=false`
- `paymentEnabled=false`

## User-Facing Abstraction

Normal UI says “Локальная обработка”, “Интеллектуальный анализ”, “Внешний сервис”, and “Требуется активация”.

Provider/model ids and technical routing can appear only in debug metadata.
