# ESSA BUSINESS - SPRINT 04A LIVE MIGRATION PREFLIGHT

## A. TARGET PROJECT CONFIRMATION

Target project:

- Project: `essa-navigator-memory`
- Project ref: `ebnkxqzgqpormgkxbevq`
- URL: `https://ebnkxqzgqpormgkxbevq.supabase.co`

Local configuration still points to the canonical project ref `ebnkxqzgqpormgkxbevq`.

No other Supabase project was touched.

## B. MIGRATION SUMMARY

Inspected migration:

`supabase/migrations/20260827_business_sprint04_commercial_activation.sql`

The migration is intended to add the Sprint 04 commercial/payment layer:

- payment intents
- commercial onboarding
- provider event/idempotency tracking
- commercial fields on `business_projects`
- RLS/policies for the new tables

The migration was not applied.

## C. OBJECTS TO BE CREATED

Tables:

- `business_payment_intents`
- `business_commercial_onboardings`
- `business_payment_provider_events`

Indexes:

- `idx_business_payment_intents_business`
- `idx_business_payment_intents_offer`
- `idx_business_commercial_onboardings_business`
- `idx_business_payment_provider_events_payment`

Policies:

- `business_payment_intents_select_member`
- `business_payment_intents_insert_admin`
- `business_payment_intents_update_admin`
- `business_commercial_onboardings_select_member`
- `business_commercial_onboardings_insert_admin`
- `business_commercial_onboardings_update_admin`
- `business_payment_provider_events_select_admin`
- `business_payment_provider_events_insert_admin`

## D. OBJECTS TO BE ALTERED

Table: `business_projects`

Columns to add:

- `linked_payment_intent_id text`
- `linked_onboarding_id text`
- `commercial_status text`
- `onboarding_status text`
- `activation_timestamp timestamptz`
- `owner_team jsonb not null default '[]'::jsonb`
- `next_action text`

The only new `not null` column has a safe default. Other added columns are nullable.

## E. RLS/POLICY CHANGES

The migration enables RLS on:

- `business_payment_intents`
- `business_commercial_onboardings`
- `business_payment_provider_events`

Tenant/member read policies are present for payment intents and onboarding.

Admin/operator write policies are present for payment intents, onboarding, and provider event records.

Important caveat: policy existence in live Supabase could not be verified through the available read-only REST method. If equivalent policies already exist, this migration can fail because `create policy` does not use `if not exists`.

## F. FOREIGN KEY / DEPENDENCY CHECK

Status: blocked.

The Sprint 04 migration depends on:

- `business_projects`
- `business_organizations`
- `business_profiles`
- `auth.users`
- `public.essa_business_has_org_role`

Live read-only GET/select probes returned `PGRST205` for all Business V1 and Sprint 04 tables, including `business_projects`, `business_organizations`, and `business_profiles`.

This means the Sprint 04 migration should not be applied by itself. Either the Sprint 01-03 Business migrations are not present in the live public schema, or the schema/API cache/exposure requires direct SQL catalog inspection.

## G. EXISTING DATA SAFETY

The migration text itself is additive and does not delete existing Business data.

However, existing live Business data could not be enumerated or counted because the live REST schema inspection could not find the Business tables.

No data was read beyond zero-row metadata/table probes. No live data was modified.

## H. DESTRUCTIVE OPERATION SCAN

No destructive migration statements were found:

- No `DROP`
- No `TRUNCATE`
- No `DELETE FROM`
- No incompatible type changes
- No table rewrite pattern found
- No destructive `ALTER` found

The `alter table business_projects add column if not exists` block is additive.

## I. CONFLICT / DUPLICATE SCAN

Low conflict risk:

- Tables use `create table if not exists`.
- Indexes use `create index if not exists`.
- Project columns use `add column if not exists`.

Known conflict risk:

- Policies use plain `create policy`, not `create policy if not exists`.
- If a prior partial/manual Sprint 04 migration created these policies, reapplying this SQL would fail on duplicate policy names.

Live duplicate-policy state could not be verified through available read-only REST inspection.

## J. BACKUP / RECOVERY STATUS

Backup/recovery status was not verified from the available local credentials.

Backup/recovery point is required before applying any Business migration live.

Recommended pre-apply action:

Confirm a recent Supabase backup or recovery point for project `ebnkxqzgqpormgkxbevq` in Supabase Dashboard/project backup settings.

## K. SECURITY ASSESSMENT

The migration introduces no payment provider credentials and no payment secrets.

It stores only:

- payment references
- statuses
- metadata
- idempotency keys
- onboarding state

It does not store card numbers, CVV, provider API keys, bank credentials, or raw provider secrets.

Cross-tenant exposure risk is low only if the prior Business RLS functions and membership tables exist and work as expected. Because those live dependencies were not visible through read-only REST inspection, tenant/RLS readiness is not verified yet.

## L. POST-MIGRATION VERIFICATION PLAN

After authorized migration application:

1. Refresh PostgREST schema cache if needed.
2. Run zero-row GET/select probes for all Sprint 01-04 Business tables.
3. Verify `business_projects` has the new commercial columns.
4. Verify the three new Sprint 04 tables are visible.
5. Verify RLS is enabled and policy names exist via direct SQL catalog query.
6. Run `node scripts/checkBusinessSupabaseReadiness.js` only after adding stricter non-HEAD verification.
7. Run `node scripts/testBusinessSprint04.js`.
8. Run Business Sprint 01-03 regressions.
9. Confirm no secrets appear in logs/artifacts.

## M. EXACT MIGRATION COMMAND/MECHANISM RECOMMENDED

Do not apply Sprint 04 alone.

Recommended sequence after explicit approval:

1. Confirm backup/recovery point.
2. Confirm target project ref is `ebnkxqzgqpormgkxbevq`.
3. Inspect live SQL catalog in Supabase SQL Editor or a trusted linked Supabase CLI connection.
4. If absent, apply `supabase/migrations/20260827_business_v1_foundation.sql`.
5. Then apply `supabase/migrations/20260827_business_v1_rls_policies.sql`.
6. Then apply `supabase/migrations/20260827_business_sprint04_commercial_activation.sql`.

Mechanism:

Use Supabase SQL Editor for project `ebnkxqzgqpormgkxbevq`, or a Supabase CLI workflow that is explicitly linked to that same project ref.

## N. SAFE TO APPLY LIVE? YES/NO

No.

Not safe to apply the Sprint 04 migration by itself from the current evidence.

## O. BLOCKERS, IF ANY

Blockers:

- Live read-only REST probes do not find the required Sprint 01-03 Business tables.
- Sprint 04 depends on those tables and on `public.essa_business_has_org_role`.
- Backup/recovery status is not verified.
- Duplicate policy state cannot be verified through available read-only REST inspection.
- The existing readiness checker produced a conflicting HEAD-based `SUPABASE_READY` result; stricter GET/select metadata probes should be used before live migration approval.

## Scope Boundary

No migration was applied.

No live data was mutated.

No live objects, RLS policies, Render configuration, or environment variables were changed.

No secrets were printed.

No payment provider was activated.

No transaction was created.

Sprint 05 was not started.
