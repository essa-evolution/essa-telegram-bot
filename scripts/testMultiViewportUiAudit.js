import fs from "fs";
import path from "path";
import {
  browserObservationStatuses,
  createBrowserObservationArtifact,
  createMultiViewportObservationContext,
  createPlaywrightBrowserVerificationProvider,
  createRepairProposalsForFindings,
  createViewportComparisonArtifact,
  createViewportResult,
  detectViewportFindings,
  responsiveClassifications,
  uiFindingStatuses,
  uiFindingTypes,
  validateBrowserObservationInput,
  viewportComparisonStatuses,
  workspaceAuditViewports
} from "../src/agentToolLayer/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const artifactDir = "artifacts/agentToolLayer/browser/phase20r";
const expectedViewports = [
  ["desktop", 1440, 900],
  ["laptop", 1280, 720],
  ["tablet", 768, 1024],
  ["mobile", 390, 844]
];

check(
  workspaceAuditViewports.length === 4 &&
    expectedViewports.every(([id, width, height]) =>
      workspaceAuditViewports.some((viewport) => viewport.id === id && viewport.width === width && viewport.height === height)
    ),
  "A Phase 20R declares the exact required four viewports",
  workspaceAuditViewports
);

for (const [id] of expectedViewports) {
  const artifactPath = path.join(artifactDir, `${id}_browser_observation_artifact.json`);
  const artifactExists = fs.existsSync(artifactPath);
  check(artifactExists, `B ${id} observation artifact exists after approved run`, { artifactPath });
  if (artifactExists) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    check(
      artifact.finalUrl === "http://localhost:3000/workspace/#navigator" &&
        artifact.interactionCount === 0 &&
        artifact.mutationCount === 0 &&
        fs.existsSync(artifact.screenshotRef),
      `C ${id} observation is localhost read-only with screenshot`,
      {
        finalUrl: artifact.finalUrl,
        screenshotRef: artifact.screenshotRef,
        interactionCount: artifact.interactionCount,
        mutationCount: artifact.mutationCount
      }
    );
  }
}

const externalValidation = validateBrowserObservationInput({
  url: "https://example.com/workspace/#navigator",
  operation: "browser_observe"
});
check(
  externalValidation.ok === false && externalValidation.errors.includes("external_url_blocked"),
  "D external navigation is blocked before browser execution",
  externalValidation
);

const provider = createPlaywrightBrowserVerificationProvider();
for (const [label, operation, expectedReason] of [
  ["E click interaction is blocked", "click primary button", "forbidden_click_request"],
  ["F form mutation is blocked", "type and submit form", "forbidden_type_request"],
  ["G storage inspection is blocked", "inspect cookies localStorage", "forbidden_localstorage_request"]
]) {
  const blocked = await provider.observe({
    executionIntent: { normalizedInput: { url: "http://localhost:3000/workspace/#navigator", operation } },
    gateResult: { decision: "READY", safeInput: { url: "http://localhost:3000/workspace/#navigator", operation } }
  });
  check(
    blocked.ok === false &&
      blocked.status === browserObservationStatuses.blocked &&
      blocked.reason === expectedReason,
    label,
    blocked
  );
}

const mockScreenshot = path.join(artifactDir, "mock_multiviewport.png");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(mockScreenshot, "mock screenshot placeholder", "utf8");

function mockArtifact(layoutEvidence) {
  return createBrowserObservationArtifact({
    target: "http://localhost:3000/workspace/#navigator",
    finalUrl: "http://localhost:3000/workspace/#navigator",
    title: "ESSA Workspace",
    viewport: layoutEvidence.viewport,
    layoutEvidence,
    domStatus: "loaded",
    visibleSections: ["Workspace root", "Navigator surface", "Production Studio"],
    visibleNavigation: ["Chat ESSA Navigator", "ESSA Production Studio"],
    visibleTextSummary: ["ESSA Workspace Navigator visible with primary content."],
    screenshotRef: mockScreenshot,
    interactionCount: 0,
    mutationCount: 0,
    providerProvenance: { providerId: "playwright_browser_verification", providerSelfVerified: false },
    projectId: "phase20r_project",
    taskId: "phase20r_task",
    traceId: "phase20r_mock_trace"
  });
}

