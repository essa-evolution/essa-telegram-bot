# ESSA Business Acquisition & Instant Demo Engine

This document defines the Phase A and Phase B local architecture for ESSA Business acquisition. It is a pre-business layer: prospects, opportunity audits, demo concepts and acquisition offers remain separate from verified Business Profiles and Business Workspaces until acceptance and ownership verification.

## Phase B: Context-Aware Demo Planning

Phase B adds a canonical `DemoRecommendation` and `DemoPlan` layer between opportunity scoring and any future generated preview:

`BusinessProspect -> DigitalOpportunityAudit -> OpportunityScore -> DemoRecommendation -> DemoPlan -> GeneratedPreview (future) -> ClientAcceptance -> CommercialBoundary -> ProductionProject / BusinessWorkspace`

`DemoPlan` is a non-executing contract. It answers what ESSA should show, why that demo is appropriate, which public evidence supports it, which capabilities would be required later, which assumptions are present, what is missing, and which gates block generation or production handoff.

The principle is `SHOW, DON'T EXPLAIN`, but the smallest useful demo wins. ESSA does not blindly create a website concept for every prospect.

### Bounded Demo Type Registry

Current Phase B demo types:

- `HOMEPAGE_CONCEPT`
- `SERVICE_LANDING_PREVIEW`
- `CATALOG_PREVIEW`
- `STOREFRONT_PREVIEW`
- `BOOKING_FLOW_PREVIEW`
- `MENU_ORDER_PREVIEW`
- `PROJECT_PORTFOLIO_PREVIEW`
- `DEVELOPER_PROJECT_PREVIEW`
- `LEAD_CAPTURE_PREVIEW`
- `CONTENT_CREATIVE_PREVIEW`
- `BUSINESS_DASHBOARD_PREVIEW`

Each type maps to existing ESSA capability contracts such as `WEBSITE_GENERATE`, `CREATIVE_BRIEF`, `BUSINESS_ANALYZE`, `PROPERTY_PRESENTATION`, `INVESTMENT_PACKAGE`, `BROWSER_OBSERVE`, and `UI_VERIFY`. Provider requirements are recorded as future eligibility metadata only.

### Selection Logic

Selection is deterministic and evidence-aware:

- restaurant/cafe + menu/order opportunity -> `MENU_ORDER_PREVIEW`
- hotel/hospitality + missing booking journey -> `BOOKING_FLOW_PREVIEW`
- retail/local shop + visible assortment -> `STOREFRONT_PREVIEW` or `CATALOG_PREVIEW`
- construction/developer + visible project opportunity -> `DEVELOPER_PROJECT_PREVIEW` or `PROJECT_PORTFOLIO_PREVIEW`
- service business + clear public service/contact information -> `SERVICE_LANDING_PREVIEW`
- visual business + weak public content presence -> `CONTENT_CREATIVE_PREVIEW`

The planner stores rejected alternatives with reasoning codes instead of hiding them. Ties are resolved by score, priority, then stable demo type order.

### Provenance

Every `DemoPlan` records selected demo, rejected alternatives, observed facts, inferred opportunity codes, evidence refs, source snapshot refs, required/optional capabilities, provider candidates, artifact plans, assumptions, missing inputs, risk class, estimated cost class and approval requirements.

### Generation Boundary

Phase B does not generate previews. `DemoArtifactPlan` may describe a page wireframe/spec, content structure, CTA, visual direction, required images, structured generation brief and preview metadata, but it remains `generated:false`.

Passing the demo-plan gate only allows a plan. `GeneratedPreview`, production handoff, publish, payment, deployment, CRM mutation and BusinessProfile creation remain blocked.

Safety gates require valid source evidence, a non-stale/non-suppressed prospect, score above threshold, evidence-justified demo selection, no prohibited personal/sensitive data, no identity impersonation, no false testimonials/reviews, no fabricated prices/products/services, known cost class, known approval requirements and `executionEnabled:false`.

## Phase C: Local Generated Preview Engine

Phase C creates the first local `GeneratedPreview` layer:

`BusinessProspect -> OpportunityAssessment -> DemoPlan -> PreviewGenerationRequest -> GeneratedPreview -> PreviewQC -> PREVIEW_READY_FOR_HUMAN_REVIEW`

