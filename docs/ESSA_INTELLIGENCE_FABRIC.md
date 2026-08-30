# ESSA Intelligence Fabric

Phase 21C defines ESSA's provider-independent intelligence layer. Phase 21K-OX extends it with the GLM-5.3-Flash research candidate derived from `artifacts/research/OxAlphaResearchArtifact.json`. ESSA is not GPT, Claude, GLM, Ox Alpha, or any future model. ESSA remains the source of truth for Navigator continuity, identity, goals, policy, context selection, tools, artifacts, verification, approval, memory, and final presentation. Models are replaceable delegated reasoning engines.

## Canonical Flow

USER -> ESSA Navigator -> ESSA Core / Intent / Goal / Policy -> Context Selection -> Intelligence Router -> selected local tool, local model, external model, or human review -> Tool Layer where needed -> Artifact -> Verification -> Escalation if needed -> Approval where needed -> Navigator result.

## Navigator Role

Navigator is not replaced by GPT or Claude. Navigator owns user-facing continuity, intent handling, goal/project routing, approval interaction, policy application, delegation, and final response presentation. Navigator delegates reasoning through an `IntelligenceRequest` and receives an `IntelligenceDecision`, provenance, verification, cost metadata, and unresolved items without provider-specific logic.

## Contracts

`IntelligenceRequest` is provider-independent and carries ids, task type, complexity, user intent, desired outcome, bounded ContextPack, ContextBudget, required capabilities, quality, latency, privacy, budget, tool/approval policy, escalation/fallback permissions, and trace id. It never carries provider secrets.

`IntelligenceDecision` is produced by ESSA. It records decision type (`LOCAL_TOOL`, `LOCAL_MODEL`, `EXTERNAL_MODEL`, `HUMAN_REQUIRED`, `BLOCKED`), selected provider/model/tool, reasoning level, estimated tokens/cost, selection reason, fallback candidates, escalation path, approval requirement, policy checks, context budget decision, and trace id.

## Model vs Provider

Providers contain models; models are not providers. OpenAI is one provider with non-executing GPT-5.6 model profiles: `gpt-5.6-luna`, `gpt-5.6-terra`, and `gpt-5.6-sol`. Sol supports `SOL_STANDARD`, `SOL_HIGH`, and `SOL_MAX` reasoning profiles. Anthropic/Claude remains an optional, replaceable provider mapped from the existing ProductionAgent candidate. Z.ai is represented by the non-executing `glm-5.3-flash` research profile only. `Ox Alpha` and `stealth/ox-alpha` are historical aliases, not canonical model ids. These external providers are not executable in Phase 21K-OX.

## Phase 21K-OX Research Candidate

`GLM-5.3-Flash` is tracked as `z-ai/glm-5.3-flash` with status `WATCH_RESEARCH_ONLY`. Its source of truth is `artifacts/research/OxAlphaResearchArtifact.json`. The router blocks explicit requests for Ox Alpha, `stealth/ox-alpha`, Z.ai, or GLM-5.3-Flash instead of silently routing to another model.

The profile records text, image, and video input as public-source claims, but it does not treat video editing, video rendering, browser use, computer use, file mutation, deployment, or publishing as model-native capabilities. Those remain agent harness or external/local tool capabilities. Audio input is not claimed. Tool calling is tracked as declared support; structured output is partial because schema enforcement is not verified.

GLM-5.3-Flash has no ESSA quality score. Vendor and community benchmarks are not ESSA Quality History. Superiority claims over GPT-5.6 Sol or Claude Fable 5 remain unverified and must not drive routing policy.

## Local-First Principle

Before any external LLM is selected, ESSA asks whether the task can be completed deterministically or locally. FFmpeg, ffprobe, local whisper.cpp, Context7, Playwright Browser Vision, Semantic Editor paths, and ESSA verification all take precedence when sufficient. Local deterministic work has model cost 0.

## Routing And Escalation

