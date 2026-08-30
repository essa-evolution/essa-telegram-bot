# ESSA Business V1 Foundation

Sprint 02 turned the Sprint 01 Business proof into a durable, tenant-scoped V1 foundation. Sprint 03 adds the Supabase repository boundary, production fail-closed runtime mode, and RLS policy migration. Sprint 04 adds the commercial activation foundation: approved offer, server-authoritative price, payment request, privileged manual payment confirmation, onboarding, and project activation without external execution. Sprint 05A establishes the canonical Business in Your Pocket architecture locally: full business lifecycle, computed portfolio dashboard, business-scoped management subscriptions, autonomy/risk gates, business health snapshots, and financial/jurisdiction boundaries.

## Canonical Business Model

ESSA Business is a full business lifecycle system plus a continuous AI-management layer.

Canonical lifecycle:

`CREATE -> SET_UP -> LAUNCH -> SELL -> OPERATE -> MONITOR -> OPTIMIZE -> GROW -> SCALE -> VALUE -> SELL_EXIT`

Canonical operating loop:

`SEE -> UNDERSTAND -> RECOMMEND -> APPROVE -> EXECUTE -> MEASURE -> LEARN -> NEXT_ACTION`

Preserved revenue loop:

`CONTENT -> ATTENTION -> OFFER -> CONVERSION -> REVENUE -> ANALYTICS -> LEARNING -> NEXT_CONTENT / NEXT_ACTION`

Portfolio is a computed read model over accessible businesses. Business history is persisted where meaningful: health snapshots, operational metrics, financial operations, management/audit events, and future valuation/readiness history.

Business Management Subscription ownership is business-scoped. One user or organization may own multiple businesses, and each business may independently have its own subscription placeholder, autonomy configuration, integrations, and management state. Future organization or portfolio bundles may group business-level subscriptions, but must not replace business-level ownership.

Autonomy levels:

- `OBSERVE`
- `RECOMMEND`
- `APPROVE_TO_EXECUTE`
- `DELEGATED_AUTOMATION`

Risk levels:

- `LOW`
- `MEDIUM`
- `HIGH`
- `REGULATED`

MVP default is `APPROVE_TO_EXECUTE` for external actions. Delegated automation is allowed only for explicitly authorized low-risk actions. Financial, public, legal, destructive, provider-activation, sensitive integration, contract/signature, outreach, payment/refund, and ad-budget actions require approval by default.

Financial Operations is a domain boundary for revenue, expenses, COGS, margins, cash flow, invoices, payments, receivables/payables, budgets, forecasts, profitability, and unit economics. Regulated accounting/tax reporting requires a jurisdiction adapter or external provider and is not claimed by the core Business layer.

## Launch Surface

- App route: `#business`
- Public entry title: `ESSA BUSINESS`
- Primary CTA: `РАЗВИТЬ МОЙ БИЗНЕС`
- Secondary CTA: `ПЕРЕДАТЬ РАЗВИТИЕ БИЗНЕСА ESSA`

The working V1 flow is: create Business Profile, submit progressive intake, receive evidence-aware Diagnosis, receive Growth Plan, review Commercial Offer, approve offer, configure offer-specific commercial terms, create a persisted payment request, confirm payment through provider verification or privileged manual verification, start onboarding, and activate the project without launching external execution.

## Persistence

The default Business service now uses a durable local JSON repository:

- Default file: `artifacts/business/business-v1-store.json`
- Store kind: `DURABLE_LOCAL_FILE`
- Browser storage for Business records: disabled
- Process restart behavior: store reloads organizations, memberships, profiles, workspaces, intakes, diagnoses, growth plans, offers, payment intents, onboarding records, provider event references, projects, partner requests, commercial requests, analytics events, and audit events.

This is suitable for local/staging proof only. Production should use Supabase and apply:

- `supabase/migrations/20260827_business_v1_foundation.sql`
- `supabase/migrations/20260827_business_v1_rls_policies.sql`
- `supabase/migrations/20260827_business_sprint04_commercial_activation.sql`

## Supabase Schema

The migration is additive and creates:

- `business_organizations`
- `business_organization_memberships`
- `business_profiles`
- `business_workspaces`
- `business_intakes`
- `business_artifacts`
- `business_payment_intents`
- `business_commercial_onboardings`
- `business_payment_provider_events`
- `business_projects`
- `business_partner_requests`
- `business_commercial_requests`
- `business_funnel_events`
- `business_audit_events`

