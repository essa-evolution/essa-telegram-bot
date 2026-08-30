# ESSA Property Repository Inventory

Inventory date: 2026-08-20  
Scope: factual repository inventory only. No implementation, migrations, provider calls, external calls, deploys, env changes, payment actions, or production mutations were performed.

## A. Executive Summary

ESSA has a real foundation for Property as a routed product/workflow and as a Capability Fabric product category, but it does not yet have a canonical Property repository.

What exists now:

- A `property` core intent, `Property Agent` selection, and `property_request` workflow are implemented and tested.
- An `ESSA_PROPERTY` product id is implemented in the product-capability map.
- Property-facing capability names exist in the Capability Registry: `PROPERTY_ANALYZE`, `PROPERTY_PRESENTATION`, `INVESTMENT_PACKAGE`, `DEVELOPMENT_CONCEPT`, and `PROPERTY_MARKETING`.
- A workspace task-package prompt exists for property requests.
- Shared infrastructure exists for Capability Registry, Product Knowledge, Product Education & Growth, Navigator Product Knowledge, Execution Preview, Execution Intent Draft/Preflight, Execution Queue, ExecutionGateway, Lead Intelligence, source/freshness tracking, provider-independence policy, and local read-only proof/test patterns.
- Lead Intelligence includes reusable B2B/property-adjacent discovery infrastructure and a fictional construction firm fixture, but it is not a Property entity store or CRM.

What does not exist yet:

- No canonical `Property`, `Listing`, `PropertyPassport`, `Building`, `Unit`, `Ownership`, lifecycle ledger, reservation/stay layer, transaction/order/payment/commission/payout/refund/dispute core, KYC/KYB/signature/legal country adapters, host dashboard, property management API/UI, or property migrations were found.
- No property-specific Product Knowledge nodes or Product Education cards were found.
- No property-specific provider activation or live external search/booking/payment flow is active.

Conclusion: the safest starting point is not a provider or UI sprint. The first sprint should create the canonical local Property model/contracts and fixtures, then connect that model to the existing Capability/Product Knowledge/Navigator fabrics in read-only mode.

## B. Capability Matrix

