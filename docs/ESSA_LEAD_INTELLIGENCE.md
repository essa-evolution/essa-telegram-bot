# ESSA Lead Intelligence & Business Discovery

Phase 21J-LI defines a local, architecture-only Lead Intelligence layer for public B2B business discovery. It does not scrape, call providers, harvest personal data, send outreach, mutate CRM data, deploy, bill, or publish.

## Architecture

- `BusinessEntity` is the normalized public business record.
- `LeadDiscoveryRequest` describes market, geography, industries, desired ESSA products, desired capabilities, limits, trace id and data policy.
- `LeadSourceProvider` describes future source adapters by capability and cost class, independent of any specific vendor.
- `BusinessNeedSignal` separates observed facts from inferred opportunity.
- `ESSA_FIT_MATCH` maps verified signals to Product Knowledge, Advertising, Creator Network, Property, Developer and Business paths.
- `LeadIntelligenceAuditArtifact` records counts, lineage, freshness, excluded data and zero external/provider calls.

## Data Policy

Allowed by default: public business data such as company name, category, city, website, public business email, public business phone, public social/directory links and source references.

Conditional future-only: public role contacts, after legal/channel policy activation.

Prohibited: personal data, sensitive personal data, private owner/person profiles, personal mobile harvesting, automated enrichment and any sensitive or inferred private attribute.

## Lifecycle

1. Request: create bounded criteria.
2. Source: local fixture or future approved provider.
3. Normalize: keep business-safe fields only.
4. Deduplicate: merge or flag duplicate listings.
5. Verify: evaluate source count, freshness and evidence.
6. Need signals: mark observed business gaps.
7. Fit match: map to ESSA products/capabilities.
8. Qualify and score: produce transparent review queue.
9. Review: human-visible result only.
10. Outreach: disabled in Phase 21J-LI.

## Product Connections

- ESSA Business: discovery, verification, qualification, scoring and local review.
- ESSA Advertising: campaign opportunity briefs from verified business signals.
- ESSA Creator Network: future BrandOpportunityCandidate briefs, no dispatch.
- ESSA Property/Developer: property/developer-related business discovery and website opportunity signals.
- Product Education & Growth: Lisa can explain the architecture in simple language using verified Product Knowledge, without inventing unavailable features.

## Execution Boundary

Execution Preview can represent `BUSINESS_DISCOVERY` as preview-only. Future live source activation, CRM import, outreach preparation beyond local review, and outreach sending require separate approval and policy activation. `OUTREACH_SEND` is explicitly disabled.

## Rollback

Rollback is a pure removal of `src/leadIntelligence`, Lead Intelligence capability/product knowledge additions, the execution preview template and the local test script. No external state exists to unwind.
