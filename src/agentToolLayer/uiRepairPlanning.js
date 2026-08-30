import fs from "fs";
import path from "path";
import { createBrowserObservationContext } from "./browserVerificationProvider.js";
import { redactForTrace } from "./policy.js";

export const uiFindingTypes = {
  encodingTextCorruption: "ENCODING_TEXT_CORRUPTION",
  missingElement: "MISSING_ELEMENT",
  blankRegion: "BLANK_REGION",
  layoutOverflow: "LAYOUT_OVERFLOW",
  failedResource: "FAILED_RESOURCE",
  consoleError: "CONSOLE_ERROR",
  pageError: "PAGE_ERROR",
  routeError: "ROUTE_ERROR",
  navigationMissing: "NAVIGATION_MISSING",
  accessibilityWarning: "ACCESSIBILITY_WARNING",
  visualReviewRequired: "VISUAL_REVIEW_REQUIRED",
  unknown: "UNKNOWN"
};

export const uiFindingSeverities = {
  info: "INFO",
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL"
};

export const uiFindingStatuses = {
  observed: "OBSERVED",
  confirmed: "FINDING_CONFIRMED",
  needsMoreObservation: "NEEDS_MORE_OBSERVATION",
  visualReviewRequired: "VISUAL_REVIEW_REQUIRED",
  dismissed: "DISMISSED"
};

export const repairProposalStatuses = {
  proposed: "REPAIR_PROPOSED",
  waitingForApproval: "WAITING_FOR_APPROVAL",
  notJustified: "NOT_JUSTIFIED",
  blocked: "BLOCKED"
};

export const repairLoopStates = [
  "OBSERVED",
  "FINDING_CONFIRMED",
  "REPAIR_PROPOSED",
  "WAITING_FOR_APPROVAL",
  "FUTURE_REPAIR",
  "FUTURE_REOBSERVE",
  "FUTURE_VERIFY"
];

export const uiFindingContract = {
  findingId: null,
  type: uiFindingTypes.unknown,
  severity: uiFindingSeverities.info,
  confidence: 0,
  target: null,
  location: null,
  summary: "",
  evidence: [],
  screenshotRef: null,
  domEvidence: [],
  consoleEvidence: [],
  resourceEvidence: [],
  userImpact: "",
  verificationMethod: "",
  requiresVisualReview: false,
  status: uiFindingStatuses.observed,
  projectId: null,
  taskId: null,
  traceId: null
};

export const repairProposalContract = {
  proposalId: null,
  findingId: null,
  proposedAction: "",
  rationale: "",
  likelyFiles: [],
  likelyLayer: null,
  changeClass: "NO_CODE_CHANGE",
  riskLevel: "LOW",
  requiresCodeChange: false,
  requiresBrowserMutation: false,
  requiresExternalProvider: false,
  expectedOutcome: "",
  verificationPlan: [],
  rollbackPlan: "",
  confidence: 0,
  approvalRequired: true,
  status: repairProposalStatuses.proposed
};

export const repairAgentRequestContract = {
  requestId: null,
  task: null,
  finding: null,
  evidence: [],
  relevantFiles: [],
  documentationContext: null,
  browserObservationContext: null,
  allowedTools: [],
  prohibitedActions: [],
  approvalPolicy: null,
  verificationPlan: []
};

