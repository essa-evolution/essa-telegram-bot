# ESSA Creator-First System Principle

Phase 21L-CF canonicalizes Creator-First as an ESSA OS/shared system principle. It is a policy and product-behavior contract only: no execution engine, provider call, payment, publication, deployment, credential, billing or environment change is introduced.

## Fresh Architecture Audit

Existing sources of truth found:

- ESSA Core docs own philosophy, system map, governance and integration approval gates.
- Capability Fabric owns provider-independent capability truth, activation state, risk, cost, approvals, Product Knowledge and Product Education.
- Product Knowledge owns truthful user-facing explanation of products and availability.
- Navigator Product Knowledge Bridge retrieves bounded Product Knowledge and stays read-only.
- Execution Preview and ExecutionIntentDraft/Preflight own prepared inputs, dependency order, cost class, provider requirements, approval points, blockers, rollback and disabled execution guards.
- Agent Tool Layer and ExecutionGateway own execution policy boundaries.
- Intelligence Fabric owns provider-independent routing, local-first/cost policy, provider activation states and context boundaries.
- Business contracts own financial operations, offers, payment request states and business revenue-loop boundaries.
- Production/Lisa profile layers own production modes, media workflow policy, identity protection and publishing gates.
- Content Intelligence owns production measurement, economics, experimentation and learning contracts.
- Technology Intelligence owns tech scouting, claim verification, fit/risk recommendations and no-auto-adoption rules.

Chosen source of truth: `src/systemPrinciples/creatorFirstSystemPrinciple.js`.

Reason: Creator-First is wider than Product Knowledge and wider than any vertical. Product Knowledge can explain it, Core docs can document it, and Preflight/Execution layers can manifest it, but the canonical machine-readable root belongs in one shared ESSA OS system-principle layer.

## Canonical Principle

Principle id: `CREATOR_FIRST_SYSTEM_PRINCIPLE`.

Canonical philosophy:

> Пусть система считает деньги. А Творец создаёт жизнь.

Canonical short product expression:

> ESSA работает. Ты живёшь.

These are not screen-level slogans. They define product behavior: ESSA should reduce avoidable user coordination burden while preserving human authority.

## System Behavior

Creator-First means:

`SYSTEM DOES SYSTEM WORK. HUMAN MAKES HUMAN DECISIONS.`

If an action can be safely, lawfully, reliably and reversibly prepared or performed by ESSA within current permissions and policy, ESSA should prefer doing or preparing it instead of forcing unnecessary manual work on the user.

If human judgment, consent, authority, financial decision, legal responsibility, external-account permission, high-impact action, irreversible action or explicit approval is required, ESSA prepares the context first and brings the human a clear decision.

## Target Interaction Model

Preferred model:

`OBSERVE -> UNDERSTAND -> PREPARE -> EXECUTE WHEN ALLOWED -> REPORT -> LEARN`

Avoided burden model:

`USER SEARCHES -> USER COUNTS -> USER COPIES -> USER CHECKS -> USER TRANSFERS -> USER REMEMBERS -> USER REPEATS`

## Prepare Before Asking

`PREPARE_BEFORE_ASKING` means ESSA should prepare available context before asking for the missing human decision. It should not ask "What do you want to do?" when it already has enough context to prepare bounded options.

The preferred pattern is: checked context, options, cost/risk class where known, missing approvals, reversibility, and one clear decision request.

ESSA must not invent unavailable facts, costs, permissions or provider states.

## Ask Only When Necessary

`DO_NOT_OFFLOAD_SYSTEM_WORK_TO_USER` means ESSA should not ask the user to manually copy known values, recalculate known metrics, repeat existing context, search known project state, reformat information unnecessarily, remember system-owned deadlines/state, compare data the system can compare, or perform repetitive administrative steps that ESSA can safely prepare or execute.

Approval and safety requirements remain unchanged.

## Approval Boundaries

Creator-First does not grant more authority. It makes ESSA prepare more.

Human approval remains authoritative for money, provider activation, payment, publishing, deployment, external account changes, destructive/high-impact actions, legal/policy decisions, rights/consent, irreversible actions and any explicit execution policy gate.

Safe internal and reversible preparation should not become micro-approval spam. Calculating a local total should not need approval; approving ad spend does.

## Automation Principle

ESSA should prefer automation for routine calculations, monitoring, analytics, report generation, repetitive operations, state checks, anomaly detection, content adaptation, safe scheduling preparation, data normalization, deduplication, verification preparation, workflow continuation, reminders/state tracking and operational summaries when existing capability, permission and safety allow it.

Phase 21L-CF marks no architecture-only capability executable.

## Human Value Zone

ESSA should preserve the human role in vision, intent, creative direction, values, taste, ownership, relationships, negotiation where human presence matters, final judgment, risk acceptance, life choices, strategic decisions and creative expression.

## Inheritance

Verticals inherit one root principle id. They may change contextual wording, examples, relevant automation examples and relevant approval examples.

Verticals may not override human authority boundaries, approval policy, safety rules, source-of-truth ownership or Creator-First core semantics.

Examples:

- ESSA Business: "Система ведёт операционку. Владелец создаёт, решает и развивает."
- ESSA Production: "Система производит, измеряет и учится. Автор создаёт."
- ESSA Advertising: "Система анализирует и оптимизирует. Человек определяет направление и границы."
- ESSA Property: "Система сопровождает процессы. Человек владеет, инвестирует и живёт."
- ESSA Publishing: "Система организует производство и распространение. Автор пишет и создаёт."
- ESSA Music Factory: "Система берёт на себя технический pipeline. Музыкант создаёт музыку."
- ESSA Creator Network: "Система координирует инфраструктуру. Создатель создаёт."

