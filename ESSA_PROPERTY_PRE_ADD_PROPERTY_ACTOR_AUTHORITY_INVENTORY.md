# ESSA Property Pre-Add Property Actor / Authority Inventory

Date: 2026-08-22

Scope: factual repository inventory before any Add Property implementation.

Method: local source inspection only. No provider calls, no external calls, no database mutation, no deployment, no environment or payment change, no code/schema/test implementation.

Canonical principle confirmed:

```text
ACTOR -> AUTHORITY -> PROPERTY -> RELATIONSHIP -> INTENT -> WORKFLOW
```

Add Property must not be treated as:

```text
FORM -> SAVE LISTING
```

The future Add Property architecture must be:

```text
ACTOR -> ORGANIZATION -> ROLE / CAPABILITY -> PROPERTY RELATIONSHIP -> AUTHORITY -> PROPERTY -> INTENT -> WORKFLOW -> REVIEW -> CONTROLLED EXECUTION
```

It must not collapse into:

```text
USER ROLE -> FORM -> LISTING
```

## A. Executive Summary

The repository already contains several strong foundations for ESSA Property:

- canonical Property, Listing Snapshot, Property Passport, source reference, fact, lifecycle, developer/project/building/unit/land contracts;
- local Property repository and read service;
- read-only Property discovery, bounded Navigator context, Lisa explanations, Passport and Comparison UI surfaces;
- local source ingestion, normalization, duplicate/conflict handling, quarantine, review console, reviewer decision contracts, case packages, handoff queue, snapshots, restore, rollback, controlled local execution intent, ExecutionGateway protection, and execution history;
- public BusinessEntity/Lead Intelligence contracts that can later support organization discovery and business identity bridging;
- shared execution, approval, provider, cost, permission, context-budget, and documentation-context infrastructure.

The repository does not yet contain a canonical Add Property actor or authority model. In particular, it does not yet define canonical ActorIdentity, Organization, OrganizationMembership, PropertyRelationship, AuthorityGrant, AuthorityEvidence, jurisdiction authority rules, or a private document/access system for ownership and delegation evidence.

The current safe starting point for Add Property is therefore not a UI form. The correct next implementation phase should be local contracts and fixtures for actor, organization, relationship, and authority primitives, wired to existing sourceRefs, evidenceRefs, review workflow, and ExecutionGateway concepts.

## B. Existing Identity Infrastructure

Relevant files:

- `src/identity/identityRegistry.js`
- `src/identity/lisaIdentityProfile.js`
- `src/identity/identityWorkflow.js`
- `02_AGENTS/07_LISA/00_CORE/LISA_MOLIS_IDENTITY.txt`
- `02_AGENTS/07_LISA/00_CORE/LISA_CHARACTER_CORE.md`
- `index.js`

Findings:

- The identity module is primarily a Digital Identity / persona / avatar identity layer.
- `lisaIdentityProfile.js` defines Lisa as `id: "lisa"`, `type: "digital_identity"`, status `draft`, with roles such as ESSA presence, Lisa Avatar, and Voice of ESSA.
- `identityRegistry.js` registers Lisa and a future personal avatar template requiring explicit consent and approved source assets.
- `identityWorkflow.js` supports identity purpose, visual identity, voice identity, personality, reference assets, avatar brief, and identity passport export.
- `index.js` has Telegram/runtime identity primitives: `userId`, `chatId`, `sessionId`, `user_profiles`, `navigator_memory`, and `essa_vocabulary`.

Classification:

- Digital Identity: IMPLEMENTED / DOCUMENTED for persona and media identity.
- Telegram/session user identity: IMPLEMENTED as runtime memory/profile keying.
- Canonical property ActorIdentity: DISCONNECTED / BLOCKED for Add Property.

Conclusion:

Existing identity cannot be reused directly as a property actor model. Lisa identity is a product/persona guide and source-of-truth identity layer, not a buyer, seller, owner, developer, agent, or property manager. Telegram `chatId` and workspace `sessionId` identify runtime interaction context, not legal authority or property relationship.

## C. Existing Organization / Business Infrastructure

Relevant files:

- `src/leadIntelligence/leadContracts.js`
- `src/leadIntelligence/businessEntityNormalizer.js`
- `src/leadIntelligence/businessVerification.js`
- `src/leadIntelligence/leadResearchPolicy.js`
- `src/property/propertyContracts.js`
- `src/property/propertyFixtures.js`

Findings:

- `businessEntityContract` defines public business profile fields: `businessId`, display/legal name, business type, industry, location, website, public email/phone, social profiles, directory profiles, public description, source refs, verification status, and freshness.
- Business normalization rejects unsafe personal/sensitive fields and keeps public-source attribution.
- Business verification is evidence-count/source/freshness oriented. It does not prove legal authority, ownership, or mandate.
- Property has `developerContract` with `developerId`, `displayName`, country/region/city, `businessBridgeId`, `sourceRefs`, and verification status.
- The fixture developer uses `businessBridgeId: "batumi_builder"`, which signals a future bridge between Property developer records and BusinessEntity.

Classification:

- Public business profile: IMPLEMENTED / TESTED for Lead Intelligence.
- Developer hierarchy identity: IMPLEMENTED / TESTED for Property structure.
- Transactional Organization model: DISCONNECTED / BLOCKED.

Conclusion:

BusinessEntity can be reused as a public organization profile, and `developerContract.businessBridgeId` is a useful bridge. It is not enough for Add Property because Add Property needs organizations with members, authority, relationship to property, capabilities, and reviewable delegation.

## D. Existing Role / Permission / RBAC Infrastructure

Relevant files:

- `src/property/propertyReviewerDecision.js`
- `src/property/propertyReviewCasePackage.js`
- `src/property/propertyReviewWorkflow.js`
- `src/agentToolLayer/contracts.js`
- `src/agentToolLayer/executionQueue.js`
- `src/agentToolLayer/executionGateway.js`

Findings:

- Property reviewer roles exist: `PROPERTY_REVIEWER`, `PROPERTY_COMPLIANCE`, `PROPERTY_ADMIN`, and future `LEGAL_SPECIALIST_FUTURE`.
- Reviewer decisions require `reviewerId`, evidence refs, valid decision type, and block provider/AI approval.
- Shared tool contracts define permission classes, read/write scopes, cost classes, approval requirements, rollback metadata, and executable status.
- Execution approval is scoped to tool/action/project/task and approval token.
- ExecutionQueue blocks provider self-approval.
- ExecutionGateway verifies approvals, scope, production access, cost, idempotency, secrets, provider override, and side effects.

Classification:

- Internal review roles: IMPLEMENTED / TESTED.
- Execution permission and approval gates: IMPLEMENTED / TESTED.
- User/org/property-context RBAC: DISCONNECTED / BLOCKED.

Conclusion:

Existing role systems are review and execution controls, not business authority. Add Property must not convert these into flat user roles. `PROPERTY_REVIEWER` can review a submission; it does not mean the reviewer owns, manages, sells, or represents the property.

## E. Existing Property Relationship Infrastructure

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyFixtures.js`
- `src/property/propertyIngestionContracts.js`
- `src/property/propertyIngestionFixtures.js`

Findings:

- Property contract represents canonical property identity and facts.
- Listing Snapshot is separate from Property.
- Developer/project/building/floor/unit/land hierarchy exists.
- Ingestion source types include `OWNER_SUBMISSION`, `DEVELOPER_FEED`, `AGENCY_FEED`, and `PARTNER_FEED`.
- Fixtures include an unverified `OWNERSHIP_STATUS` fact.
- Current facts and source types are evidence/source signals, not Actor-to-Property relationship records.

Classification:

- Property hierarchy: IMPLEMENTED / TESTED.
- Source relationship hints: IMPLEMENTED as ingestion metadata.
- Canonical Actor -> PropertyRelationship: BLOCKED / MISSING.

Conclusion:

Owner submission, agency feed, partner feed, developer feed, and ownership status are not sufficient to represent relationship semantics. Future Add Property needs a distinct PropertyRelationship contract so the same actor can be owner, seller, landlord, host, property manager, developer representative, agency agent, buyer, tenant, investor, guest, or service provider depending on context.

## F. Existing Authority / Delegation Infrastructure

Relevant files:

- `src/property/propertyReviewWorkflow.js`
- `src/property/propertyReviewerDecision.js`
- `src/property/propertyReviewCasePackage.js`
- `src/property/propertyExecutionIntent.js`
- `src/agentToolLayer/executionQueue.js`
- `src/agentToolLayer/executionGateway.js`

Findings:

- Evidence request types include `OWNERSHIP_DOCUMENT` and `AUTHORITY_DOCUMENT`.
- Reviewer decisions require evidence refs.
- Case packages can require ownership evidence, source clarification, legal review, compliance review, or additional documents.
- Execution approval requires explicit local human approval and blocks AI/provider/Navigator/Lisa approval.
- Execution rollback is local and limited to canonical-resolution association.

Classification:

- Authority evidence request placeholder: IMPLEMENTED.
- Execution approval authority: IMPLEMENTED for controlled local execution.
- Property/business/legal authority grant: BLOCKED / MISSING.

Conclusion:

Execution approval is not the same as property authority. A human may approve a local merge without having authority to sell, rent, manage, list, modify, or represent a property. Future Add Property needs `AuthorityGrant` or equivalent, scoped to relationship, property, organization, action, jurisdiction, evidence, time period, and lifecycle status.

## G. Existing Documents / Evidence Infrastructure

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyPassportBuilder.js`
- `src/property/propertyReviewCasePackage.js`
- `src/property/propertyReviewWorkflow.js`
- `workspace/modules/propertyPassportUi.js`
- `workspace/modules/propertyReviewQueueUi.js`
- `workspace/modules/assetsUi.js`
- `src/navigator/toolBroker.js`
- `src/agentToolLayer/documentationContextBridge.js`

Findings:

