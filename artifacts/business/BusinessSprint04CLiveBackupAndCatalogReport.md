# ESSA BUSINESS - SPRINT 04C LIVE BACKUP & DATABASE CATALOG VERIFICATION

Generated: 2026-08-28T03:51:50.0031246+04:00

Mode: LIVE READ-ONLY + LOCAL BACKUP ARTIFACTS. No migrations were applied. No live schema, data, RLS, environment, Render, payment, or provider configuration was changed.

## A. TARGET PROJECT VERIFICATION

Canonical project confirmed from local `.env`:

- Project ref: `ebnkxqzgqpormgkxbevq`
- Configured URL: `https://ebnkxqzgqpormgkxbevq.supabase.co`
- Credential evidence: service role key is configured; anon key is not configured.
- Secret handling: no secret values were printed into this report or artifacts.

## B. AVAILABLE RECOVERY MECHANISMS

Programmatic recovery verification is incomplete from this workstation:

- Supabase Dashboard status and managed backup/PITR availability were not programmatically accessible from the current local credentials.
- No direct PostgreSQL connection string was present in `.env`.
- `psql` is not installed.
- `pg_dump` is not installed.
- PostgREST/service-role access can prove API/schema-cache visibility, but cannot create a full logical backup or inspect `pg_catalog`.

Result: `MANUAL_BACKUP_STATUS_CHECK_REQUIRED`.

## C. PRE-MIGRATION BACKUP STATUS

No live database dump was created.

Reason: direct PostgreSQL backup tooling and connection details are unavailable in the current environment. Creating a real pre-migration backup requires Supabase Dashboard backup/export access, Supabase CLI database dump capability, or `pg_dump` plus a database connection string.

## D. BACKUP ARTIFACT VERIFICATION

- `artifacts/private-backups/` did not exist before this audit.
- No private dump file was produced.
- `.gitignore` now excludes `artifacts/private-backups/` so future local backup exports are not accidentally tracked.
- Machine-readable audit artifact was created under `artifacts/business/phase-sprint04c/`.

## E. DIRECT POSTGRES ACCESS STATUS

Direct PostgreSQL catalog access is not available from this workstation.

Evidence:

- `DATABASE_URL` / direct database URL: not present in local `.env`.
- `psql`: unavailable.
- `pg_dump`: unavailable.

Impact: live `pg_namespace`, `pg_class`, `pg_proc`, `pg_policies`, `pg_indexes`, `information_schema`, and Supabase migration-history tables could not be inspected through direct SQL.

## F. LIVE CATALOG RESULTS

Direct catalog results: unavailable.

PostgREST strict select probes were used as the safest available read-only source. Every checked Business table returned `PGRST205`, meaning PostgREST could not find the public table in its schema cache:

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
- `business_partner_requests`
- `business_projects`
- `business_commercial_requests`
- `business_funnel_events`
- `business_analytics`
- `business_audit_events`
- `business_payment_intents`
- `business_commercial_onboardings`
- `business_payment_provider_events`

RPC probe for `public.essa_business_has_org_role` returned `PGRST202`.

## G. BUSINESS OBJECT COLLISION CHECK

Confirmed via PostgREST: no checked Business tables or RPC are visible in the public schema cache.

Not fully confirmed via catalog: partial, non-exposed, wrong-schema, or stale-cache objects cannot be ruled out without direct SQL catalog access.

Collision risk by migration:

- Foundation migration uses `create table if not exists` and `create index if not exists`, reducing table/index collision risk.
- RLS migration uses `create or replace function`, reducing function collision risk but potentially replacing existing functions if a partial state exists.
- RLS and Sprint 04 migrations use plain `create policy`, so duplicate policy names would fail if policies exist already.

## H. RLS/POLICY COLLISION CHECK

No policy catalog inspection was possible.

PostgREST indicates required Business tables/functions are not exposed, but does not prove policies are absent. Because policies use plain `create policy`, a direct catalog check or controlled first-run failure handling is required before live application.

## I. MIGRATION HISTORY

Repository Business migrations found:

1. `supabase/migrations/20260827_business_v1_foundation.sql`
2. `supabase/migrations/20260827_business_v1_rls_policies.sql`
3. `supabase/migrations/20260827_business_sprint04_commercial_activation.sql`

Live migration history could not be read through direct SQL. Public REST probes for Business objects show the chain is not live-visible.

## J. POSTGREST VS CATALOG CONCLUSION

PostgREST conclusion: Business V1/Sprint 04 objects are missing from the public schema cache.

Catalog conclusion: unknown because direct PostgreSQL catalog access is unavailable.

Best current interpretation: earliest missing live-visible migration is `20260827_business_v1_foundation.sql`. A stale schema cache or wrong-schema object remains possible but unproven.

## K. NON-BUSINESS DATA SAFETY

