# ESSA Content Intelligence & Revenue Loop

Phase 21L-CR canonicalizes ESSA Production as content-driven growth intelligence:

`CONTENT -> ATTENTION -> OFFER -> CONVERSION -> REVENUE -> ANALYTICS -> LEARNING -> NEXT CONTENT`

This phase is architecture-only. It does not connect social APIs, analytics providers, payment providers, tracking pixels, advertising platforms, publishing systems, scraping, external model calls, or production data mutation.

## Repository Audit

Existing layers reused:

- ESSA Production: `src/productionAgent/` and `src/workspace/productionIntent.js` already define local production safety, tool boundaries, Lisa profile protection, media inspection/edit/verification, and publish approval gates.
- ESSA Business: `src/business/businessContracts.js` already owns `businessRevenueLoop`, offers, payment request states, financial operations boundaries, funnel events, health snapshots, and restricted metric policy.
- Capability Fabric: `src/capabilities/` already owns provider-independent capability identity, availability, product mapping, Product Knowledge, Execution Preview, and architecture-only truth policy.
- Product Education & Growth: `src/productEducation/` already prepares truthful channel briefs, organic growth plans, creator/ad candidates, freshness and Lisa Character Core protection without execution.
- Intelligence Fabric: `src/intelligence/` already owns routing, provider activation states, bounded context policy and Quality History.
- Technology Intelligence: `src/technologyIntelligence/` already owns provider/tool discovery as research only, with no installation, adoption, provider calls or Capability Fabric mutation.
- Agent Tool Layer / Execution Preview: `src/agentToolLayer/` and `src/capabilities/executionPreview.js` already preserve preflight, approval, cost and disabled execution gates.
- Property and Lead Intelligence contain useful attribution/boundary patterns, especially source provenance, no transaction mutation, and privacy-safe public-data constraints.

No duplicate production engine was added. Phase 21L-CR adds a thin `src/contentIntelligence/` contract layer that references those owners.

## Canonical Principle

Views alone are not business success. ESSA must distinguish content performance from business outcome.

A high-view content asset can create little revenue. A lower-view asset can produce higher conversion and revenue. Production optimization therefore supports attention metrics, conversion metrics, economic metrics and learning metrics.

## Content Identity

`ContentAsset` is Production-owned metadata. It includes:

- `contentAssetId`, `brandId`, `campaignId`, `projectId`, `audienceId`
- `topic`, `hook`, `format`, `platform`
- `productionMode`: `HUMAN_CREATOR`, `AI_AVATAR`, `FACELESS`, `HYBRID`
- optional `offerId`, `ctaId`, `funnelId`
- `sourceArtifacts`, `derivedArtifacts`, `version`, `lineage`, `publicationRefsFuture`, `creatorRef`

Original/derived lineage is preserved through `parentContentAssetId`, `rootContentAssetId` and `derivationType`.

## Production Modes

Production is not faceless-only. Mode selection is driven by goal, audience, brand, cost, platform and creative strategy.

Canonical modes:

- `HUMAN_CREATOR`
- `AI_AVATAR`
- `FACELESS`
- `HYBRID`

Operation modes are `MANUAL`, `ASSISTED`, and `AUTONOMOUS_FUTURE`. Autonomous future still requires policy, budget, platform permissions, publish approvals, rollback where possible and audit.

## Attention Metrics

Canonical attention metrics include impressions, views, watch time, average watch time, retention curve, completion rate, rewatches, saves, shares, comments, profile visits and clicks.

Each metric carries availability:

- `AVAILABLE`
- `UNAVAILABLE`
- `ESTIMATED`
- `UNKNOWN`

Platform adapters map provider-specific metrics into canonical metrics. No platform is hard-coded as the architecture.

## Offers

Offer truth remains in ESSA Business. Production stores only offer references.

`OfferReference` contains `offerId`, `businessId`, product/service ref, audience, promise, future price, destination, CTA, funnel ref, availability and version.

Production may create `NON_COMMERCIAL_CONTENT`; revenue attribution is not forced onto every content asset.

## Conversion

Provider-independent conversion events:

`VIEW`, `CLICK`, `LANDING_VISIT`, `LEAD`, `REGISTRATION`, `BOOKING`, `CHECKOUT_START`, `PURCHASE`, `SUBSCRIPTION`, `OTHER_CONVERSION`

Each `ConversionEvent` supports event id, timestamp, content asset id, campaign id, offer id, channel, funnel step, anonymous or future user ref, future value/currency, source provenance and privacy metadata.