- Property Passport has `documentChecklist` and `protectedViewMetadata`.
- Property Passport Builder marks location evidence, area evidence, ownership evidence, legal review, and KYC/KYB status.
- Review workflow has evidence request objects and ownership/authority document request types.
- Review case packages store evidence refs and sanitize exports to remove raw payloads, owner text, review notes, env, and secrets.
- Workspace assets can store document-like artifacts for project workflows.
- Agent tool layer has documentation context artifacts for code/provider documentation contexts.

Classification:

- Source refs and evidence refs: IMPLEMENTED / TESTED.
- Property document checklist: IMPLEMENTED / TESTED.
- Private authority/ownership document repository: BLOCKED / MISSING.

Conclusion:

The repository already has evidence references and document checklists, but not a canonical protected document vault for ownership papers, mandates, powers of attorney, agency agreements, company authorization letters, service contracts, KYC/KYB, or jurisdiction-specific evidence.

## H. Existing Verification / Trust / Compliance Infrastructure

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyPassportBuilder.js`
- `src/property/propertyIngestionPipeline.js`
- `src/property/propertyIngestionReview.js`
- `src/property/propertyReviewerDecision.js`
- `src/property/propertyReviewCasePackage.js`
- `src/property/propertyReviewWorkflow.js`
- `src/property/propertyReviewWorkflowSnapshot.js`
- `src/property/propertyExecutionIntent.js`
- `src/property/propertyExecutionHistory.js`
- `src/leadIntelligence/businessVerification.js`
- `src/leadIntelligence/leadResearchPolicy.js`

Findings:

- Property has freshness, confidence, verification, fact status, risk flags, gaps, and lifecycle events.
- Ingestion validates and normalizes local source records and can quarantine invalid records.
- Review case packages preserve source, validation, normalization, identity resolution, conflicts, gaps, decision, audit, provenance, and limitations.
- Review workflow supports assignments, inbox, evidence requests, audit events, snapshots, restore, rollback, and case versions.
- Controlled local execution has preflight, approval, idempotency, rollback, immutable checks, and history.
- Business verification is public-source/freshness/evidence oriented with privacy constraints.

Classification:

- Local property trust pipeline: IMPLEMENTED / TESTED.
- Ownership/legal/KYC/transaction verification: DISCONNECTED / BLOCKED.

Conclusion:

The trust pipeline is a strong foundation, but Add Property still requires authority-aware verification. The current system can say "this record has evidence gaps" or "this local merge is safe"; it cannot yet say "this actor is authorized to list, sell, rent, manage, edit, or order services for this property."

## I. Existing Organization Membership Infrastructure

Relevant files:

- `src/leadIntelligence/leadContracts.js`
- `src/property/propertyReviewWorkflow.js`
- `src/property/propertyReviewerDecisionFixtures.js`

Findings:

- Lead Intelligence can represent a public business entity.
- Review workflow has local reviewer identities such as `reviewer_property_001`, `compliance_local_001`, and `admin_local_001`.
- Reviewer decision fixtures use placeholder reviewer IDs.
- No canonical membership contract was found for actor membership inside a company, developer, agency, property management firm, cleaning company, or partner.

Classification:

- Public business entity: IMPLEMENTED.
- Reviewer placeholder identities: IMPLEMENTED for local review fixtures.
- Organization membership: BLOCKED / MISSING.

Conclusion:

Add Property must introduce or prepare `OrganizationMembership` rather than using reviewer IDs or Telegram user IDs as company membership. Membership should be scoped and evidenced.

## J. Developer Readiness

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyFixtures.js`
- `src/property/propertyIngestionContracts.js`
- `src/property/propertyIngestionFixtures.js`
- `src/property/propertyIngestionPipeline.js`

Findings:

- Developer/project/building/floor/unit/land hierarchy is implemented.
- Developer fixtures have source refs and partial verification.
- Ingestion supports `DEVELOPER_FEED`.
- Deterministic hierarchy matching can resolve project/building/unit records locally.
- There is no developer organization membership or authorized developer representative model.

Classification:

- Developer hierarchy: IMPLEMENTED / TESTED.
- Developer feed as source type: IMPLEMENTED / TESTED.
- Developer actor authority: BLOCKED / MISSING.

Conclusion:

Future developer Add Property flows should not only submit project/unit data. They must resolve the submitting actor, developer organization, membership/capability, authority evidence, project relationship, and review path.

## K. Agency / Agent Readiness

Relevant files:

- `src/property/propertyIngestionContracts.js`
- `src/property/propertyIngestionFixtures.js`
- `src/property/propertyReviewCasePackage.js`

Findings:

- `AGENCY_FEED` exists as a source type.
- Fixture records can carry an agency listing ID.
- Review case packages can preserve source identity, conflicts, evidence gaps, and required reviews.
- There is no Agency organization contract, Agent person contract, agency membership, representation agreement, commission, mandate, or listing authority lifecycle.

Classification:

- Agency as source type: IMPLEMENTED / TESTED.
- Agency/agent authority model: BLOCKED / MISSING.

Conclusion:

Agency Add Property must be relationship- and authority-based. A feed source is not an agent, and an agent is not automatically authorized.

