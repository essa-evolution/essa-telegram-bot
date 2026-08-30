# ESSA BUSINESS - SPRINT 04B LIVE SCHEMA CHAIN AUDIT

## A. LIVE BUSINESS SCHEMA STATUS

Live target is reachable, but strict Business schema readiness is not present.

Source of truth for this audit: Supabase JS `GET` / `select(...).limit(0)` probes, not HEAD-only checks.

Result:

- Business V1 tables returned `PGRST205`.
- Sprint 04 commercial tables returned `PGRST205`.
- `public.essa_business_has_org_role` RPC probe returned `PGRST202`.

No live mutation was performed.

## B. REPOSITORY BUSINESS MIGRATION INVENTORY

Repository Business migrations found:

- `supabase/migrations/20260827_business_v1_foundation.sql`
- `supabase/migrations/20260827_business_v1_rls_policies.sql`
- `supabase/migrations/20260827_business_sprint04_commercial_activation.sql`

No other Business Supabase migrations were found.

## C. DEPENDENCY ORDER

Required chain:

1. `20260827_business_v1_foundation.sql`
2. `20260827_business_v1_rls_policies.sql`
3. `20260827_business_sprint04_commercial_activation.sql`

Sprint 04 must not be applied before Sprint 02 foundation and Sprint 03 RLS.

## D. LIVE OBJECTS PRESENT

Confirmed present through strict Business-specific probes:

- None.

The project itself is reachable, but no Business schema object was confirmed present through the strict read-only method.

## E. LIVE OBJECTS MISSING

Missing/not exposed through strict probes:

- `business_organizations`
- `business_organization_memberships`
- `business_memberships`
- `business_profiles`
- `business_workspaces`
- `business_intakes`
- `business_diagnoses`
- `business_growth_plans`
- `business_offers`
- `business_artifacts`
- `business_projects`
- `business_partner_requests`
- `business_commercial_requests`
- `business_funnel_events`
- `business_analytics`
- `business_audit_events`
- `business_payment_intents`
- `business_commercial_onboardings`
- `business_payment_provider_events`
- `public.essa_business_has_org_role`

Repository note: diagnoses, growth plans, and offers are modeled through `business_artifacts`, not separate SQL tables.

## F. PGRST205 ROOT CAUSE

Confirmed root cause: unknown, with strong evidence that Business objects are absent from the PostgREST public schema cache.

Most likely causes:

- Business migrations were never applied to this live project.
- Objects were created in a schema other than `public`.
- PostgREST schema cache/exposure is stale or misconfigured.

Permission/RLS denial is less likely because the error is schema-cache absence (`PGRST205`), not an authorization denial. The RLS helper function probe returned `PGRST202`, meaning the function is also not visible/callable by the REST API.

## G. EARLIEST MISSING MIGRATION

Earliest missing migration:

`supabase/migrations/20260827_business_v1_foundation.sql`

This creates the base Business tables that all later Business migrations depend on.

## H. REQUIRED MIGRATION SEQUENCE

Required live sequence after explicit approval:

1. Foundation: `20260827_business_v1_foundation.sql`
2. RLS: `20260827_business_v1_rls_policies.sql`
3. Commercial activation: `20260827_business_sprint04_commercial_activation.sql`

Do not apply Sprint 04 alone.

## I. DESTRUCTIVE OPERATION SCAN

All three repository Business migrations were scanned for destructive patterns.

No destructive operations found:

- no `DROP`
- no `TRUNCATE`
- no `DELETE FROM`
- no incompatible type rewrite
- no unsafe destructive `ALTER`

Safe-default note:

- Sprint 04 adds `owner_team jsonb not null default '[]'::jsonb`; this has a safe default.
- Other Sprint 04 `business_projects` additions are nullable.

Known duplicate risk:

- RLS migrations use plain `create policy`, not `create policy if not exists`.
- If policies were partially applied manually, reapplying can fail on duplicate policy names.

## J. NON-BUSINESS DATA SAFETY

The Business migrations target only Business-prefixed tables/functions/policies plus references to `auth.users`.

No non-Business ESSA tables are dropped, altered, truncated, or rewritten by these migrations.

Existing non-Business data should remain intact based on SQL text inspection.

## K. BACKUP/RECOVERY STATUS

Status: `MANUAL_BACKUP_STATUS_CHECK_REQUIRED`.

Backup/PITR status could not be verified through the current read-only local REST inspection.

Before applying any live migration, confirm a recent Supabase backup or recovery point for project `ebnkxqzgqpormgkxbevq`.

## L. READINESS CHECKER CORRECTION

Corrected:

`src/business/supabaseBusinessRepository.js`

Old behavior:

- `verifyConnection()` used HEAD-style Supabase checks.
- This could report `SUPABASE_READY` even when strict probes returned `PGRST205`.

New behavior:

- `verifyConnection()` now uses strict zero-row select proof: `select("*", { count: "exact" }).limit(0)`.
- `PGRST205` now correctly marks tables missing and returns `MIGRATION_REQUIRED`.

Validation:

- `node scripts/testBusinessSprint01.js` passed
- `node scripts/testBusinessSprint02.js` passed
- `node scripts/testBusinessSprint03.js` passed
- `node scripts/testBusinessSprint04.js` passed
- corrected live readiness checker returned `MIGRATION_REQUIRED`

## M. EXACT LIVE APPLY PLAN

Do not apply yet.

When approved:

1. Confirm backup/recovery point in Supabase.
2. Confirm SQL Editor or CLI target is project ref `ebnkxqzgqpormgkxbevq`.
3. Optionally run a direct catalog query in Supabase SQL Editor to confirm missing Business objects.
4. Apply `supabase/migrations/20260827_business_v1_foundation.sql`.
5. Apply `supabase/migrations/20260827_business_v1_rls_policies.sql`.
6. Apply `supabase/migrations/20260827_business_sprint04_commercial_activation.sql`.
7. Refresh PostgREST schema cache if needed.
8. Run the corrected `node scripts/checkBusinessSupabaseReadiness.js`.
9. Run Business Sprint 01-04 regressions.

## N. SAFE TO APPLY FOUNDATION MIGRATION? YES/NO

No, not yet.

The foundation migration appears additive and is the earliest missing migration, but live apply still requires explicit approval and backup/recovery confirmation.

## O. SAFE TO APPLY FULL CHAIN? YES/NO

No, not yet.

The full chain appears structurally ordered and non-destructive, but backup/recovery status and explicit apply approval are still required. Duplicate policy state is also not directly inspectable through current REST-only read access.

## P. BLOCKERS

Blockers:

- Backup/recovery status is not verified.
- No explicit approval to apply migrations.
- Strict probes show Business schema missing/not exposed.
- Direct SQL catalog inspection was not available from current credentials.
- Duplicate policy state cannot be verified through REST-only inspection.

## Q. NEXT MANUAL/APPROVAL ACTION

Manual action:

Confirm a Supabase backup/recovery point for project `ebnkxqzgqpormgkxbevq`.

Then, if you approve live schema application, apply the migration chain in this exact order:

1. `20260827_business_v1_foundation.sql`
2. `20260827_business_v1_rls_policies.sql`
3. `20260827_business_sprint04_commercial_activation.sql`

Stop before payment provider activation or Sprint 05.

## Scope Boundary

No migration was applied.

No live data was mutated.

No live schema/RLS was changed.

No Render or environment configuration changed.

No payment provider was activated.

No external AI/provider/model calls were made.

Sprint 05 was not started.