| Capability | Status | Existing Location | Evidence | Reusable? | Gap | Notes |
|---|---|---|---|---|---|---|
| Property intent routing | TESTED | `src/core/intentRouter.js`, `src/core/agentRouter.js`, `src/core/workflowRouter.js`, `scripts/testEssaCore.js` | Test passed: `нужна квартира в Батуми` -> `property`, `Property Agent`, `property_request`. | Yes | No domain object creation. | Routing only. |
| Property workflow plan | TESTED | `src/connect/executionPlanner.js`, `scripts/testExecutionPlanner.js` | Test passed: `property_request` has `search`, `browser`, `documents`; all `not_started`. | Yes | No execution or repository state. | Plan selects tools such as `perplexity`, `playwright`, `essa_documents`, but execution remains not started. |
| Property workspace task package | IMPLEMENTED | `src/workspace/propertyTaskPackagePrompt.js` | Prompt structure includes goal, location, property type, criteria, budget, documents, risks, specialist questions, action plan. | Yes | Not persisted as canonical entity. | Good first UI/prompt surface after contracts exist. |
| ESSA Property product id | IMPLEMENTED | `src/capabilities/productCapabilityMap.js` | `property: "ESSA_PROPERTY"`. | Yes | Product is mapped, not a data model. | Product map can anchor future Product Knowledge. |
| Property capability taxonomy | IMPLEMENTED | `src/capabilities/capabilityRegistry.js` | `real_estate_development` category includes `PROPERTY_ANALYZE`, `PROPERTY_PRESENTATION`, `INVESTMENT_PACKAGE`, `DEVELOPMENT_CONCEPT`, `PROPERTY_MARKETING`. | Yes | Base capabilities are generic registry records, not executable property logic. | No property-specific overrides found. |
| Product -> Property capability map | IMPLEMENTED | `src/capabilities/productCapabilityMap.js` | `ESSA_PROPERTY` maps to property capabilities plus `BUSINESS_DISCOVERY`, `BUSINESS_ENTITY_VERIFY`, `BUSINESS_NEED_ANALYZE`. | Yes | Does not create product knowledge nodes. | Correct bridge to B2B discovery. |
| Capability contract / availability lifecycle | TESTED | `src/capabilities/capabilityContracts.js`, `src/capabilities/capabilityRegistry.js`, `scripts/testCapabilityFabric.js` | Capability registry test passed with 111 capabilities and zero invalid. | Yes | Not property-specific. | Use this for Property model activation states. |
| Composite capability architecture | TESTED | `src/capabilities/capabilityComposition.js`, `scripts/testCapabilityFabric.js` | Composite plans preserve dependencies, cost class, verification plan, approval points. | Yes | Property composite overrides not yet defined. | Future property composites should not bypass this. |
| Product Knowledge Graph | TESTED | `src/capabilities/productKnowledge.js`, `src/navigator/productKnowledgeBridge.js`, `scripts/testNavigatorProductKnowledge.js` | Bounded discovery and source versions exist. | Yes | No property-specific knowledge nodes. | Add property nodes only after canonical property contracts exist. |
| Product Education & Growth | TESTED | `src/productEducation/*`, `docs/ESSA_PRODUCT_EDUCATION_GROWTH.md`, tests | Product education orchestration, channels, freshness, Creator/Advertising candidates are implemented as non-executing architecture. | Yes | No property-specific education strategy yet. | Includes `REAL_ESTATE` audience profile. |
| Lisa Product Guide | TESTED | `src/capabilities/capabilityKnowledge.js`, `scripts/testCapabilityFabric.js`, `scripts/testNavigatorProductKnowledge.js` | Tests confirm `LISA_ESSA_PRODUCT_GUIDE` cannot mutate Character Core. | Yes | No property-specific verified facts for Lisa to explain yet. | Lisa should explain only verified current Property knowledge. |
| Navigator product discovery | TESTED | `src/navigator/productKnowledgeBridge.js`, `scripts/testCapabilityFabric.js`, `scripts/testNavigatorProductKnowledge.js` | Broad overview and bounded context exist; full catalog is not loaded. | Yes | Property drilldown currently lacks ProductKnowledge nodes. | Handles “Что умеет ESSA?” safely. |
| Lead Intelligence for property/developer partners | TESTED | `src/leadIntelligence/*`, `scripts/testLeadIntelligence.js` | Fixture contains `Batumi Green Builders`; business discovery, verification, fit matching, no outreach, no CRM mutation are tested. | Yes | Not a property inventory, CRM, or partner marketplace. | Useful for developer/partner discovery later. |
| Business/Advertising/Creator bridge | TESTED | `src/leadIntelligence/essaFitMatcher.js`, `src/productEducation/*`, tests | BrandOpportunityCandidate is non-dispatching; Advertising fit is review-only. | Yes | No property-specific briefs or dispatch. | Good future bridge once Property facts exist. |
| Execution Preview | TESTED | `src/capabilities/executionPreview.js`, `scripts/testExecutionPreview.js`, `docs/ESSA_EXECUTION_PREVIEW.md` | Preview is read-only, provider calls 0, payment 0. | Yes | No property-specific preview template. | Use before any future live property action. |
| Execution Intent Draft / Preflight | TESTED | `src/capabilities/executionIntentDraft.js`, `scripts/testExecutionIntentDraftPreflight.js`, `docs/ESSA_EXECUTION_INTENT_PREFLIGHT.md` | Phase 21K explicitly never executes, pays, publishes, scrapes, mutates DB, or dispatches. | Yes | No property-specific intent draft template. | Future Property execution must pass here first. |
| ExecutionQueue | TESTED | `src/agentToolLayer/executionQueue.js`, `scripts/testExecutionIntentQueue.js` | Intent status lifecycle, approval tokens, rollback metadata, provider cannot approve. | Yes | Not a transaction/payment/order ledger. | Reusable safety queue, not business transaction core. |
| ExecutionGateway | TESTED | `src/agentToolLayer/executionGateway.js`, `scripts/testExecutionGateway.js` | Blocks production writes, publish/deploy/security tools, secret-like input, provider overrides, cost reapproval. | Yes | Not property-specific. | Must protect future Property actions. |
| Knowledge DB plumbing | IMPLEMENTED | `src/knowledge/*`, `scripts/checkKnowledgeDb.js`, `index.js` | Supabase client/search/usage logging exists for ESSA documents. | Partly | No property tables/migrations/schema. | Do not reuse as Property DB without new schema. |
| Property canonical entity | PLANNED | None found | Search found no `Property` entity contract/module/table. | No | Missing `Property != Listing` model. | Smallest first build target. |
| Property ID system | PLANNED | None found | No canonical property id/version/source-id scheme found. | No | Missing stable IDs and external source references. | Needed before passports/listings. |
| Property Passport | PLANNED | None found | No `PropertyPassport` contract/module found. | No | Missing source/freshness-backed current property summary. | Should be read-only local first. |
| Listing layer | PLANNED | None found | No listing contract/provider/source normalization found. | No | Missing separate listing snapshots. | Must remain distinct from Property. |
| Buildings / units / projects | PLANNED | None found | No modules for buildings, units, projects, developers as property entities. | No | Missing hierarchy. | Lead Intelligence has business entities only. |
| Ownership / lifecycle ledger | PLANNED | None found | No ownership event ledger or audit event store. | No | Missing immutable property event history. | Critical before transaction workflow. |
| Transaction/order/payment core | PLANNED | None found | Payment terms appear only in gating/preview docs and safety policy. | No | Missing deal/order/payment/commission/payout/refund/dispute model. | ExecutionQueue is not a business transaction ledger. |
| KYC/KYB/signatures/legal adapters | PLANNED | None found | Searches found no country adapters or KYC/KYB/signature flows. | No | Missing legal/professional verification layer. | Must be country-specific and gated. |
| Stay/rental/reservation layer | PLANNED | None found | No availability calendars, bookings, reservations, guest/host dashboard. | No | Missing stay/rental product layer. | Do after Property core. |
| Property management | PLANNED | None found | No maintenance, cleaning, occupancy, host dashboard, management APIs. | No | Missing property operations layer. | Future/deferred. |
| Property UI/API/database | PLANNED | None found | Express app exists, but no property API routes/migrations/tables/UI found. | No | Missing real product surface. | Start with contracts/fixtures before UI. |