No user tracking is implemented in this phase.

## Attribution

`AttributionRecord` maps content touchpoints to conversion outcomes with explicit evidence and confidence. Supported models:

`FIRST_TOUCH`, `LAST_TOUCH`, `LINEAR`, `POSITION_BASED`, `DATA_DRIVEN_FUTURE`, `UNKNOWN`

Attribution is not exact when evidence is incomplete.

## Revenue

Canonical relationship:

`ContentAsset -> Conversion -> Transaction -> Revenue`

Revenue evidence states:

- `REPORTED_REVENUE`
- `ATTRIBUTED_REVENUE`
- `ESTIMATED_REVENUE`
- `UNKNOWN_REVENUE`

Production never invents revenue. Transaction truth remains outside Production, in Business/Transaction/payment-provider boundaries.

## Content Economics

`ContentEconomicsRecord` prepares:

- costs: production, distribution, total
- outcomes: impressions, views, clicks, leads, customers, attributed revenue
- metrics: cost per asset, CPM, CPC, CPL, cost per customer, revenue per asset, revenue per thousand views, ROI, ROAS
- confidence and completeness

Metrics are calculated only from present evidence. Missing data remains missing.

## Learning

`ContentLearningObservation` keeps input dimensions and outcomes separated. Dimensions may include hook, topic, script structure, duration, voice, production mode, visual style, editing rhythm, music, CTA, platform, posting time, audience and offer.

`ContentPatternInsight` separates:

- `OBSERVED`
- `CORRELATED`
- `HYPOTHESIS`
- `VALIDATED`

Correlation is not treated as causation.

Lisa content learning is scoped to format, packaging, distribution and content strategy. Metrics cannot rewrite Lisa Character Core, identity, worldview or voice principles.

## Next Content Loop

Canonical loop:

`CREATE -> PUBLISH -> OBSERVE -> MEASURE -> ATTRIBUTE -> LEARN -> ADAPT -> NEXT CONTENT`

`NextContentRecommendation` may recommend hook style, duration range, format, CTA style, platform, objective, audience and production mode. It cannot auto-generate or publish content in this phase.

## Experiments

`ContentExperiment` captures hypothesis, variants, controlled variables, success metric, business metric, future dates, result and confidence. Learning cannot claim patterns without sufficient evidence.

## Content Variant & Sequential Experimentation Engine

Phase 21L-CR.1 makes controlled content variant experimentation explicit inside the existing Content Intelligence architecture. It does not create a second engine.

Canonical flow:

`MASTER CONTENT -> HYPOTHESIS -> VARIANTS -> CONTROLLED EXPERIMENT -> MEASUREMENT -> GOAL-AWARE WINNER DETECTION -> SIGNAL EXTRACTION -> NEXT GENERATION -> LEARNING`

Master content uses existing `ContentAsset` with role metadata such as `MASTER`, `VARIANT` or `DERIVED`. Master content is never overwritten.

`ContentVariant` records `variantId`, `masterContentAssetId`, optional parent variant, experiment/generation ids, derived content asset ref, label, explicit `VariantChangeSet`, hypothesis ref, audience/platform/offer/campaign refs, lineage and status. Every variant must preserve lineage to the master content asset; orphan variants are invalid for future execution.

`VariantChangeSet` records exactly what changed. Supported dimensions include hook, first frame, title, duration, script structure, pacing, editing style, captions, subtitle style, music, voice, visual style, CTA, thumbnail, description, format, platform adaptation and other.

Variant metadata distinguishes `SINGLE_VARIABLE` from `MULTI_VARIABLE`. Multi-variable variants reduce causal confidence. If hook, music and CTA all change, ESSA may record an observed difference, but it must not claim the hook caused the result.

`ExperimentVariantSet` groups a generation of related variants with master id, hypothesis, variants, controlled variables, changed variables, audience/platform/offer/campaign scope, success goal, primary metric, secondary metrics, start state and result state.

Hypotheses use explicit lifecycle states:

- `HYPOTHESIS_PROPOSED`
- `TESTING`
- `SUPPORTED`
- `NOT_SUPPORTED`
- `INCONCLUSIVE`
- `INVALIDATED`

Hypotheses are not upgraded to truth automatically.

`WinnerDetectionResult` is goal-aware. There is no universal best content. A variant may win reach, retention, engagement, follow growth, lead generation, conversion, revenue or ROI and lose another objective. Winner detection derives from the existing goal-aware success policy and can use Content Economics where cost, revenue and ROI evidence exists.

