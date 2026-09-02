import {
  createAgentToolContract,
  toolCategories,
  toolCostClasses,
  toolEnvironments,
  toolPermissionClasses
} from "./contracts.js";

export const agentToolRegistry = [
  createAgentToolContract({
    toolId: "documentation.context7.mock",
    providerId: "context7_future",
    category: "documentation",
    capabilities: ["versioned_library_docs", "api_reference_lookup"],
    permissions: [toolPermissionClasses.readOnly],
    readScope: ["package_name", "version", "official_docs_cache"],
    externalSideEffects: false,
    costClass: toolCostClasses.none,
    approvalRequired: false,
    adapter: { kind: "DocumentationProvider", status: "mock_only" }
  }),
  createAgentToolContract({
    toolId: "browser.playwright.mock",
    providerId: "playwright_mcp_future",
    category: "browser",
    capabilities: ["browser_open", "browser_observe", "browser_capture", "browser_inspect", "browser_verify", "open", "inspect", "screenshot", "state_capture", "verification"],
    permissions: [toolPermissionClasses.readOnly],
    readScope: ["local_dev_server", "dom_state", "screenshots"],
    writeScope: [],
    externalSideEffects: false,
    costClass: toolCostClasses.local,
    approvalRequired: true,
    rollback: { supported: false, strategy: "read_only_observation_no_mutation" },
    adapter: { kind: "BrowserVerificationProvider", status: "read_only_boundary" }
  }),
  createAgentToolContract({
    toolId: "database.supabase.mock",
    providerId: "supabase_future",
    category: "database",
    capabilities: ["query", "schema_inspect", "migration_plan", "write_with_approval"],
    permissions: [toolPermissionClasses.readOnly, toolPermissionClasses.externalMutation],
    readScope: ["scoped_project", "development_schema"],
    writeScope: ["development_only_with_explicit_approval"],
    externalSideEffects: true,
    costClass: toolCostClasses.metered,
    requiresSecrets: true,
    environment: toolEnvironments.development,
    productionAccess: "deny_by_default",
    approvalRequired: true,
    rollback: { supported: true, strategy: "migration_down_or_restore_point_required" },
    adapter: { kind: "DatabaseToolProvider", status: "mock_only" }
  }),
  createAgentToolContract({
    toolId: "security.testing.mock",
    providerId: "security_testing_future",
    category: "security",
    capabilities: ["static_policy_review", "dependency_risk_plan"],
    permissions: [toolPermissionClasses.securitySensitive],
    readScope: ["local_source_metadata"],
    externalSideEffects: false,
    costClass: toolCostClasses.none,
    productionAccess: "deny_by_default",
    approvalRequired: true,
    executable: false,
    adapter: { kind: "SecurityTestingProvider", status: "non_executable" }
  }),
  createAgentToolContract({
    toolId: "filesystem.local.mock",
    providerId: "essa_local_future",
    category: "filesystem",
    capabilities: ["read_file", "write_file_with_scope"],
    permissions: [toolPermissionClasses.readOnly, toolPermissionClasses.localMutation],
    readScope: ["workspace"],
    writeScope: ["workspace"],
    externalSideEffects: false,
    costClass: toolCostClasses.local,
    approvalRequired: true,
    rollback: { supported: true, strategy: "patch_reverse" }
  }),
  createAgentToolContract({
    toolId: "code.local.mock",
    providerId: "essa_code_future",
    category: "code",
    capabilities: ["edit", "test", "lint"],
    permissions: [toolPermissionClasses.localMutation],
    readScope: ["workspace"],
    writeScope: ["workspace"],
    externalSideEffects: false,
    costClass: toolCostClasses.local,
    approvalRequired: true,
    rollback: { supported: true, strategy: "patch_reverse" }
  }),
  createAgentToolContract({
    toolId: "media.local.mock",
    providerId: "essa_media_future",
    category: "media",
    capabilities: ["inspect_media", "render_local"],
    permissions: [toolPermissionClasses.localMutation],
    readScope: ["media/input"],
    writeScope: ["media/output"],
    externalSideEffects: false,
    costClass: toolCostClasses.local,
    approvalRequired: true,
    rollback: { supported: true, strategy: "delete_generated_output_only" }
  }),
  createAgentToolContract({
    toolId: "deployment.provider.mock",
    providerId: "deployment_future",
    category: "deployment",
    capabilities: ["deploy", "publish", "rollback_deployment"],
    permissions: [toolPermissionClasses.deploy, toolPermissionClasses.publish],
    readScope: ["workspace_build_artifact"],
    writeScope: ["production_deployment"],
    externalSideEffects: true,
    costClass: toolCostClasses.paidExternal,
    requiresSecrets: true,
    productionAccess: "deny_by_default",
    approvalRequired: true,
    rollback: { supported: true, strategy: "provider_rollback_reference_required" },
    adapter: { kind: "DeploymentProvider", status: "non_executable" }
  }),
  createAgentToolContract({
    toolId: "design.asset.mock",
    providerId: "design_future",
    category: "design",
    capabilities: ["design_review", "visual_spec_plan"],
    permissions: [toolPermissionClasses.readOnly],
    readScope: ["local_design_assets"],
    externalSideEffects: false,
    costClass: toolCostClasses.none,
    approvalRequired: false
  }),
  createAgentToolContract({
    toolId: "research.web.mock",
    providerId: "research_future",
    category: "research",
    capabilities: ["research_plan", "source_requirements"],
    permissions: [toolPermissionClasses.readOnly, toolPermissionClasses.costIncurring],
    readScope: ["query_package"],
    externalSideEffects: true,
    costClass: toolCostClasses.metered,
    approvalRequired: true,
    adapter: { kind: "ResearchProvider", status: "non_executable" }
  }),
  createAgentToolContract({
    toolId: "business_acquisition.delivery.dry_run",
    providerId: "essa_business_acquisition_dry_run",
    category: "communication",
    capabilities: ["EMAIL_DELIVERY", "WHATSAPP_DELIVERY", "TELEGRAM_DELIVERY", "BUSINESS_DM_DELIVERY"],
    permissions: [toolPermissionClasses.readOnly],
    readScope: ["business_acquisition_delivery_dry_run"],
    writeScope: [],
    externalSideEffects: false,
    costClass: toolCostClasses.none,
    requiresSecrets: false,
    environment: toolEnvironments.local,
    productionAccess: "deny_by_default",
    approvalRequired: false,
    executable: false,
    rollback: { supported: false, strategy: "dry_run_no_mutation" },
    adapter: { kind: "BusinessAcquisitionDeliveryDryRun", status: "dry_run_gateway_only" }
  }),
  createAgentToolContract({
    toolId: "property.local.execution",
    providerId: "essa_property_local_execution_proof",
    category: "property",
    capabilities: ["property_canonical_resolution_association"],
    permissions: [toolPermissionClasses.localMutation],
    readScope: ["local_property_review_case_package", "local_property_execution_store"],
    writeScope: ["local_property_execution_store"],
    externalSideEffects: false,
    costClass: toolCostClasses.local,
    environment: toolEnvironments.local,
    productionAccess: "deny_by_default",
    approvalRequired: true,
    rollback: { supported: true, strategy: "local_before_state_snapshot" },
    executable: false,
    adapter: { kind: "LocalPropertyExecutionProof", status: "gateway_checked_local_commit_only" }
  })
];

export function listAgentTools(filters = {}) {
  return agentToolRegistry.filter((tool) => {
    if (filters.category && tool.category !== filters.category) return false;
    if (filters.providerId && tool.providerId !== filters.providerId) return false;
    if (typeof filters.executable === "boolean" && tool.executable !== filters.executable) return false;
    return true;
  });
}

export function getAgentTool(toolId, registry = agentToolRegistry) {
  return registry.find((tool) => tool.toolId === toolId) || null;
}

export function validateAgentToolRegistry(registry = agentToolRegistry) {
  return registry.map((tool) => ({
    toolId: tool.toolId,
    valid: Boolean(
      tool.toolId &&
      tool.providerId &&
      toolCategories.includes(tool.category) &&
      Array.isArray(tool.capabilities) &&
      Array.isArray(tool.permissions) &&
      tool.audit?.sourceOfTruth === "ESSA Core" &&
      tool.audit?.providerMayMutatePolicy === false
    ),
    category: tool.category
  }));
}