Status key: `PLANNED` = absent or future-only; `DOCUMENTED` = described in docs/prompts but no implemented logic; `IMPLEMENTED` = code artifact exists; `TESTED` = relevant local tests pass; `ACTIVE` = live/currently executable user-facing behavior; `BLOCKED` = prevented by missing provider/policy/safety dependency.

## C. Existing Shared Infrastructure

The repository has strong shared infrastructure that should be reused for Property:

- Capability contracts and lifecycle: `src/capabilities/capabilityContracts.js`
  - Availability states: `ARCHITECTURE_ONLY`, `LOCAL_READY`, `PROVIDER_READY`, `READY_FOR_KEY`, `READY_FOR_PAYMENT`, `READY_FOR_ACTIVATION`, `ACTIVE`, `DEGRADED`, `UNAVAILABLE`, `DISABLED`.
  - Cost/risk classes and education/content/demo contracts.
- Capability Registry: `src/capabilities/capabilityRegistry.js`
  - 111 capabilities validated by `scripts/testCapabilityFabric.js`.
  - Provider names are not baked into capability identities.
- Product Capability Map: `src/capabilities/productCapabilityMap.js`
  - `ESSA_PROPERTY` exists and maps to property and business-discovery capabilities.
- Product Knowledge / Product Education:
  - `src/capabilities/productKnowledge.js`
  - `src/capabilities/capabilityKnowledge.js`
  - `src/productEducation/*`
  - `docs/ESSA_PRODUCT_EDUCATION_GROWTH.md`
- Navigator Product Knowledge bridge:
  - `src/navigator/productKnowledgeBridge.js`
  - Supports bounded product overview, capability discovery, availability summary, source versions, stale knowledge handling, and `providerCalls: 0`.
- Execution safety:
  - `src/capabilities/executionPreview.js`
  - `src/capabilities/executionIntentDraft.js`
  - `src/agentToolLayer/executionQueue.js`
  - `src/agentToolLayer/executionGateway.js`
  - Future execution is preflighted, approval-gated, scope-checked, cost-checked, provider-independent, and non-executing in current phases.