Multiple metric winners are represented by `MetricWinner`. Example: Variant A may win reach, Variant B retention, Variant C purchase conversion. If the campaign goal is revenue, C may be the operational winner.

No-winner states are canonical:

- `NO_CLEAR_WINNER`
- `INSUFFICIENT_DATA`
- `METRICS_CONFLICT`
- `EXPERIMENT_INVALID`
- `RESULT_INCONCLUSIVE`

Sample adequacy is explicit: `SUFFICIENT`, `LIMITED`, `INSUFFICIENT`, `UNKNOWN`. Phase 21L-CR.1 does not invent statistical significance.

`SequentialExperimentPlan` prefers small meaningful generations over dozens of near-duplicate variants:

`GENERATION 1 -> measure -> detect signal -> formulate next hypothesis -> GENERATION 2 -> refine -> continue only while useful`

`NextVariantGenerationRecommendation` records retained elements, variables to explore, variables to hold constant, proposed hypotheses, suggested variant count, strategy, reason and confidence. Strategies are `EXPLORE`, `EXPLOIT` and `BALANCED`. No automatic variant generation is enabled.

Experiment outcomes feed the existing learning flow:

`WinnerDetectionResult -> ContentLearningObservation -> scoped ContentPatternInsight -> NextContentRecommendation`

Learning remains scoped by brand, creator, audience, platform, topic, format, offer, campaign, market, language and time window. ESSA must not generalize "question hooks always work" from one isolated experiment.

Mass variation safety: experimentation is not permission to generate low-value duplicate or spam content. Future enforcement should include max variants per generation, minimum hypothesis quality, minimum change meaningfulness, platform limits, human approval and budget constraints.

Originality and copyright: variants derived from owned or authorized master content are allowed conceptually. Third-party content supports pattern extraction only unless rights are available.

Production-mode compatibility: the same experiment contracts work for `HUMAN_CREATOR`, `AI_AVATAR`, `FACELESS` and `HYBRID`.

Lisa Character Core protection is mandatory. Experiment results may optimize hook, duration, editing, format, distribution, CTA and packaging. They may not rewrite Lisa Character Core, worldview, voice principles, ethical boundaries or identity.

Quality and human review override performance. A high-performing variant may become `PERFORMANCE_WINNER` and still be `QUALITY_REJECTED`. Future human decisions include `ACCEPT_WINNER`, `ACCEPT_ALTERNATIVE`, `REJECT_RESULT`, `CONTINUE_TESTING` and `STOP_EXPERIMENT`.

`PlatformExperimentAdapter` keeps the core platform-independent. Future adapters may map Instagram Trial Reels, TikTok experimentation, YouTube Shorts testing, ad creative testing or other platforms into canonical experiment contracts. External services such as Buzzfy are future provider/tool candidates, not architectural dependencies, and should be classified through Technology Intelligence before any adoption.

`ContentExperimentAuditArtifact` records experiment id, generation id, master id, variant ids, change sets, hypothesis, goal, metrics, winner decision, confidence, data completeness, sample adequacy, learning handoff, next-generation recommendation, provider calls, external calls, publish actions and timestamp.

## Viral Patterns

`ViralPatternObservation` supports structural pattern extraction across hook, story, visual, editing, retention, CTA, comments and trend lifecycle.

ESSA extracts principles. ESSA must not copy, clone or launder copyrighted third-party content.

## Faceless Channel Factory

Architecture-only capability: `FACELESS_CHANNEL_FACTORY`

Pipeline:

`Research -> Ideas -> Scripts -> Voice -> Visuals -> Editing -> Captions -> Thumbnail -> Metadata -> QA -> Approval -> Scheduling -> Publishing -> Analytics -> Learning`

Future modes: `MANUAL`, `ASSISTED`, `AUTONOMOUS`. Autonomous mode inherits approval and policy rules. No autonomous publishing is implemented now.

## Goal-Aware Metrics

Content goals include awareness, engagement, education, trust, lead generation, conversion, revenue, retention, community, product discovery, brand building and organic growth.

Success policy is objective-driven:

- awareness: reach, views, completion
- education: retention, saves, downstream discovery
- lead generation: clicks, leads, qualified leads
- revenue: purchase, attributed revenue, ROI
- community: meaningful engagement, returning audience

Not all content is evaluated by revenue.