Diagnosis, Growth Plan, and Offer use the generic `business_artifacts` model in the SQL migration with `artifact_type`, `revision`, `status`, tenant IDs, and creator metadata.

Payment and onboarding records store only necessary commercial state, references, status, and metadata. ESSA domain tables do not store full card numbers, CVV, bank credentials, raw provider secrets, or generic password submissions.

## Auth

Business API routes use `createBusinessAuthAdapter`.

When Supabase env is configured, the server verifies `Authorization: Bearer <token>` through Supabase Auth and uses the canonical user ID from the verified session.

Required env:

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` for server verification, or `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- Supabase Auth enabled with project JWT settings
- Business V1 migration applied

If Supabase Auth is absent, production auth is blocked. Local header identity is only a development/test boundary and must not be treated as production authentication.

## Repository Modes

- Local/test: durable JSON repository.
- Supabase/staging/production: Supabase repository adapter.

Production-like mode is requested when `NODE_ENV=production` or `ESSA_BUSINESS_STORE=supabase`. In that mode protected Business API routes fail closed if the active store is still local JSON or Supabase configuration is missing.

The read-only readiness checker is `scripts/checkBusinessSupabaseReadiness.js`. It reports configuration state and required table presence without printing secret values or mutating data.

## Tenancy And RBAC

Canonical relation:

`User -> Membership -> Organization -> Business Profile -> Workspace / Artifacts`

Server-side checks enforce:

- Unauthenticated requests denied.
- Invalid token/session denied.
- A user without membership cannot read another Business.
- `VIEWER` can read but cannot mutate.
- Mutations require `EDITOR` or above.
- Admin actions require `ADMIN` or above.

## Commercial Boundary

Offer approval does not start execution and does not charge payment.

Approval moves the project to `PAYMENT_REQUIRED`. An offer starts as `NOT_PRICED`; an authorized ESSA operator must configure offer-specific commercial terms before a payment request can be created. Supported payment models are `ONE_TIME`, `SETUP_FEE`, `RECURRING`, `SUBSCRIPTION`, `PERFORMANCE_FEE`, `SUCCESS_FEE`, `REVENUE_SHARE`, `TRANSACTION_COMMISSION`, and `CUSTOM`. Supported Sprint 04 currencies are `USD`, `EUR`, and `GEL`.

Payment requests derive amount, currency, and payment model from the persisted approved offer on the server. Client-supplied amount/currency values are ignored for payment creation.

The provider adapter boundary includes `createPaymentIntent`, `getPaymentStatus`, `cancelPayment`, `verifyWebhookEvent`, and `normalizeProviderEvent`. The default adapter returns explicit `NOT_CONFIGURED`; there is no fake checkout and no fake provider success.

Manual payment confirmation requires an authorized ESSA operator/admin role and evidence reference. A business owner/client cannot confirm their own payment. `PAYMENT_CONFIRMED` is required before onboarding and project activation.

Project activation is idempotent and does not launch ads, publish content, contact leads, spend budget, change websites, or call paid AI providers. External execution remains governed by the existing approval/execution architecture.

## Analytics

Privacy-safe funnel events are supported:

- `BUSINESS_HOME_VIEWED`
- `BUSINESS_CREATED`
- `BUSINESS_INTAKE_STARTED`
- `BUSINESS_INTAKE_COMPLETED`
- `DIAGNOSIS_VIEWED`
- `GROWTH_PLAN_VIEWED`
- `OFFER_VIEWED`
- `OFFER_APPROVED`
- `PAYMENT_PAGE_VIEWED`
- `PAYMENT_REQUEST_CREATED`
- `PAYMENT_PENDING`
- `PAYMENT_CONFIRMED`
- `ONBOARDING_STARTED`
- `PROJECT_ACTIVATED`
- `COMMERCIAL_REQUEST_CREATED`
- `BUSINESS_PARTNER_REQUESTED`

Analytics events store route/status/stage only and explicitly exclude raw private metrics, notes, budgets, documents, and strategy payloads.

## Production Blockers

- Apply and review the Sprint 04 additive Supabase migration in the target project.
- Verify Supabase RLS policies in the target project.
- Configure Supabase Auth/JWT environment for server verification.
- Set `ESSA_BUSINESS_STORE=supabase` only after the Supabase repository is active and verified.
- Complete payment provider selection, webhook signature verification details, operational payment policy, and legal review before automated checkout.
- Complete external storage bucket security review before accepting private files.
- Do not claim guaranteed revenue, ROI, leads, or autonomous financial execution.