- Lead Intelligence:
  - `src/leadIntelligence/*`
  - Reusable for future public business/developer/partner discovery.
  - Explicitly excludes personal/sensitive data, outreach, live scraping, CRM mutation, and external calls.
- Core routing/workflows:
  - `src/core/*`
  - `src/connect/executionPlanner.js`
  - `src/workspace/*`

## D. Property-Specific Existing Infrastructure

The following property-specific or property-adjacent infrastructure exists:

- Core intent and agent:
  - `src/core/agentRouter.js` maps `property` to `Property Agent`.
  - `src/core/intentRouter.js` includes property patterns such as apartment/house/real estate/Batumi/rent/buy housing.
  - `scripts/testEssaCore.js` confirms `нужна квартира в Батуми` routes correctly.
- Workflow:
  - `src/core/workflowRegistry.js` defines `property_request` with steps: `location`, `budget`, `property_type`, `criteria`, `documents`, `next_action`.
  - `src/connect/executionPlanner.js` defines execution planning steps: research, browser source check, documents.
  - `scripts/testExecutionPlanner.js` confirms the plan is `planned`, requires approval, and steps are `not_started`.
- Workspace prompt:
  - `src/workspace/propertyTaskPackagePrompt.js` creates an `ESSA Property Task Package` with task title, goal, location, property type, criteria, budget categories, documents checklist, risks, specialist questions, search/action plan, approval block, next step.
- Capability/Product fabric:
  - `src/capabilities/capabilityRegistry.js` contains real-estate capability names.
  - `src/capabilities/productCapabilityMap.js` maps `ESSA_PROPERTY` to property capabilities and selected lead intelligence capabilities.
  - `src/capabilities/productDiscoveryUi.js` labels `ESSA Property / Real Estate` and describes it as helping with real estate, presentations, investment packages, and concepts.
- Lead/property-adjacent fixture:
  - `src/leadIntelligence/businessDiscovery.js` includes `batumi_builder`, a fictional construction organization for Property/Developer connection tests.

These are routing/catalog/prompt/workflow pieces. They are not a canonical property repository.

## E. Missing Property Capabilities

Missing canonical Property model:

- `Property`
- stable `propertyId`
- external source references
- versioning
- source confidence
- current status
- country/region/city/address normalization
- geo/location model
- media/document references
- availability/freshness metadata

Missing `Property != Listing` separation:

- `Listing`
- listing source/provider
- listing price snapshot
- listing availability snapshot
- listing status
- listing deduplication to canonical Property
- listing stale handling

Missing Property Passport:

- current verified summary
- facts vs inferred fields
- source lineage
- freshness status
- risk flags
- document checklist
- legal/professional verification flags
- public/private field separation

Missing real-estate hierarchy:

- developer/project
- building
- floor
- unit/apartment
- land/parcel
- amenity model
- construction status
- handover timeline
- management/HOA/service fee fields

Missing ownership and lifecycle ledger:

- ownership claim/source events
- listing observed events
- price changed events
- status changed events
- document added/verified events
- reservation/booking events
- transaction/deal events
- immutable audit/event store

Missing transaction core:

- deal/order model
- buyer/seller/broker/partner roles
- quote/offer/reservation/deposit/payment/checkout
- commission
- payout
- refund
- dispute
- cancellation
- escrow/payment-provider boundary
- receipt/invoice
- accounting/revenue records

Missing trust/legal layer:

- identity verification
- KYC/KYB
- signatures
- legal document templates
- local country adapters
- tax/compliance disclaimers
- professional review workflow

Missing stay/rental layer:

- host/guest
- stay/rental listing
- availability calendar
- reservation
- booking
- check-in/check-out
- pricing rules
- occupancy
- cleaning/maintenance
- property management dashboard

Missing UI/API/database:

- property routes
- property API endpoints
- property workspace panels
- property database tables/migrations
- property fixtures/tests
- property read-only browser proof

## F. Architecture Conflicts / Duplicates

No direct duplicate Property repository was found.

Potential conflicts to avoid:

- Do not use `ExecutionQueue` as a transaction ledger. It is an approval/execution intent lifecycle, not a commercial order/deal/payment system.
- Do not use Lead Intelligence `BusinessEntity` as a Property entity. It can discover developers, agencies, hotels, or operators, but it cannot represent land/building/unit/listing/passport ownership facts.
- Do not use Product Knowledge as the source of property facts. Product Knowledge explains ESSA products and capabilities; it is not a real-estate data store.
- Do not merge Property and Listing. The canon explicitly requires Property to remain the durable object and Listing to remain a source-specific, time-sensitive presentation/snapshot.
- Do not let Navigator or Lisa invent property availability. They must resolve from verified Property/Product Knowledge/current availability only.
- Do not wire provider search/booking/payment before ExecutionPreview, ExecutionIntentDraft/Preflight, ExecutionQueue, ExecutionGateway, and explicit Lisa approval paths are extended for Property.

## G. Navigator / LISA Assessment

Navigator:

- Existing role: orchestration/navigation/discovery layer.
- Evidence:
  - `src/navigator/productKnowledgeBridge.js` builds bounded Product Discovery responses.
  - It can answer broad product questions without loading the full catalog.
  - It records source versions, freshness, `executionPerformed: false`, and `providerCalls: 0`.
  - `scripts/testCapabilityFabric.js` confirms product search does not load full ESSA catalog.
- Property status:
  - Navigator can mention `ESSA Property` in broad product overview.
  - Navigator can resolve property intent through the core router.
  - Navigator cannot truthfully explain detailed Property features because property Product Knowledge nodes do not exist yet.

Lisa:

- Existing role: human-facing guide, not orchestrator and not a separate marketing persona.
- Evidence:
  - `src/capabilities/capabilityKnowledge.js` defines `LISA_ESSA_PRODUCT_GUIDE`.
  - Tests confirm Lisa Product Guide uses Character Core and may not mutate it.
- Property status:
  - Lisa may explain the current factual state: Property routing/workflow/catalog exists; canonical repository/stays/transactions are not active.
  - Lisa must not say ESSA can currently list, book, sell, verify ownership, run payments, or manage stays.

Navigator/Lisa split should remain:

- Navigator routes, selects bounded context, shows capability/product status, and prepares safe future actions.
- Lisa explains in simple practical language using verified current Product Knowledge and availability.
- Neither layer should become the Property repository.

## H. Transaction Assessment

Transaction core is not implemented.

Existing reusable safety pieces:

- `src/agentToolLayer/executionQueue.js`
  - Intent status lifecycle.
  - Approval tokens.
  - Idempotency keys.
  - Rollback metadata.
  - Provider cannot approve execution.
- `src/agentToolLayer/executionGateway.js`
  - Blocks non-ready intents.
  - Blocks expired intents.
  - Blocks production writes by default.
  - Blocks publish/deploy/security-sensitive tools.
  - Blocks provider override.
  - Blocks secret-like input.
  - Requires cost reapproval if estimate exceeds approval.

Missing transaction components:

- property deal/order/payment entity
- buyer/seller/broker roles
- checkout
- commissions
- payouts
- refunds
- disputes
- invoices/receipts
- payment provider abstraction
- escrow/hold rules
- settlement audit

Classification: `ExecutionQueue` and `ExecutionGateway` are `TESTED` shared safety infrastructure. Property transaction core is `PLANNED`.

## I. Property Passport Assessment

Property Passport is not implemented.

Required future role:

- A read-only, source-labeled, versioned summary of a canonical `Property`.
- Must separate facts from inferences.
- Must include source refs, freshness, confidence, gaps, risk flags, and professional verification requirements.
- Must not be generated from Product Knowledge alone.
- Must be safe for Navigator/Lisa to summarize without inventing unavailable facts.

Reusable infrastructure:

- Capability source/version/freshness patterns.
- Product Education freshness patterns.
- Lead Intelligence audit/source/freshness patterns.
- ExecutionGateway safety model.

Recommended first shape:

- `Property`
- `PropertySourceRef`
- `PropertyFact`
- `PropertyPassport`
- `PropertyPassportAudit`
- local fixtures only
- no provider calls
- no DB migration in first inventory follow-up unless explicitly approved as implementation phase.

