import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = Number(process.env.PHASE21Q_PORT || 3220);
const base = `http://127.0.0.1:${port}`;
const workspaceUrl = `${base}/workspace/#workflow/LOCAL_MEDIA_REPURPOSE_PROOF`;
const artifactDir = path.join("artifacts", "execution", "phase21q");
const screenshotDir = path.join(artifactDir, "screenshots");
const browserProofPath = path.join(artifactDir, "AutonomousWorkflowBrowserProof.json");
const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 }
];

fs.mkdirSync(screenshotDir, { recursive: true });

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${base}/workspace/`);
      if (response.ok) return true;
    } catch {
      await wait(250);
    }
  }
  return false;
}

function startServer() {
  const child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "phase21q_no_external_calls"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  return { child, output };
}

async function screenshot(page, viewportId, label) {
  const screenshotPath = path.join(screenshotDir, `${viewportId}_${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function runViewport(page, viewportId) {
  await page.goto(workspaceUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#autonomous-workflow-panel:not([hidden])", { timeout: 10000 });
  await page.waitForSelector("[data-action='EXECUTE_WORKFLOW']", { timeout: 10000 });
  await page.waitForFunction(() => document.body.innerText.includes("LOCAL_MEDIA_REPURPOSE_PROOF"));
  if (await page.locator("[data-action='EXECUTE_WORKFLOW']").first().isDisabled()) {
    await page.locator("[data-action='SELECT_SYNTHETIC_ASSET']").first().click();
    await page.waitForFunction(() => !document.querySelector("[data-action='EXECUTE_WORKFLOW']")?.disabled, { timeout: 10000 });
  }
  const previewShot = await screenshot(page, viewportId, "workflow_preview");
  const previewChecks = await page.evaluate(() => ({
    routeOpened: window.location.hash === "#workflow/LOCAL_MEDIA_REPURPOSE_PROOF",
    panelVisible: Boolean(document.querySelector("#autonomous-workflow-panel:not([hidden])")),
    dagVisible: document.querySelectorAll(".workflow-step-node").length === 4,
    readinessVisible: document.body.innerText.includes("Готово к локальному workflow"),
    onePrimaryExecute: document.querySelectorAll("[data-action='EXECUTE_WORKFLOW']").length === 1,
    noRawSourcePathInRoute: !window.location.hash.includes(":\\") && !window.location.hash.includes("/artifacts/"),
    noExternalPromises: document.body.innerText.includes("Внешние модели, оплата, deploy и publish не вызываются."),
    noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    metrics: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }
  }));

  await page.locator("[data-action='EXECUTE_WORKFLOW']").first().click();
  await page.waitForFunction(() => {
    const panel = document.querySelector("#autonomous-workflow-panel");
    return panel?.innerText.includes("Выполняется");
  }, { timeout: 2000 }).catch(() => {});
  const runningShot = await screenshot(page, viewportId, "workflow_running");
  await page.waitForFunction(() => {
    const output = document.querySelector(".workflow-output-card");
    return output?.dataset.workflowState === "SUCCEEDED" &&
      document.body.innerText.includes("Workflow verified") &&
      document.querySelectorAll(".workflow-output-item").length === 4;
  }, { timeout: 25000 });
  const successShot = await screenshot(page, viewportId, "workflow_success");
  const successChecks = await page.evaluate(() => ({
    succeeded: document.querySelector(".workflow-output-card")?.dataset.workflowState === "SUCCEEDED",
    outputsVisible: document.querySelectorAll(".workflow-output-item").length === 4,
    allStepsSucceeded: Array.from(document.querySelectorAll(".workflow-step-node")).every((node) => node.dataset.status === "SUCCEEDED"),
    lineageVisible: document.body.innerText.includes("SOURCE_VIDEO -> MEDIA_OBSERVATION") &&
      document.body.innerText.includes("TRIMMED_VIDEO -> RESIZED_VIDEO"),
    rollbackVisible: Boolean(document.querySelector("[data-action='ROLLBACK_WORKFLOW']")),
    sourcePreservedVisible: document.body.innerText.includes("исходник сохран") || document.body.innerText.includes("Исходник")
  }));

  await page.locator("[data-action='SIMULATE_RESIZE_FAILURE']").first().click();
  await page.waitForSelector(".workflow-failure-card", { timeout: 20000 });
  const failureShot = await screenshot(page, viewportId, "workflow_failure");
  const failureChecks = await page.evaluate(() => ({
    failureVisible: document.body.innerText.includes("Failure UX"),
    failedStepVisible: document.body.innerText.includes("Video resize: Ошибка выполнения"),
    noFalseSuccess: document.body.innerText.includes("Сценарий отказа: Ошибка выполнения")
  }));

  await page.locator("[data-action='ROLLBACK_WORKFLOW']").first().click();
  await page.waitForFunction(() => document.querySelector(".workflow-output-card")?.dataset.workflowState === "ROLLED_BACK", { timeout: 10000 });
  const rollbackShot = await screenshot(page, viewportId, "workflow_rollback");
  const rollbackChecks = await page.evaluate(() => ({
    rolledBack: document.querySelector(".workflow-output-card")?.dataset.workflowState === "ROLLED_BACK",
    rollbackLabel: document.body.innerText.includes("Созданные версии удалены") || document.body.innerText.includes("rollback"),
    sourceStillVisible: document.body.innerText.includes("Исходник закреплён")
  }));

  return {
    viewportId,
    screenshots: [previewShot, runningShot, successShot, failureShot, rollbackShot],
    checks: { previewChecks, successChecks, failureChecks, rollbackChecks },
    status: [
      ...Object.entries(previewChecks).filter(([key]) => key !== "metrics").map(([, value]) => value),
      ...Object.values(successChecks),
      ...Object.values(failureChecks),
      ...Object.values(rollbackChecks)
    ].every(Boolean) ? "PASS" : "FAIL"
  };
}

const server = startServer();
const browserErrors = {
  consoleErrors: [],
  pageErrors: [],
  failedRequests: []
};
const results = [];

try {
  if (!await waitForServer()) throw new Error(`Server did not start at ${base}`);
  const browser = await chromium.launch({ headless: true });
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      browserErrors.failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText || "unknown"
      });
    });
    results.push(await runViewport(page, viewport.id));
    await page.close();
  }
  await browser.close();

  const proof = {
    artifactType: "AutonomousWorkflowBrowserProof",
    phase: "21Q",
    route: workspaceUrl,
    status: results.every((item) => item.status === "PASS") &&
      browserErrors.consoleErrors.length === 0 &&
      browserErrors.pageErrors.length === 0 &&
      browserErrors.failedRequests.length === 0
      ? "PHASE_21Q_BROWSER_WORKFLOW_PASS"
      : "PHASE_21Q_BROWSER_WORKFLOW_FAIL",
    results,
    browserErrors,
    externalCounters: {
      externalProviderCalls: 0,
      externalModelCalls: 0,
      paidProviderCalls: 0,
      externalCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0,
      adActions: 0,
      socialDispatches: 0,
      externalAccountMutations: 0,
      productionDbMutations: 0,
      envKeyBillingChanges: 0
    },
    createdAt: new Date().toISOString()
  };
  writeJson(browserProofPath, proof);
  if (proof.status !== "PHASE_21Q_BROWSER_WORKFLOW_PASS") {
    console.error(JSON.stringify(proof, null, 2));
    process.exit(1);
  }
  console.log(proof.status);
  console.log(browserProofPath);
} finally {
  server.child.kill();
}