## Reports

`ContentIntelligenceReport` combines attention, conversion, economic performance, audience signals, creative signals, offer/funnel performance, learning observations, pattern insights, confidence, completeness and next recommendations.

`CampaignIntelligenceReport` rolls assets up to Advertising-owned campaign intelligence: spend, attention, clicks, leads, sales, revenue, cost, ROI/ROAS, creative patterns and audience patterns.

## Cross-Product Connections

- Advertising owns campaign and distribution logic.
- Production owns content asset and production metadata.
- Business owns goals, offers, target audience and business economics.
- Transaction/revenue truth stays outside Production.
- Attribution maps touchpoints to outcomes.
- Analytics normalizes observations.
- Intelligence creates learning and recommendations.
- Creator Network distribution links `creatorRef`, audience exposure and attribution without executing creator payments.
- Property, Publishing, Music, Business and other verticals provide promoted object/product/service refs.
- Product Knowledge -> Product Education -> Channel Education Brief -> Production, then future results return as Production Analytics -> Product Education Learning.

## Data Completeness

Reports declare `COMPLETE`, `PARTIAL`, `INSUFFICIENT` or `UNKNOWN`. Example: views available, clicks available, purchase attribution unavailable means ESSA cannot claim true ROI.

## Privacy

Architecture supports data minimization, consent requirements, anonymous events where possible, jurisdiction policy, retention policy and user/customer separation. No surveillance architecture or raw user tracking is introduced.

## Capability Fabric

Added architecture-only capabilities:

- `CONTENT_ANALYZE`
- `CONTENT_PERFORMANCE_ANALYZE`
- `CONTENT_ATTRIBUTION`
- `CONTENT_ECONOMICS`
- `CONTENT_LEARN`
- `NEXT_CONTENT_RECOMMEND`
- `CAMPAIGN_INTELLIGENCE`
- `VIRAL_PATTERN_ANALYZE`
- `FACELESS_CHANNEL_BUILD`
- `CONTENT_EXPERIMENT`
- `OFFER_AWARE_CONTENT_PLAN`

These are provider-independent and do not activate providers.

## Product Knowledge

Added truthful Product Knowledge for:

- "Понять, какой контент реально приводит клиентов."
- "Связать ролик с оффером и результатом."
- "Сравнить контент не только по просмотрам."
- "Понять, какие hooks/форматы лучше работают для конкретной аудитории."
- "Создать faceless-медиа pipeline."

All entries remain `ARCHITECTURE_ONLY`.

## Execution Preview

Future preview examples remain non-executing:

- "Создай 30 Shorts для нового продукта."
- "Проанализируй, какие ролики приводят покупателей."
- "Создай faceless-канал."
- "Улучши следующий месяц контента на основе результата прошлого."

Execution Gateway, publishing, payment and provider activation remain disabled until a future approved phase.

## Intelligence And Technology

Deterministic metric normalization/calculation is local. Simple classification may use cheap intelligence in a future phase. Complex pattern/strategy may use stronger intelligence with bounded context. Raw full analytics history should not be sent to powerful models unnecessarily.

Technology Intelligence may discover future social analytics APIs, content-analysis models, video tools and trend-analysis tools, but adoption remains gated. No automatic provider replacement is allowed.

## Audit Artifact

`ContentAnalyticsAuditArtifact` tracks data sources, assets, present/absent metrics, attribution method, economic fields, confidence, learning inputs, generated recommendations, provider calls, external calls, publish actions, transaction mutations and timestamp.

## Implementation Roadmap

1. Canonical `ContentAsset` identity and lineage.
2. Canonical metrics and conversion event model.
3. Offer, CTA and funnel references to Business.
4. Attribution contracts and confidence policy.
5. Content economics with incomplete-data handling.
6. Learning observations and pattern insights.
7. Controlled content variants and sequential experiment generations.
8. Next content and next variant generation recommendations.
9. Faceless Channel Factory planning.
10. Live platform adapters after approval, privacy, consent, terms and provider gating.
11. Transaction/revenue connection through Business/Transaction truth only.

## Rollback

Remove `src/contentIntelligence/`, `scripts/testContentIntelligenceRevenueLoop.js`, `scripts/testContentVariantSequentialExperimentation.js`, the Phase 21L-CR / 21L-CR.1 entries in `src/capabilities/capabilityRegistry.js`, `src/capabilities/productCapabilityMap.js`, `src/capabilities/productKnowledge.js`, and this document.
