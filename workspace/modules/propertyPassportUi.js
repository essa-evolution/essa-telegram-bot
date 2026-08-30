import {
  buildBoundedPropertyContext,
  buildPropertyPassportViewModel,
  propertyDiscoveryGuideSteps,
  buildPropertyDiscoveryGuideStep,
  createLisaPropertyPassportExplanation,
  createLisaPropertyDiscoveryExplanation,
  discoverProperties,
  propertyDemoAliases,
  propertyReadService
} from "../../src/property/index.js";

const futureActions = [
  "Buy",
  "Rent",
  "Book",
  "Verify ownership",
  "Start transaction"
];

const lisaQuestions = [
  "Что известно об объекте?",
  "Что подтверждено?",
  "Какие есть риски?",
  "Почему данные устарели?",
  "Откуда информация?",
  "Что такое Property Passport?",
  "Что ESSA пока не умеет?"
];

export const propertySections = [
  { id: "overview", label: "Overview" },
  { id: "passport", label: "Passport" },
  { id: "compare", label: "Compare" },
  { id: "verification", label: "Verification" },
  { id: "sources", label: "Sources" },
  { id: "risks", label: "Risks" },
  { id: "documents", label: "Documents" },
  { id: "lisa", label: "Lisa" }
];

export const propertyGuideSteps = [
  { id: "what", title: "What is this property?", section: "overview" },
  { id: "known", title: "What facts are known?", section: "passport" },
  { id: "verified", title: "What is verified?", section: "verification" },
  { id: "freshness", title: "What is stale or missing?", section: "verification" },
  { id: "risks", title: "What are the risks?", section: "risks" },
  { id: "sources", title: "What are the sources?", section: "sources" },
  { id: "limits", title: "What ESSA cannot do yet.", section: "lisa" }
];

export const propertyCompareGuideSteps = [
  { id: "identity", title: "Identity", dimension: "identity" },
  { id: "price", title: "Price observations", dimension: "market" },
  { id: "freshness", title: "Freshness", dimension: "freshness" },
  { id: "verification", title: "Verification", dimension: "verification" },
  { id: "risks", title: "Risks", dimension: "risks" },
  { id: "gaps", title: "Evidence gaps", dimension: "gaps" },
  { id: "sources", title: "Sources", dimension: "sources" },
  { id: "limitations", title: "Limitations", dimension: "limitations" }
];

export function buildPropertyFixtureStates() {
  return Object.values(propertyDemoAliases).map((alias) => {
    const evidence = propertyReadService.buildPassportInput(alias.alias);
    return {
      id: alias.alias,
      propertyId: alias.propertyId,
      canonicalPropertyId: alias.propertyId,
      evidenceProfile: alias.evidenceProfile,
      label: alias.label,
      description: alias.description,
      property: evidence.property,
      facts: evidence.facts,
      sourceRefs: evidence.sourceRefs,
      listingSnapshots: evidence.listingSnapshots,
      lifecycleEvents: evidence.lifecycleEvents,
      project: evidence.project,
      building: evidence.building,
      unit: evidence.unit,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  });
}

function getFixtureState(fixtureId = "normal") {
  const states = buildPropertyFixtureStates();
  return states.find((state) => state.id === fixtureId || state.propertyId === fixtureId) || states[0];
}

export function parsePropertyHash(inputHash = window.location.hash || "#property") {
  const rawHash = inputHash || "#property";
  const query = rawHash.includes("?") ? rawHash.slice(rawHash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const section = params.get("section") || "overview";
  const guideRaw = Number.parseInt(params.get("guideStep") || "0", 10);
  const compareGuideRaw = Number.parseInt(params.get("compareGuideStep") || "0", 10);
  const discoveryGuideRaw = Number.parseInt(params.get("discoveryGuideStep") || "0", 10);
  const mode = params.get("mode") === "compare" || section === "compare"
    ? "compare"
    : params.get("mode") === "discover" || section === "discover"
      ? "discover"
      : "passport";
  const selectedItems = (params.get("items") || "normal,stale")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    fixtureId: params.get("fixture") || "normal",
    section: mode === "compare" ? "compare" : mode === "discover" ? "discover" : propertySections.some((item) => item.id === section) ? section : "overview",
    mode,
    discoveryQuery: params.get("q") || "",
    discoveryGuideActive: params.get("discoveryGuide") === "1",
    discoveryGuideStep: Number.isFinite(discoveryGuideRaw)
      ? Math.max(0, Math.min(propertyDiscoveryGuideSteps.length - 1, discoveryGuideRaw))
      : 0,
    selectedItems: selectedItems.length ? selectedItems.slice(0, 3) : ["normal", "stale"],
    guideActive: params.get("guide") === "1",
    guideStep: Number.isFinite(guideRaw)
      ? Math.max(0, Math.min(propertyGuideSteps.length - 1, guideRaw))
      : 0,
    compareGuideActive: params.get("compareGuide") === "1",
    compareGuideStep: Number.isFinite(compareGuideRaw)
      ? Math.max(0, Math.min(propertyCompareGuideSteps.length - 1, compareGuideRaw))
      : 0
  };
}

export function buildPropertyHash({
  fixtureId = "normal",
  section = "overview",
  mode = "passport",
  selectedItems = ["normal", "stale"],
  discoveryQuery = "",
  discoveryGuideActive = false,
  discoveryGuideStep = 0,
  guideActive = false,
  guideStep = 0,
  compareGuideActive = false,
  compareGuideStep = 0
} = {}) {
  const params = new URLSearchParams();
  if (mode === "discover" || section === "discover") {
    params.set("mode", "discover");
    if (discoveryQuery) params.set("q", discoveryQuery.slice(0, 140));
    if (discoveryGuideActive) {
      params.set("discoveryGuide", "1");
      params.set("discoveryGuideStep", String(Math.max(0, Math.min(propertyDiscoveryGuideSteps.length - 1, discoveryGuideStep))));
    }
    return `#property?${params.toString()}`;
  }
  if (mode === "compare" || section === "compare") {
    const items = (selectedItems || ["normal", "stale"]).filter(Boolean).slice(0, 3);
    params.set("mode", "compare");
    params.set("items", items.length ? items.join(",") : "normal,stale");
    if (compareGuideActive) {
      params.set("compareGuide", "1");
      params.set("compareGuideStep", String(Math.max(0, Math.min(propertyCompareGuideSteps.length - 1, compareGuideStep))));
    }
    return `#property?${params.toString()}`;
  }
  if (fixtureId && fixtureId !== "normal") params.set("fixture", fixtureId);
  if (section && section !== "overview") params.set("section", section);
  if (guideActive) {
    params.set("guide", "1");
    params.set("guideStep", String(Math.max(0, Math.min(propertyGuideSteps.length - 1, guideStep))));
  }
  const query = params.toString();
  return query ? `#property?${query}` : "#property";
}

function propertyElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}

function valueText(value) {
  if (value == null || value === "") return "Missing";
  return String(value);
}

function appendMetric(parent, label, value, options = {}) {
  const item = propertyElement("div", "property-metric");
  const key = propertyElement("span", "", label);
  const val = propertyElement("strong", "", valueText(value));
  if (options.testId) item.dataset.testid = options.testId;
  item.append(key, val);
  parent.append(item);
  return item;
}