The repository migrations target Business-domain public objects and `auth.users` references. No `drop`, `truncate`, destructive type rewrite, or non-Business table alteration was found in the scanned Business migrations.

Existing non-Business ESSA tables/data should not be modified by these migrations, assuming the SQL is applied as-is to the canonical project only.

## L. MIGRATION 1 EXPECTED DELTA

`20260827_business_v1_foundation.sql` is expected to:

- Create 11 Business tables: organizations, organization memberships, profiles, workspaces, intakes, artifacts, projects, partner requests, commercial requests, funnel events, audit events.
- Add foreign keys to `auth.users` and internal Business tables.
- Add unique constraint on `(organization_id, user_id)` for memberships.
- Add 5 indexes.
- Enable RLS on the 11 created tables.

Destructive scan: no `drop` or `truncate`; RLS enablement is protective but can block access until policies are applied.

## M. MIGRATION 2 EXPECTED DELTA

`20260827_business_v1_rls_policies.sql` is expected to:

- Create or replace 3 helper functions:
  - `public.essa_business_role_rank`
  - `public.essa_business_has_org_role`
  - `public.essa_business_has_business_role`
- Create 25 RLS policies across foundation tables.

Destructive scan: no `drop` or `truncate`. Main risk is duplicate policy names or replacing an existing helper function in a partially applied database.

## N. MIGRATION 3 EXPECTED DELTA

`20260827_business_sprint04_commercial_activation.sql` is expected to:

- Alter `business_projects` by adding 7 commercial/onboarding columns, including `owner_team jsonb not null default '[]'::jsonb`.
- Create 3 commercial tables:
  - `business_payment_intents`
  - `business_commercial_onboardings`
  - `business_payment_provider_events`
- Add foreign keys to foundation Business tables and `auth.users`.
- Add uniqueness constraints for idempotency and provider-event deduplication.
- Add 4 indexes.
- Enable RLS on the 3 new tables.
- Create 8 RLS policies.

Destructive scan: no `drop` or `truncate`; the `add column if not exists` statements are additive and safe for existing rows because the only new `not null` added column has a default.

## O. EXACT CONTROLLED APPLY PROCEDURE

Do not apply until manual backup/recovery has been verified.

Recommended controlled procedure after approval:

1. Confirm Supabase Dashboard is on project `ebnkxqzgqpormgkxbevq`.
2. Create or verify a restorable backup/recovery point.
3. Use a direct SQL-capable mechanism tied to only `ebnkxqzgqpormgkxbevq`.
4. Apply one migration file at a time in this order:
   - `supabase/migrations/20260827_business_v1_foundation.sql`
   - `supabase/migrations/20260827_business_v1_rls_policies.sql`
   - `supabase/migrations/20260827_business_sprint04_commercial_activation.sql`
5. Stop after any error; do not skip forward.
6. Run the post-apply verification procedure after each migration.

## P. POST-APPLY VERIFICATION PROCEDURE

After migration 1:

- Strict select `.limit(0)` for foundation tables.
- Verify `business_projects` exists before applying Sprint 04.

After migration 2:

- Verify `public.essa_business_has_org_role` RPC visibility or direct function existence.
- Verify policy creation through catalog or Dashboard.

After migration 3:

- Strict select `.limit(0)` for payment/onboarding/provider event tables.
- Strict select `.limit(0)` for `business_projects` with new commercial columns if possible.
- Run local Business Sprint 03 and Sprint 04 tests.
- Run `node scripts/checkBusinessSupabaseReadiness.js`.

## Q. SAFE TO APPLY MIGRATION 1? YES/NO

NO for immediate live application from this audit.

Reason: a verified restorable backup/recovery point has not been confirmed, and direct catalog inspection is unavailable. Structurally the migration appears additive and likely safe once backup and target confirmation are complete.

## R. SAFE TO APPLY COMPLETE CHAIN SEQUENTIALLY? YES/NO

NO for immediate live application from this audit.

Reason: full chain requires backup verification and ideally direct catalog/policy inspection. Sprint 04 also depends on foundation tables and RLS helper functions.

## S. REMAINING BLOCKERS

- `MANUAL_BACKUP_STATUS_CHECK_REQUIRED`.
- Direct PostgreSQL catalog access unavailable.
- `psql` and `pg_dump` unavailable locally.
- Live migration history inaccessible from current read-only methods.
- Duplicate policy collisions cannot be ruled out without catalog access.

## T. REQUIRED HUMAN APPROVAL

Required before live schema application:

- Confirm a restorable Supabase backup/recovery point exists for `ebnkxqzgqpormgkxbevq`.
- Confirm the intended apply mechanism targets only `ebnkxqzgqpormgkxbevq`.
- Explicitly approve applying migration 1, then migration 2, then migration 3.

Sprint 04C stops here. Sprint 05 was not started.
