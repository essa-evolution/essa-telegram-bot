-- ESSA Business Sprint 03 RLS policies.
-- Additive follow-up to avoid rewriting Sprint 02 migration history.

create or replace function public.essa_business_role_rank(role text)
returns integer
language sql
immutable
as $$
  select case role
    when 'OWNER' then 4
    when 'ADMIN' then 3
    when 'EDITOR' then 2
    when 'VIEWER' then 1
    else 0
  end
$$;

create or replace function public.essa_business_has_org_role(target_organization_id text, minimum_rank integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from business_organization_memberships memberships
    where memberships.organization_id = target_organization_id
      and memberships.user_id = auth.uid()
      and public.essa_business_role_rank(memberships.role) >= minimum_rank
  )
$$;

create or replace function public.essa_business_has_business_role(target_business_id text, minimum_rank integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from business_profiles profiles
    join business_organization_memberships memberships
      on memberships.organization_id = profiles.organization_id
    where profiles.business_id = target_business_id
      and memberships.user_id = auth.uid()
      and public.essa_business_role_rank(memberships.role) >= minimum_rank
  )
$$;

create policy business_organizations_select_member
on business_organizations for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_organizations_insert_self_owner
on business_organizations for insert
with check (owner_user_id = auth.uid());

create policy business_organizations_update_admin
on business_organizations for update
using (public.essa_business_has_org_role(organization_id, 3))
with check (public.essa_business_has_org_role(organization_id, 3));

create policy business_memberships_select_member
on business_organization_memberships for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_memberships_insert_owner_admin
on business_organization_memberships for insert
with check (
  user_id = auth.uid()
  or public.essa_business_has_org_role(organization_id, 3)
);

create policy business_memberships_update_owner_admin
on business_organization_memberships for update
using (public.essa_business_has_org_role(organization_id, 3))
with check (public.essa_business_has_org_role(organization_id, 3));

create policy business_profiles_select_member
on business_profiles for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_profiles_insert_owner
on business_profiles for insert
with check (owner_user_id = auth.uid());

create policy business_profiles_update_editor
on business_profiles for update
using (public.essa_business_has_org_role(organization_id, 2))
with check (public.essa_business_has_org_role(organization_id, 2));

create policy business_workspaces_select_member
on business_workspaces for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_workspaces_insert_editor
on business_workspaces for insert
with check (public.essa_business_has_org_role(organization_id, 2));

create policy business_workspaces_update_editor
on business_workspaces for update
using (public.essa_business_has_org_role(organization_id, 2))
with check (public.essa_business_has_org_role(organization_id, 2));

create policy business_intakes_select_member
on business_intakes for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_intakes_insert_editor
on business_intakes for insert
with check (created_by = auth.uid() and public.essa_business_has_org_role(organization_id, 2));

create policy business_intakes_update_editor
on business_intakes for update
using (public.essa_business_has_org_role(organization_id, 2))
with check (public.essa_business_has_org_role(organization_id, 2));

create policy business_artifacts_select_member
on business_artifacts for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_artifacts_insert_editor
on business_artifacts for insert
with check (created_by = auth.uid() and public.essa_business_has_org_role(organization_id, 2));

create policy business_artifacts_update_editor
on business_artifacts for update
using (public.essa_business_has_org_role(organization_id, 2))
with check (public.essa_business_has_org_role(organization_id, 2));

create policy business_projects_select_member
on business_projects for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_projects_insert_editor
on business_projects for insert
with check (created_by = auth.uid() and public.essa_business_has_org_role(organization_id, 2));

create policy business_projects_update_editor
on business_projects for update
using (public.essa_business_has_org_role(organization_id, 2))
with check (public.essa_business_has_org_role(organization_id, 2));

create policy business_partner_requests_select_member
on business_partner_requests for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_partner_requests_insert_editor
on business_partner_requests for insert
with check (requested_by = auth.uid() and public.essa_business_has_org_role(organization_id, 2));

create policy business_commercial_requests_select_member
on business_commercial_requests for select
using (public.essa_business_has_org_role(organization_id, 1));

create policy business_commercial_requests_insert_admin
on business_commercial_requests for insert
with check (requested_by = auth.uid() and public.essa_business_has_org_role(organization_id, 3));

create policy business_funnel_events_select_admin
on business_funnel_events for select
using (
  organization_id is null
  or public.essa_business_has_org_role(organization_id, 3)
);

create policy business_funnel_events_insert_member
on business_funnel_events for insert
with check (
  actor_user_id = auth.uid()
  and (
    organization_id is null
    or public.essa_business_has_org_role(organization_id, 1)
  )
);

create policy business_audit_events_select_admin
on business_audit_events for select
using (public.essa_business_has_org_role(organization_id, 3));

create policy business_audit_events_insert_member
on business_audit_events for insert
with check (
  actor_user_id = auth.uid()
  and public.essa_business_has_org_role(organization_id, 1)
);