## L. Property Manager Readiness

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyReviewWorkflow.js`

Findings:

- Lifecycle event types include `MANAGEMENT_STARTED`.
- Evidence request types include `AUTHORITY_DOCUMENT`.
- No canonical property manager actor, organization, management contract, service scope, owner authorization, work order, rental authorization, or maintenance authority model was found.

Classification:

- Management lifecycle placeholder: DOCUMENTED / IMPLEMENTED as event enum.
- Property manager authority: BLOCKED / MISSING.

Conclusion:

Property manager is a relationship plus authority scope, not a global role. It may authorize maintenance, guest communication, pricing changes, rental listing, cleaning dispatch, or reporting, but each action needs explicit scope.

## M. Service Provider / Partner Readiness

Relevant files:

- `src/leadIntelligence/leadContracts.js`
- `src/property/propertyIngestionContracts.js`
- `src/agentToolLayer/contracts.js`
- `src/agentToolLayer/registry.js`

Findings:

- Lead Intelligence can describe businesses using public business fields.
- Property ingestion has `PARTNER_FEED`.
- Agent Tool Layer has technical provider/tool concepts.
- No service-provider relationship model exists for companies that perform cleaning, repairs, inspections, photography, valuation, legal services, moving, insurance, or utilities.

Classification:

- Public business profile: IMPLEMENTED.
- Partner feed source type: IMPLEMENTED.
- Service provider / partner actor authority: BLOCKED / MISSING.

Conclusion:

Technical providers and real-world service providers must remain separate. OpenAI, Anthropic, local tools, or property ingestion adapters are execution providers. Cleaning companies, legal offices, agencies, developers, and managers are business/service actors.

## N. Cleaning Company Readiness

Relevant files:

- `src/leadIntelligence/leadContracts.js`
- `src/property/propertyReviewWorkflow.js`
- `src/agentToolLayer/executionGateway.js`

Findings:

- A cleaning company could later be represented as a BusinessEntity/public organization profile.
- Existing workflow/evidence/gateway architecture could later protect cleaning service ordering.
- No cleaning company service catalog, quote, work order, property access permission, owner/manager approval, scheduling, payment, completion proof, complaint, or audit model exists.

Classification:

- Business profile foundation: IMPLEMENTED.
- Cleaning/service workflow: PLANNED / BLOCKED.

Conclusion:

Cleaning company integration should be a later service workflow, not part of basic Add Property. It requires property access authority and controlled execution.

## O. Buyer / Seller / Landlord / Tenant / Guest / Investor / Owner Semantics

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyFixtures.js`
- `src/property/propertyIngestionContracts.js`

Findings:

- Current code has Property, Listing Snapshot, source refs, facts, lifecycle events, and source types.
- It does not define semantic actor roles such as owner, seller, landlord, tenant, buyer, guest, investor, host, or representative.
- `OWNERSHIP_STATUS` is an unverified property fact in fixtures, not a relationship.

Classification:

- Semantic actor roles: BLOCKED / MISSING.

Conclusion:

These concepts should be modeled as contextual relationships and workflow roles, not as global user roles. A person can be owner for one property, buyer in another workflow, landlord for one listing, guest for one stay, and investor in one deal.

## P. Authority Scope / Lifecycle Requirements

Existing partial lifecycle foundations:

- property freshness statuses;
- property verification statuses;
- property fact statuses;
- property lifecycle event types;
- reviewer decision statuses;
- review workflow statuses;
- evidence request statuses;
- execution intent statuses;
- execution approval statuses;
- rollback statuses.

Missing authority lifecycle:

- requested;
- pending evidence;
- pending review;
- active;
- limited;
- expired;
- revoked;
- suspended;
- superseded;
- rejected;
- requires reverification;
- jurisdiction blocked.

Missing authority scopes:

- property scope;
- project/building/unit scope;
- organization scope;
- listing scope;
- transaction scope;
- rent/stay scope;
- service-order scope;
- action scope;
- time scope;
- geography/jurisdiction scope;
- document/evidence scope.

Conclusion:

The repository has lifecycle patterns that can be reused. It does not yet have an authority lifecycle contract.

## Q. Country / Jurisdiction Infrastructure

Relevant files:

- `src/property/propertyContracts.js`
- `src/property/propertyFixtures.js`
- `src/workspace/legalTaskPackagePrompt.js`
- `src/leadIntelligence/leadResearchPolicy.js`
- `16_ESSA_CORE_INTEGRATION_ARCHITECTURE.md`

Findings:

- Property, developer, and business records carry country/region/city.
- Legal task package prompts include jurisdiction as a workflow question.
- Lead research policy requires jurisdictional privacy review before live public-source research.
- Core integration architecture calls out government or official system interactions and external approval gates.
- No jurisdiction-specific Add Property, ownership, agency, mandate, POA, registry, KYC/KYB, tax, tenancy, or listing rules exist.

Classification:

- Location fields: IMPLEMENTED.
- Jurisdiction prompts/policy: DOCUMENTED.
- Jurisdiction authority rules: BLOCKED / MISSING.

Conclusion:

Future Add Property needs a jurisdiction rule layer before real-world authority, listing, rental, transaction, registry, or service actions can become active.