These are contextual manifestations, not separate policy definitions.

## UX Implications

Canonical UX implications:

- `SYSTEM_PREPARES_USER_DECIDES`
- `NO_REDUNDANT_INPUT`
- `NO_REDUNDANT_CONTEXT_REQUEST`
- `ACTIONABLE_DECISION_CONTEXT`
- `MINIMIZE_MANUAL_COORDINATION`
- `REPORT_BY_EXCEPTION`
- `PROGRESSIVE_DISCLOSURE`
- `HUMAN_CONTROL_WHERE_MATERIAL`
- `PREPARE_BEFORE_ASKING`
- `DO_NOT_OFFLOAD_SYSTEM_WORK_TO_USER`

## Report By Exception

ESSA should not force users to monitor everything continuously. When safe and permitted, routine state should be monitored by the system and surfaced when there is an anomaly, blocker, opportunity, approval requirement, meaningful change, risk, deadline or decision.

No live monitoring is implemented in this phase.

## Connections

Navigator inherits Creator-First by retrieving bounded Product Knowledge itself, using deterministic tools where available, and surfacing exact approval requirements instead of sending the user to perform system work manually.

Execution Preview and Preflight are direct Creator-First manifestations: they prepare inputs, dependencies, cost class, provider requirements, approvals, blockers, artifacts, verification and rollback while keeping execution disabled.

Future Phase 21M should ask only for missing inputs and present approval context before requesting consent. This phase does not implement 21M.

Business Management inherits `SYSTEM MONITORS -> SYSTEM PREPARES -> OWNER DECIDES WHEN MATERIAL`. Future automation may prepare responses to sales drops, inventory risk, campaign anomalies, cost increases, missed opportunities and cash-flow signals, but no live business action is enabled here.

Production inherits repeatable technical/operational preparation while preserving creative intent, taste, identity and final approvals across `MANUAL`, `ASSISTED` and `AUTONOMOUS_FUTURE` modes.

Content Intelligence and sequential experimentation already express Creator-First by measuring, learning, comparing and preparing recommendations so the creator does not manually analyze large metric sets.

Technology Intelligence expresses Creator-First by discovering and evaluating technology signals and bringing candidate, evidence, impact, risk, recommendation and next safe choice, without auto-adoption.

Intelligence Fabric supports Creator-First by choosing appropriate local/intelligence/tool resources internally. Provider activation, cost and privacy gates remain policy-controlled.

Capability Fabric supports Creator-First by truthfully expressing whether capabilities can prepare, execute locally, use intelligence, require providers, require approvals, require payment or remain architecture-only.

Agents inherit the principle as: "Do the system work. Escalate the human decision." They may not expand permissions, bypass approvals, invent consent, activate providers, purchase services, publish or make irreversible decisions without authority.

## Effort And Burden Contracts

`UserEffortProfile` tracks required human inputs, required human decisions, system preparations, system-executable steps, avoidable manual steps, unavoidable human steps and approval steps.

`ManualBurdenFinding` tracks workflow, step, why it is manual today, available system capability, permission required, automation potential, risk and recommended future state.

## Representative Workflow Audit

- Product Discovery: already handles bounded knowledge search, availability wording and next safe actions; user still states intent and chooses direction; execution approval blocks automation.
- Execution Preflight: already handles inputs, dependencies, cost class, provider requirements, approval points and rollback; user supplies missing inputs and approves material actions.
- Business Management: already models contracts, revenue loop and health snapshots; owner judgment, financial decisions and legal boundaries remain human-controlled.
- Production: already protects Lisa profile, production intent, media workflow policy and publish gates; creative direction and final approvals remain human.
- Content Intelligence: already models content economics, winner detection and recommendations; platform adapters, privacy and publishing block live automation.
- Technology Intelligence: already models candidates, claims, risk and recommendation; install, keys, billing and provider calls remain approval-gated.
- Property: already supports local discovery/passport/intake concepts; ownership, legal review, payment and transaction decisions remain human-controlled.
- Publishing: already supports package planning and format checks; rights, author judgment and publish decisions remain human-controlled.

## Anti-Patterns

Canonical anti-patterns:

- `REDUNDANT_QUESTION`
- `REDUNDANT_INPUT`
- `MANUAL_COPYING`
- `MANUAL_RECALCULATION`
- `MANUAL_STATE_TRACKING`
- `RAW_DATA_DUMP`
- `UNPREPARED_APPROVAL_REQUEST`
- `TOO_MANY_MICRO_APPROVALS`
- `SYSTEM_CAPABILITY_HIDDEN_FROM_USER`
- `USER_FORCED_TO_CHOOSE_PROVIDER`
- `AUTOMATION_WITHOUT_AUTHORITY`

## Product Knowledge And Lisa Guide

Product Knowledge registers `essa_creator_first_system_principle` as a truthful architecture-only explanation node. It points to the shared root principle id and does not claim unsupported automation is already live.

Lisa may explain Creator-First from canonical data: the user should not have to become the operator of many systems; ESSA should gather, count, check and bring the places where human choice matters.

## Localization

The semantic id remains stable. Russian is the canonical expression in this phase, but future culturally appropriate translations can be added without changing the policy identifier.

## Versioning

Contextual wording changes do not create a new core principle. Core semantic changes require a deliberate canonical version update in the shared source of truth.

## Roadmap

Smallest safe next phase: connect future input/approval collection to `CreatorFirstDecision` metadata so ESSA asks only for truly missing inputs and presents prepared approval context before requesting consent.

Rollback path: remove `src/systemPrinciples`, remove the Product Knowledge node `essa_creator_first_system_principle`, remove `scripts/testCreatorFirstSystemPrinciple.js`, and remove this document. No external state exists.
