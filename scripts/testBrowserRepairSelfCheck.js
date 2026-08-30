import fs from "fs";
import {
  buildRepairSelfCheckPackage,
  createBrowserObservationArtifact,
  createRepairProposalForFinding,
  repairLoopStates,
  uiFindingTypes
} from "../src/agentToolLayer/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const realArtifact = JSON.parse(fs.readFileSync(
  "artifacts/agentToolLayer/browser/phase20n/browser_observation_artifact.json",
  "utf8"
));
const sourceAudit = {
  htmlMetaCharsetUtf8: true,
  httpContentTypeUtf8: true,
  nodeUtf8ReadHasCyrillic: true
};
const realPackage = buildRepairSelfCheckPackage({
  artifact: realArtifact,
  sourceAudit,
  observedDisplayMojibake: true
});
const realFinding = realPackage.findings[0];
const realProposal = realPackage.repairProposals[0];

check(
  realFinding?.type === uiFindingTypes.encodingTextCorruption &&
    realFinding.evidence.length > 0 &&
    realPackage.diagnosis.conclusion === "CONSOLE_OR_CAPTURE_DISPLAY_DEFECT",
  "A real mojibake display evidence creates an evidence-backed finding only when supported",
  { diagnosis: realPackage.diagnosis, finding: realFinding }
);

check(
  realFinding.consoleEvidence.length === 0 &&
    realFinding.resourceEvidence.length === 0,
  "B no console/resource errors are invented",
  {
    consoleEvidence: realFinding.consoleEvidence,
    resourceEvidence: realFinding.resourceEvidence
  }
);

const uncertainArtifact = createBrowserObservationArtifact({
  target: "http://localhost:3000/workspace/#navigator",
  finalUrl: "http://localhost:3000/workspace/#navigator",
  domStatus: "domcontentloaded",
  visibleTextSummary: ["Workspace shell appears, but screenshot needs human review."],
  screenshotRef: realArtifact.screenshotRef,
  interactionCount: 0,
  mutationCount: 0
});
const uncertainPackage = buildRepairSelfCheckPackage({
  artifact: uncertainArtifact,
  sourceAudit: {
    htmlMetaCharsetUtf8: false,
    httpContentTypeUtf8: false,
    nodeUtf8ReadHasCyrillic: false
  },
  observedDisplayMojibake: true
});
check(
  uncertainPackage.findings[0]?.requiresVisualReview === true &&
    uncertainPackage.findings[0]?.status !== "DISMISSED",
  "C uncertain screenshot/display issue requires visual review",
  uncertainPackage.findings[0]
);

check(
  realProposal &&
    realProposal.requiresBrowserMutation === false &&
    realProposal.requiresExternalProvider === false &&
    realProposal.status === "WAITING_FOR_APPROVAL",
  "D RepairProposal cannot execute itself",
  realProposal
);

check(
  realPackage.repairAgentRequest.prohibitedActions.includes("browser.click") &&
    realPackage.repairAgentRequest.prohibitedActions.includes("browser.type") &&
    realPackage.repairAgentRequest.approvalPolicy.browserInteractionDisabled === true,
  "E browser interaction remains disabled",
  realPackage.repairAgentRequest
);

check(
  realPackage.repairAgentRequest.approvalPolicy.modelCannotMarkRepairVerified === true &&
    repairLoopStates.includes("FUTURE_VERIFY") &&
    realPackage.state === "WAITING_FOR_APPROVAL",
  "F model cannot mark repair verified and loop stops before repair",
  {
    state: realPackage.state,
    approvalPolicy: realPackage.repairAgentRequest.approvalPolicy,
    repairLoopStates
  }
);

check(
  realPackage.repairAgentRequest.browserObservationContext.fullDomIncluded === false &&
    realPackage.repairAgentRequest.browserObservationContext.visibleSections.length <= 6 &&
    realPackage.repairAgentRequest.browserObservationContext.visibleTextSummary.length <= 6 &&
    !JSON.stringify(realPackage.repairAgentRequest.browserObservationContext).includes("localStorage") &&
    !JSON.stringify(realPackage.repairAgentRequest.browserObservationContext).includes("cookie"),
  "G full DOM/artifact payload is not passed to RepairAgentRequest",
  {
    requestChars: JSON.stringify(realPackage.repairAgentRequest.browserObservationContext).length,
    artifactChars: JSON.stringify(realArtifact).length,
    visibleSections: realPackage.repairAgentRequest.browserObservationContext.visibleSections.length,
    visibleTextSummary: realPackage.repairAgentRequest.browserObservationContext.visibleTextSummary.length
  }
);

check(
  realPackage.repairAgentRequest.allowedTools.includes("filesystem.read") &&
    realPackage.repairAgentRequest.approvalPolicy.sourceCodeMutationRequiresRepairApproval === true,
  "H repair contract is provider-independent",
  realPackage.repairAgentRequest.allowedTools
);

const noFindingPackage = buildRepairSelfCheckPackage({
  artifact: realArtifact,
  sourceAudit,
  observedDisplayMojibake: false
});
check(
  noFindingPackage.findings.length === 0 &&
    createRepairProposalForFinding(null, noFindingPackage.diagnosis) === null,
  "I no external calls or unsupported repairs are created without evidence",
  {
    findings: noFindingPackage.findings.length,
    providerCalls: noFindingPackage.providerCalls,
    executedRepair: noFindingPackage.executedRepair
  }
);

if (failures > 0) {
  console.error(`Browser repair self-check tests failed: ${failures}`);
  process.exit(1);
}

console.log("Browser repair self-check tests passed.");