function numericOrNull(value) {
  if (value == null || value === "") return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function countFacts(viewModel) {
  return {
    verified: viewModel.verificationSection.verifiedFacts.length,
    unverified: viewModel.verificationSection.unverifiedFacts.length,
    inferred: viewModel.verificationSection.inferredFacts.length
  };
}

function priceLabel(entry) {
  if (entry.price == null) return "Missing / not available";
  return `${entry.price} ${entry.currency || "Missing"}`;
}

function compareCurrencyStatus(entries) {
  const currencies = [...new Set(entries.map((entry) => entry.currency).filter(Boolean))];
  if (currencies.length > 1) return "NOT DIRECTLY COMPARABLE - currencies differ and FX conversion is not active.";
  if (currencies.length === 0) return "MISSING - no observed current prices in selected local fixtures.";
  return `Comparable only as observed ${currencies[0]} fixture prices. No live valuation is performed.`;
}

function factLabels(viewModel) {
  return [
    ...viewModel.verificationSection.verifiedFacts,
    ...viewModel.verificationSection.unverifiedFacts,
    ...viewModel.verificationSection.inferredFacts
  ].map((fact) => fact.label);
}

export function buildPropertyComparisonViewModel({
  itemIds = ["normal", "stale"],
  generatedAt = "2026-08-20T00:00:00.000Z"
} = {}) {
  const states = buildPropertyFixtureStates();
  const selectedIds = [...new Set(itemIds.filter(Boolean))].slice(0, 3);
  const safeIds = selectedIds.length >= 2 ? selectedIds : ["normal", "stale"];
  const selectedStates = safeIds
    .map((id) => states.find((state) => state.id === id))
    .filter(Boolean)
    .slice(0, 3);
  const compared = selectedStates.map((state) => {
    const passportResult = propertyReadService.getPropertyPassport(state.id, { generatedAt });
    const viewModel = passportResult.viewModel || buildPropertyPassportViewModel({ ...state, generatedAt });
    const factCounts = countFacts(viewModel);
    const gaps = viewModel.audit.gaps || [];
    const sourceRows = viewModel.sourcesSection.rows || [];
    const price = numericOrNull(viewModel.marketSection.observedPrice);
    return {
      fixtureId: state.id,
      label: state.label,
      description: state.description,
      propertyId: viewModel.propertyId,
      propertyType: viewModel.identitySection.propertyType || "Missing",
      location: [viewModel.locationSection.city, viewModel.locationSection.country].filter(Boolean).join(", ") || "Missing",
      hierarchy: {
        project: viewModel.hierarchySection.project,
        building: viewModel.hierarchySection.building,
        unit: viewModel.hierarchySection.unit
      },
      market: {
        observedPrice: price,
        currency: viewModel.marketSection.currency,
        listingStatus: viewModel.marketSection.listingStatus,
        observedAt: viewModel.marketSection.observedAt,
        source: viewModel.marketSection.source,
        freshness: viewModel.marketSection.badge.label
      },
      freshness: {
        status: viewModel.freshnessSection.freshness || "MISSING",
        label: viewModel.freshnessSection.badge.label,
        staleReason: viewModel.freshnessSection.staleReason || null
      },
      verification: {
        status: viewModel.identitySection.verificationStatus,
        confidence: viewModel.identitySection.confidence,
        ...factCounts
      },
      risks: {
        count: viewModel.risksSection.rows.length,
        flags: viewModel.risksSection.rows.map((row) => row.flag),
        explanations: viewModel.risksSection.rows.map((row) => row.explanation)
      },
      sources: {
        count: sourceRows.length,
        currentCount: sourceRows.filter((row) => row.freshnessStatus === "CURRENT").length,
        staleCount: sourceRows.filter((row) => row.freshnessStatus === "STALE").length,
        rows: sourceRows
      },
      gaps,
      missingFacts: factLabels(viewModel).length ? gaps : ["MISSING / NOT AVAILABLE"],
      documents: viewModel.documentsSection.rows,
      limitations: viewModel.limitationsSection.unavailableFeatures,
      viewModel,
      providerCalls: viewModel.providerCalls,
      externalCalls: viewModel.externalCalls,
      dbMutations: viewModel.dbMutations,
      payments: viewModel.payments,
      bookingActions: viewModel.bookingActions,
      transactionActions: viewModel.transactionActions
    };
  });

  const priced = compared.filter((entry) => entry.market.observedPrice != null);
  const lowestPrice = priced.length
    ? priced.reduce((lowest, entry) => entry.market.observedPrice < lowest.market.observedPrice ? entry : lowest, priced[0])
    : null;
  const mostVerified = compared.reduce((best, entry) => entry.verification.verified > best.verification.verified ? entry : best, compared[0]);
  const mostSources = compared.reduce((best, entry) => entry.sources.count > best.sources.count ? entry : best, compared[0]);
  const mostGaps = compared.reduce((worst, entry) => entry.gaps.length > worst.gaps.length ? entry : worst, compared[0]);
  const mostRisks = compared.reduce((worst, entry) => entry.risks.count > worst.risks.count ? entry : worst, compared[0]);
  const staleEntries = compared.filter((entry) => entry.freshness.status === "STALE" || entry.sources.staleCount > 0);

  const deltas = [
    lowestPrice ? {
      label: "LOWER OBSERVED PRICE",
      propertyId: lowestPrice.propertyId,
      fixtureId: lowestPrice.fixtureId,
      text: `${lowestPrice.label} has the lower observed fixture price: ${priceLabel({ price: lowestPrice.market.observedPrice, currency: lowestPrice.market.currency })}.`,
      sourceLineage: `${lowestPrice.market.source} / observed ${valueText(lowestPrice.market.observedAt)} / freshness ${lowestPrice.market.freshness}`
    } : {
      label: "OBSERVED PRICE MISSING",
      propertyId: "MISSING",
      fixtureId: "missing",
      text: "No selected local fixture has a current observed price.",
      sourceLineage: "No current listing source"
    },
    {
      label: "MORE VERIFIED DATA",
      propertyId: mostVerified.propertyId,
      fixtureId: mostVerified.fixtureId,
      text: `${mostVerified.label} has ${mostVerified.verification.verified} verified facts in this fixture comparison.`,
      sourceLineage: `${mostVerified.sources.count} source rows available`
    },
    {
      label: staleEntries.length ? "STALE DATA" : "CURRENT DATA",
      propertyId: staleEntries.map((entry) => entry.propertyId).join(", ") || "selected fixtures",
      fixtureId: staleEntries.map((entry) => entry.fixtureId).join(", ") || "selected",
      text: staleEntries.length
        ? `${staleEntries.map((entry) => entry.label).join(", ")} include stale fixture evidence.`
        : "Selected local fixtures do not expose stale listing evidence.",
      sourceLineage: staleEntries.map((entry) => `${entry.market.source} / observed ${valueText(entry.market.observedAt)}`).join("; ") || "Current local fixture sources"
    },
    {
      label: "STRONGER SOURCE COVERAGE",
      propertyId: mostSources.propertyId,
      fixtureId: mostSources.fixtureId,
      text: `${mostSources.label} has ${mostSources.sources.count} source rows, including ${mostSources.sources.currentCount} current and ${mostSources.sources.staleCount} stale.`,
      sourceLineage: mostSources.sources.rows.map((row) => `${row.source} / observed ${valueText(row.observedAt)} / ${row.freshnessStatus}`).join("; ")
    },
    {
      label: "MORE EVIDENCE GAPS",
      propertyId: mostGaps.propertyId,
      fixtureId: mostGaps.fixtureId,
      text: `${mostGaps.label} has ${mostGaps.gaps.length} listed evidence gaps: ${mostGaps.gaps.join(", ") || "none"}.`,
      sourceLineage: "Derived from local Passport audit gaps"
    },
    {
      label: "ADDITIONAL RISK FLAGS",
      propertyId: mostRisks.propertyId,
      fixtureId: mostRisks.fixtureId,
      text: `${mostRisks.label} has ${mostRisks.risks.count} risk flags: ${mostRisks.risks.flags.join(", ") || "none"}.`,
      sourceLineage: "Derived from local Passport risk flags"
    }
  ];

  return {
    viewModelType: "PropertyComparisonViewModel",
    selectedPropertyIds: compared.map((entry) => entry.propertyId),
    selectedFixtureIds: compared.map((entry) => entry.fixtureId),
    generatedAt,
    compared,
    currencyComparability: compareCurrencyStatus(compared.map((entry) => ({
      price: entry.market.observedPrice,
      currency: entry.market.currency
    }))),
    deltas,
    warnings: [
      "Comparison is factual and read-only; it is not a recommendation.",
      "Missing / not available does not mean worse.",
      "No FX conversion, ranking, investment score, live market analysis or legal conclusion is active."
    ],
    limitations: [
      "Uses local fixture Property Passport view models only.",
      "Does not create canonical facts.",
      "Does not call providers, DB, live search, maps, booking, payment or transaction systems."
    ],
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

function badgeNode(badge = {}, extraClass = "") {
  const badgeEl = propertyElement("span", `property-badge ${extraClass} tone-${badge.tone || "muted"}`.trim(), badge.label || "Missing");
  badgeEl.title = badge.description || "";
  badgeEl.dataset.badge = String(badge.label || "Missing").toUpperCase();
  return badgeEl;
}

function renderSection(title, className = "") {
  const section = propertyElement("section", `property-section ${className}`.trim());
  section.append(propertyElement("h3", "", title));
  return section;
}

function setSectionMetadata(section, sectionId) {
  section.dataset.propertySection = sectionId;
  section.id = `property-section-${sectionId}`;
  section.tabIndex = -1;
  return section;
}

function renderFacts(title, rows = [], emptyText = "No facts in local fixture.", options = {}) {
  const section = renderSection(title, "property-facts-section");
  if (options.sectionId) setSectionMetadata(section, options.sectionId);
  const list = propertyElement("div", "property-fact-list");
  if (!rows.length) {
    list.append(propertyElement("p", "property-empty", emptyText));
  }
  rows.forEach((row) => {
    const item = propertyElement("article", "property-fact-row");
    const header = propertyElement("div", "property-row-header");
    header.append(propertyElement("strong", "", row.label), badgeNode(row.badge));
    item.append(
      header,
      propertyElement("p", "", row.value),
      propertyElement("small", "property-fact-source-trace", `Source trace: ${row.source} / observed ${valueText(row.observedAt)} / confidence ${row.confidence} / verification ${row.verificationStatus}`)
    );
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderSources(viewModel) {
  const section = setSectionMetadata(renderSection("Sources"), "sources");
  const table = propertyElement("div", "property-source-table");
  viewModel.sourcesSection.rows.forEach((row) => {
    const source = propertyElement("article", "property-source-row");
    const header = propertyElement("div", "property-row-header");
    const sourceParts = String(row.source || "").split(" / ");
    header.append(propertyElement("strong", "", sourceParts[0] || row.source), badgeNode(row.freshnessBadge));
    source.append(
      header,
      propertyElement("p", "property-local-source-label", row.sourceType === "LOCAL_FIXTURE" ? "LOCAL DEMO SOURCE" : row.sourceType),
      propertyElement("p", "", `Source ID: ${sourceParts[1] || "Missing"}`),
      propertyElement("p", "", `Observed: ${valueText(row.observedAt)} / Effective: ${valueText(row.effectiveAt)}`),
      propertyElement("small", "", `freshness ${row.freshnessStatus} / confidence ${row.confidence} / verification ${row.verificationStatus}`)
    );
    table.append(source);
  });
  section.append(table);
  return section;
}

function renderRisks(viewModel) {
  const section = setSectionMetadata(renderSection("Risks", "property-risk-section"), "risks");
  const list = propertyElement("div", "property-risk-list");
  viewModel.risksSection.rows.forEach((row) => {
    const item = propertyElement("article", "property-risk-row");
    const related = row.flag.includes("OWNERSHIP")
      ? "Related fact/source: OWNERSHIP_STATUS / local listing fixture"
      : row.flag.includes("STALE")
        ? "Related fact/source: stale listing snapshot / local stale fixture"
        : row.flag.includes("LOCATION")
          ? "Related fact/source: geo precision / local fixture"
          : "Related fact/source: unverified facts in local passport";
    item.append(
      propertyElement("strong", "", row.flag),
      propertyElement("p", "", row.explanation),
      propertyElement("small", "", related),
      propertyElement("small", "", "Current user action: review only. Professional verification will be required before any future real-world action. Not a legal conclusion.")
    );
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderDocuments(viewModel) {
  const section = setSectionMetadata(renderSection("Documents"), "documents");
  const list = propertyElement("div", "property-document-list");
  viewModel.documentsSection.rows.forEach((row) => {
    const item = propertyElement("article", "property-document-row");
    item.append(propertyElement("strong", "", row.documentType), badgeNode(row.badge), propertyElement("span", "", row.status));
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderLimitations(viewModel) {
  const section = renderSection("Current Limitations", "property-limitations");
  const list = propertyElement("div", "property-limitation-list");
  viewModel.limitationsSection.unavailableFeatures.forEach((row) => {
    const item = propertyElement("article", "property-limitation-row");
    item.append(propertyElement("strong", "", row.feature), propertyElement("span", "", row.status), propertyElement("p", "", row.explanation));
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderVerificationDetail(viewModel) {
  const section = setSectionMetadata(renderSection("Verification", "property-verification-detail"), "verification");
  const legend = propertyElement("div", "property-status-legend");
  [
    ["Verified", "Supported by available local fixture evidence, not a legal guarantee."],
    ["Unverified", "Present in the Passport but not confirmed by ESSA."],
    ["Inferred", "A cautious interpretation, not a verified fact."],
    ["Stale", "Source may be outdated and needs review."],
    ["Missing", "Not available in the local fixture."]
  ].forEach(([label, description]) => {
    const item = propertyElement("article", "property-status-item");
    item.append(propertyElement("strong", "", label), propertyElement("p", "", description));
    legend.append(item);
  });
  section.append(
    propertyElement("p", "", `Verification status: ${viewModel.identitySection.verificationStatus}`),
    propertyElement("p", "", `Confidence: ${viewModel.identitySection.confidence}`),
    legend,
    renderFacts("Verified", viewModel.verificationSection.verifiedFacts),
    renderFacts("Unverified", viewModel.verificationSection.unverifiedFacts),
    renderFacts("Inferred", viewModel.verificationSection.inferredFacts),
    propertyElement("p", "", `Stale: ${viewModel.freshnessSection.badge.label === "Stale" ? viewModel.freshnessSection.staleReason : "No stale source is present in the selected local fixture."}`),
    propertyElement("p", "", `Missing: ${viewModel.audit.gaps?.join(", ") || "No gaps listed."}`)
  );
  return section;
}

function renderFutureActions(onAsk) {
  const section = renderSection("Guide / Next Steps", "property-next-step-section");
  const readonly = propertyElement("div", "property-readonly-actions");
  ["Ask Lisa", "Explain Passport", "View Sources", "View Risks"].forEach((label) => {
    const button = propertyElement("button", "property-readonly-action", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => onAsk(label));
    readonly.append(button);
  });

  const future = propertyElement("div", "property-future-actions");
  futureActions.forEach((label) => {
    const button = propertyElement("button", "property-future-action", `${label} / NOT ACTIVE YET`);
    button.type = "button";
    button.dataset.futureAction = label.toLowerCase().replaceAll(" ", "_");
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => onAsk(`${label} is not active yet`));
    future.append(button);
  });
  section.append(readonly, future);
  return section;
}

export function buildLocalLisaAnswer(question = "", viewModel = buildPropertyPassportViewModel()) {
  const lower = String(question).toLowerCase();
  if (lower.includes("section:sources") || lower.includes("source section")) {
    return "You are viewing Sources: each row is local demo evidence with source name, source id, observed/effective dates, freshness, confidence and verification status. No missing URL is invented.";
  }
  if (lower.includes("section:risks") || lower.includes("risk section")) {
    return "You are viewing Risks: these are review signals from the local Passport, not legal conclusions. Real action would require future professional verification.";
  }
  if (lower.includes("section:verification") || lower.includes("verification section")) {
    return "You are viewing Verification: verified, unverified, inferred, stale and missing are separated so ESSA does not turn uncertain evidence into a guarantee.";
  }
  if (lower.includes("подтверж") || lower.includes("verified")) {
    return `Подтверждено: ${viewModel.verificationSection.verifiedFacts.map((fact) => fact.label).join(", ") || "none"}. Неподтверждено: ${viewModel.verificationSection.unverifiedFacts.map((fact) => fact.label).join(", ") || "none"}.`;
  }
  if (lower.includes("риск") || lower.includes("risk")) {
    return viewModel.risksSection.rows.map((row) => row.explanation).join(" ") || "Risk flags are not present in this local fixture.";
  }
  if (lower.includes("устар") || lower.includes("stale")) {
    return viewModel.freshnessSection.staleReason || `Freshness is ${viewModel.freshnessSection.freshness}.`;
  }
  if (lower.includes("откуда") || lower.includes("source") || lower.includes("источник")) {
    return `Источники: ${viewModel.sourcesSection.rows.map((row) => row.source).join("; ") || "no local sources"}.`;
  }
  if (lower.includes("passport") || lower.includes("паспорт")) {
    return "Property Passport is a read-only factual surface: identity, listing evidence, source lineage, freshness, verification, gaps and risks. It is not a purchase, booking or legal verification.";
  }
  if (lower.includes("не умеет") || lower.includes("not active")) {
    return viewModel.limitationsSection.unavailableFeatures.map((row) => row.explanation).join(" ");
  }
  return viewModel.lisaExplanationSection.text;
}

export function buildPropertyUiContext({
  fixtureId = "normal",
  section = "overview",
  viewModel = buildPropertyPassportViewModel()
} = {}) {
  return {
    currentProduct: "ESSA_PROPERTY",
    currentRoute: buildPropertyHash({ fixtureId, section }),
    currentSection: section,
    fixture: fixtureId,
    propertyId: viewModel.propertyId,
    availableReadOnlyActions: [
      "open_overview",
      "open_passport",
      "open_compare",
      "open_verification",
      "open_sources",
      "open_risks",
      "open_documents",
      "ask_lisa",
      "guide_next",
      "guide_back",
      "exit_guide"
    ],
    executionEnabled: false,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

export function buildLisaSectionAnswer(section = "overview", viewModel = buildPropertyPassportViewModel()) {
  if (section === "sources") return buildLocalLisaAnswer("section:sources", viewModel);
  if (section === "risks") return buildLocalLisaAnswer("section:risks", viewModel);
  if (section === "verification") return buildLocalLisaAnswer("section:verification", viewModel);
  if (section === "documents") return "You are viewing Documents: this checklist shows which evidence is present, missing or future-only in the local Passport.";
  if (section === "passport") return "You are viewing the Passport: identity, location, market, facts, freshness, source lineage and limitations are presented as read-only evidence.";
  if (section === "lisa") return "You are viewing Lisa: Lisa explains the selected Property Passport in simple language and stays inside available read-only actions.";
  return buildLocalLisaAnswer("Что известно об объекте?", viewModel);
}

export function buildPropertyGuideStep(stepIndex = 0, viewModel = buildPropertyPassportViewModel()) {
  const safeIndex = Math.max(0, Math.min(propertyGuideSteps.length - 1, stepIndex));
  const step = propertyGuideSteps[safeIndex];
  const answers = {
    what: `${viewModel.identitySection.propertyType} ${viewModel.propertyId}, ${viewModel.locationSection.city}, ${viewModel.locationSection.country}.`,
    known: `Known facts: ${[
      ...viewModel.verificationSection.verifiedFacts,
      ...viewModel.verificationSection.unverifiedFacts,
      ...viewModel.verificationSection.inferredFacts
    ].map((fact) => fact.label).join(", ") || "none"}.`,
    verified: buildLocalLisaAnswer("Что подтверждено?", viewModel),
    freshness: `Freshness: ${viewModel.freshnessSection.freshness}. Missing: ${viewModel.audit.gaps?.join(", ") || "none"}.`,
    risks: buildLocalLisaAnswer("Какие есть риски?", viewModel),
    sources: buildLocalLisaAnswer("Откуда информация?", viewModel),
    limits: buildLocalLisaAnswer("Что ESSA пока не умеет?", viewModel)
  };
  return {
    ...step,
    index: safeIndex,
    total: propertyGuideSteps.length,
    answer: answers[step.id],
    canBack: safeIndex > 0,
    canNext: safeIndex < propertyGuideSteps.length - 1,
    executionEnabled: false
  };
}

export function buildLisaComparisonAnswer(question = "", comparison = buildPropertyComparisonViewModel()) {
  const lower = String(question).toLowerCase();
  const entries = comparison.compared || [];
  const names = entries.map((entry) => `${entry.label} (${entry.propertyId})`).join("; ");
  const stale = entries.filter((entry) => entry.freshness.status === "STALE" || entry.sources.staleCount > 0);
  const lowerPrice = comparison.deltas.find((delta) => delta.label === "LOWER OBSERVED PRICE");
  const mostVerified = comparison.deltas.find((delta) => delta.label === "MORE VERIFIED DATA");
  const moreGaps = comparison.deltas.find((delta) => delta.label === "MORE EVIDENCE GAPS");
  const moreRisks = comparison.deltas.find((delta) => delta.label === "ADDITIONAL RISK FLAGS");

  if (lower.includes("свеже") || lower.includes("fresh")) {
    return stale.length
      ? `Freshness differs: ${stale.map((entry) => entry.label).join(", ")} include stale local evidence. This is not live market freshness.`
      : "The selected local fixtures do not expose stale evidence, but ESSA still treats this as read-only fixture data.";
  }
  if (lower.includes("подтверж") || lower.includes("verified")) {
    return mostVerified?.text || "Verified fact counts are not available in this comparison.";
  }
  if (lower.includes("риск") || lower.includes("risk")) {
    return `${moreRisks?.text || "Risk flags are not available."} These are review signals, not legal conclusions.`;
  }
  if (lower.includes("дешев") || lower.includes("price") || lower.includes("cheaper")) {
    return `${lowerPrice?.text || "Observed prices are missing."} ${comparison.currencyComparability}`;
  }
  if (lower.includes("неизвест") || lower.includes("unknown") || lower.includes("missing")) {
    return `${moreGaps?.text || "Evidence gaps are not available."} Missing / not available is not treated as a negative score.`;
  }
  if (lower.includes("direct") || lower.includes("напрям")) {
    return comparison.currencyComparability;
  }
  return `This comparison includes ${names}. It shows identity, observed prices, freshness, verification, risks, sources and evidence gaps. It does not choose the best property or make financial, legal or investment recommendations.`;
}

export function buildPropertyCompareGuideStep(stepIndex = 0, comparison = buildPropertyComparisonViewModel()) {
  const safeIndex = Math.max(0, Math.min(propertyCompareGuideSteps.length - 1, stepIndex));
  const step = propertyCompareGuideSteps[safeIndex];
  const entries = comparison.compared || [];
  const answers = {
    identity: `Identity: ${entries.map((entry) => `${entry.label}: ${entry.propertyType}, ${entry.location}, ${entry.hierarchy.project} / ${entry.hierarchy.building} / ${entry.hierarchy.unit}`).join(" | ")}.`,
    price: `${buildLisaComparisonAnswer("price", comparison)} Source lineage remains attached to each observed price.`,
    freshness: buildLisaComparisonAnswer("freshness", comparison),
    verification: buildLisaComparisonAnswer("verified", comparison),
    risks: buildLisaComparisonAnswer("risk", comparison),
    gaps: buildLisaComparisonAnswer("missing", comparison),
    sources: `Source coverage: ${entries.map((entry) => `${entry.label}: ${entry.sources.count} sources (${entry.sources.currentCount} current, ${entry.sources.staleCount} stale)`).join("; ")}.`,
    limitations: comparison.limitations.join(" ")
  };
  return {
    ...step,
    index: safeIndex,
    total: propertyCompareGuideSteps.length,
    answer: answers[step.id],
    canBack: safeIndex > 0,
    canNext: safeIndex < propertyCompareGuideSteps.length - 1,
    executionEnabled: false
  };
}

export function buildPropertyComparisonUiContext({
  comparison = buildPropertyComparisonViewModel(),
  selectedItems = comparison.selectedFixtureIds,
  currentDimension = "overview"
} = {}) {
  return {
    currentProduct: "ESSA_PROPERTY",
    mode: "compare",
    currentRoute: buildPropertyHash({ mode: "compare", selectedItems }),
    selectedPropertyIds: comparison.selectedPropertyIds,
    selectedFixtureIds: selectedItems,
    currentComparisonDimension: currentDimension,
    availableComparisonActions: [
      "change_local_fixture_selection",
      "explain_identity",
      "explain_price_observations",
      "explain_freshness",
      "explain_verification",
      "explain_risks",
      "explain_evidence_gaps",
      "explain_sources",
      "guide_next",
      "guide_back",
      "exit_compare_guide"
    ],
    executionEnabled: false,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

function renderComparisonMetric(label, value, source = "") {
  const metric = propertyElement("div", "property-comparison-metric");
  metric.append(propertyElement("span", "", label), propertyElement("strong", "", valueText(value)));
  if (source) metric.append(propertyElement("small", "", source));
  return metric;
}

function renderPropertyComparison(comparison, routeState, panel) {
  const section = setSectionMetadata(renderSection("Property Comparison", "property-comparison-panel"), "compare");
  const intro = propertyElement("div", "property-comparison-intro");
  intro.append(
    propertyElement("p", "", "Read-only side-by-side comparison of local Property Passport fixtures. This is factual comparison, not a recommendation."),
    propertyElement("p", "", comparison.currencyComparability)
  );

  const chooser = propertyElement("div", "property-comparison-selector");
  chooser.append(propertyElement("strong", "", "Compare local fixtures"));
  buildPropertyFixtureStates().forEach((fixture) => {
    const button = propertyElement("button", comparison.selectedFixtureIds.includes(fixture.id) ? "active" : "", fixture.id);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.title = fixture.description;
    button.addEventListener("click", () => {
      const next = comparison.selectedFixtureIds.includes(fixture.id)
        ? comparison.selectedFixtureIds.filter((id) => id !== fixture.id)
        : comparison.selectedFixtureIds.concat(fixture.id);
      const safeNext = next.length < 2 ? comparison.selectedFixtureIds : next.slice(0, 3);
      window.location.hash = buildPropertyHash({ mode: "compare", selectedItems: safeNext });
      renderPropertyPassportUi(panel, { mode: "compare", section: "compare", selectedItems: safeNext });
    });
    chooser.append(button);
  });

  const cards = propertyElement("div", "property-comparison-grid");
  comparison.compared.forEach((entry) => {
    const card = propertyElement("article", "property-comparison-card");
    card.dataset.fixtureId = entry.fixtureId;
    const riskText = entry.risks.flags.length ? entry.risks.flags.join(", ") : "Missing / not available";
    const gapText = entry.gaps.length ? entry.gaps.join(", ") : "Missing / not available";
    card.append(
      propertyElement("h4", "", entry.label),
      badgeNode({ label: entry.freshness.label, tone: entry.freshness.label === "Stale" ? "danger" : entry.freshness.label === "Missing" ? "muted" : "success" }),
      renderComparisonMetric("Property ID", entry.propertyId),
      renderComparisonMetric("Type", entry.propertyType),
      renderComparisonMetric("Location", entry.location),
      renderComparisonMetric("Project / Building / Unit", `${entry.hierarchy.project} / ${entry.hierarchy.building} / ${entry.hierarchy.unit}`),
      renderComparisonMetric("Observed price", priceLabel({ price: entry.market.observedPrice, currency: entry.market.currency }), `${entry.market.source} / observed ${valueText(entry.market.observedAt)} / freshness ${entry.market.freshness}`),
      renderComparisonMetric("Listing status", entry.market.listingStatus),
      renderComparisonMetric("Verification", entry.verification.status),
      renderComparisonMetric("Verified / Unverified / Inferred", `${entry.verification.verified} / ${entry.verification.unverified} / ${entry.verification.inferred}`),
      renderComparisonMetric("Risks", `${entry.risks.count}: ${riskText}`),
      renderComparisonMetric("Sources", `${entry.sources.count} total / ${entry.sources.currentCount} current / ${entry.sources.staleCount} stale`),
      renderComparisonMetric("Evidence gaps", gapText)
    );
    cards.append(card);
  });

  const deltas = propertyElement("div", "property-comparison-deltas");
  comparison.deltas.forEach((delta) => {
    const item = propertyElement("article", "property-comparison-delta");
    item.append(
      propertyElement("strong", "", delta.label),
      propertyElement("p", "", delta.text),
      propertyElement("small", "", `Source lineage: ${delta.sourceLineage}`)
    );
    deltas.append(item);
  });

  const sourceLineage = renderSection("Source-Aware Comparison", "property-comparison-sources");
  comparison.compared.forEach((entry) => {
    const block = propertyElement("article", "property-source-row");
    block.append(propertyElement("strong", "", entry.label));
    entry.sources.rows.forEach((row) => {
      block.append(propertyElement("p", "", `${row.source} / observed ${valueText(row.observedAt)} / freshness ${row.freshnessStatus} / verification ${row.verificationStatus}`));
    });
    if (!entry.sources.rows.length) block.append(propertyElement("p", "", "Missing / not available"));
    sourceLineage.append(block);
  });

  const lisaPanel = renderSection("Lisa Comparison Explanation", "property-lisa-panel property-comparison-lisa");
  const uiContext = buildPropertyComparisonUiContext({
    comparison,
    selectedItems: comparison.selectedFixtureIds,
    currentDimension: propertyCompareGuideSteps[routeState.compareGuideStep]?.dimension || "overview"
  });
  const contextBlock = propertyElement("div", "property-lisa-context");
  contextBlock.append(
    propertyElement("span", "", `currentProduct=${uiContext.currentProduct}`),
    propertyElement("span", "", `mode=${uiContext.mode}`),
    propertyElement("span", "", `selectedPropertyIds=${uiContext.selectedPropertyIds.join(",")}`),
    propertyElement("span", "", `availableComparisonActions=${uiContext.availableComparisonActions.join(",")}`),
    propertyElement("span", "", `currentComparisonDimension=${uiContext.currentComparisonDimension}`)
  );
  const answer = propertyElement("p", "property-lisa-answer", buildLisaComparisonAnswer("Чем отличаются эти объекты?", comparison));
  const questions = propertyElement("div", "property-lisa-questions");
  [
    "Чем отличаются эти объекты?",
    "Где данные свежее?",
    "Где больше подтверждённых фактов?",
    "Какие риски различаются?",
    "Какой объект дешевле по наблюдаемой цене?",
    "Где больше неизвестных данных?",
    "Почему их нельзя сравнить напрямую?"
  ].forEach((question) => {
    const button = propertyElement("button", "property-lisa-question", question);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => {
      answer.textContent = buildLisaComparisonAnswer(question, comparison);
    });
    questions.append(button);
  });
  lisaPanel.append(propertyElement("strong", "", "LISA_ESSA_PRODUCT_GUIDE"), contextBlock, questions, answer);

  const guide = renderSection("GUIDE ME THROUGH THE COMPARISON", "property-guide-panel property-comparison-guide");
  const guideStep = buildPropertyCompareGuideStep(routeState.compareGuideStep, comparison);
  const guideContent = propertyElement("article", "property-guide-step");
  guideContent.append(
    propertyElement("strong", "", `${guideStep.index + 1}/${guideStep.total} ${guideStep.title}`),
    propertyElement("p", "", routeState.compareGuideActive ? guideStep.answer : "Start a safe read-only walkthrough of this comparison.")
  );
  const actions = propertyElement("div", "property-guide-actions");
  const start = propertyElement("button", "property-readonly-action", routeState.compareGuideActive ? "Restart Compare Guide" : "GUIDE ME THROUGH THE COMPARISON");
  start.type = "button";
  start.dataset.executionEnabled = "false";
  start.addEventListener("click", () => {
    window.location.hash = buildPropertyHash({ mode: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: true, compareGuideStep: 0 });
    renderPropertyPassportUi(panel, { mode: "compare", section: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: true, compareGuideStep: 0 });
  });
  const back = propertyElement("button", "property-readonly-action", "Back");
  back.type = "button";
  back.disabled = !routeState.compareGuideActive || !guideStep.canBack;
  back.dataset.executionEnabled = "false";
  back.addEventListener("click", () => {
    const nextStep = Math.max(0, guideStep.index - 1);
    window.location.hash = buildPropertyHash({ mode: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: true, compareGuideStep: nextStep });
    renderPropertyPassportUi(panel, { mode: "compare", section: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: true, compareGuideStep: nextStep });
  });
  const next = propertyElement("button", "property-readonly-action", "Next");
  next.type = "button";
  next.disabled = !routeState.compareGuideActive || !guideStep.canNext;
  next.dataset.executionEnabled = "false";
  next.addEventListener("click", () => {
    const nextStep = Math.min(propertyCompareGuideSteps.length - 1, guideStep.index + 1);
    window.location.hash = buildPropertyHash({ mode: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: true, compareGuideStep: nextStep });
    renderPropertyPassportUi(panel, { mode: "compare", section: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: true, compareGuideStep: nextStep });
  });
  const explain = propertyElement("button", "property-readonly-action", "Explain with Lisa");
  explain.type = "button";
  explain.dataset.executionEnabled = "false";
  explain.addEventListener("click", () => {
    answer.textContent = guideStep.answer;
    lisaPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const exit = propertyElement("button", "property-readonly-action", "Exit Compare Guide");
  exit.type = "button";
  exit.dataset.executionEnabled = "false";
  exit.addEventListener("click", () => {
    window.location.hash = buildPropertyHash({ mode: "compare", selectedItems: comparison.selectedFixtureIds });
    renderPropertyPassportUi(panel, { mode: "compare", section: "compare", selectedItems: comparison.selectedFixtureIds, compareGuideActive: false, compareGuideStep: 0 });
  });
  actions.append(start, back, next, explain, exit);
  guide.append(guideContent, actions);

  const warnings = renderSection("Warnings / Limitations", "property-limitations");
  comparison.warnings.concat(comparison.limitations).forEach((text) => warnings.append(propertyElement("p", "", text)));

  section.append(intro, chooser, cards, deltas, sourceLineage, lisaPanel, guide, warnings);
  return section;
}

function renderPropertyDiscovery(discovery, routeState, panel) {
  const section = setSectionMetadata(renderSection("Property Discovery", "property-discovery-panel"), "discover");
  section.dataset.discoveryStatus = discovery.status;
  section.dataset.matchedCount = String(discovery.matchedCount);

  const form = propertyElement("form", "property-discovery-search");
  const input = propertyElement("input");
  input.type = "search";
  input.name = "propertyQuery";
  input.value = routeState.discoveryQuery || "";
  input.placeholder = "Квартира в Батуми до 130000 USD";
  input.setAttribute("aria-label", "Property discovery query");
  const submit = propertyElement("button", "property-readonly-action", "Search local data");
  submit.type = "submit";
  submit.dataset.executionEnabled = "false";
  form.append(input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    window.location.hash = buildPropertyHash({ mode: "discover", discoveryQuery: query });
    renderPropertyPassportUi(panel, { mode: "discover", section: "discover", discoveryQuery: query });
  });

  const examples = propertyElement("div", "property-discovery-examples");
  ["Квартира в Батуми", "Объекты в Грузии", "Квартира до 130000 USD", "Что известно об объектах в Батуми?"].forEach((example) => {
    const button = propertyElement("button", "property-lisa-question", example);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => {
      window.location.hash = buildPropertyHash({ mode: "discover", discoveryQuery: example });
      renderPropertyPassportUi(panel, { mode: "discover", section: "discover", discoveryQuery: example });
    });
    examples.append(button);
  });

  const queryBlock = renderSection("Structured Query", "property-discovery-query");
  const queryGrid = propertyElement("div", "property-overview-metrics");
  ["country", "city", "propertyType", "currentStatus", "minPrice", "maxPrice", "currency", "listingType"].forEach((key) => {
    appendMetric(queryGrid, key, discovery.query[key] ?? "NOT_SPECIFIED");
  });
  queryBlock.append(queryGrid);

  const summary = propertyElement("div", "property-discovery-summary");
  summary.append(
    propertyElement("p", "", `${discovery.matchedCount} local repository result(s). Status: ${discovery.status}.`),
    propertyElement("p", "", `Freshness: current ${discovery.freshnessSummary.current}, stale ${discovery.freshnessSummary.stale}, missing ${discovery.freshnessSummary.missing}.`),
    propertyElement("p", "", `Missing evidence: incomplete ${discovery.missingEvidenceSummary.incomplete}, missing price ${discovery.missingEvidenceSummary.missingPrice}, professional review ${discovery.missingEvidenceSummary.needsProfessionalReview}.`)
  );

  const cards = propertyElement("div", "property-discovery-results");
  if (!discovery.results.length) {
    const empty = propertyElement("article", "property-discovery-card property-discovery-empty");
    empty.append(
      propertyElement("strong", "", "NO_MATCHES_IN_CURRENT_PROPERTY_DATA"),
      propertyElement("p", "", "В текущем локальном наборе ESSA подходящих объектов нет. Live Property Search пока не активирован.")
    );
    cards.append(empty);
  }
  discovery.results.forEach((result) => {
    const summaryItem = result.summary;
    const card = propertyElement("article", "property-discovery-card");
    card.dataset.propertyId = result.propertyId;
    card.dataset.fixtureId = result.alias || result.propertyId;
    const flags = result.states.length ? result.states.join(", ") : "KNOWN";
    const actions = propertyElement("div", "property-readonly-actions");
    const passport = propertyElement("button", "property-readonly-action", "View Passport");
    passport.type = "button";
    passport.dataset.executionEnabled = "false";
    passport.addEventListener("click", () => {
      window.location.hash = buildPropertyHash({ fixtureId: result.alias || result.propertyId, section: "passport" });
      renderPropertyPassportUi(panel, { fixtureId: result.alias || result.propertyId, section: "passport", mode: "passport" });
    });
    const compare = propertyElement("button", "property-readonly-action", "Compare");
    compare.type = "button";
    compare.dataset.executionEnabled = "false";
    compare.disabled = discovery.results.length < 2;
    compare.addEventListener("click", () => {
      const items = discovery.results.map((item) => item.alias || item.propertyId).slice(0, 3);
      window.location.hash = buildPropertyHash({ mode: "compare", selectedItems: items });
      renderPropertyPassportUi(panel, { mode: "compare", section: "compare", selectedItems: items });
    });
    const askLisa = propertyElement("button", "property-readonly-action", "Ask Lisa");
    askLisa.type = "button";
    askLisa.dataset.executionEnabled = "false";
    askLisa.addEventListener("click", () => {
      answer.textContent = createLisaPropertyDiscoveryExplanation(discovery).humanExplanation;
      lisaPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    actions.append(passport, compare, askLisa);
    card.append(
      propertyElement("h4", "", summaryItem.label || summaryItem.propertyId),
      badgeNode({ label: summaryItem.freshness, tone: summaryItem.freshness === "STALE" ? "danger" : "success", description: "Freshness from local source evidence." }),
      renderComparisonMetric("Property type", summaryItem.propertyType),
      renderComparisonMetric("Location", `${summaryItem.city}, ${summaryItem.country}`),
      renderComparisonMetric("Observed price", priceLabel({ price: summaryItem.observedPrice, currency: summaryItem.currency })),
      renderComparisonMetric("Current status", summaryItem.currentStatus),
      renderComparisonMetric("Verification", summaryItem.verificationStatus),
      renderComparisonMetric("Evidence", summaryItem.evidenceCompleteness),
      renderComparisonMetric("States", flags),
      renderComparisonMetric("Risk flags", summaryItem.primaryRiskFlags.join(", ") || "Missing / not available"),
      actions
    );
    cards.append(card);
  });

  const lisaPanel = renderSection("Lisa Discovery Explanation", "property-lisa-panel property-discovery-lisa");
  const lisa = createLisaPropertyDiscoveryExplanation(discovery);
  const answer = propertyElement("p", "property-lisa-answer", lisa.humanExplanation);
  const lisaQuestionsBlock = propertyElement("div", "property-lisa-questions");
  [
    "Сколько объектов найдено?",
    "Какие фильтры ты поняла?",
    "Что не указано?",
    "Где stale data?",
    "Где missing evidence?",
    "Почему это не live search?"
  ].forEach((question) => {
    const button = propertyElement("button", "property-lisa-question", question);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => {
      answer.textContent = lisa.humanExplanation;
    });
    lisaQuestionsBlock.append(button);
  });
  lisaPanel.append(propertyElement("strong", "", "LISA_ESSA_PRODUCT_GUIDE"), lisaQuestionsBlock, answer);

  const guide = renderSection("HELP ME FIND A PROPERTY", "property-guide-panel property-discovery-guide");
  const guideStep = buildPropertyDiscoveryGuideStep(routeState.discoveryGuideStep, discovery);
  const guideContent = propertyElement("article", "property-guide-step");
  guideContent.append(
    propertyElement("strong", "", `${guideStep.index + 1}/${guideStep.total} ${guideStep.title}`),
    propertyElement("p", "", routeState.discoveryGuideActive ? guideStep.answer : "Start a safe read-only guided property discovery flow. You can skip unknown fields.")
  );
  const guideActions = propertyElement("div", "property-guide-actions");
  const start = propertyElement("button", "property-readonly-action", routeState.discoveryGuideActive ? "Restart Discovery Guide" : "HELP ME FIND A PROPERTY");
  start.type = "button";
  start.dataset.executionEnabled = "false";
  start.addEventListener("click", () => {
    window.location.hash = buildPropertyHash({ mode: "discover", discoveryQuery: routeState.discoveryQuery, discoveryGuideActive: true, discoveryGuideStep: 0 });
    renderPropertyPassportUi(panel, { mode: "discover", section: "discover", discoveryQuery: routeState.discoveryQuery, discoveryGuideActive: true, discoveryGuideStep: 0 });
  });
  const back = propertyElement("button", "property-readonly-action", "Back");
  back.type = "button";
  back.disabled = !routeState.discoveryGuideActive || !guideStep.canBack;
  back.dataset.executionEnabled = "false";
  back.addEventListener("click", () => {
    const nextStep = Math.max(0, guideStep.index - 1);
    window.location.hash = buildPropertyHash({ mode: "discover", discoveryQuery: routeState.discoveryQuery, discoveryGuideActive: true, discoveryGuideStep: nextStep });
    renderPropertyPassportUi(panel, { mode: "discover", section: "discover", discoveryQuery: routeState.discoveryQuery, discoveryGuideActive: true, discoveryGuideStep: nextStep });
  });
  const next = propertyElement("button", "property-readonly-action", "Next");
  next.type = "button";
  next.disabled = !routeState.discoveryGuideActive || !guideStep.canNext;
  next.dataset.executionEnabled = "false";
  next.addEventListener("click", () => {
    const nextStep = Math.min(propertyDiscoveryGuideSteps.length - 1, guideStep.index + 1);
    window.location.hash = buildPropertyHash({ mode: "discover", discoveryQuery: routeState.discoveryQuery, discoveryGuideActive: true, discoveryGuideStep: nextStep });
    renderPropertyPassportUi(panel, { mode: "discover", section: "discover", discoveryQuery: routeState.discoveryQuery, discoveryGuideActive: true, discoveryGuideStep: nextStep });
  });
  guideActions.append(start, back, next);
  guide.append(guideContent, guideActions);

  const warnings = renderSection("Warnings / Limitations", "property-limitations");
  discovery.warnings.concat(discovery.limitations).forEach((text) => warnings.append(propertyElement("p", "", text)));

  section.append(form, examples, queryBlock, summary, cards, lisaPanel, guide, warnings);
  return section;
}

export function renderPropertyPassportUi(panel, options = {}) {
  if (!panel) return null;

  const routeState = {
    ...parsePropertyHash(),
    ...options
  };
  const fixtureId = routeState.fixtureId;
  const currentSection = routeState.mode === "compare" ? "compare" : routeState.mode === "discover" ? "discover" : routeState.section;
  const state = getFixtureState(fixtureId);
  const passportResult = propertyReadService.getPropertyPassport(state.id);
  const viewModel = passportResult.viewModel || buildPropertyPassportViewModel(state);
  const comparison = buildPropertyComparisonViewModel({ itemIds: routeState.selectedItems });
  const discovery = discoverProperties(routeState.discoveryQuery || "Квартира в Батуми");
  const propertyContext = buildBoundedPropertyContext({
    query: "Покажи read-only Property Passport",
    propertyId: state.id
  });
  const lisa = createLisaPropertyPassportExplanation(propertyContext);

  panel.hidden = false;
  panel.innerHTML = "";
  panel.dataset.activeFixture = state.id;
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.dbMutations = String(viewModel.dbMutations);
  panel.dataset.paymentActions = String(viewModel.payments);
  panel.dataset.bookingActions = String(viewModel.bookingActions);
  panel.dataset.transactionActions = String(viewModel.transactionActions);
  panel.dataset.currentSection = currentSection;
  panel.dataset.currentMode = routeState.mode || "passport";
  panel.dataset.selectedPropertyIds = currentSection === "discover"
    ? discovery.results.map((result) => result.propertyId).join(",")
    : comparison.selectedPropertyIds.join(",");
  panel.dataset.discoveryStatus = discovery.status;
  panel.dataset.discoveryMatchedCount = String(discovery.matchedCount);
  panel.dataset.currentRoute = buildPropertyHash({
    fixtureId: state.id,
    section: currentSection,
    mode: routeState.mode,
    selectedItems: routeState.selectedItems,
    discoveryQuery: routeState.discoveryQuery,
    discoveryGuideActive: routeState.discoveryGuideActive,
    discoveryGuideStep: routeState.discoveryGuideStep,
    guideActive: routeState.guideActive,
    guideStep: routeState.guideStep,
    compareGuideActive: routeState.compareGuideActive,
    compareGuideStep: routeState.compareGuideStep
  });
  panel.dataset.currentProduct = "ESSA_PROPERTY";
  panel.dataset.availableReadOnlyActions = "discover_property,open_overview,open_passport,open_compare,open_verification,open_sources,open_risks,open_documents,ask_lisa,guide_next,guide_back,exit_guide";

  const header = propertyElement("div", "module-section-header property-passport-header");
  header.append(
    propertyElement("span", "", "ESSA Property"),
    propertyElement("p", "", "Read-only Property Passport from local fixtures. Live execution is off.")
  );

  const intro = propertyElement("section", "property-intro");
  intro.append(
    propertyElement("h2", "", "ESSA Property / Real Estate"),
    propertyElement("p", "", "ESSA Property currently shows a local read-only Property Passport: facts, source lineage, freshness, risks, documents and Lisa explanations. It is not a live marketplace."),
    propertyElement("p", "", "Available now: local Property discovery, structured queries, Passport, Comparison, source/freshness/risk explanation and Lisa read-only guidance. Not active: live search, imports, booking, payment, transaction, ownership/legal verification and Property Stay.")
  );
  const introActions = propertyElement("div", "property-intro-actions");
  const discoveryBack = propertyElement("a", "property-discovery-return", "Back to Product Discovery");
  discoveryBack.href = "#product-discovery/search?q=property";
  const discoverLink = propertyElement("a", "property-discovery-return", "DISCOVER LOCAL PROPERTIES");
  discoverLink.href = buildPropertyHash({ mode: "discover", discoveryQuery: routeState.discoveryQuery || "Квартира в Батуми" });
  const passportLink = propertyElement("a", "property-discovery-return", "Open demo Property Passport");
  passportLink.href = buildPropertyHash({ fixtureId: state.id, section: "passport" });
  const compareLink = propertyElement("a", "property-discovery-return", "COMPARE PROPERTIES");
  compareLink.href = buildPropertyHash({ mode: "compare", selectedItems: routeState.selectedItems || ["normal", "stale"] });
  introActions.append(discoveryBack, discoverLink, passportLink, compareLink);
  intro.append(introActions);

  const nav = propertyElement("nav", "property-section-nav");
  nav.setAttribute("aria-label", "Property Passport sections");
  [{ id: "discover", label: "Discover" }, ...propertySections].forEach((section) => {
    const link = propertyElement("a", section.id === currentSection ? "active" : "", section.label);
    link.href = buildPropertyHash({
      fixtureId: state.id,
      section: section.id,
      mode: section.id === "compare" ? "compare" : section.id === "discover" ? "discover" : "passport",
      selectedItems: routeState.selectedItems,
      discoveryQuery: routeState.discoveryQuery,
      discoveryGuideActive: routeState.discoveryGuideActive,
      discoveryGuideStep: routeState.discoveryGuideStep,
      guideActive: routeState.guideActive,
      guideStep: routeState.guideStep
    });
    link.dataset.propertySectionTarget = section.id;
    nav.append(link);
  });

  const selector = propertyElement("section", "property-fixture-selector");
  selector.append(propertyElement("strong", "", "Local fixture state"));
  buildPropertyFixtureStates().forEach((fixture) => {
    const button = propertyElement("button", fixture.id === state.id ? "active" : "", fixture.label);
    button.type = "button";
    button.dataset.fixtureId = fixture.id;
    button.dataset.executionEnabled = "false";
    button.title = fixture.description;
    button.addEventListener("click", () => {
      window.location.hash = buildPropertyHash({
        fixtureId: fixture.id,
        section: currentSection,
        mode: currentSection === "compare" ? "compare" : "passport",
        selectedItems: routeState.selectedItems,
        guideActive: routeState.guideActive,
        guideStep: routeState.guideStep
      });
      renderPropertyPassportUi(panel, {
        fixtureId: fixture.id,
        section: currentSection,
        mode: currentSection === "compare" ? "compare" : "passport",
        selectedItems: routeState.selectedItems,
        guideActive: routeState.guideActive,
        guideStep: routeState.guideStep
      });
    });
    selector.append(button);
  });

  const overview = propertyElement("section", "property-overview");
  setSectionMetadata(overview, "overview");
  const overviewText = propertyElement("div", "property-overview-text");
  overviewText.append(
    propertyElement("h2", "", "Property Overview"),
    propertyElement("p", "", `${viewModel.identitySection.propertyType} / ${viewModel.propertyId}`),
    badgeNode(viewModel.freshnessSection.badge, "property-overview-badge"),
    badgeNode({ label: viewModel.identitySection.verificationStatus, tone: "info", description: "Verification state from local Property Passport." })
  );
  const metrics = propertyElement("div", "property-overview-metrics");
  appendMetric(metrics, "Property type", viewModel.identitySection.propertyType);
  appendMetric(metrics, "Property ID", viewModel.propertyId, { testId: "property-id" });
  appendMetric(metrics, "Country", viewModel.locationSection.country);
  appendMetric(metrics, "City", viewModel.locationSection.city);
  appendMetric(metrics, "Project", viewModel.hierarchySection.project);
  appendMetric(metrics, "Building", viewModel.hierarchySection.building);
  appendMetric(metrics, "Unit", viewModel.hierarchySection.unit);
  appendMetric(metrics, "Current status", viewModel.identitySection.currentStatus);
  appendMetric(metrics, "Observed listing price", viewModel.marketSection.observedPrice ?? "Missing", { testId: "property-price" });
  appendMetric(metrics, "Currency", viewModel.marketSection.currency || "Missing");
  appendMetric(metrics, "Freshness", viewModel.freshnessSection.freshness, { testId: "property-freshness" });
  appendMetric(metrics, "Verification status", viewModel.identitySection.verificationStatus);
  overview.append(overviewText, metrics);

  const passport = setSectionMetadata(propertyElement("section", "property-passport-grid"), "passport");

  const identity = renderSection("Identity");
  identity.append(
    propertyElement("p", "", `Property ID: ${viewModel.identitySection.propertyId}`),
    propertyElement("p", "", `Type: ${viewModel.identitySection.propertyType}`),
    propertyElement("p", "", `Hierarchy: ${viewModel.hierarchySection.project} / ${viewModel.hierarchySection.building} / ${viewModel.hierarchySection.unit}`)
  );

  const location = renderSection("Location");
  location.append(
    propertyElement("p", "", `${viewModel.locationSection.country} / ${viewModel.locationSection.region} / ${viewModel.locationSection.city}`),
    propertyElement("p", "", `Address precision: ${valueText(viewModel.locationSection.geo)}`)
  );

  const market = renderSection("Market");
  market.append(
    propertyElement("p", "", `Current observed listing: ${valueText(viewModel.marketSection.listingId)}`),
    propertyElement("p", "", `Price: ${valueText(viewModel.marketSection.observedPrice)} ${valueText(viewModel.marketSection.currency)}`),
    propertyElement("p", "", `Listing status: ${viewModel.marketSection.listingStatus}`),
    propertyElement("p", "", `Observed: ${valueText(viewModel.marketSection.observedAt)}`)
  );

  const freshness = renderSection("Freshness");
  freshness.append(
    badgeNode(viewModel.freshnessSection.badge),
    propertyElement("p", "property-stale-explanation", viewModel.freshnessSection.staleReason || "No stale source is present in the selected local fixture.")
  );

  const lisaPanel = setSectionMetadata(renderSection("Lisa Explanation", "property-lisa-panel"), "lisa");
  const lisaText = propertyElement("p", "property-lisa-text", lisa.humanExplanation);
  const uiContext = buildPropertyUiContext({ fixtureId: state.id, section: currentSection, viewModel });
  const contextBlock = propertyElement("div", "property-lisa-context");
  contextBlock.append(
    propertyElement("span", "", `currentProduct=${uiContext.currentProduct}`),
    propertyElement("span", "", `currentRoute=${uiContext.currentRoute}`),
    propertyElement("span", "", `currentSection=${uiContext.currentSection}`),
    propertyElement("span", "", `availableReadOnlyActions=${uiContext.availableReadOnlyActions.join(",")}`)
  );
  const questionList = propertyElement("div", "property-lisa-questions");
  const answer = propertyElement("p", "property-lisa-answer", buildLisaSectionAnswer(currentSection, viewModel));
  lisaQuestions.forEach((question) => {
    const button = propertyElement("button", "property-lisa-question", question);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => {
      answer.textContent = buildLocalLisaAnswer(question, viewModel);
    });
    questionList.append(button);
  });
  lisaPanel.append(propertyElement("strong", "", "LISA_ESSA_PRODUCT_GUIDE"), lisaText, contextBlock, questionList, answer);

  const guide = setSectionMetadata(renderSection("GUIDE ME THROUGH THIS PROPERTY", "property-guide-panel"), "guide");
  const activeGuideStep = buildPropertyGuideStep(routeState.guideStep, viewModel);
  const guideContent = propertyElement("article", "property-guide-step");
  guideContent.append(
    propertyElement("strong", "", `${activeGuideStep.index + 1}/${activeGuideStep.total} ${activeGuideStep.title}`),
    propertyElement("p", "", routeState.guideActive ? activeGuideStep.answer : "Start a safe read-only walkthrough of this Property Passport.")
  );
  const guideActions = propertyElement("div", "property-guide-actions");
  const startGuide = propertyElement("button", "property-readonly-action", routeState.guideActive ? "Restart Guide" : "GUIDE ME THROUGH THIS PROPERTY");
  startGuide.type = "button";
  startGuide.dataset.executionEnabled = "false";
  startGuide.addEventListener("click", () => {
    window.location.hash = buildPropertyHash({ fixtureId: state.id, section: "overview", guideActive: true, guideStep: 0 });
    renderPropertyPassportUi(panel, { fixtureId: state.id, section: "overview", guideActive: true, guideStep: 0 });
  });
  const backGuide = propertyElement("button", "property-readonly-action", "Back");
  backGuide.type = "button";
  backGuide.disabled = !routeState.guideActive || !activeGuideStep.canBack;
  backGuide.dataset.executionEnabled = "false";
  backGuide.addEventListener("click", () => {
    const nextStep = Math.max(0, activeGuideStep.index - 1);
    const step = propertyGuideSteps[nextStep];
    window.location.hash = buildPropertyHash({ fixtureId: state.id, section: step.section, guideActive: true, guideStep: nextStep });
    renderPropertyPassportUi(panel, { fixtureId: state.id, section: step.section, guideActive: true, guideStep: nextStep });
  });
  const nextGuide = propertyElement("button", "property-readonly-action", "Next");
  nextGuide.type = "button";
  nextGuide.disabled = !routeState.guideActive || !activeGuideStep.canNext;
  nextGuide.dataset.executionEnabled = "false";
  nextGuide.addEventListener("click", () => {
    const nextStep = Math.min(propertyGuideSteps.length - 1, activeGuideStep.index + 1);
    const step = propertyGuideSteps[nextStep];
    window.location.hash = buildPropertyHash({ fixtureId: state.id, section: step.section, guideActive: true, guideStep: nextStep });
    renderPropertyPassportUi(panel, { fixtureId: state.id, section: step.section, guideActive: true, guideStep: nextStep });
  });
  const explainGuide = propertyElement("button", "property-readonly-action", "Explain with Lisa");
  explainGuide.type = "button";
  explainGuide.dataset.executionEnabled = "false";
  explainGuide.addEventListener("click", () => {
    answer.textContent = activeGuideStep.answer;
    lisaPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const exitGuide = propertyElement("button", "property-readonly-action", "Exit Guide");
  exitGuide.type = "button";
  exitGuide.dataset.executionEnabled = "false";
  exitGuide.addEventListener("click", () => {
    window.location.hash = buildPropertyHash({ fixtureId: state.id, section: currentSection });
    renderPropertyPassportUi(panel, { fixtureId: state.id, section: currentSection, guideActive: false, guideStep: 0 });
  });
  guideActions.append(startGuide, backGuide, nextGuide, explainGuide, exitGuide);
  guide.append(guideContent, guideActions);
  const comparisonSection = renderPropertyComparison(comparison, routeState, panel);
  const discoverySection = renderPropertyDiscovery(discovery, routeState, panel);

  passport.append(
    identity,
    location,
    market,
    renderFacts("Verified Facts", viewModel.verificationSection.verifiedFacts),
    renderFacts("Unverified Facts", viewModel.verificationSection.unverifiedFacts),
    renderFacts("Inferred Facts", viewModel.verificationSection.inferredFacts, "No inferred facts in local fixture."),
    renderVerificationDetail(viewModel),
    renderSources(viewModel),
    freshness,
    renderRisks(viewModel),
    renderDocuments(viewModel),
    lisaPanel,
    renderLimitations(viewModel),
    renderFutureActions((question) => {
      answer.textContent = buildLocalLisaAnswer(question, viewModel);
      lisaPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );

  const sideEffects = propertyElement("section", "property-side-effects");
  sideEffects.append(
    propertyElement("strong", "", "Read-only proof"),
    propertyElement("p", "", `providerCalls=${viewModel.providerCalls} externalCalls=${viewModel.externalCalls} dbMutations=${viewModel.dbMutations} payments=${viewModel.payments} bookingActions=${viewModel.bookingActions} transactionActions=${viewModel.transactionActions}`),
    propertyElement("p", "", `propertyReadService providerCalls=${propertyReadService.providerCalls} externalCalls=${propertyReadService.externalCalls} dbMutations=${propertyReadService.dbMutations} payments=${propertyReadService.payments}`)
  );

  panel.append(header, intro, nav, selector, guide, overview, passport, sideEffects);
  if (currentSection === "compare") {
    panel.replaceChildren(header, intro, nav, selector, comparisonSection, sideEffects);
  }
  if (currentSection === "discover") {
    panel.replaceChildren(header, intro, nav, discoverySection, sideEffects);
  }
  requestAnimationFrame(() => {
    const target = panel.querySelector(`[data-property-section="${currentSection}"]`);
    if (target) {
      target.classList.add("active-section");
      if (currentSection !== "overview") target.scrollIntoView({ behavior: "auto", block: "start" });
    }
  });
  return { state, viewModel, propertyContext, lisa };
}