`PreviewGenerationRequest` is always `LOCAL_ONLY` in Phase C. It records the demo plan, prospect, demo type, allowed artifact types, source/evidence refs, brand inputs, asset inputs, missing-input policy, local cost ceiling, approval state and idempotency key.

`GeneratedPreview` is a local inspectable artifact package. Required defaults:

- `provider: LOCAL`
- `providerModel: NONE`
- `providerCalls: 0`
- `externalCalls: 0`
- `publishAllowed: false`
- `handoffAllowed: false`
- `productionReady: false`
- `commercialUseAllowed: false`
- `watermarkRequired: true`

Supported local preview demo types:

- `SERVICE_LANDING_PREVIEW`
- `CATALOG_PREVIEW`
- `STOREFRONT_PREVIEW`
- `BOOKING_FLOW_PREVIEW`
- `PROJECT_PORTFOLIO_PREVIEW`
- `MENU_ORDER_PREVIEW`
- `LEAD_CAPTURE_PREVIEW`

Each preview package is written under:

`artifacts/business/acquisition-preview/<previewId>/`

Package files:

- `preview.json`
- `index.html`
- `preview.css`
- `audit.json`
- `content-spec.json`
- `navigation-flow.json`

Generated previews use only observed public facts, explicit assumptions and bounded placeholders such as `Price on request`, `Request availability`, `Contact business`, `Demo content`, `Example category` and `Example layout`.

Every rendered HTML preview visibly includes:

- `ESSA DEMO / CONCEPT`
- this is not the official business website
- preview status
- source snapshot date when available
- generated by ESSA Preview Engine

`PreviewQC` checks linkage, evidence refs, source snapshots, unsupported claims, assumptions, personal/sensitive data, demo labels, official-site disclaimers, publish/commercial/production permissions, provider/external/outreach/payment counters, required files and basic HTML structure.

Successful Phase C generation ends only at `PREVIEW_READY_FOR_HUMAN_REVIEW`. It never transitions to `SENT`, `PUBLISHED`, `ACCEPTED`, `PAID`, `ACTIVATING` or `ACTIVE_BUSINESS`.

## Phase D: Human Preview Review and Revision Control

Phase D adds human review and revision control for local `GeneratedPreview` artifacts:

`GeneratedPreview -> PreviewQC -> HumanReview -> APPROVED / REVISION_REQUESTED / REJECTED -> RevisedPreviewVersion if needed -> CLIENT_PREVIEW_READY`

`CLIENT_PREVIEW_READY` means the preview may later be shown to the prospect. It does not send, publish, deploy, transfer source, activate billing, create a `BusinessProfile`, create a production `BusinessWorkspace`, or authorize production use.

### Review Decisions

Supported decisions:

- `APPROVE_FOR_CLIENT_PREVIEW`
- `REQUEST_REVISION`
- `REJECT_PREVIEW`
- `PAUSE_REVIEW`

Production approval is intentionally not supported in Phase D.

### Review State Machine

Allowed transitions:

- `PREVIEW_READY_FOR_HUMAN_REVIEW -> IN_REVIEW -> CLIENT_PREVIEW_READY`
- `PREVIEW_READY_FOR_HUMAN_REVIEW -> IN_REVIEW -> REVISION_REQUESTED -> REVISION_IN_PROGRESS -> PREVIEW_READY_FOR_HUMAN_REVIEW`
- `PREVIEW_READY_FOR_HUMAN_REVIEW -> IN_REVIEW -> REJECTED`

Rejected previews are terminal. A rejected preview cannot become client-shareable without a new valid preview and review path.

### Revision Lineage

Revision never overwrites an existing preview:

`GeneratedPreview v1 -> PreviewReview -> PreviewRevisionRequest -> GeneratedPreview v2`

The revised preview records `parentPreviewId`, `parentVersion`, `revisionRequestId`, `changedSections`, `unchangedSections`, `evidenceDelta`, `assumptionDelta` and `artifactDelta`.

### Review Safety

Human review may approve client preview only if:

- `PreviewQC` is `PASS`, or `PASS_WITH_WARNINGS` is explicitly allowed by review policy
- no sensitive or personal data is present
- factuality checks pass
- `ESSA DEMO / CONCEPT` is visible
- not-official-site notice is visible
- `publishAllowed` remains false
- `productionReady` remains false
- `commercialUseAllowed` remains false
- no outreach, payment, provider, external, publish or production handoff action is attached

