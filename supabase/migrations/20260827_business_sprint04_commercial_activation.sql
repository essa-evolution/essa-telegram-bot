-- ESSA Business Sprint 04 commercial activation foundation.
-- Additive only: payment/onboarding tables and project commercial links.

alter table business_projects
  add column if not exists linked_payment_intent_id text,
  add column if not exists linked_onboarding_id text,
  add column if not exists commercial_status text,
  add column if not exists onboarding_status text,
  add column if not exists activation_timestamp timestamptz,
  add column if not exists owner_team jsonb not null default '[]'::jsonb,
  add column if not exists next_action text;

create table if not exists business_payment_intents (
  payment_intent_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  offer_id text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('USD', 'EUR', 'GEL')),
  payment_model text not null check (payment_model in (
    'ONE_TIME',
    'SETUP_FEE',
    'RECURRING',
    'SUBSCRIPTION',
    'PERFORMANCE_FEE',
    'SUCCESS_FEE',
    'REVENUE_SHARE',
    'TRANSACTION_COMMISSION',
    'CUSTOM'
  )),
  status text not null check (status in (
    'PAYMENT_REQUIRED',
    'PAYMENT_PENDING',
    'PAYMENT_CONFIRMED',
    'PAYMENT_FAILED',
    'PAYMENT_CANCELLED'
  )),
  provider text not null,
  provider_reference text,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  audit_refs jsonb not null default '[]'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists business_commercial_onboardings (
  onboarding_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  offer_id text not null,
  payment_intent_id text not null references business_payment_intents(payment_intent_id) on delete cascade,
  status text not null check (status in ('NOT_STARTED', 'ONBOARDING', 'PROJECT_ACTIVE')),
  primary_contact text,
  approved_scope jsonb not null default '[]'::jsonb,
  communication_preference text,
  project_owner text,
  missing_client_materials jsonb not null default '[]'::jsonb,
  required_access_list jsonb not null default '[]'::jsonb,
  next_action text,
  onboarding_notes text,
  sensitive_credential_policy jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_intent_id)
);

create table if not exists business_payment_provider_events (
  provider_event_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  payment_intent_id text references business_payment_intents(payment_intent_id) on delete cascade,
  provider text not null,
  event_type text not null,
  event_fingerprint text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (provider, event_fingerprint)
);

create index if not exists idx_business_payment_intents_business
on business_payment_intents(business_id, updated_at desc);

create index if not exists idx_business_payment_intents_offer
on business_payment_intents(offer_id);

create index if not exists idx_business_commercial_onboardings_business
on business_commercial_onboardings(business_id, updated_at desc);

create index if not exists idx_business_payment_provider_events_payment
on business_payment_provider_events(payment_intent_id, received_at desc);

alter table business_payment_intents enable row level security;
alter table business_commercial_onboardings enable row level security;
alter table business_payment_provider_events enable row level security;

create policy business_payment_intents_select_member
on business_payment_intents for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_payment_intents_insert_admin
on business_payment_intents for insert
with check (
  requested_by = auth.uid()
  and public.essa_business_has_org_role(organization_id, 3)
);

create policy business_payment_intents_update_admin
on business_payment_intents for update
using (public.essa_business_has_org_role(organization_id, 3))
with check (public.essa_business_has_org_role(organization_id, 3));

create policy business_commercial_onboardings_select_member
on business_commercial_onboardings for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_commercial_onboardings_insert_admin
on business_commercial_onboardings for insert
with check (
  created_by = auth.uid()
  and public.essa_business_has_org_role(organization_id, 3)
);

create policy business_commercial_onboardings_update_admin
on business_commercial_onboardings for update
using (public.essa_business_has_org_role(organization_id, 3))
with check (public.essa_business_has_org_role(organization_id, 3));

create policy business_payment_provider_events_select_admin
on business_payment_provider_events for select
using (public.essa_business_has_org_role(organization_id, 3));

create policy business_payment_provider_events_insert_admin
on business_payment_provider_events for insert
with check (public.essa_business_has_org_role(organization_id, 3));
