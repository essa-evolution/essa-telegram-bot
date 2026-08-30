# ESSA Goal-To-Content Workflow Foundation

Phase 21R canonicalizes the production workflow foundation for one human production goal becoming an execution-grade content workflow.

Canonical example:

> Сделай мне подкаст на тему: почему человек теряет себя в отношениях. Ведущая - LISA. После мастер-подкаста подготовь короткие ролики для short-form.

## Canonical Contracts

- `ProductionGoal` preserves the human request, topic, owner and requested derivative family.
- `ProductionIntent` resolves the first supported intent: `PODCAST_WITH_SHORT_FORM_DERIVATIVES`.
- `PODCAST_TO_SHORTS_FOUNDATION` is the canonical recipe for the foundation slice.
- The compiled plan uses the existing `ExecutionWorkflow` model from Phase 21Q. No second workflow engine, orchestrator, approval system, artifact registry, capability registry, Navigator or Character Core is introduced.
- `ExecutionFrontier` states the next blocked or resumable action.

## Recipe Steps

1. `CONTENT_BRIEF`
2. `SCRIPT_GENERATE`
3. `SCRIPT_QUALITY_REVIEW`
4. `VOICE_RENDER`
5. `AVATAR_RENDER`
6. `MASTER_ASSEMBLE`
7. `MASTER_VERIFY`
8. `SEMANTIC_CLIP_PLAN`
9. `SHORT_FORM_DERIVATIVES`
10. `SHORT_FORM_QUALITY_REVIEW`
11. `HUMAN_REVIEW_CHECKPOINT`

## Material Inputs

The foundation resolves only explicit or canonical inputs:

- topic
- host identity
- language
- master format
- short-form targets
- voice rights state
- avatar rights state

Missing inputs are surfaced as blockers. The system must not invent production facts, rights, provider outputs, platform approvals or distribution decisions.

## Provider Boundaries

Voice and avatar rendering are represented as provider-boundary steps. Phase 21R does not call a voice provider, avatar provider, external model, payment service, publishing API or deployment service.

Voice identity and provider binding remain separate:

- Lisa identity is resolved through Lisa Character Core and Lisa Production Profile.
- Voice provider configuration is represented through the existing voice binding contract.
- Voice rendering remains blocked until rights and scoped human approval are present.
- Avatar rendering remains blocked until identity rights, provider choice and scoped human approval are present.

## Artifacts

The foundation defines the following production artifacts:

- `ContentBrief`
- `ScriptArtifact`
- `MasterContentArtifact`
- `SemanticClipPlan`
- `ShortFormDerivative`

The master artifact is immutable and starts unverified because no provider output is produced in this phase. Short-form derivatives keep lineage to the master and integrate with `ContentVariant` for later Content Intelligence and sequential experimentation.

## Human Checkpoints

Human approval is required for:

- content brief acceptance
- provider execution activation
- master review
- short-form package review before any publish or distribution path

Approval scope is explicit. Approval in this foundation does not imply publishing, payment, external account mutation or provider execution.

## Workspace Route

The workspace route is:

`#production/workflow/PODCAST_TO_SHORTS_FOUNDATION`

The UI shows a production goal form, the 11-step execution-grade plan, provider-boundary blockers, `ExecutionFrontier`, Lisa canonical identity references and Content Intelligence handoff. Normal UX labels hide provider brand names.

## Proof

The canonical synthetic proof is written to:

`artifacts/production/phase21r/GoalToContentWorkflowFoundationProof.json`

The proof must show:

- existing `ExecutionWorkflow` reuse
- valid DAG and typed bindings
- provider calls equal zero
- payment, publish, deploy and external mutation counters equal zero
- ContentVariant handoff present
- human review checkpoint present
- UI route present
