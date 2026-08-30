import { createClient } from "@supabase/supabase-js";

const requiredTables = [
  "business_organizations",
  "business_organization_memberships",
  "business_profiles",
  "business_workspaces",
  "business_intakes",
  "business_artifacts",
  "business_payment_intents",
  "business_commercial_onboardings",
  "business_payment_provider_events",
  "business_projects",
  "business_partner_requests",
  "business_commercial_requests",
  "business_funnel_events",
  "business_audit_events"
];

export function getSupabaseBusinessConfig(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || "";
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  return {
    configured: Boolean(url && (serviceRoleKey || anonKey)),
    urlConfigured: Boolean(url),
    serviceRoleConfigured: Boolean(serviceRoleKey),
    anonKeyConfigured: Boolean(anonKey),
    selectedStoreMode: env.ESSA_BUSINESS_STORE || (env.NODE_ENV === "production" ? "supabase" : "local"),
    missing: [
      !url ? "SUPABASE_URL or VITE_SUPABASE_URL" : null,
      !serviceRoleKey && !anonKey ? "SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY" : null
    ].filter(Boolean)
  };
}

function tableRows(snapshot, key) {
  return Array.isArray(snapshot?.[key]) ? snapshot[key] : [];
}

export function createSupabaseBusinessRepository(options = {}) {
  const env = options.env || process.env;
  const config = getSupabaseBusinessConfig(env);
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const client = options.client || (config.configured
    ? createClient(url, key, { auth: { persistSession: false } })
    : null);

  async function assertConfigured() {
    if (!client) {
      return {
        ok: false,
        status: "BLOCKED_CONFIGURATION",
        reason: "LIVE_SUPABASE_CONFIGURATION_REQUIRED",
        missing: config.missing
      };
    }
    return { ok: true };
  }

  async function verifyConnection() {
    const configured = await assertConfigured();
    if (!configured.ok) return configured;
    const tableChecks = [];
    for (const table of requiredTables) {
      const { error } = await client.from(table).select("*", { count: "exact" }).limit(0);
      tableChecks.push({
        table,
        exists: !error,
        errorCode: error?.code || null,
        errorMessage: error?.message ? "TABLE_CHECK_FAILED" : null
      });
    }
    const missingTables = tableChecks.filter((item) => !item.exists).map((item) => item.table);
    return {
      ok: missingTables.length === 0,
      status: missingTables.length ? "MIGRATION_REQUIRED" : "SUPABASE_READY",
      requiredTables,
      tableChecks,
      missingTables
    };
  }

  async function upsert(table, rows, mapper = (row) => row) {
    if (!rows.length) return { ok: true, count: 0 };
    const { error } = await client.from(table).upsert(rows.map(mapper));
    if (error) return { ok: false, table, reason: "SUPABASE_UPSERT_FAILED", errorCode: error.code };
    return { ok: true, count: rows.length };
  }

  async function saveSnapshot(snapshot = {}) {
    const configured = await assertConfigured();
    if (!configured.ok) return configured;
    const results = [];
    results.push(await upsert("business_organizations", tableRows(snapshot, "organizations"), (row) => ({
      organization_id: row.organizationId,
      owner_user_id: row.ownerUserId,
      name: row.name,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_organization_memberships", tableRows(snapshot, "memberships"), (row) => ({
      membership_id: row.membershipId,
      organization_id: row.organizationId,
      user_id: row.userId,
      role: row.role,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_profiles", tableRows(snapshot, "businessProfiles"), (row) => ({
      business_id: row.businessId,
      organization_id: row.organizationId,
      owner_user_id: row.ownerUserId,
      name: row.name,
      industry: row.industry,
      business_type: row.businessType,
      country: row.country,
      region: row.region,
      city: row.city,
      website: row.website,
      social_links: row.socialLinks || [],
      description: row.description,
      products_services: row.productsServices || [],
      target_audience: row.targetAudience,
      current_situation: row.currentSituation,
      goals: row.goals || [],
      challenges: row.challenges || [],
      preferred_languages: row.preferredLanguages || [],
      status: row.status,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_workspaces", tableRows(snapshot, "workspaces"), (row) => ({
      workspace_id: row.workspaceId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      status: row.status,
      assets_metadata: row.assetsMetadata || [],
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_intakes", tableRows(snapshot, "intakes"), (row) => ({
      intake_id: row.intakeId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      workspace_id: row.workspaceId,
      intent: row.intent,
      payload: row,
      source_refs: row.sourceRefs || [],
      completeness: row.completeness,
      created_by: row.createdBy,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    const artifacts = [
      ...tableRows(snapshot, "diagnoses").map((payload) => ({ artifact_type: "DIAGNOSIS", id: payload.diagnosisId, payload })),
      ...tableRows(snapshot, "growthPlans").map((payload) => ({ artifact_type: "GROWTH_PLAN", id: payload.growthPlanId, payload })),
      ...tableRows(snapshot, "offers").map((payload) => ({ artifact_type: "OFFER", id: payload.offerId, payload }))
    ];
    results.push(await upsert("business_artifacts", artifacts, (row) => ({
      artifact_id: row.id,
      organization_id: row.payload.organizationId,
      business_id: row.payload.businessId,
      artifact_type: row.artifact_type,
      revision: row.payload.revision || 1,
      payload: row.payload,
      status: row.payload.status || "ACTIVE",
      created_by: row.payload.createdBy,
      created_at: row.payload.createdAt,
      updated_at: row.payload.updatedAt || row.payload.createdAt
    })));
    results.push(await upsert("business_payment_intents", tableRows(snapshot, "paymentIntents"), (row) => ({
      payment_intent_id: row.paymentIntentId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      offer_id: row.offerId,
      amount: row.amount,
      currency: row.currency,
      payment_model: row.paymentModel,
      status: row.status,
      provider: row.provider,
      provider_reference: row.providerReference,
      requested_by: row.requestedBy,
      requested_at: row.requestedAt,
      confirmed_at: row.confirmedAt,
      failed_at: row.failedAt,
      cancelled_at: row.cancelledAt,
      metadata: row.metadata || {},
      audit_refs: row.auditRefs || [],
      idempotency_key: row.idempotencyKey,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_commercial_onboardings", tableRows(snapshot, "commercialOnboardings"), (row) => ({
      onboarding_id: row.onboardingId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      offer_id: row.offerId,
      payment_intent_id: row.paymentIntentId,
      status: row.status,
      primary_contact: row.primaryContact,
      approved_scope: row.approvedScope || [],
      communication_preference: row.communicationPreference,
      project_owner: row.projectOwner,
      missing_client_materials: row.missingClientMaterials || [],
      required_access_list: row.requiredAccessList || [],
      next_action: row.nextAction,
      onboarding_notes: row.onboardingNotes,
      sensitive_credential_policy: row.sensitiveCredentialPolicy || {},
      created_by: row.createdBy,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_payment_provider_events", tableRows(snapshot, "paymentProviderEvents"), (row) => ({
      provider_event_id: row.providerEventId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      payment_intent_id: row.paymentIntentId,
      provider: row.provider,
      event_type: row.eventType,
      event_fingerprint: row.eventFingerprint,
      received_at: row.receivedAt,
      processed_at: row.processedAt,
      status: row.status,
      metadata: row.metadata || {}
    })));
    results.push(await upsert("business_projects", tableRows(snapshot, "projects"), (row) => ({
      project_id: row.projectId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      linked_diagnosis_id: row.linkedDiagnosisId,
      linked_growth_plan_id: row.linkedGrowthPlanId,
      linked_offer_id: row.linkedOfferId,
      linked_payment_intent_id: row.linkedPaymentIntentId,
      linked_onboarding_id: row.linkedOnboardingId,
      title: row.title,
      status: row.status,
      commercial_status: row.commercialStatus,
      onboarding_status: row.onboardingStatus,
      activation_timestamp: row.activationTimestamp,
      owner_team: row.ownerTeam || [],
      next_action: row.nextAction,
      goal: row.goal,
      tasks: row.tasks || [],
      approvals: row.approvals || [],
      assets_metadata: row.assetsMetadata || [],
      activity_events: row.activityEvents || [],
      created_by: row.createdBy,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_partner_requests", tableRows(snapshot, "partnerRequests"), (row) => ({
      partner_request_id: row.partnerRequestId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      requested_by: row.requestedBy,
      desired_scope: row.desiredScope,
      goals: row.goals || [],
      areas_to_delegate: row.areasToDelegate || [],
      preferred_involvement: row.preferredInvolvementLevel,
      current_team: row.currentTeam,
      notes: row.notes,
      status: row.status,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_commercial_requests", tableRows(snapshot, "commercialRequests"), (row) => ({
      commercial_request_id: row.commercialRequestId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      offer_id: row.offerId,
      requested_by: row.requestedBy,
      contact_preference: row.contactPreference,
      scope: row.scope || [],
      status: row.status,
      payment_boundary: row.paymentBoundary,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    })));
    results.push(await upsert("business_funnel_events", tableRows(snapshot, "analyticsEvents"), (row) => ({
      analytics_event_id: row.analyticsEventId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      actor_user_id: row.actorUserId,
      event_type: row.eventType,
      metadata: row.metadata || {},
      privacy_policy: row.privacyPolicy || {},
      created_at: row.createdAt
    })));
    results.push(await upsert("business_audit_events", tableRows(snapshot, "auditEvents"), (row) => ({
      event_id: row.eventId,
      organization_id: row.organizationId,
      business_id: row.businessId,
      actor_user_id: row.actorUserId,
      event_type: row.eventType,
      target_id: row.targetId,
      metadata: row.metadata || {},
      created_at: row.createdAt
    })));
    return {
      ok: results.every((result) => result.ok),
      status: results.every((result) => result.ok) ? "SNAPSHOT_PERSISTED" : "SNAPSHOT_PERSIST_FAILED",
      results
    };
  }

  return {
    repositoryKind: "SUPABASE_BUSINESS_REPOSITORY",
    requiredTables,
    config: {
      configured: config.configured,
      urlConfigured: config.urlConfigured,
      serviceRoleConfigured: config.serviceRoleConfigured,
      anonKeyConfigured: config.anonKeyConfigured,
      selectedStoreMode: config.selectedStoreMode,
      missing: config.missing
    },
    verifyConnection,
    saveSnapshot,
    describe: () => ({
      repositoryKind: "SUPABASE_BUSINESS_REPOSITORY",
      configured: config.configured,
      selectedStoreMode: config.selectedStoreMode,
      productionDatabaseReady: false,
      requiredTables
    })
  };
}
