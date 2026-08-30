# ESSA Tech Radar

Phase 21K-TS consolidates this as the canonical ESSA Tech Radar. Technology Intelligence may create or update local candidates and radar entries, but it may not install, activate, purchase, deploy, publish, change providers, create keys, call external providers, or send ESSA/user data.

## Lifecycle

Radar stages:

`DISCOVERED`, `WATCH`, `RESEARCH`, `BENCHMARK_PENDING`, `BENCHMARKED`, `ADOPTION_REVIEW`, `APPROVED`, `ACTIVE`, `DEPRECATED`, `REJECTED`, `ARCHIVED`

Recommendation states:

`IGNORE`, `WATCH`, `RESEARCH`, `SECURITY_REVIEW`, `BENCHMARK`, `ADOPTION_REVIEW`, `ADOPT_FUTURE`, `REJECT`

Trust hierarchy:

`TIER_1_OFFICIAL -> TIER_2_INDEPENDENT_TECHNICAL -> TIER_3_REPOSITORY_COMMUNITY -> TIER_4_SOCIAL_SIGNAL`

Tier 4 may create a candidate; it may not verify a claim.

## Phase 21K-OX Entry: GLM-5.3-Flash

Status: `WATCH_RESEARCH_ONLY`

Canonical model: `z-ai/glm-5.3-flash`

Historical aliases: `Ox Alpha`, `stealth/ox-alpha`

Source of truth: `artifacts/research/OxAlphaResearchArtifact.json`

ESSA must treat Ox Alpha as a historical stealth alias only. It must not appear as a new active model, provider, route, benchmark winner, or default candidate.

## Allowed In Phase 21K-OX

- Record GLM-5.3-Flash as a research candidate.
- Preserve Ox Alpha as historical alias metadata.
- Track public-source capability claims with confidence and status.
- Add disabled benchmark candidate metadata.
- Add unscored Quality History metadata.
- Add Provider Health metadata showing research-only, no live health check, and revalidation required.
- Block router selection until security, legal, pricing, provider-route, and benchmark revalidation are complete.

## Blocked In Phase 21K-OX

- Calling Ox Alpha, GLM-5.3-Flash, Z.ai, OpenRouter, OpenCode, or any external model route.
- Creating API keys or provider credentials.
- Connecting ESSA to OpenRouter.
- Sending ESSA source, secrets, media, memory, user data, or project data externally.
- Treating vendor benchmarks, community screenshots, or viral claims as ESSA Quality History.
- Claiming video editing or rendering as model-native.
- Beginning Phase 21L.

## Capability Boundary

Model capability: text reasoning, coding reasoning, declared tool calling, declared structured output, image input reasoning, and video input reasoning.

Agent harness capability: codebase editing by a host agent, browser use, computer use, workflow orchestration, retries, verification loops, and artifact saving.

External/local tool capability: FFmpeg rendering, ffprobe inspection, local transcription, browser screenshots, deployment tools, filesystem mutation, and publishing.

## Promotion Gates

Before GLM-5.3-Flash can move beyond WATCH/RESEARCH, ESSA needs:

- Fresh live model metadata revalidation.
- Security review of retention, training use, regions, and subprocessors.
- Legal review of direct Z.ai and routed provider terms.
- Provider-route selection policy.
- Pricing and discount revalidation.
- Local dry-run benchmark plan using non-sensitive fixtures.
- Explicit approval for any future provider call.
- Independent or ESSA-controlled benchmark evidence.

## Phase 21K-TS Operating Rules

Technology Scout can detect new models, providers, tools, open-source repositories, pricing changes, terms changes, provider deprecations, breaking changes and capability-gap matches.

Technology Researcher separates official facts, independent evidence, community signals, social claims, conflicts and unknowns.

Technology Verifier checks identity, developer/provider, availability, version/model id, capabilities, license, pricing, API availability, repository authenticity and misleading claims.

ESSA Fit Analyzer maps candidates to Capability Fabric, Intelligence Fabric, Provider Health, Quality History, Product Knowledge and known gaps.

Technology Intelligence can prepare review items, digests, audit artifacts and future benchmark handoffs. It cannot perform live adoption.

