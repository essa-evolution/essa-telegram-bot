import fs from "fs";
import path from "path";
import {
  createRepairProposal,
  createUIFinding,
  repairProposalStatuses,
  uiFindingSeverities,
  uiFindingStatuses,
  uiFindingTypes
} from "./uiRepairPlanning.js";

export const workspaceAuditViewports = [
  { id: "desktop", label: "DESKTOP", width: 1440, height: 900, screenshotName: "desktop_1440x900.png" },
  { id: "laptop", label: "LAPTOP", width: 1280, height: 720, screenshotName: "laptop_1280x720.png" },
  { id: "tablet", label: "TABLET", width: 768, height: 1024, screenshotName: "tablet_768x1024.png" },
  { id: "mobile", label: "MOBILE", width: 390, height: 844, screenshotName: "mobile_390x844.png" }
];

export const viewportComparisonStatuses = {
  pass: "PASS",
  passWithWarnings: "PASS_WITH_WARNINGS",
  fail: "FAIL",
  visualReviewRequired: "VISUAL_REVIEW_REQUIRED"
};

export const responsiveClassifications = {
  responsive: "RESPONSIVE",
  partiallyResponsive: "PARTIALLY_RESPONSIVE",
  desktopOnly: "DESKTOP_ONLY",
  unknown: "UNKNOWN"
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeRegions(artifact = {}) {
  return safeArray(artifact.layoutEvidence?.criticalRegions).map((region) => ({
    key: region.key,
    selector: region.selector,
    exists: region.exists,
    visible: region.visible,
    zeroSize: region.zeroSize,
    outsideViewport: region.outsideViewport,
    rect: region.rect
      ? {
          x: region.rect.x,
          y: region.rect.y,
          width: region.rect.width,
          height: region.rect.height,
          right: region.rect.right,
          bottom: region.rect.bottom
        }
      : null
  }));
}

function findingEvidence(kind, detail = {}) {
  return [{ kind, ...detail }];
}

function isExpectedHiddenRegion(region = {}) {
  return region.key === "productionStudioPanel" &&
    region.rect?.display === "none" &&
    region.rect?.hidden === true;
}

function isHorizontallyOutsideViewport(region = {}, viewport = {}) {
  const rect = region.rect;
  return Boolean(rect && (rect.x < 0 || rect.right > viewport.width));
}

function viewportFindingBase({ artifact, viewport, type, severity, confidence, location, summary, evidence, userImpact, verificationMethod }) {
  return {
    type,
    severity,
    confidence,
    target: artifact.target,
    location,
    summary,
    evidence,
    screenshotRef: artifact.screenshotRef,
    domEvidence: summarizeRegions(artifact),
    consoleEvidence: safeArray(artifact.consoleErrors),
    resourceEvidence: safeArray(artifact.failedRequests),
    userImpact,
    verificationMethod,
    requiresVisualReview: false,
    status: uiFindingStatuses.confirmed,
    projectId: artifact.projectId,
    taskId: artifact.taskId,
    traceId: artifact.traceId,
    viewport: {
      id: viewport.id,
      label: viewport.label,
      width: viewport.width,
      height: viewport.height
    }
  };
}

export function detectViewportFindings(artifact = {}, viewport = {}) {
  const layout = artifact.layoutEvidence || {};
  const findings = [];

  if (layout.horizontalOverflow) {
    findings.push(createUIFinding(viewportFindingBase({
      artifact,
      viewport,
      type: uiFindingTypes.layoutOverflow,
      severity: layout.horizontalOverflowPixels > 80 ? uiFindingSeverities.medium : uiFindingSeverities.low,
      confidence: 0.95,
      location: "document.documentElement",
      summary: `${viewport.label} has horizontal document overflow of ${layout.horizontalOverflowPixels}px.`,
      evidence: findingEvidence("horizontal_overflow", {
        scrollWidth: layout.documentMetrics?.scrollWidth,
        viewportWidth: layout.viewport?.width,
        overflowPixels: layout.horizontalOverflowPixels
      }),
      userImpact: "Users may need to scroll sideways or may miss clipped content at this viewport.",
      verificationMethod: "document.documentElement.scrollWidth > window.innerWidth"
    })));
  }

  for (const region of safeArray(layout.criticalRegions)) {
    if (!region.exists) {
      findings.push(createUIFinding(viewportFindingBase({
        artifact,
        viewport,
        type: uiFindingTypes.missingElement,
        severity: ["workspaceShell", "mainPanel", "workspaceTitle"].includes(region.key)
          ? uiFindingSeverities.high
          : uiFindingSeverities.medium,
        confidence: 0.96,
        location: region.selector,
        summary: `${region.key} is missing at ${viewport.label}.`,
        evidence: findingEvidence("missing_critical_region", { key: region.key, selector: region.selector }),
        userImpact: "A critical Workspace region is not available in the DOM.",
        verificationMethod: "document.querySelector(selector) returned null"
      })));
      continue;
    }

    if (region.zeroSize && !isExpectedHiddenRegion(region)) {
      findings.push(createUIFinding(viewportFindingBase({
        artifact,
        viewport,
        type: uiFindingTypes.blankRegion,
        severity: uiFindingSeverities.medium,
        confidence: 0.92,
        location: region.selector,
        summary: `${region.key} has zero-size geometry at ${viewport.label}.`,
        evidence: findingEvidence("zero_size_region", { key: region.key, selector: region.selector, rect: region.rect }),
        userImpact: "A present critical region may not be usable or visible.",
        verificationMethod: "getBoundingClientRect width/height check"
      })));
    }

    if (
      region.visible &&
      region.outsideViewport &&
      !["workspaceShell"].includes(region.key) &&
      isHorizontallyOutsideViewport(region, layout.viewport || viewport)
    ) {
      findings.push(createUIFinding(viewportFindingBase({
        artifact,
        viewport,
        type: uiFindingTypes.layoutOverflow,
        severity: uiFindingSeverities.low,
        confidence: 0.88,
        location: region.selector,
        summary: `${region.key} extends outside the ${viewport.label} viewport.`,
        evidence: findingEvidence("outside_viewport_region", {
          key: region.key,
          selector: region.selector,
          rect: region.rect,
          viewport: layout.viewport
        }),
        userImpact: "A visible critical region may be partially inaccessible without scrolling.",
        verificationMethod: "getBoundingClientRect compared with viewport bounds"
      })));
    }
  }

  for (const overlap of safeArray(layout.geometryOverlaps)) {
    findings.push(createUIFinding(viewportFindingBase({
      artifact,
      viewport,
      type: uiFindingTypes.layoutOverflow,
      severity: overlap.smallerAreaRatio > 0.6 ? uiFindingSeverities.medium : uiFindingSeverities.low,
      confidence: 0.82,
      location: `${overlap.a} / ${overlap.b}`,
      summary: `${viewport.label} has geometry-backed overlap between ${overlap.a} and ${overlap.b}.`,
      evidence: findingEvidence("geometry_overlap", overlap),
      userImpact: "Overlapping critical regions may obscure interaction targets or content.",
      verificationMethod: "bounding-box intersection area ratio"
    })));
  }

  for (const clipped of safeArray(layout.clippedTextElements)) {
    const finding = createUIFinding(viewportFindingBase({
      artifact,
      viewport,
      type: uiFindingTypes.visualReviewRequired,
      severity: clipped.horizontallyClipped ? uiFindingSeverities.medium : uiFindingSeverities.low,
      confidence: 0.86,
      location: clipped.className ? `${clipped.tagName}.${clipped.className.split(/\s+/).join(".")}` : clipped.tagName,
      summary: `${viewport.label} has measurable clipped visible text: "${clipped.text}".`,
      evidence: findingEvidence("clipped_text_element", clipped),
      userImpact: "A visible navigation or control label may be truncated for users at this viewport.",
      verificationMethod: "element scroll/client geometry and viewport bounds"
    }));
    finding.requiresVisualReview = true;
    findings.push(finding);
  }

  for (const error of safeArray(artifact.consoleErrors)) {
    findings.push(createUIFinding(viewportFindingBase({
      artifact,
      viewport,
      type: uiFindingTypes.consoleError,
      severity: uiFindingSeverities.low,
      confidence: 0.9,
      location: "browser console",
      summary: `${viewport.label} console warning/error was recorded.`,
      evidence: findingEvidence("console_error", { message: String(error).slice(0, 300) }),
      userImpact: "Console errors may indicate broken UI behavior or missing assets.",
      verificationMethod: "Playwright console event capture"
    })));
  }

  for (const error of safeArray(artifact.pageErrors)) {
    findings.push(createUIFinding(viewportFindingBase({
      artifact,
      viewport,
      type: uiFindingTypes.pageError,
      severity: uiFindingSeverities.high,
      confidence: 0.95,
      location: "page runtime",
      summary: `${viewport.label} page error was recorded.`,
      evidence: findingEvidence("page_error", { message: String(error).slice(0, 300) }),
      userImpact: "Runtime page errors can prevent Workspace functions from working.",
      verificationMethod: "Playwright pageerror event capture"
    })));
  }

  for (const request of safeArray(artifact.failedRequests)) {
    findings.push(createUIFinding(viewportFindingBase({
      artifact,
      viewport,
      type: uiFindingTypes.failedResource,
      severity: uiFindingSeverities.medium,
      confidence: 0.93,
      location: "local resource request",
      summary: `${viewport.label} failed local resource request was recorded.`,
      evidence: findingEvidence("failed_request", { request: String(request).slice(0, 300) }),
      userImpact: "Missing resources may break visual or functional UI regions.",
      verificationMethod: "Playwright requestfailed event capture"
    })));
  }

  return findings;
}

export function createRepairProposalsForFindings(findings = []) {
  return safeArray(findings)
    .filter((finding) => finding.status === uiFindingStatuses.confirmed)
    .map((finding) => {
      const likelyLayer = finding.type === uiFindingTypes.layoutOverflow ||
        finding.type === uiFindingTypes.blankRegion
        ? "workspace CSS/layout/responsive breakpoint"
        : "workspace runtime/resource handling";

      return createRepairProposal({
        findingId: finding.findingId,
        proposedAction: `Investigate ${finding.location} and adjust the ${likelyLayer} only after explicit repair approval.`,
        rationale: finding.summary,
        likelyFiles: [
          "workspace/styles.css",
          "workspace/index.html",
          "workspace/app.js"
        ],
        likelyLayer,
        changeClass: "LOCAL_UI_REPAIR_CANDIDATE",
        riskLevel: finding.severity === uiFindingSeverities.high ? "MEDIUM" : "LOW",
        requiresCodeChange: true,
        requiresBrowserMutation: false,
        requiresExternalProvider: false,
        expectedOutcome: "Measured UI defect is resolved without changing Workspace behavior outside the affected layout/resource boundary.",
        verificationPlan: [
          "Apply one approved local patch only.",
          "Run one localhost read-only multi-viewport reobserve.",
          "Confirm the specific measured finding no longer appears.",
          "Confirm interactionCount and mutationCount remain 0."
        ],
        rollbackPlan: "Revert the approved patch and preserve before/after audit artifacts.",
        confidence: finding.confidence,
        approvalRequired: true,
        status: repairProposalStatuses.waitingForApproval
      });
    });
}

function commonKeys(results = []) {
  const sets = results.map((result) =>
    new Set(safeArray(result.criticalInventory).filter((item) => item.exists).map((item) => item.key))
  );
  if (!sets.length) return [];
  return [...sets[0]].filter((key) => sets.every((set) => set.has(key)));
}

function classifyResponsive(results = []) {
  if (!results.length) return responsiveClassifications.unknown;
  const mobile = results.find((result) => result.viewport.id === "mobile");
  const desktop = results.find((result) => result.viewport.id === "desktop");
  const allCorePresent = results.every((result) =>
    ["workspaceShell", "workspaceNavigation", "mainPanel", "workspaceTitle"]
      .every((key) => result.criticalInventory.some((item) => item.key === key && item.exists && item.visible))
  );
  const overflowCount = results.filter((result) => result.horizontalOverflow).length;

  if (!allCorePresent) return responsiveClassifications.desktopOnly;
  if (overflowCount === 0) return responsiveClassifications.responsive;
  if (desktop && !desktop.horizontalOverflow && mobile?.horizontalOverflow) {
    return responsiveClassifications.partiallyResponsive;
  }
  return responsiveClassifications.partiallyResponsive;
}

export function createViewportComparisonArtifact({
  target,
  results = [],
  findings = [],
  repairProposals = []
} = {}) {
  const failedResults = results.filter((result) => result.status === "FAIL");
  const warnings = findings.length || results.some((result) => result.status === "PASS_WITH_WARNINGS");
  const visualReviewRequired = findings.some((finding) => finding.requiresVisualReview);
  const overallStatus = failedResults.length
    ? viewportComparisonStatuses.fail
    : visualReviewRequired
      ? viewportComparisonStatuses.visualReviewRequired
      : warnings
        ? viewportComparisonStatuses.passWithWarnings
        : viewportComparisonStatuses.pass;

  return {
    artifactId: createId("viewport_comparison"),
    type: "viewport_comparison",
    target,
    createdAt: new Date().toISOString(),
    overallStatus,
    responsiveClassification: classifyResponsive(results),
    commonElements: commonKeys(results),
    viewportResults: results,
    overflowDifferences: results.map((result) => ({
      viewport: result.viewport.id,
      horizontalOverflow: result.horizontalOverflow,
      overflowPixels: result.horizontalOverflowPixels
    })),
    visibilityDifferences: results.map((result) => ({
      viewport: result.viewport.id,
      hiddenOrMissing: result.criticalInventory
        .filter((item) => !item.exists || !item.visible)
        .map((item) => item.key)
    })),
    errorsByViewport: results.map((result) => ({
      viewport: result.viewport.id,
      consoleErrors: result.consoleErrors,
      pageErrors: result.pageErrors,
      failedRequests: result.failedRequests
    })),
    findingsByViewport: workspaceAuditViewports.map((viewport) => ({
      viewport: viewport.id,
      findings: findings.filter((finding) => finding.viewport?.id === viewport.id)
    })),
    screenshots: results.map((result) => ({
      viewport: result.viewport.id,
      screenshotRef: result.screenshotRef
    })),
    repairProposals,
    interactionCount: results.reduce((sum, result) => sum + result.interactionCount, 0),
    mutationCount: results.reduce((sum, result) => sum + result.mutationCount, 0)
  };
}

export function createMultiViewportObservationContext(comparison = {}) {
  return {
    status: comparison.overallStatus,
    target: comparison.target,
    responsiveClassification: comparison.responsiveClassification,
    viewportSummaries: safeArray(comparison.viewportResults).map((result) => ({
      viewport: result.viewport,
      status: result.status,
      horizontalOverflow: result.horizontalOverflow,
      overflowPixels: result.horizontalOverflowPixels,
      workspacePresent: result.criticalInventory.some((item) => item.key === "workspaceShell" && item.exists),
      navigatorPresent: result.criticalInventory.some((item) => item.key === "workspaceTitle" && item.exists),
      screenshotRef: result.screenshotRef,
      consoleErrorCount: result.consoleErrors.length,
      pageErrorCount: result.pageErrors.length,
      failedRequestCount: result.failedRequests.length
    })),
    confirmedFindings: safeArray(comparison.findingsByViewport).flatMap((item) =>
      safeArray(item.findings).map((finding) => ({
        findingId: finding.findingId,
        type: finding.type,
        severity: finding.severity,
        confidence: finding.confidence,
        viewport: finding.viewport,
        location: finding.location,
        summary: finding.summary,
        screenshotRef: finding.screenshotRef,
        evidence: safeArray(finding.evidence).slice(0, 3)
      }))
    ),
    repairProposals: safeArray(comparison.repairProposals).map((proposal) => ({
      proposalId: proposal.proposalId,
      findingId: proposal.findingId,
      likelyFiles: proposal.likelyFiles,
      likelyLayer: proposal.likelyLayer,
      status: proposal.status,
      approvalRequired: proposal.approvalRequired
    })),
    screenshots: comparison.screenshots,
    repairConstraints: {
      noRepairExecutionInPhase20R: true,
      browserInteractionDisabled: true,
      externalProvidersDisabled: true,
      fullDomExcluded: true
    },
    bounded: true
  };
}

export function createViewportResult({ artifact, viewport, verification }) {
  const layout = artifact.layoutEvidence || {};
  return {
    viewport,
    status: verification?.status || artifact.verificationStatus || "UNKNOWN",
    finalUrl: artifact.finalUrl,
    title: artifact.title,
    screenshotRef: artifact.screenshotRef,
    horizontalOverflow: Boolean(layout.horizontalOverflow),
    horizontalOverflowPixels: layout.horizontalOverflowPixels || 0,
    documentMetrics: layout.documentMetrics || null,
    criticalInventory: summarizeRegions(artifact),
    consoleErrors: safeArray(artifact.consoleErrors),
    pageErrors: safeArray(artifact.pageErrors),
    failedRequests: safeArray(artifact.failedRequests),
    interactionCount: artifact.interactionCount || 0,
    mutationCount: artifact.mutationCount || 0,
    verification
  };
}

export function saveMultiViewportAuditArtifacts({
  comparison,
  context,
  artifacts = [],
  outputDir
} = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const paths = {
    comparisonPath: path.join(outputDir, "viewport_comparison_artifact.json"),
    contextPath: path.join(outputDir, "multi_viewport_observation_context.json"),
    findingsPath: path.join(outputDir, "ui_findings.json"),
    repairProposalsPath: path.join(outputDir, "repair_proposals.json")
  };
  fs.writeFileSync(paths.comparisonPath, `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.contextPath, `${JSON.stringify(context, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.findingsPath, `${JSON.stringify(safeArray(comparison.findingsByViewport).flatMap((item) => item.findings), null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.repairProposalsPath, `${JSON.stringify(comparison.repairProposals, null, 2)}\n`, "utf8");

  for (const artifact of artifacts) {
    const id = artifact.viewportDescriptor?.id || artifact.viewport?.id || artifact.layoutEvidence?.viewport?.width || "viewport";
    fs.writeFileSync(
      path.join(outputDir, `${id}_browser_observation_artifact.json`),
      `${JSON.stringify(artifact, null, 2)}\n`,
      "utf8"
    );
  }

  return paths;
}
