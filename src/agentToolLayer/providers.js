export function createDocumentationProviderStub() {
  return {
    providerId: "context7_future",
    executable: false,
    async resolveVersionedDocs() {
      return {
        ok: false,
        status: "STUB_NOT_EXECUTABLE",
        providerCallMade: false,
        docs: null
      };
    }
  };
}

export function createBrowserVerificationProviderStub() {
  return {
    providerId: "playwright_mcp_future",
    executable: false,
    readOnly: true,
    localOnly: true,
    forbiddenCapabilities: ["click", "type", "submit", "storage", "cookies", "external_navigation"],
    async verifyBuildCycle() {
      return {
        ok: false,
        status: "STUB_NOT_EXECUTABLE",
        providerCallMade: false,
        cycle: ["open", "observe", "capture", "inspect", "verify", "report"]
      };
    }
  };
}

export function createDatabaseToolProviderStub() {
  return {
    providerId: "supabase_future",
    executable: false,
    defaults: {
      projectScoped: true,
      developmentOnly: true,
      readOnly: true,
      productionDenyByDefault: true,
      writeRequiresApproval: true,
      migrationRequiresApproval: true,
      auditTrailRequired: true
    },
    async query() {
      return {
        ok: false,
        status: "STUB_NOT_EXECUTABLE",
        providerCallMade: false
      };
    }
  };
}

export function createSecurityTestingProviderStub() {
  return {
    providerId: "security_testing_future",
    executable: false,
    async planSecurityReview() {
      return {
        ok: false,
        status: "NON_EXECUTABLE_SECURITY_BOUNDARY",
        providerCallMade: false
      };
    }
  };
}