Routing is policy/data driven by required capability, task complexity, quality, latency, cost, context size, provider health, historical success, privacy, approval, and domain defaults. The canonical escalation path is `LOCAL -> LUNA -> TERRA -> SOL -> SOL_MAX -> HUMAN_REVIEW`, but the router may skip directly to a higher tier when task complexity requires it. Provider completion claims are never proof; ESSA verification controls success, repair, escalation, or human review.

Escalation limits prevent runaway loops: max escalation steps, attempts per tier, total cost, turns, timeout, and human review thresholds. Sol Max is reserved for exceptional complexity, repeated lower-tier failures, major architecture conflicts, or high-value deep reasoning.

## Cost And Budget Economy

The Cost Engine estimates provider/model input, output, tool, and total cost from pricing metadata. Pricing for Phase 21K-OX external models is marked `PRICE_REVALIDATION_REQUIRED_BEFORE_LIVE_USE`; no paid execution, billing, or credentials are configured. GLM-5.3-Flash preview-free claims are historical and cannot be used for budgeting; its paid/discounted pricing must be revalidated before any live use. Budget policy supports future `FREE_ONLY`, `LOW_COST`, `STANDARD`, `PREMIUM`, and `HUMAN_APPROVAL_REQUIRED` modes, plus task/workflow/project/user/provider budgets.

ESSA's economic priority is: deterministic/local solution, free verified external tool where appropriate, lowest-cost sufficient intelligence, stronger model only when needed, and human review when risk, budget, or complexity exceeds policy.

## Context And Memory Economy

ESSA never automatically sends full memory/history. Memory is retrieved by relevance into a bounded ContextPack with selected and withheld context, reasons, approximate tokens, privacy level, documentation context, browser context, and project context. Models may receive temporary execution state, but persistent ESSA memory, Lisa Character Core, LisaProductionProfile, and DynamicExpressionContext remain ESSA-owned.

## Provider Health, Fallback, And Quality Learning

Provider health states include `AVAILABLE`, `DEGRADED`, `RATE_LIMITED`, `OUT_OF_CREDITS`, `AUTH_FAILED`, `UNAVAILABLE`, `NOT_CONFIGURED`, and `EXPERIMENTAL`. Fallback must preserve task policy, privacy, budget, required capabilities, context contract, and verification. Quality records track task type, provider, model, canonical model id, historical aliases, success, verification status, cost, latency, retries, quality score, evidence level, source of truth, provider-call state, external-data state, and timestamp. GLM-5.3-Flash has a research-only, unscored Quality History record. Providers do not autonomously rewrite routing policy.

## Domain Policy Support

The router supports domain policy profiles for ESSA Production, Music Factory, Mirror, and Business without implementing those domain features in this phase. Production can prefer Terra for semantic planning and local FFmpeg for deterministic media tasks; Mirror can enforce Mirror-specific policy without letting a model own identity.

## Secrets And Activation Lifecycle

Provider secrets belong only in secure server configuration. They must never appear in prompts, Character Core, ContextPack, browser/client UI, source code, fixtures, logs, traces, or user-visible output. Phase 21K-OX does not create OpenRouter, Z.ai, or OpenCode keys and does not connect ESSA to those providers. Future paid providers require `PROVIDER_LIVE_REVALIDATION` before activation: current model ids, current pricing, credential presence, billing state, provider health, quota/rate policy, current API contract, retention/training policy, subprocessor route, and safety configuration.

Activation states are `ARCHITECTURE_ONLY`, `NOT_CONFIGURED`, `READY_FOR_KEY`, `READY_FOR_PAYMENT`, `READY_FOR_ACTIVATION`, `ACTIVE`, `DEGRADED`, and `DISABLED`. Phase 21K-OX leaves OpenAI, Anthropic, and Z.ai ready for architecture review only, not live use.

## Rollback

Rollback is local: remove `src/intelligence/`, remove `scripts/testIntelligenceFabric.js`, and remove this document. No env, billing, Render secrets, deployment, provider credentials, or live provider state is changed by Phase 21C.
