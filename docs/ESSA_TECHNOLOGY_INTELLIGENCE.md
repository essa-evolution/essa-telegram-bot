# ESSA Technology Intelligence

Phase 21K-TS creates ESSA's canonical Technology Intelligence layer. It prepares continuous technology discovery without autonomous adoption.

Canonical flow:

`DISCOVER -> RESEARCH -> VERIFY -> CLASSIFY -> MAP TO ESSA -> COMPARE -> RISK REVIEW -> RECOMMEND -> HUMAN REVIEW -> FUTURE BENCHMARK -> FUTURE ADOPTION`

## Agents

`ESSA_TECH_SCOUT` detects relevant technology signals: AI models, providers, coding agents, open-source repositories, image/video/voice/music tools, browser/computer-use tools, automation, databases, MCP/connectors, infrastructure, security/testing tools, research tools, CRM/business tools, pricing changes, terms changes, deprecations and breaking API changes.

`ESSA_TECH_RESEARCHER` turns candidates into `TechnologyResearchArtifact` records and separates official facts, independent evidence, community signals, social claims and unknowns.

`ESSA_TECH_VERIFIER` verifies identity, developer/provider, availability, version/model id, capabilities, license, pricing, API availability, repository authenticity, conflicting claims and misleading language.

`ESSA_TECH_FIT_ANALYZER` maps researched candidates to the Capability Fabric, Intelligence Fabric, Provider Registry, Product Knowledge, local stack, costs, known gaps, limitations, Provider Health and Quality History.

None of these roles may install, activate, create keys, call providers, purchase, deploy, publish, mutate canonical providers, mutate the Capability Fabric or send ESSA/user data externally.

## Contracts

The domain lives in `src/technologyIntelligence/`.

Core contracts:

- `TechnologyCandidate`
- `TechnologyResearchArtifact`
- `TechnologyEssaFit`
- `TechnologyComparison`
- `TechnologyReviewItem`
- `TechnologyBenchmarkPlan`
- `TechnologyScanSchedule`
- `TechnologyScanResult`
- `TechnologyDigest`
- `TechnologyIntelligenceAuditArtifact`

Supported technology types include AI models, model providers, agent frameworks, coding agents, open-source tools, image/video/voice/music tools, browser tools, automation, databases, research/search, security, infrastructure, MCP, business tools and other.

## Sources And Trust

Source categories include official provider releases, official documentation, official changelogs, GitHub releases, GitHub search/trending, Hugging Face models, OpenRouter models, npm, PyPI, arXiv/research, reputable tech news, community signals and social signals.

Trust hierarchy:

- `TIER_1_OFFICIAL`
- `TIER_2_INDEPENDENT_TECHNICAL`
- `TIER_3_REPOSITORY_COMMUNITY`
- `TIER_4_SOCIAL_SIGNAL`

Tier 4 may create a candidate. It may not verify a claim.

## Watches

Technology Intelligence supports breaking-change watch, opportunity watch, provider-update watch, cost-change watch and capability-gap watch.

Breaking changes include deprecation, endpoint removal, material price change, SDK major version change, provider terms change, free tier removal and context-limit change.

Opportunities include new free/local models, open-source replacements, cheaper equivalent providers, video/voice/browser/coding capabilities and local inference tools.

Capability-gap watch uses Capability Fabric needs such as `VIDEO_GENERATE` or `VOICE_GENERATE` to prioritize discovery.

## Open-Source Security Gate

A discovered repository cannot move to test/adoption until identity, license, maintainer activity, dependency behavior, install scripts, network behavior, filesystem behavior, secret risk, telemetry, data collection, advisories, supply chain, local storage and platform compatibility are reviewed.

States:

`DISCOVERED -> RESEARCHED -> SECURITY_REVIEW_REQUIRED -> SAFE_FIXTURE_TEST_ALLOWED -> SANDBOX_TEST_ALLOWED -> ADOPTION_REVIEW_REQUIRED -> APPROVED/REJECTED`

Stars are only a signal, never proof of quality.

## Radar And Review

The canonical Tech Radar remains `docs/ESSA_TECH_RADAR.md`. It tracks history, not only current state.

Radar stages:

`DISCOVERED`, `WATCH`, `RESEARCH`, `BENCHMARK_PENDING`, `BENCHMARKED`, `ADOPTION_REVIEW`, `APPROVED`, `ACTIVE`, `DEPRECATED`, `REJECTED`, `ARCHIVED`

Review queue records include why ESSA cares, affected products/capabilities, evidence status, security status, possible benefit/risk, recommendation and next safe action.

Recommendation states:

`IGNORE`, `WATCH`, `RESEARCH`, `SECURITY_REVIEW`, `BENCHMARK`, `ADOPTION_REVIEW`, `ADOPT_FUTURE`, `REJECT`

Only Lisa/human approval can move a candidate toward live adoption.

## Benchmark Handoff

Technology Intelligence does not create a separate benchmark system. It hands candidates to the existing benchmark architecture through `TechnologyBenchmarkPlan`.

Future comparisons may cover model vs model, image provider vs image provider, video provider vs video provider, voice engine vs voice engine, local tool vs cloud provider, and open-source repo vs existing ESSA implementation.

Benchmark results may feed Quality History only after approved execution and verification. Internet claims and vendor benchmarks are not ESSA measured performance.

## Digest And Scheduling

`TechnologyScanSchedule` is scheduling-ready only in Phase 21K-TS. No background job is created.

`TechnologyDigest` prepares bounded user-facing summaries:

- NEW
- IMPORTANT UPDATES
- POTENTIAL SAVINGS
- NEW CAPABILITIES
- BREAKING CHANGES
- WATCH
- RECOMMENDED FOR TEST
- NO ACTION REQUIRED

Alert levels are `INFO`, `WATCH`, `IMPORTANT`, and `URGENT`.

## Privacy And Context

Scouting uses public technology metadata only. It must never send ESSA secrets, source code, user media, customer data, private business data, API keys or credentials to discovered technologies.

`TechnologyResearchContext` includes only selected sources and claims, excluded noise, character/token estimates and trust tiers. It never loads the entire research database for Navigator answers.

## Capability And Product Evolution

Technology Intelligence may propose `CapabilityCandidate` or `ProductOpportunityCandidate`, but cannot mutate Capability Fabric or add products autonomously.

If a future adopted technology enables a real capability, Product Knowledge and Product Education become refresh-required. Phase 21K-TS creates no marketing content for unadopted technology.

## Ox/GLM Example

Phase 21K-OX is the canonical example:

Signal: `OX ALPHA`

Research: alias identified as `GLM-5.3-Flash`

Result: Ox alias archived/historical, GLM candidate `WATCH_RESEARCH_ONLY`, no production activation, no provider call, no Quality History score.