## R. Navigator / Lisa Role In Add Property

Relevant files:

- `src/property/propertyNavigatorBridge.js`
- `src/property/propertyDiscovery.js`
- `src/capabilities/capabilityKnowledge.js`
- `src/capabilities/productKnowledge.js`
- `src/navigator/productKnowledgeBridge.js`
- `docs/ESSA_NAVIGATOR_PRODUCT_KNOWLEDGE.md`

Findings:

- Property Navigator bridge classifies read-only intents and blocks future live actions such as buy, pay, book, sign, live owner verification, maps, legal verification, and transactions.
- Bounded Property Discovery context returns only selected local results, warnings, limitations, counters, and blocked actions.
- Lisa Product Guide uses `LISA_ESSA_PRODUCT_GUIDE`, character core, and verified Product Knowledge.
- Lisa may explain source/freshness/risks/gaps and limitations.
- Lisa may not mutate Character Core or invent unavailable features.
- Lisa cannot approve execution, authority, ownership, provider calls, public actions, payment, booking, transaction, or legal claims.

Classification:

- Bounded read-only property self-description: IMPLEMENTED / TESTED.
- Lisa as product/property guide: IMPLEMENTED / DOCUMENTED.
- Lisa as authority source: DISCONNECTED / BLOCKED.

Conclusion:

In Add Property, Lisa should guide the actor through relationship, evidence, limitations, and next steps. Lisa must not become the source of legal truth or authority.

## S. Workflow Runtime Readiness

Relevant files:

- `src/core/workflowRegistry.js`
- `src/workspace/propertyTaskPackagePrompt.js`
- `src/property/propertyIngestionPipeline.js`
- `src/property/propertyIngestionReview.js`
- `src/property/propertyReviewerDecision.js`
- `src/property/propertyReviewCasePackage.js`
- `src/property/propertyReviewWorkflow.js`
- `src/property/propertyExecutionIntent.js`

Findings:

- Core workflow registry has general workspace workflows including Property.
- Property task package prompt asks for location, budget, property type, criteria, documents, and next action.
- Property ingestion pipeline handles validation, normalization, duplicate resolution, conflict, quarantine, and local repository evidence.
- Review workflow handles handoff queue, assignment, reviewer inbox, evidence requests, audit, bounded context, Lisa explanation, snapshots, and restore.
- Execution intent exists only for one controlled local action: applying a confirmed exact match.

Classification:

- Workflow primitives: IMPLEMENTED / TESTED.
- Add Property composed workflow: PLANNED / BLOCKED.

Conclusion:

Add Property should be a composed workflow:

```text
identify actor
resolve organization
establish membership/capability
declare property relationship
collect authority evidence
identify or create property candidate
create AddPropertyIntent
validate source/evidence
route to review
record reviewer decision
prepare controlled execution only if eligible
```

## T. ExecutionGateway Protection

Relevant files:

- `src/agentToolLayer/contracts.js`
- `src/agentToolLayer/executionQueue.js`
- `src/agentToolLayer/executionGateway.js`
- `src/property/propertyExecutionIntent.js`
- `src/property/propertyExecutionHistory.js`

Findings:

- ExecutionGateway verifies ready status, approval, approval token, cost, scopes, environment, task/project ownership, idempotency, secrets, provider override, and production access.
- ExecutionQueue prevents provider self-approval.
- Property execution currently supports only `APPLY_CONFIRMED_EXACT_MATCH`.
- Property execution explicitly does not mutate ownership, legal status, payments, bookings, publication, source evidence, or listing history.
- Rollback is limited to restoring a previous canonical-resolution association.

Classification:

- Controlled local execution: IMPLEMENTED / TESTED.
- Add Property execution actions: PLANNED / BLOCKED.

Conclusion:

Future Add Property actions must each become a separate intent with preflight, authority check, human approval, idempotency, rollback policy, and ExecutionGateway enforcement. Authority must be checked before action eligibility, not after form submission.

## U. Privacy / Access / Sensitive Data Readiness

Relevant files:

- `src/leadIntelligence/leadResearchPolicy.js`
- `src/property/propertyReviewCasePackage.js`
- `src/property/propertyContracts.js`
- `src/agentToolLayer/contracts.js`
- `12_ESSA_CORE_EXECUTION_ARCHITECTURE.md`
- `16_ESSA_CORE_INTEGRATION_ARCHITECTURE.md`

Findings:

- Lead research policy prohibits personal/sensitive data and requires minimization, public-source constraints, source attribution, and jurisdictional review.
- Review case package sanitization rejects raw payloads, owner text, review notes, env, secrets, Supabase references, and OpenAI API key references from export.
- Property Passport has public and protected metadata fields.
- Execution architecture requires consent, privacy, identity safety, legal limits, external-action controls, payment-action controls, and data sensitivity.

Classification:

- Privacy principles: DOCUMENTED / IMPLEMENTED in partial pipelines.
- Property actor access control: BLOCKED / MISSING.

Conclusion:

Add Property must protect ownership documents, authority documents, private addresses where applicable, contact data, KYC/KYB, financial data, access instructions, tenant/guest data, and service-entry instructions. Existing public BusinessEntity rules are not enough for private property authority data.

## V. Phase 22A-22O Foundation For Add Property

Observed current foundation by phase intent:

- 22A: canonical Property contracts, Passport, Listing separation, lifecycle, source/freshness/confidence fields.
- 22B: read-only Passport UI and property knowledge representation.
- 22C: read-only route and local Playwright proof.
- 22D: property detail navigation and Product Discovery bridge.
- 22E: read-only comparison mode.
- 22F: local repository and read API foundation.
- 22G: read-only discovery and Navigator query path.
- 22H: local source ingestion and normalization foundation.
- 22I: ingestion review console.
- 22J: reviewer decision contracts and audit foundation.
- 22K: review case package and human handoff.
- 22L: reviewer handoff queue and workflow.
- 22M: workflow snapshot, restore, and rollback foundation.
- 22N: first controlled execution intent and local execution proof.
- 22O: execution history, approval inspection, traceability, timeline, and rollback inspection.

Where Add Property plugs in:

```text
before ingestion: actor/org/relationship/authority/evidence intake
during ingestion: source record and normalized property candidate creation
during review: authority-aware case package and reviewer decision
during execution: gated local or future live action only after authority and review
```

Conclusion:

The foundation is strong for evidence, review, and controlled execution. It is not yet an Add Property authority stack.

## W. Conflicts / Duplicate-Risk Analysis

Potential duplication risks:

- Do not reuse Lisa Digital Identity as a property actor.
- Do not treat Telegram `chatId` or workspace `sessionId` as legal actor identity.
- Do not fork BusinessEntity into a separate unrelated organization model without a bridge.
- Do not treat `developerContract` as full Organization; it is a property hierarchy entity.
- Do not use reviewer roles as business roles.
- Do not encode owner/agent/manager/developer representative relationships as loose property facts.
- Do not use ingestion source type as authority proof.
- Do not use reviewer approval or ExecutionGateway approval as proof of authority to sell, rent, manage, or service a property.
- Do not confuse technical providers with real-world partners/service providers.
- Do not create a second evidence/document system if existing `sourceRefs`, `evidenceRefs`, case packages, document checklist, and protected metadata can be generalized.

Conclusion:

The safest architecture is to add missing authority primitives while reusing the existing evidence, review, and execution control layers.

## X. Missing Canonical Models

Models not found as canonical contracts:

- `ActorIdentity`
- `PersonAccount`
- `Organization`
- `OrganizationMembership`
- `ActorCapabilityGrant`
- `PropertyRelationship`
- `AuthorityGrant`
- `AuthorityEvidence`
- `AuthorityDocumentLink`
- `JurisdictionAuthorityRule`
- `AddPropertyIntent`
- `PropertySubmission`
- `ListingAuthority`
- `ServiceProviderProfile`
- `ServiceOffering`
- `ServiceOrder`
- `PropertyAccessPolicy`
- `PrivateDocumentAccessPolicy`
- `KycKybStatus`
- `MandateLifecycle`

Classification:

- All above are PLANNED / BLOCKED until an approved implementation phase.

Conclusion:

These missing models explain why Add Property should not be implemented as a listing form yet.

## Y. Recommended Canonical Architecture

Recommended future local architecture:

```text
ActorIdentity
  -> Organization
  -> OrganizationMembership
  -> ActorCapabilityGrant
  -> PropertyRelationship
  -> AuthorityGrant
  -> AuthorityEvidence / DocumentLink
  -> AddPropertyIntent
  -> SourceRecord / NormalizedPropertyCandidate
  -> ReviewCasePackage
  -> ReviewerDecision
  -> ExecutionIntent
  -> ExecutionGateway
  -> Audit / History / Rollback
```

Reuse:

- `sourceRefs` for source lineage;
- `evidenceRefs` for reviewable claims;
- `documentChecklist` for public/passport-level document status;
- `protectedViewMetadata` for private/sensitive metadata;
- Property review workflow for human handoff;
- reviewer decision rules for non-executing decisions;
- ExecutionQueue and ExecutionGateway for controlled execution;
- BusinessEntity as public organization profile;
- developer/project/building/unit hierarchy for property structure.

Do not reuse:

- Lisa Digital Identity as a property actor;
- reviewer IDs as owner/agent/company membership;
- technical provider registry as real-world partner/service provider registry;
- source types as authority grants;
- execution approval as legal/property authority.

## Z. Smallest Safe First Add Property Phase

Recommended smallest safe next implementation phase:

Phase 22P or 23A: Local Actor / Organization / Relationship / Authority Contracts.

Scope:

- Create local-only contracts and fixtures for ActorIdentity, Organization, OrganizationMembership, PropertyRelationship, AuthorityGrant, AuthorityEvidence, and AddPropertyIntent.
- Map owner, developer representative, agency agent, property manager, and service provider to relationship-plus-authority semantics.
- Add tests proving Add Property cannot proceed when actor, organization, relationship, authority, or evidence is missing.
- Reuse existing sourceRefs/evidenceRefs/review case concepts.
- Do not build live provider ingestion, real listing publication, booking, payment, transaction, ownership verification, KYC/KYB, signatures, external dispatch, or production persistence.