const healthyLayout = {
  viewport: { width: 390, height: 844 },
  documentMetrics: { scrollWidth: 390, clientWidth: 390, scrollHeight: 900, clientHeight: 844 },
  horizontalOverflow: false,
  horizontalOverflowPixels: 0,
  criticalRegions: [
    { key: "workspaceShell", selector: ".workspace-shell", exists: true, visible: true, zeroSize: false, outsideViewport: false, rect: { x: 0, y: 0, width: 390, height: 844, right: 390, bottom: 844 } },
    { key: "workspaceNavigation", selector: ".sidebar", exists: true, visible: true, zeroSize: false, outsideViewport: false, rect: { x: 0, y: 0, width: 80, height: 844, right: 80, bottom: 844 } },
    { key: "mainPanel", selector: ".main-panel", exists: true, visible: true, zeroSize: false, outsideViewport: false, rect: { x: 80, y: 0, width: 310, height: 844, right: 390, bottom: 844 } },
    { key: "workspaceTitle", selector: "#workspace-title", exists: true, visible: true, zeroSize: false, outsideViewport: false, rect: { x: 96, y: 16, width: 220, height: 32, right: 316, bottom: 48 } }
  ],
  geometryOverlaps: [],
  visibleTextLength: 120
};

const healthyFindings = detectViewportFindings(mockArtifact(healthyLayout), workspaceAuditViewports[3]);
check(healthyFindings.length === 0, "H healthy measurements do not invent a defect", healthyFindings);

const overflowFindings = detectViewportFindings(mockArtifact({
  ...healthyLayout,
  documentMetrics: { ...healthyLayout.documentMetrics, scrollWidth: 460 },
  horizontalOverflow: true,
  horizontalOverflowPixels: 70
}), workspaceAuditViewports[3]);
check(
  overflowFindings.some((finding) => finding.type === uiFindingTypes.layoutOverflow),
  "I horizontal overflow becomes a UIFinding",
  overflowFindings
);

const missingFindings = detectViewportFindings(mockArtifact({
  ...healthyLayout,
  criticalRegions: [
    ...healthyLayout.criticalRegions,
    { key: "navigatorPrompt", selector: ".prompt-bar", exists: false, visible: false, zeroSize: false, outsideViewport: false, rect: null }
  ]
}), workspaceAuditViewports[3]);
check(
  missingFindings.some((finding) => finding.type === uiFindingTypes.missingElement),
  "J missing critical region becomes a UIFinding",
  missingFindings
);

const zeroSizeFindings = detectViewportFindings(mockArtifact({
  ...healthyLayout,
  criticalRegions: [
    ...healthyLayout.criticalRegions,
    { key: "metricsPanel", selector: ".metrics-panel", exists: true, visible: false, zeroSize: true, outsideViewport: false, rect: { x: 0, y: 0, width: 0, height: 20, right: 0, bottom: 20 } }
  ]
}), workspaceAuditViewports[3]);
check(
  zeroSizeFindings.some((finding) => finding.type === uiFindingTypes.blankRegion),
  "K zero-size critical region becomes a UIFinding",
  zeroSizeFindings
);

const overlapFindings = detectViewportFindings(mockArtifact({
  ...healthyLayout,
  geometryOverlaps: [{ a: "workspaceNavigation", b: "mainPanel", overlapArea: 1200, smallerAreaRatio: 0.4 }]
}), workspaceAuditViewports[3]);
check(
  overlapFindings.some((finding) => finding.evidence.some((item) => item.kind === "geometry_overlap")),
  "L geometry-backed overlap becomes a UIFinding",
  overlapFindings
);

const proposals = createRepairProposalsForFindings(overflowFindings);
check(
  proposals.length === overflowFindings.filter((finding) => finding.status === uiFindingStatuses.confirmed).length &&
    proposals.every((proposal) => proposal.approvalRequired === true && proposal.status === "WAITING_FOR_APPROVAL"),
  "M confirmed findings create approval-gated repair proposals only",
  proposals
);

const result = createViewportResult({
  artifact: mockArtifact(healthyLayout),
  viewport: workspaceAuditViewports[3],
  verification: { status: browserObservationStatuses.pass }
});
const comparison = createViewportComparisonArtifact({
  target: "http://localhost:3000/workspace/#navigator",
  results: [result],
  findings: [],
  repairProposals: []
});
const context = createMultiViewportObservationContext(comparison);
check(
  comparison.overallStatus === viewportComparisonStatuses.pass &&
    comparison.responsiveClassification === responsiveClassifications.responsive &&
    context.bounded === true &&
    JSON.stringify(context).length < JSON.stringify(mockArtifact(healthyLayout)).length,
  "N comparison/context are verifier-owned and bounded",
  {
    overallStatus: comparison.overallStatus,
    responsiveClassification: comparison.responsiveClassification,
    contextChars: JSON.stringify(context).length,
    artifactChars: JSON.stringify(mockArtifact(healthyLayout)).length
  }
);

if (failures > 0) {
  console.error(`Multi-Viewport UI Audit tests failed: ${failures}`);
  process.exit(1);
}

console.log("Multi-Viewport UI Audit tests passed.");
