# ESSA Product Education & Growth

Phase 21G adds a provider-independent Product Education & Growth orchestration layer. It turns verified Product Knowledge into structured education strategy, content angles, demo plans, channel briefs, Creator Network candidates, Advertising candidates, organic growth plans, bounded education context, and audit artifacts.

This layer does not execute content. It does not call LLMs, TTS, image/video providers, ads, social APIs, billing, deploy, or creator dispatch.

## Source Of Truth

All Product Education & Growth material is derived from:

- Capability Registry
- Product Capability Map
- Product Knowledge Graph
- capability availability state
- capability/product version metadata
- Lisa Product Guide Character Core reference

Architecture-only capabilities must be described as planned or preparing only. They cannot be described as live, active, or usable now.

## Lisa Product Guide

`LISA_ESSA_PRODUCT_GUIDE` consumes education strategies and content angles while preserving Lisa Character Core. The role is direct, human, practical, and user-need-first. It cannot mutate, overwrite, or simplify Lisa Character Core, and it cannot become a generic marketing persona.

The guide answers:

- What do you need?
- What can ESSA do?
- How does it work?
- What will you get?
- What is not available yet?

## Contracts

Phase 21G defines:

- `ProductEducationRequest`
- `ProductEducationStrategy`
- `ProductContentAngle`
- `CapabilityDemoPlan`
- `ChannelEducationBrief`
- `EducationRefreshIntent`
- `ProductJourneyEducationPlan`
- `OrganicGrowthPlan`
- `ProductEducationCalendarItem`
- `ProductEducationAuditArtifact`

All contracts are structured data only.

## Content Angles

One capability can generate multiple educational angles, including `HOW_TO`, `PROBLEM_SOLUTION`, `COMMON_MISTAKES`, `BEFORE_AFTER`, `DEMO`, `FAQ`, `MYTH_VS_REALITY`, `USE_CASE`, `BEGINNER_GUIDE`, `ADVANCED_TIP`, `WORKFLOW`, `COMPARISON`, and `RESULT_SHOWCASE`.

Angles are plans, not finished posts.

## Demo Plans

`CapabilityDemoPlan` is non-executing. It reflects current capability state:

- `ARCHITECTURE_ONLY` becomes `PLANNED_DEMO_NOT_EXECUTABLE`
- `LOCAL_READY` becomes `LOCAL_DEMO_READY`
- `ACTIVE` becomes `ACTIVE_DEMO_READY`
- payment-gated state becomes `PROVIDER_ACTIVATION_REQUIRED`

## Channel Briefs

`ChannelEducationBrief` prepares future briefs for Instagram Reels, TikTok, YouTube Shorts, YouTube, Telegram, ESSA in-app, Website, and Email/Newsletter. Briefs contain structure, not final scripts.

Short-form channels use fast hook, one problem, one capability, quick demonstration, outcome, and simple CTA. YouTube long-form allows broader explanation, walkthrough, limitations, and multiple examples. Telegram stays concise. In-app is contextual help. Website explains products and availability. Email supports progressive learning.

## CTA Policy

CTA is availability-aware:

- `ACTIVE` / `LOCAL_READY`: `TRY`, `CREATE`, `OPEN`, or `LEARN_MORE`
- `READY_FOR_PAYMENT`: `LEARN_MORE` or `ACTIVATION_REQUIRED`
- `ARCHITECTURE_ONLY`: `COMING_SOON` or `LEARN_MORE`

No education brief may say "try now" when execution is unavailable.

## Claim Policy

Claims are classified as:

- `ALLOWED_CURRENT_CLAIM`
- `ALLOWED_LIMITED_CLAIM`
- `FUTURE_CLAIM_ONLY`
- `PROHIBITED_CLAIM`

Example: local-ready `VIDEO_TRIM` may say ESSA can locally trim video. Architecture-only image generation cannot say ESSA already creates images; it may say image generation is represented in the architecture and preparing for future activation.

## Freshness And Refresh

Education artifacts track capability version, product version, availability state, strategy version, and freshness. Freshness can be `CURRENT`, `STALE_CAPABILITY_VERSION`, `STALE_PRODUCT_VERSION`, `STALE_AVAILABILITY`, or `REFRESH_REQUIRED`.

When Product Knowledge changes, the future flow is:

`ProductKnowledgeChanged -> affected strategies -> affected angles -> affected channel briefs -> mark stale -> create RefreshIntent`

No regeneration runs automatically in Phase 21G.

## Handoffs

Production handoff:

`ChannelEducationBrief -> ProductContentIntent -> ESSA Production`

Creator Network handoff:

`ChannelEducationBrief -> CreatorBriefCandidate`

Advertising handoff:

`ProductEducationStrategy -> CampaignEducationBriefCandidate -> ESSA Advertising`

All handoffs carry allowed claims, prohibited claims, availability, source versions, demo eligibility, and CTA policy.

## Bounded Context

`buildBoundedProductEducationContext` selects only the relevant product, capability, strategy, angle, claim policy, demo plan, channel constraints, and Lisa Character Core reference. It does not inject the full Product Knowledge catalog into future prompts.

## Provider Independence

Provider names are never the core educational claim. If a provider implementing a capability changes, the education message remains about the capability, such as "create image", not the vendor.