Out of scope for smallest safe phase:

- UI form;
- public listing publication;
- live marketplace search;
- external property portals;
- government registry calls;
- agency/developer API integrations;
- payments;
- bookings;
- contracts/signatures;
- Creator Network dispatch;
- advertising launch;
- production database mutation.

## Required Status Matrix

| Capability / Concept | Status | Existing File / Location | Evidence | Reusable | Missing | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| Lisa Digital Identity | IMPLEMENTED / DOCUMENTED | `src/identity/lisaIdentityProfile.js`, `src/identity/identityRegistry.js` | Lisa profile, identity registry, character core refs | Yes, for Lisa guidance only | Not a property actor | Keep separate from Add Property actor model |
| Telegram / workspace runtime user key | IMPLEMENTED / DISCONNECTED | `index.js` | `userId`, `chatId`, `sessionId`, profile/memory tables | Limited, as session context | Legal identity, authority, org membership | Do not treat as authority |
| Canonical ActorIdentity | BLOCKED | Not found | No actor contract | No | Person/account identity for property context | Add local contract in next phase |
| Public BusinessEntity | IMPLEMENTED / TESTED | `src/leadIntelligence/leadContracts.js` | BusinessEntity fields, normalization, verification | Yes, public org profile | Membership, authority, transactional role | Bridge to future Organization |
| Transactional Organization | BLOCKED | Not found | No Organization contract | No | Org identity, members, authority | Add canonical Organization |
| Developer hierarchy | IMPLEMENTED / TESTED | `src/property/propertyContracts.js`, `src/property/propertyFixtures.js` | Developer/project/building/floor/unit/land contracts | Yes | Developer members/representatives | Keep hierarchy; add org bridge |
| Developer feed | IMPLEMENTED / TESTED | `src/property/propertyIngestionContracts.js` | `DEVELOPER_FEED` source type | Yes, as source type | Submitter authority | Require actor/org/authority |
| Agency feed | IMPLEMENTED / TESTED | `src/property/propertyIngestionContracts.js`, fixtures | `AGENCY_FEED`, agency listing ID | Yes, as evidence/source | Agency org, agent, mandate | Add relationship and mandate model |
| Partner feed | IMPLEMENTED | `src/property/propertyIngestionContracts.js` | `PARTNER_FEED` | Yes, as source type | Partner/service org and authority | Keep separate from technical providers |
| Reviewer roles | IMPLEMENTED / TESTED | `src/property/propertyReviewerDecision.js` | `PROPERTY_REVIEWER`, `PROPERTY_COMPLIANCE`, `PROPERTY_ADMIN` | Yes, review only | Business authority | Do not use as owner/agent roles |
| Execution approval | IMPLEMENTED / TESTED | `src/agentToolLayer/executionQueue.js`, `src/property/propertyExecutionIntent.js` | approval token, local human approval, provider cannot approve | Yes, execution control | Property authority proof | Keep distinct from authority |
| ExecutionGateway | IMPLEMENTED / TESTED | `src/agentToolLayer/executionGateway.js` | preflight/gating/idempotency/scope checks | Yes | Add Property action types | Future actions must pass gateway |
| PropertyRelationship | BLOCKED | Not found | No Actor -> Property model | No | owner/seller/landlord/tenant/manager/etc. | Add canonical relationship contract |
| AuthorityGrant | BLOCKED | Not found | Only evidence requests and execution approval exist | No | mandate, delegation, scope, lifecycle | Add authority contract |
| Authority evidence request | IMPLEMENTED | `src/property/propertyReviewWorkflow.js` | `AUTHORITY_DOCUMENT` evidence type | Yes | Evidence storage/access/validation | Reuse in authority review |
| Ownership evidence request | IMPLEMENTED | `src/property/propertyReviewWorkflow.js` | `OWNERSHIP_DOCUMENT` evidence type | Yes | Ownership verification | Reuse as evidence, not proof |
| Document checklist | IMPLEMENTED / TESTED | `src/property/propertyPassportBuilder.js` | location/area/ownership/legal/KYC checklist | Yes | Protected document repository | Generalize carefully |
| Protected property metadata | DOCUMENTED / PARTIAL | `src/property/propertyContracts.js` | `protectedViewMetadata` | Yes | access policy | Add private access model |
| Review case package | IMPLEMENTED / TESTED | `src/property/propertyReviewCasePackage.js` | source/evidence/conflict/gap/provenance/audit | Yes | authority-aware case fields | Extend in future |
| Handoff queue / reviewer inbox | IMPLEMENTED / TESTED | `src/property/propertyReviewWorkflow.js` | queue item, assignment, inbox, evidence requests | Yes | actor authority assignment | Reuse for Add Property review |
| Snapshot / restore / rollback | IMPLEMENTED / TESTED | `src/property/propertyReviewWorkflowSnapshot.js` | local snapshot and restore foundation | Yes | authority lifecycle rollback | Reuse after extension |
| Property local repository | IMPLEMENTED / TESTED | `src/property/localPropertyRepository.js`, `src/property/propertyReadService.js` | local read APIs and summaries | Yes | write authority for Add Property | Keep read-only until gated |
| Read-only discovery | IMPLEMENTED / TESTED | `src/property/propertyDiscovery.js` | structured query, local results, blocked live actions | Yes | Add Property intake | Keep separate from Add Property |
| Lisa Product Guide | IMPLEMENTED / DOCUMENTED | `src/capabilities/capabilityKnowledge.js`, `src/property/propertyNavigatorBridge.js` | `LISA_ESSA_PRODUCT_GUIDE`, truthful limitations | Yes | authority decisions | Lisa explains; never approves |
| Product Knowledge for Property | IMPLEMENTED / DOCUMENTED | `src/capabilities/productKnowledge.js` | Property local passport preview node/card | Yes | Add Property product education | Update after future capability exists |
| Jurisdiction rules | DOCUMENTED / BLOCKED | `src/workspace/legalTaskPackagePrompt.js`, `src/leadIntelligence/leadResearchPolicy.js` | jurisdiction question/policy | Partial | legal rules by country/action | Add jurisdiction adapter later |
| Service provider / cleaning company | PLANNED / BLOCKED | Not canonical; `BusinessEntity` can help later | No service order contracts | Partial | service profile, work order, access authority | Defer after authority model |
| Buyer/seller/tenant/guest/investor semantics | BLOCKED | Not found | No relationship semantics | No | contextual relationship roles | Add relationship taxonomy |
| Live provider ingestion | DISCONNECTED / BLOCKED | Product knowledge and discovery limitations | explicitly not active | No | provider activation, approvals | Keep disabled |
| Booking/payment/transaction | DISCONNECTED / BLOCKED | Property discovery/product knowledge limitations | explicitly not active | No | legal/payment/provider stack | Future only |
| Ownership/legal/KYC/KYB verification | DISCONNECTED / BLOCKED | Passport checklist and case package limitations | explicitly not active | Partial as checklist | verification providers/rules/review | Future only |

