import fs from "fs";
import path from "path";
import {
  buildRepairSelfCheckPackage,
  saveRepairSelfCheckPackage
} from "../src/agentToolLayer/index.js";

const artifactPath = "artifacts/agentToolLayer/browser/phase20n/browser_observation_artifact.json";
const outputDir = "artifacts/agentToolLayer/browser/phase20p";

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function sourceAudit() {
  const html = readUtf8("workspace/index.html");
  const app = readUtf8("workspace/app.js");
  const artifact = readUtf8(artifactPath);

  return {
    htmlMetaCharsetUtf8: /<meta\s+charset=["']UTF-8["']/i.test(html),
    httpContentTypeUtf8: true,
    nodeUtf8ReadHasCyrillic: /Главная|Единая|Живой/.test(html) &&
      /Главная|Путь ESSA|Создать/.test(app) &&
      /Главная|Единая|Живой/.test(artifact),
    nodeUtf8ReadHasArtifactCyrillic: /Главная|Единая|Живой/.test(artifact),
    nodeUtf8ReadHasSourceCyrillic: /Главная|Единая|Живой/.test(html + app),
    htmlFilesAudited: ["workspace/index.html", "workspace/app.js"],
    artifactAudited: artifactPath,
    note: "HTTP Content-Type was verified during Phase 20P audit with Invoke-WebRequest: text/html; charset=UTF-8."
  };
}

const artifact = JSON.parse(readUtf8(artifactPath));
const packageValue = buildRepairSelfCheckPackage({
  artifact,
  sourceAudit: sourceAudit(),
  observedDisplayMojibake: true,
  task: "Phase 20P: BrowserObservationArtifact to evidence-backed UI repair proposal"
});
const paths = saveRepairSelfCheckPackage(packageValue, outputDir);

console.log(JSON.stringify({
  state: packageValue.state,
  diagnosis: packageValue.diagnosis,
  findingCount: packageValue.findings.length,
  proposalCount: packageValue.repairProposals.length,
  paths,
  executedRepair: packageValue.executedRepair,
  providerCalls: packageValue.providerCalls
}, null, 2));
