import fs from "node:fs";
import path from "node:path";

import { clone } from "./businessContracts.js";

const DEFAULT_RELATIVE_PATH = "artifacts/business/business-v1-store.json";

const collectionKeys = [
  "organizations",
  "memberships",
  "businessProfiles",
  "workspaces",
  "creationFlows",
  "intakes",
  "diagnoses",
  "growthPlans",
  "offers",
  "managementSubscriptions",
  "managementStates",
  "operationalMetrics",
  "recommendations",
  "actionIntents",
  "approvalGates",
  "automationPermissions",
  "healthSnapshots",
  "financialOperations",
  "jurisdictionAdapters",
  "paymentIntents",
  "commercialOnboardings",
  "paymentProviderEvents",
  "projects",
  "partnerRequests",
  "commercialRequests",
  "analyticsEvents"
];

const collectionIdKeys = {
  organizations: "organizationId",
  memberships: "membershipId",
  businessProfiles: "businessId",
  workspaces: "workspaceId",
  creationFlows: "creationFlowId",
  intakes: "intakeId",
  diagnoses: "diagnosisId",
  growthPlans: "growthPlanId",
  offers: "offerId",
  managementSubscriptions: "subscriptionId",
  managementStates: "managementStateId",
  operationalMetrics: "metricId",
  recommendations: "recommendationId",
  actionIntents: "actionIntentId",
  approvalGates: "approvalGateId",
  automationPermissions: "automationPermissionId",
  healthSnapshots: "healthSnapshotId",
  financialOperations: "financialOperationsId",
  jurisdictionAdapters: "jurisdictionAdapterId",
  paymentIntents: "paymentIntentId",
  commercialOnboardings: "onboardingId",
  paymentProviderEvents: "providerEventId",
  projects: "projectId",
  partnerRequests: "partnerRequestId",
  commercialRequests: "commercialRequestId",
  analyticsEvents: "analyticsEventId"
};

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function emptySnapshot(metadata = {}) {
  return {
    metadata,
    organizations: [],
    memberships: [],
    businessProfiles: [],
    workspaces: [],
    creationFlows: [],
    intakes: [],
    diagnoses: [],
    growthPlans: [],
    offers: [],
    managementSubscriptions: [],
    managementStates: [],
    operationalMetrics: [],
    recommendations: [],
    actionIntents: [],
    approvalGates: [],
    automationPermissions: [],
    healthSnapshots: [],
    financialOperations: [],
    jurisdictionAdapters: [],
    paymentIntents: [],
    commercialOnboardings: [],
    paymentProviderEvents: [],
    projects: [],
    partnerRequests: [],
    commercialRequests: [],
    analyticsEvents: [],
    auditEvents: []
  };
}

export function snapshotFromState(state) {
  const snapshot = emptySnapshot(clone(state.metadata || {}));
  collectionKeys.forEach((key) => {
    snapshot[key] = [...(state[key]?.values?.() || [])].map(clone);
  });
  snapshot.auditEvents = (state.auditEvents || []).map(clone);
  return snapshot;
}

export function hydrateStateFromSnapshot(state, snapshot = {}) {
  collectionKeys.forEach((key) => {
    if (!state[key]?.clear) return;
    state[key].clear();
    (snapshot[key] || []).forEach((item) => {
      const id = item[collectionIdKeys[key]];
      if (id) state[key].set(id, item);
    });
  });
  state.auditEvents = Array.isArray(snapshot.auditEvents) ? snapshot.auditEvents.map(clone) : [];
}

export function createJsonBusinessRepository(options = {}) {
  const filePath = path.resolve(options.filePath || process.env.ESSA_BUSINESS_STORE_PATH || DEFAULT_RELATIVE_PATH);

  function load() {
    ensureDirectory(filePath);
    if (!fs.existsSync(filePath)) {
      const initial = emptySnapshot();
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2));
      return initial;
    }
    const text = fs.readFileSync(filePath, "utf8");
    if (!text.trim()) return emptySnapshot();
    return JSON.parse(text);
  }

  function save(snapshot) {
    ensureDirectory(filePath);
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2));
    fs.renameSync(tmpPath, filePath);
    return { ok: true, filePath };
  }

  return {
    repositoryKind: "JSON_DURABLE_LOCAL_FILE",
    filePath,
    load,
    save,
    describe: () => ({
      repositoryKind: "JSON_DURABLE_LOCAL_FILE",
      filePath,
      durableAcrossProcessRestart: true,
      productionDatabaseReady: false
    })
  };
}