## Add Property Interpretation Rules

Current Add Property must be understood as an authority-aware workflow, not a form:

- "I own this apartment" creates an owner relationship claim requiring evidence.
- "I represent the developer" creates actor -> organization membership and developer representative authority claim.
- "I am an agent" creates agency membership and mandate/authorization claim.
- "I manage this unit" creates property management relationship and scoped authority claim.
- "I want to list this" creates an intent that must be evaluated against authority, property identity, source evidence, review, and execution gates.
- "I want cleaning for this property" is a future service order workflow requiring property access authority and service provider routing.

## Operational Now vs Architecture Only

Operational now in local/read-only or local-proof form:

- Telegram/workspace runtime can identify a chat/session/user key for memory/profile.
- ESSA can describe Property capabilities from Product Knowledge.
- ESSA can parse read-only property discovery queries.
- ESSA can search local repository/demo property records.
- ESSA can open/read a local Property Passport and compare local records.
- ESSA can show source lineage, freshness, risk flags, evidence gaps, and limitations.
- ESSA can run local ingestion fixtures through validation/normalization/review.
- ESSA can create reviewer decisions and case packages locally.
- ESSA can manage a local review queue/inbox and evidence requests.
- ESSA can snapshot/restore local review workflow state.
- ESSA can run a controlled local execution proof for applying a confirmed exact match.
- ESSA can inspect execution history and approval/rollback details.

Ready in architecture but not active as real-world capability:

- Authority document request as evidence workflow.
- Ownership document request as evidence workflow.
- Developer/agency/partner feed source types.
- Review/compliance/legal handoff roles.
- ExecutionGateway protection for future action types.
- Product Knowledge and Lisa explanations for Property limitations.
- BusinessEntity bridge for public organization profile.

Still requires provider activation or external integrations:

- live property search;
- live listing portal imports;
- maps/geocoding;
- government registry checks;
- ownership verification;
- legal verification;
- KYC/KYB;
- signatures;
- payment;
- booking;
- transaction;
- agency/developer/partner APIs;
- service provider dispatch.

Future/deferred:

- actor identity;
- organization membership;
- property relationships;
- authority grants;
- jurisdiction authority rules;
- Add Property UI;
- listing publication;
- Property Stay;
- service orders;
- cleaning company workflows;
- Creator Network dispatch;
- advertising launch.

## Final Confirmation

Phase status for this inventory:

- Code changes: none.
- Schema changes: none.
- Test changes: none.
- Provider calls: none.
- External calls: none.
- Env changes: none.
- Payment changes: none.
- Deploy/publish changes: none.
- Production database mutations: none.

Final Add Property architectural answer:

```text
ACTOR -> ORGANIZATION -> ROLE / CAPABILITY -> PROPERTY RELATIONSHIP -> AUTHORITY -> PROPERTY -> INTENT -> WORKFLOW -> REVIEW -> CONTROLLED EXECUTION
```

The repository is ready for a local, contract-first Add Property authority phase. It is not ready for a production Add Property form that saves listings directly.