Review approval cannot bypass preview generation safety gates and cannot issue execution approval tokens.

### Review Audit

`BusinessAcquisitionPreviewReviewAudit` records preview/version reviewed, reviewer, decision, timestamps, reason codes, comments, requested changes, prior/resulting state, QC snapshot, safety snapshot, permission snapshots before/after decision and zero external-effect counters.

## Phase E: Client Preview Sharing Preparation and Access Boundary

Phase E prepares an approved preview for possible future manual sharing:

`CLIENT_PREVIEW_READY -> SharePreparationRequest -> RecipientEligibilityCheck -> ClientPreviewSharePackage -> ShareAccessPolicy -> MANUAL_SHARE_READY`

Future delivery remains separate:

`MANUAL_SHARE_READY -> explicit human send approval -> delivery provider -> client access`

Approval to show is not approval to send. `CLIENT_PREVIEW_READY` is not `SENT`, and `MANUAL_SHARE_READY` is not `SENT`.

### Recipient Eligibility

Allowed recipient bases in Phase E:

- `VERIFIED_PUBLIC_BUSINESS_CONTACT`
- `EXPLICITLY_AUTHORIZED_BUSINESS_CONTACT`
- `SAFE_BUSINESS_CONTACT_REVIEW_REQUIRED`

Blocked recipient/contact sources include personal/private contacts, opt-outs, blocked recipients, purchased lists, unauthorized enrichment and missing provenance when policy requires it. Suppression overrides commercial opportunity score.

### Share Package

`ClientPreviewSharePackage` locks exactly to `previewId + previewVersion + artifactIntegrityRefs`. It may later be shown only to the eligible recipient under a private, expiring, manual-recipient-only policy.

Required defaults:

- `clientShareAllowed: true` only after valid review and recipient eligibility
- `sendAllowed: false`
- `publicAccessAllowed: false`
- `downloadAllowed: false`
- `sourceTransferAllowed: false`
- `editAllowed: false`
- `productionUseAllowed: false`
- `commercialUseAllowed: false`
- `publishAllowed: false`

### Access Policy

`ShareAccessPolicy` supports `PRIVATE_PREVIEW`, `MANUAL_RECIPIENT_ONLY` and `EXPIRING_ACCESS`. It models future authentication and expiration but does not create public URLs or externally usable access credentials in Phase E.

### Expiration and Revocation

Share packages have bounded lifetime. Expired packages are not access-ready. Revocation is explicit, audited and irreversible for that package. A new package may be created later only through a fresh valid eligibility path.

Supported revocation reasons:

- `PREVIEW_REVISED`
- `FACTUALITY_ISSUE`
- `PROSPECT_SUPPRESSED`
- `CONTACT_OPT_OUT`
- `HUMAN_REVOKED`
- `POLICY_VIOLATION`
- `EXPIRED`

### Share State Machine

Allowed states:

- `DRAFT`
- `ELIGIBILITY_CHECKED`
- `ACCESS_POLICY_READY`
- `MANUAL_SHARE_READY`
- `BLOCKED`
- `REVOKED`
- `EXPIRED`
- `STALE`

`SENT` and `DELIVERED` do not exist in Phase E. Invalid transitions are blocked.

### Share Audit

`ClientPreviewShareAudit` records preparation, package, prospect, locked preview/version, review approval ref, recipient eligibility projection, provenance, suppression check, access policy, expiration, permissions, state transitions, revocation, safety snapshot, artifact integrity refs and zero outbound-action counters. Recipient details are redacted in proof artifacts.

## Phase F: Controlled Delivery Intent

Phase F adds the final local approval boundary before any future delivery execution:

`MANUAL_SHARE_READY -> DeliveryIntentDraft -> MessagePreview -> DeliveryPreflight -> HumanSendApproval -> FinalPreExecutionValidation -> APPROVED_FOR_FUTURE_DELIVERY`

The approval binds to the exact material action: share package, preview id/version, eligible recipient ref, recipient eligibility ref, channel, message fingerprint, artifact integrity refs and access policy ref. A changed message, recipient, channel, preview version, artifact integrity ref, share-package state, recipient eligibility state, suppression state or approval state invalidates the old approval.

### Channel Policy

Phase F models only bounded future delivery channels:

- `EMAIL`: supported for planning, provider required later.
- `WHATSAPP`: planning metadata only, provider required later.
- `TELEGRAM`: planning metadata only, provider required later.
- `BUSINESS_DM`: planning metadata only, provider required later.

Unsupported channels are blocked. No provider integration is active.

### Message Preview and Factuality

`DeliveryMessagePreview` is deterministic and generated locally from verified public prospect context, digital opportunity audit reasoning and the approved share package. It may mention the business name, a bounded opportunity, the existence of an ESSA demo/concept and an invitation to review it.

It blocks fabricated or manipulative claims including guaranteed outcomes, fake urgency, fake prior relationship, fake testimonials, invented metrics, invented discounts, sensitive personal references, impersonation and any claim that the preview is the official website.

### Delivery Preflight

`DeliveryPreflight` revalidates the Phase E share package, preview/review version lock, artifact integrity, recipient eligibility, suppression and opt-out state, channel policy, message factuality and hard boundaries. It returns `PASS`, `PASS_WITH_WARNINGS` or `BLOCKED` and always records zero provider, external, send, outreach, publish, payment and production handoff counters.

### Human Send Approval

`HumanSendApproval` is local architecture metadata for one future execution boundary only. It records who approved, when, expiry, revocation state, action fingerprint and scope. It does not send, publish, create public links, call providers, mutate CRM, accept payment, activate a `BusinessProfile` or create a production `BusinessWorkspace`.

### Execution Layer Integration

Future delivery must connect through the existing execution architecture:

`APPROVED_FOR_FUTURE_DELIVERY -> ExecutionIntent -> ExecutionQueue -> ExecutionGateway -> provider adapter -> Delivery Result`

The Business Acquisition domain decides what action is allowed. The Execution layer decides whether and how that approved action may execute. Future implementation must not bypass `ExecutionGateway`.

## Phase G: Execution Bridge Dry Run

Phase G adds `AcquisitionExecutionBridge` as a small adapter from an approved acquisition delivery action into the existing Agent Tool Layer execution contracts. It does not introduce a Business Acquisition queue, gateway or provider router.

Canonical dry-run path:

`APPROVED_FOR_FUTURE_DELIVERY -> AcquisitionExecutionBridge -> ExecutionIntent -> ExecutionQueue -> ExecutionGateway -> DRY_RUN_GATEWAY_RESULT`

Before creating an `ExecutionIntent`, the bridge re-runs `FinalPreExecutionValidation`. It verifies the human send approval, expiry, revocation, action fingerprint, share package, preview/version, artifact integrity, recipient eligibility, suppression/opt-out state, channel, message fingerprint and no publish/payment/production permissions.

### Capability Mapping

Business Acquisition maps channels to provider-independent capabilities:

- `EMAIL -> EMAIL_DELIVERY`
- `WHATSAPP -> WHATSAPP_DELIVERY`
- `TELEGRAM -> TELEGRAM_DELIVERY`
- `BUSINESS_DM -> BUSINESS_DM_DELIVERY`

If no existing execution tool exposes the required capability, the bridge returns `CAPABILITY_UNAVAILABLE`. Tests may use a dry-run fixture tool consistent with Agent Tool Layer conventions, but production code does not invent an executable communication provider.

### ExecutionIntent Reuse

The bridge builds an existing `ExecutionIntent` through the existing queue/gateway architecture. The intent stores acquisition refs, share package, preview version, action fingerprint, human approval ref, recipient eligibility ref, redacted recipient, artifact integrity refs, channel, message fingerprint and idempotency key. Raw recipient details are not required in proof artifacts.

### Dry-Run Provider Boundary

The dry-run can construct and enqueue an intent, then call `ExecutionGateway`. The gateway returns a decision with `executed: false`. A future provider adapter would connect only after:

`ExecutionGateway -> provider router / adapter boundary -> provider -> DeliveryResult`

Provider selection remains downstream and interchangeable. Business Acquisition knows the required capability, not the vendor.

## Phase H: Communication Capability Boundary

Phase H introduces provider-neutral communication capabilities behind `ExecutionGateway`:

- `EMAIL_DELIVERY`
- `WHATSAPP_DELIVERY`
- `TELEGRAM_DELIVERY`
- `BUSINESS_DM_DELIVERY`

