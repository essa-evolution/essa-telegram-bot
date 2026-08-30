-- ESSA Business Sprint 02 durable V1 foundation.
-- Additive only: creates Business domain tables without deleting existing data.

create table if not exists business_organizations (
  organization_id text primary key,
  owner_user_id uuid not null references auth.users(id),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_organization_memberships (
  membership_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists business_profiles (
  business_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  owner_user_id uuid not null references auth.users(id),
  name text not null,
  industry text,
  business_type text,
  country text,
  region text,
  city text,
  website text,
  social_links jsonb not null default '[]'::jsonb,
  description text,
  products_services jsonb not null default '[]'::jsonb,
  target_audience text,
  current_situation text,
  goals jsonb not null default '[]'::jsonb,
  challenges jsonb not null default '[]'::jsonb,
  preferred_languages jsonb not null default '[]'::jsonb,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_workspaces (
  workspace_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  status text not null default 'ACTIVE',
  assets_metadata jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_intakes (
  intake_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  workspace_id text references business_workspaces(workspace_id),
  intent text not null,
  payload jsonb not null,
  source_refs jsonb not null default '[]'::jsonb,
  completeness text not null default 'PARTIAL',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_artifacts (
  artifact_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  artifact_type text not null check (artifact_type in ('DIAGNOSIS', 'GROWTH_PLAN', 'OFFER')),
  revision integer not null default 1,
  payload jsonb not null,
  status text not null default 'ACTIVE',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_projects (
  project_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  linked_diagnosis_id text,
  linked_growth_plan_id text,
  linked_offer_id text,
  title text not null,
  status text not null,
  goal text,
  tasks jsonb not null default '[]'::jsonb,
  approvals jsonb not null default '[]'::jsonb,
  assets_metadata jsonb not null default '[]'::jsonb,
  activity_events jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_partner_requests (
  partner_request_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  desired_scope text,
  goals jsonb not null default '[]'::jsonb,
  areas_to_delegate jsonb not null default '[]'::jsonb,
  preferred_involvement text,
  current_team text,
  notes text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_commercial_requests (
  commercial_request_id text primary key,
  organization_id text not null references business_organizations(organization_id) on delete cascade,
  business_id text not null references business_profiles(business_id) on delete cascade,
  offer_id text not null,
  requested_by uuid not null references auth.users(id),
  contact_preference text,
  scope jsonb not null default '[]'::jsonb,
  status text not null check (status in ('REQUESTED', 'CONTACT_PENDING', 'CONTACTED', 'ONBOARDING')),
  payment_boundary jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_funnel_events (
  analytics_event_id text primary key,
  organization_id text,
  business_id text,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  privacy_policy jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists business_audit_events (
  event_id text primary key,
  organization_id text not null,
  business_id text,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_profiles_org on business_profiles(organization_id);
create index if not exists idx_business_memberships_user on business_organization_memberships(user_id);
create index if not exists idx_business_artifacts_business on business_artifacts(business_id, artifact_type, created_at desc);
create index if not exists idx_business_projects_business on business_projects(business_id, updated_at desc);
create index if not exists idx_business_audit_business on business_audit_events(business_id, created_at desc);

alter table business_organizations enable row level security;
alter table business_organization_memberships enable row level security;
alter table business_profiles enable row level security;
alter table business_workspaces enable row level security;
alter table business_intakes enable row level security;
alter table business_artifacts enable row level security;
alter table business_projects enable row level security;
alter table business_partner_requests enable row level security;
alter table business_commercial_requests enable row level security;
alter table business_funnel_events enable row level security;
alter table business_audit_events enable row level security;

-- RLS policies should be reviewed in the target Supabase project before launch.
-- The server route also enforces membership and RBAC before read/write.
