export const productDiscoveryModes = {
  overview: "OVERVIEW",
  searchResults: "SEARCH_RESULTS",
  productDetail: "PRODUCT_DETAIL",
  capabilityDetail: "CAPABILITY_DETAIL",
  educationDetail: "EDUCATION_DETAIL",
  demoPreview: "DEMO_PREVIEW",
  executionPreview: "EXECUTION_PREVIEW",
  executionPreflight: "EXECUTION_PREFLIGHT",
  notFound: "NOT_FOUND"
};

export const productDiscoveryBaseHash = "#product-discovery";

export const productDiscoveryUiStateContract = {
  mode: productDiscoveryModes.overview,
  selectedProductId: null,
  selectedCapabilityId: null,
  selectedEducationId: null,
  searchQuery: "",
  filters: {},
  previousState: null,
  debugEnabled: false,
  executionEnabled: false,
  providerCalls: 0
};

export function createProductDiscoveryUiState(input = {}) {
  return {
    ...productDiscoveryUiStateContract,
    ...input,
    filters: { ...(input.filters || {}) },
    executionEnabled: false,
    providerCalls: 0
  };
}

export function buildProductDiscoveryHash(state = {}) {
  const mode = state.mode || productDiscoveryModes.overview;
  const params = new URLSearchParams();

  if (state.searchQuery) params.set("q", state.searchQuery);
  if (state.filters?.availabilityState) params.set("availability", state.filters.availabilityState);
  if (state.debugEnabled) params.set("debug", "1");

  const suffix = params.toString() ? `?${params.toString()}` : "";

  if (mode === productDiscoveryModes.searchResults) return `${productDiscoveryBaseHash}/search${suffix}`;
  if (mode === productDiscoveryModes.productDetail) return `${productDiscoveryBaseHash}/product/${encodeURIComponent(state.selectedProductId || "")}${suffix}`;
  if (mode === productDiscoveryModes.capabilityDetail) return `${productDiscoveryBaseHash}/capability/${encodeURIComponent(state.selectedCapabilityId || "")}${suffix}`;
  if (mode === productDiscoveryModes.educationDetail) return `${productDiscoveryBaseHash}/education/${encodeURIComponent(state.selectedCapabilityId || "")}${suffix}`;
  if (mode === productDiscoveryModes.demoPreview) return `${productDiscoveryBaseHash}/demo/${encodeURIComponent(state.selectedCapabilityId || "")}${suffix}`;
  if (mode === productDiscoveryModes.executionPreview) return `${productDiscoveryBaseHash}/execute/${encodeURIComponent(state.selectedCapabilityId || "")}${suffix}`;
  if (mode === productDiscoveryModes.executionPreflight) return `${productDiscoveryBaseHash}/preflight/${encodeURIComponent(state.selectedCapabilityId || "")}${suffix}`;
  return `${productDiscoveryBaseHash}${suffix}`;
}

export function parseProductDiscoveryHash(hash = productDiscoveryBaseHash, previousState = null) {
  const raw = String(hash || productDiscoveryBaseHash);
  const [pathPart, queryPart = ""] = raw.split("?");
  const parts = pathPart.replace(/^#/, "").split("/").filter(Boolean);
  const params = new URLSearchParams(queryPart);
  const common = {
    searchQuery: params.get("q") || previousState?.searchQuery || "",
    filters: {
      availabilityState: params.get("availability") || previousState?.filters?.availabilityState || ""
    },
    debugEnabled: params.get("debug") === "1" || previousState?.debugEnabled || false,
    previousState
  };

  if (parts[0] !== "product-discovery") return createProductDiscoveryUiState({ mode: productDiscoveryModes.overview });
  if (parts.length === 1) return createProductDiscoveryUiState({ ...common, mode: productDiscoveryModes.overview });
  if (parts[1] === "search") return createProductDiscoveryUiState({ ...common, mode: productDiscoveryModes.searchResults });
  if (parts[1] === "product") {
    return createProductDiscoveryUiState({
      ...common,
      mode: parts[2] ? productDiscoveryModes.productDetail : productDiscoveryModes.notFound,
      selectedProductId: parts[2] ? decodeURIComponent(parts[2]) : null
    });
  }
  if (parts[1] === "capability") {
    return createProductDiscoveryUiState({
      ...common,
      mode: parts[2] ? productDiscoveryModes.capabilityDetail : productDiscoveryModes.notFound,
      selectedCapabilityId: parts[2] ? decodeURIComponent(parts[2]) : null
    });
  }
  if (parts[1] === "education") {
    return createProductDiscoveryUiState({
      ...common,
      mode: parts[2] ? productDiscoveryModes.educationDetail : productDiscoveryModes.notFound,
      selectedCapabilityId: parts[2] ? decodeURIComponent(parts[2]) : null,
      selectedEducationId: parts[2] ? `education_${decodeURIComponent(parts[2])}` : null
    });
  }
  if (parts[1] === "demo") {
    return createProductDiscoveryUiState({
      ...common,
      mode: parts[2] ? productDiscoveryModes.demoPreview : productDiscoveryModes.notFound,
      selectedCapabilityId: parts[2] ? decodeURIComponent(parts[2]) : null
    });
  }
  if (parts[1] === "execute") {
    return createProductDiscoveryUiState({
      ...common,
      mode: parts[2] ? productDiscoveryModes.executionPreview : productDiscoveryModes.notFound,
      selectedCapabilityId: parts[2] ? decodeURIComponent(parts[2]) : null
    });
  }
  if (parts[1] === "preflight") {
    return createProductDiscoveryUiState({
      ...common,
      mode: parts[2] ? productDiscoveryModes.executionPreflight : productDiscoveryModes.notFound,
      selectedCapabilityId: parts[2] ? decodeURIComponent(parts[2]) : null
    });
  }

  return createProductDiscoveryUiState({ ...common, mode: productDiscoveryModes.notFound });
}

export function createProductDiscoveryBackState(state = {}) {
  if (state.previousState) return createProductDiscoveryUiState(state.previousState);
  if (state.searchQuery) {
    return createProductDiscoveryUiState({
      mode: productDiscoveryModes.searchResults,
      searchQuery: state.searchQuery,
      filters: state.filters
    });
  }
  return createProductDiscoveryUiState({ mode: productDiscoveryModes.overview });
}