Each capability describes what ESSA needs, not which vendor should perform it. The default capability metadata supports dry run, disables live execution, requires human send approval, requires recipient eligibility and preserves idempotency.

### Communication Request and Result

`CommunicationDeliveryRequest` is built from an existing `ExecutionIntent`. It carries execution-relevant data only: execution intent id, capability type, redacted recipient projection, artifact refs, message fingerprint, action fingerprint, idempotency key, approval ref and metadata. It does not carry vendor names or credentials.

`CommunicationDeliveryResult` is provider-neutral. Phase H may produce only `NOT_EXECUTED` or `DRY_RUN_VALIDATED`. Live states such as accepted, rejected or failed are modeled for future phases but are not emitted by dry-run adapters. `SENT` and `DELIVERED` remain invalid fake proof states.

### Adapter and Routing Boundary

The communication adapter interface is:

`supports(capability) -> validate(request) -> estimateCost(request) -> checkReadiness() -> dryRun(request) -> execute(request)`

In Phase H, `execute()` is disabled. The local adapter `LOCAL_COMMUNICATION_DRY_RUN_ADAPTER` validates request structure, capability, idempotency, approval/action fingerprint presence, no vendor selection and no credential-like values, then returns `DRY_RUN_VALIDATED`.

The provider routing boundary supports deterministic local dry-run selection only. Future routing may consider capability support, provider availability, health, cost, latency, policy, geography, account limits and fallback priority, while preserving the same approved action fingerprint.

### Credential and Cost Boundary

Business Acquisition never sees communication provider credentials. `ExecutionIntent` does not store credentials. Proof artifacts do not contain credentials. Future live credentials may only be resolved downstream at provider adapter execution time after gateway approval. Phase H does not inspect, resolve or print secrets.

Dry-run cost is local and zero. No vendor pricing is fetched and no spend is authorized.

### Future Live Execution Path

Future live delivery may follow:

`ExecutionGateway -> capability resolution -> provider routing -> provider adapter -> external provider call -> provider-neutral DeliveryResult -> execution audit -> acquisition delivery status projection`

Fallback is allowed only between compatible providers for the same capability and exact approved action scope. Changing vendors must not require Business Acquisition domain changes.

Canonical flow:

`DISCOVER -> ANALYZE -> SCORE -> BUILD DEMO -> PERSONALIZE OFFER -> CONTACT -> PREVIEW -> PURCHASE -> ACTIVATE -> GROW`

Phase A implements only the local, no-call foundation through:

- `BusinessProspect`
- `ProspectSource`
- `DigitalOpportunityAudit`
- `OpportunityScore`
- `DemoProject`
- `DemoArtifact`
- `AcquisitionOffer`
- `AcquisitionAuditArtifact`

## Boundary

Before purchase, a demo is only a preview. It is not the full paid deliverable, does not transfer source files, does not hand off a production domain, does not perform expensive integrations, and must not pretend to be an official business website. Demo artifacts must be visibly marked `DEMO / CONCEPT`.

After purchase, the future activation path must require business ownership verification, agreement or payment, and then conversion into the existing ESSA Business workspace model.

## Reuse

Phase A reuses Lead Intelligence for local fixture discovery, public business data normalization, deduplication, verification, ESSA fit, lead qualification and lead scoring. It does not activate live sources, scrape websites, send outreach, mutate CRM records or call model providers.

Phase A also reuses ESSA Business commercial principles: pricing is configurable, not hard-coded, and full implementation is paid. It does not create a canonical Business Offer or Business Profile before activation.

## Safety

- Public business data only.
- No sensitive personal data.
- No good/bad business classification.
- Observed facts stay separate from inferred opportunities.
- No automated outreach.
- No source file transfer before purchase.
- No production domain handoff before purchase.
- No fake official website.
- No Supabase migration or mutation in Phase A.
- No provider/model/payment/publish/deploy actions.

## Smallest Safe Slice

The first implementation creates a local proof from a Lead Intelligence fixture:

`BusinessEntity -> BusinessProspect -> DigitalOpportunityAudit -> OpportunityScore -> DemoProject -> AcquisitionOffer -> AcquisitionAuditArtifact`

The proof verifies that no BusinessProfile is created, no outreach is sent, no external provider is called, and activation is blocked until offer acceptance and ownership verification.