export const repairApprovalSummaryContract = {
  finding: null,
  evidence: [],
  proposedFiles: [],
  proposedChange: "",
  expectedOutcome: "",
  risks: [],
  rollback: "",
  verificationPlan: []
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeExcerpt(value = "", maxLength = 220) {
  return clean(value).slice(0, maxLength);
}

export function createUIFinding(input = {}) {
  if (!safeArray(input.evidence).length) {
    throw new Error("UIFinding requires evidence");
  }

  return redactForTrace({
    ...uiFindingContract,
    ...input,
    findingId: input.findingId || createId("ui_finding"),
    evidence: safeArray(input.evidence),
    domEvidence: safeArray(input.domEvidence),
    consoleEvidence: safeArray(input.consoleEvidence),
    resourceEvidence: safeArray(input.resourceEvidence),
    requiresVisualReview: Boolean(input.requiresVisualReview),
    createdAt: input.createdAt || nowIso()
  });
}

export function createRepairProposal(input = {}) {
  return redactForTrace({
    ...repairProposalContract,
    ...input,
    proposalId: input.proposalId || createId("repair_proposal"),
    likelyFiles: safeArray(input.likelyFiles),
    verificationPlan: safeArray(input.verificationPlan),
    requiresBrowserMutation: false,
    requiresExternalProvider: false,
    approvalRequired: input.approvalRequired !== false,
    createdAt: input.createdAt || nowIso()
  });
}

function containsAny(text, markers) {
  return markers.some((marker) => text.includes(marker));
}

export function analyzeMojibakeEvidence({
  artifact = {},
  sourceAudit = {},
  observedDisplayMojibake = false
} = {}) {
  const observedText = JSON.stringify([
    artifact.visibleSections,
    artifact.visibleNavigation,
    artifact.visibleTextSummary
  ]);
  const strongMojibakeMarkers = [
    "Рџ", "Рњ", "Рђ", "Р•", "РЅ", "Рµ", "Рѕ", "СЃ", "С‚",
    "СЊ", "Р°", "Рё", "Р»", "Рє", "Рі", "Рґ", "вЂ", "рџ", "�"
  ];
  const goodUnicodeMarkers = ["Главная", "Единая", "Живой", "Создать", "Цифровая", "Производство"];
  const matchedMojibakeMarkers = strongMojibakeMarkers.filter((marker) => observedText.includes(marker));
  const matchedGoodMarkers = goodUnicodeMarkers.filter((marker) => observedText.includes(marker));
  const artifactLooksCorrupt = matchedMojibakeMarkers.length >= 4 && matchedGoodMarkers.length === 0;
  const sourceLooksUtf8 =
    sourceAudit.htmlMetaCharsetUtf8 === true &&
    sourceAudit.httpContentTypeUtf8 === true &&
    sourceAudit.nodeUtf8ReadHasCyrillic === true;

  let conclusion = "UNCERTAIN";
  let confidence = 0.45;

  if (artifactLooksCorrupt && !sourceLooksUtf8) {
    conclusion = "ARTIFACT_OR_SOURCE_ENCODING_DEFECT";
    confidence = 0.72;
  } else if (!artifactLooksCorrupt && sourceLooksUtf8 && observedDisplayMojibake) {
    conclusion = "CONSOLE_OR_CAPTURE_DISPLAY_DEFECT";
    confidence = 0.84;
  } else if (!artifactLooksCorrupt && matchedGoodMarkers.length) {
    conclusion = "NO_PERSISTED_ARTIFACT_ENCODING_DEFECT_DETECTED";
    confidence = 0.78;
  }

  return {
    conclusion,
    confidence,
    artifactLooksCorrupt,
    sourceLooksUtf8,
    observedDisplayMojibake,
    matchedMojibakeMarkers,
    matchedGoodMarkers,
    evidence: [
      {
        kind: "artifact_utf8_read",
        summary: matchedGoodMarkers.length
          ? "Node UTF-8 read of BrowserObservationArtifact contains valid Cyrillic markers."
          : "Node UTF-8 read did not find expected Cyrillic markers.",
        markers: matchedGoodMarkers
      },
      {
        kind: "artifact_mojibake_scan",
        summary: matchedMojibakeMarkers.length
          ? "Strict mojibake-like markers were found in persisted observation text."
          : "Strict mojibake-like markers were not found in persisted observation text.",
        markers: matchedMojibakeMarkers
      },
      {
        kind: "source_encoding_audit",
        summary: sourceLooksUtf8
          ? "HTML meta charset, HTTP Content-Type, and Node UTF-8 source read point to UTF-8."
          : "Source encoding evidence is incomplete or mixed.",
        sourceAudit
      }
    ]
  };
}

export function createFindingFromBrowserObservation({
  artifact,
  sourceAudit = {},
  observedDisplayMojibake = false
} = {}) {
  const diagnosis = analyzeMojibakeEvidence({
    artifact,
    sourceAudit,
    observedDisplayMojibake
  });

  if (
    diagnosis.conclusion === "NO_PERSISTED_ARTIFACT_ENCODING_DEFECT_DETECTED" &&
    observedDisplayMojibake !== true
  ) {
    return { diagnosis, finding: null };
  }

  const finding = createUIFinding({
    type: uiFindingTypes.encodingTextCorruption,
    severity: diagnosis.conclusion === "ARTIFACT_OR_SOURCE_ENCODING_DEFECT"
      ? uiFindingSeverities.medium
      : uiFindingSeverities.low,
    confidence: diagnosis.confidence,
    target: artifact.target,
    location: diagnosis.conclusion === "CONSOLE_OR_CAPTURE_DISPLAY_DEFECT"
      ? "terminal/rendered JSON display"
      : "BrowserObservationArtifact.visibleTextSummary",
    summary: diagnosis.conclusion === "CONSOLE_OR_CAPTURE_DISPLAY_DEFECT"
      ? "Mojibake was observed in rendered command output, but persisted UTF-8 artifact and page encoding evidence are valid."
      : "Possible mojibake detected in browser observation text evidence.",
    evidence: diagnosis.evidence,
    screenshotRef: artifact.screenshotRef,
    domEvidence: safeArray(artifact.visibleTextSummary).slice(0, 3).map((item) => safeExcerpt(item)),
    consoleEvidence: safeArray(artifact.consoleErrors),
    resourceEvidence: safeArray(artifact.failedRequests),
    userImpact: diagnosis.conclusion === "CONSOLE_OR_CAPTURE_DISPLAY_DEFECT"
      ? "Low impact to the Workspace UI; future human-readable reports may look corrupted if displayed through a non-UTF-8 channel."
      : "Users or agents may misread UI text if the persisted observation content is actually corrupted.",
    verificationMethod: "Compare HTTP charset, source file UTF-8 read, persisted JSON UTF-8 read, and bounded observation text.",
    requiresVisualReview: true,
    status: diagnosis.conclusion === "UNCERTAIN"
      ? uiFindingStatuses.needsMoreObservation
      : uiFindingStatuses.confirmed,
    projectId: artifact.projectId,
    taskId: artifact.taskId,
    traceId: artifact.traceId
  });

  return { diagnosis, finding };
}

export function createRepairProposalForFinding(finding = null, diagnosis = {}) {
  if (!finding) return null;

  if (diagnosis.conclusion === "CONSOLE_OR_CAPTURE_DISPLAY_DEFECT") {
    return createRepairProposal({
      findingId: finding.findingId,
      proposedAction: "Do not change Workspace UI. Keep browser artifact writes as UTF-8 and make future report consumers read/render JSON as UTF-8 before displaying excerpts.",
      rationale: "Evidence points to display/capture rendering rather than corrupt source files or corrupt persisted JSON.",
      likelyFiles: [
        "src/agentToolLayer/browserVerificationProvider.js",
        "scripts/runBrowserReadonlyProof.js"
      ],
      likelyLayer: "agent_tool_layer/browser_observation_reporting",
      changeClass: "REPORTING_OR_ARTIFACT_CONSUMPTION",
      riskLevel: "LOW",
      requiresCodeChange: false,
      expectedOutcome: "Future reports distinguish persisted UTF-8 text from terminal mojibake and avoid false UI repair requests.",
      verificationPlan: [
        "Read BrowserObservationArtifact with Node fs.readFileSync(..., 'utf8').",
        "Confirm valid Cyrillic markers such as 'Главная' and 'Единая' are present.",
        "Confirm HTTP response remains text/html; charset=UTF-8.",
        "Rerun one approved localhost read-only observation only after explicit approval."
      ],
      rollbackPlan: "Remove generated Phase 20P repair artifacts; no application behavior was changed.",
      confidence: diagnosis.confidence,
      status: repairProposalStatuses.waitingForApproval
    });
  }

  return createRepairProposal({
    findingId: finding.findingId,
    proposedAction: "Investigate and repair the exact encoding boundary only after approval.",
    rationale: "Evidence is insufficient to choose a safe source-code mutation.",
    likelyFiles: [
      "workspace/index.html",
      "workspace/app.js",
      "src/agentToolLayer/browserVerificationProvider.js"
    ],
    likelyLayer: "workspace_or_browser_observation_encoding",
    changeClass: "NEEDS_MORE_OBSERVATION",
    riskLevel: "MEDIUM",
    requiresCodeChange: true,
    expectedOutcome: "Unicode text remains valid in source, browser DOM extraction, persisted artifact, and report display.",
    verificationPlan: [
      "Perform source byte/charset audit.",
      "Rerun one approved localhost read-only observation.",
      "Compare artifact text against expected Cyrillic markers.",
      "Check screenshot manually if text rendering remains uncertain."
    ],
    rollbackPlan: "Revert any future source or provider changes and keep previous observation artifact for audit.",
    confidence: Math.min(diagnosis.confidence, 0.6),
    status: repairProposalStatuses.waitingForApproval
  });
}

export function createRepairApprovalSummary({ finding, proposal } = {}) {
  return redactForTrace({
    ...repairApprovalSummaryContract,
    finding: finding
      ? {
          findingId: finding.findingId,
          type: finding.type,
          severity: finding.severity,
          confidence: finding.confidence,
          summary: finding.summary
        }
      : null,
    evidence: safeArray(finding?.evidence).slice(0, 5),
    proposedFiles: safeArray(proposal?.likelyFiles),
    proposedChange: proposal?.proposedAction || "",
    expectedOutcome: proposal?.expectedOutcome || "",
    risks: [
      proposal?.requiresCodeChange ? "Future code change requires explicit approval." : null,
      proposal?.requiresBrowserMutation ? "Browser mutation requested." : null,
      proposal?.requiresExternalProvider ? "External provider requested." : null
    ].filter(Boolean),
    rollback: proposal?.rollbackPlan || "",
    verificationPlan: safeArray(proposal?.verificationPlan)
  });
}

export function createRepairAgentRequest({
  task,
  finding,
  proposal,
  browserObservationContext,
  documentationContext = null
} = {}) {
  return redactForTrace({
    ...repairAgentRequestContract,
    requestId: createId("repair_agent_request"),
    task,
    finding,
    evidence: safeArray(finding?.evidence),
    relevantFiles: safeArray(proposal?.likelyFiles),
    documentationContext,
    browserObservationContext: {
      status: browserObservationContext?.status,
      target: browserObservationContext?.target,
      finalUrl: browserObservationContext?.finalUrl,
      visibleSections: safeArray(browserObservationContext?.visibleSections).slice(0, 6),
      visibleTextSummary: safeArray(browserObservationContext?.visibleTextSummary).slice(0, 6),
      uiFindings: safeArray(browserObservationContext?.uiFindings),
      repairProposals: safeArray(browserObservationContext?.repairProposals),
      screenshotRef: browserObservationContext?.screenshotRef,
      fullDomIncluded: false,
      policy: browserObservationContext?.policy
    },
    allowedTools: ["filesystem.read", "code.patch_after_approval", "tests.local_after_approval"],
    prohibitedActions: [
      "browser.click",
      "browser.type",
      "browser.submit",
      "browser.storage_inspection",
      "provider.api_call",
      "deploy",
      "publish",
      "supabase.connect",
      "env.modify"
    ],
    approvalPolicy: {
      sourceCodeMutationRequiresRepairApproval: true,
      modelCannotMarkRepairVerified: true,
      browserInteractionDisabled: true
    },
    verificationPlan: safeArray(proposal?.verificationPlan)
  });
}

export function buildRepairSelfCheckPackage({
  artifact,
  sourceAudit = {},
  observedDisplayMojibake = false,
  task = "Phase 20P browser observation self-check"
} = {}) {
  const { diagnosis, finding } = createFindingFromBrowserObservation({
    artifact,
    sourceAudit,
    observedDisplayMojibake
  });
  const proposal = createRepairProposalForFinding(finding, diagnosis);
  const context = createBrowserObservationContext({
    artifact,
    findings: finding ? [finding] : [],
    repairProposals: proposal ? [proposal] : []
  });
  const approvalSummary = proposal
    ? createRepairApprovalSummary({ finding, proposal })
    : null;
  const repairAgentRequest = proposal
    ? createRepairAgentRequest({
        task,
        finding,
        proposal,
        browserObservationContext: context
      })
    : null;

  return {
    state: proposal ? "WAITING_FOR_APPROVAL" : "OBSERVED",
    loopStates: [...repairLoopStates],
    diagnosis,
    findings: finding ? [finding] : [],
    repairProposals: proposal ? [proposal] : [],
    browserObservationContext: context,
    repairAgentRequest,
    approvalSummary,
    executedRepair: false,
    providerCalls: 0
  };
}

export function saveRepairSelfCheckPackage(packageValue, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const paths = {
    packagePath: path.join(outputDir, "phase20p_repair_self_check_package.json"),
    findingsPath: path.join(outputDir, "ui_findings.json"),
    proposalsPath: path.join(outputDir, "repair_proposals.json"),
    repairAgentRequestPath: path.join(outputDir, "repair_agent_request.json"),
    approvalSummaryPath: path.join(outputDir, "repair_approval_summary.json"),
    contextPath: path.join(outputDir, "browser_observation_context.with_findings.json")
  };

  fs.writeFileSync(paths.packagePath, `${JSON.stringify(packageValue, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.findingsPath, `${JSON.stringify(packageValue.findings, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.proposalsPath, `${JSON.stringify(packageValue.repairProposals, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.repairAgentRequestPath, `${JSON.stringify(packageValue.repairAgentRequest, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.approvalSummaryPath, `${JSON.stringify(packageValue.approvalSummary, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.contextPath, `${JSON.stringify(packageValue.browserObservationContext, null, 2)}\n`, "utf8");

  return paths;
}