## J. Stay / Rental Assessment

Stay/rental is not implemented.

Missing:

- stay listing
- host
- guest
- calendar
- availability rules
- reservation
- booking
- nightly pricing
- fees/taxes
- check-in/check-out
- cancellation/refund
- cleaning/maintenance
- host dashboard
- property management dashboard

Existing related signals:

- Lead Intelligence has `NO_VISIBLE_BOOKING_FLOW` as a public business need signal.
- This is useful for Advertising/Developer/Business discovery, not for actual stay booking.

Classification: stay/rental layer is `PLANNED` and should come after canonical Property and Listing models.

## K. Recommended Starting Point

First implementation sprint, not executed in this inventory:

1. Define local canonical Property contracts only.
   - `Property`
   - `PropertyId`
   - `PropertySourceRef`
   - `PropertyFact`
   - `PropertyListingSnapshot`
   - `PropertyPassport`
   - `PropertyLifecycleEvent`
   - `PropertyAuditArtifact`

2. Add local fixtures and tests only.
   - one apartment/unit
   - one building/project
   - one developer/business bridge
   - one duplicate listing snapshot
   - one stale listing snapshot
   - one incomplete-evidence property

3. Connect read-only Property Passport builder.
   - input: local fixture facts/listing snapshots
   - output: source-labeled `PropertyPassport`
   - no DB, provider, payment, booking, or external calls

4. Add Product Knowledge node for current truthful ESSA Property state.
   - Explain what is available now: routing/workflow/planning/passport preview if implemented.
   - Explain what is not active: live search, booking, transaction, payment, legal verification.

5. Add Navigator/Lisa read-only explanation.
   - Navigator returns bounded context.
   - Lisa explains the passport/current limitations in plain language.
   - No launch/action button beyond read-only preview or future-preflight.

6. Only after that, consider a second sprint for UI/API.
   - property discovery panel
   - passport view
   - source/freshness badges
   - no live providers until explicitly activated.

Smallest safe next phase name:

`PHASE 22A — ESSA PROPERTY CANONICAL CONTRACTS & LOCAL PASSPORT FIXTURES`

## L. Risks

Truthfulness risk:

- Because `ESSA_PROPERTY` and property capabilities exist in the registry, UI or Lisa copy could accidentally imply real property execution exists. Product Knowledge must explicitly mark property as planning/catalog-only until contracts and current features exist.

Domain conflation risk:

- BusinessEntity, Property, Listing, Developer, Unit, Stay, and Transaction must stay separate. Reusing the wrong entity will create data corruption later.

Legal/financial risk:

- Property recommendations can become regulated advice. Current `propertyTaskPackagePrompt.js` correctly says not to present output as legal, financial, tax, or investment advice and to mark items requiring local professional verification.

Provider activation risk:

- Live property search, maps, real estate portals, payment providers, KYC/KYB, signatures, or booking systems require explicit activation, legal/source review, privacy review, cost review, and ExecutionGateway protection.

Freshness risk:

- Property/listing facts age quickly. Listing snapshots and Property Passport output must carry source timestamps and stale status before they are shown in Navigator/Lisa/Product Education.

Transaction risk:

- The existing ExecutionQueue can approve tool execution, but it cannot substitute for an auditable property deal/payment ledger.

Privacy risk:

- Ownership, tenant, guest, broker, and contact data can become personal data. Lead Intelligence policy patterns should be reused, but property-specific privacy rules are still missing.

Rollback path:

- This inventory added only this markdown report.
- No source code, tests, schemas, providers, env, deployment, payments, or external systems were modified.
- To roll back this inventory artifact only, remove `ESSA_PROPERTY_REPOSITORY_INVENTORY.md`.

Verification performed:

- `node scripts\testEssaCore.js` passed.
- `node scripts\testExecutionPlanner.js` passed.
- `node scripts\testCapabilityFabric.js` passed.
- `node scripts\testLeadIntelligence.js` passed.

External/provider calls:

- Provider calls: 0
- External calls: 0
- Payment actions: 0
- Env/secret changes: 0
- Deploy/publish/social/ads/Creator dispatch: 0
- Database migrations/mutations: 0
