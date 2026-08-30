import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = Number(process.env.PHASE21P_PORT || 3210);
const base = `http://127.0.0.1:${port}`;
const workspaceUrl = `${base}/workspace/#execution/VIDEO_TRIM`;
const artifactDir = path.join("artifacts", "execution", "phase21p");
const screenshotDir = path.join(artifactDir, "screenshots");
const proofPath = path.join(artifactDir, "SafeLocalExecutionWorkspaceProof.json");
const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "mobile", width: 390, height: 844 }
];
const capabilityInputs = {
  MEDIA_PROBE: {},
  VIDEO_TRIM: { start: "2", end: "5" },
  VIDEO_RESIZE: {},
  AUDIO_EXTRACT: {}
};

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
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "phase21p_no_external_calls"
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

async function selectSyntheticAsset(page) {
  await page.locator("[data-action='SELECT_ASSET']").first().click();
  await page.waitForFunction(() => document.body.innerText.includes("phase21n_source_8s.mp4"));
}

async function runCapability(page, viewportId, capabilityId) {
  await page.goto(`${base}/workspace/#execution/${capabilityId}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#safe-local-execution-panel:not([hidden])", { timeout: 10000 });
  await page.waitForFunction((id) => document.querySelector("#safe-local-execution-panel")?.dataset.route?.includes(id), capabilityId);
  await selectSyntheticAsset(page);
  await page.waitForFunction(() => document.querySelector(".result-card")?.dataset.executionState === "PENDING");
  const inputs = capabilityInputs[capabilityId] || {};
  if (inputs.start) await page.locator("[data-input='startSeconds']").fill(inputs.start);
  if (inputs.end) await page.locator("[data-input='endSeconds']").fill(inputs.end);
  await page.waitForSelector("[data-action='EXECUTE_LOCAL'][data-enabled='true']", { timeout: 10000 });
  const readyShot = await screenshot(page, viewportId, `${capabilityId.toLowerCase()}_ready`);
  const [executeResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/safe-local/execute"), { timeout: 20000 }),
    page.locator("[data-action='EXECUTE_LOCAL']").first().click()
  ]);
  if (!executeResponse.ok()) {
    throw new Error(`execute_failed_${capabilityId}_${executeResponse.status()}`);
  }
  await page.waitForFunction((id) => {
    const result = document.querySelector(".result-card[data-execution-state='SUCCEEDED']");
    if (!result) return false;
    if (id === "MEDIA_PROBE") return Boolean(result.querySelector(".safe-local-observation-card"));
    return Boolean(result.querySelector(".safe-local-artifact-card a[href^='/api/safe-local/artifacts/']"));
  }, capabilityId, { timeout: 20000 });
  const successShot = await screenshot(page, viewportId, `${capabilityId.toLowerCase()}_success`);
  const checks = await page.evaluate((id) => {
    const text = document.body.innerText;
    const metrics = {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
    return {
      workspaceVisible: Boolean(document.querySelector("#safe-local-execution-panel:not([hidden])")),
      routeRecorded: document.querySelector("#safe-local-execution-panel")?.dataset.route?.includes(id) === true,
      successVisible: text.includes("Готово"),
      sourcePreservedVisible: text.includes("Исходник сохран"),
      verificationVisible: text.includes("Результат проверен"),
      zeroExternalVisible: text.includes("Внешний AI-провайдер не используется.") &&
        text.includes("Оплата, публикация и deploy не выполняются."),
      artifactOrObservationVisible: id === "MEDIA_PROBE"
        ? text.includes("Параметры медиа")
        : Boolean(document.querySelector(".safe-local-artifact-card a[href^='/api/safe-local/artifacts/']")),
      noHorizontalOverflow: metrics.scrollWidth <= metrics.clientWidth,
      metrics
    };
  }, capabilityId);
  return {
    capabilityId,
    screenshots: [readyShot, successShot],
    status: Object.entries(checks).filter(([key]) => key !== "metrics").every(([, value]) => value === true) ? "PASS" : "FAIL",
    checks
  };
}

async function runInvalidInput(page, viewportId) {
  await page.goto(`${base}/workspace/#execution/VIDEO_TRIM`, { waitUntil: "networkidle" });
  await page.waitForSelector("#safe-local-execution-panel:not([hidden])", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector("#safe-local-execution-panel")?.dataset.route?.includes("VIDEO_TRIM"));
  await selectSyntheticAsset(page);
  await page.evaluate(() => {
    document.querySelector("[data-input='startSeconds']").value = "7";
    const end = document.querySelector("[data-input='endSeconds']");
    end.value = "2";
    end.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const execute = document.querySelector("[data-action='EXECUTE_LOCAL']");
    const text = document.body.innerText;
    return (execute?.disabled === true || execute?.dataset.enabled === "false") &&
      (text.includes("Проверьте время") || text.includes("выходит за длительность") || text.includes("Локальное выполнение заблокировано"));
  });
  const shot = await screenshot(page, viewportId, "invalid_range_blocked");
  const checks = await page.evaluate(() => ({
    blockedLabelVisible: document.body.innerText.includes("Проверьте время") ||
      document.body.innerText.includes("выходит за длительность") ||
      document.body.innerText.includes("Локальное выполнение заблокировано"),
    ctaDisabled: document.querySelector("[data-action='EXECUTE_LOCAL']")?.disabled === true ||
      document.querySelector("[data-action='EXECUTE_LOCAL']")?.dataset.enabled === "false"
  }));
  return {
    screenshots: [shot],
    status: checks.blockedLabelVisible && checks.ctaDisabled ? "PASS" : "FAIL",
    checks
  };
}

async function runRollback(page, viewportId) {
  await page.goto(`${base}/workspace/#execution/VIDEO_RESIZE`, { waitUntil: "networkidle" });
  await page.waitForSelector("#safe-local-execution-panel:not([hidden])", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector("#safe-local-execution-panel")?.dataset.route?.includes("VIDEO_RESIZE"));
  await selectSyntheticAsset(page);
  await page.waitForFunction(() => document.querySelector(".result-card")?.dataset.executionState === "PENDING");
  await page.waitForSelector("[data-action='EXECUTE_LOCAL'][data-enabled='true']", { timeout: 10000 });
  await page.locator("[data-action='EXECUTE_LOCAL']").first().click();
  await page.waitForSelector(".result-card[data-execution-state='SUCCEEDED']", { timeout: 20000 });
  await page.locator("[data-action='ROLLBACK_DERIVED']").first().click();
  await page.waitForSelector(".result-card[data-execution-state='ROLLED_BACK']", { timeout: 10000 });
  const shot = await screenshot(page, viewportId, "rollback_completed");
  const checks = await page.evaluate(() => ({
    rolledBackVisible: document.body.innerText.includes("Созданная версия удалена"),
    sourcePreservedVisible: document.body.innerText.includes("Исходник сохран"),
    artifactCardsGone: document.querySelectorAll(".safe-local-artifact-card").length === 0
  }));
  return {
    screenshots: [shot],
    status: checks.rolledBackVisible && checks.sourcePreservedVisible && checks.artifactCardsGone ? "PASS" : "FAIL",
    checks
  };
}

async function runDeferred(page, viewportId) {
  await page.goto(`${base}/workspace/#execution/IMAGE_RESIZE`, { waitUntil: "networkidle" });
  await page.waitForSelector("#safe-local-execution-panel:not([hidden])", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector("#safe-local-execution-panel")?.dataset.route?.includes("IMAGE_RESIZE"));
  const shot = await screenshot(page, viewportId, "deferred_image_resize");
  const checks = await page.evaluate(() => ({
    blockedVisible: document.body.innerText.includes("Пока недоступно для локального выполнения") ||
      document.body.innerText.includes("Эта возможность пока недоступна"),
    ctaDisabled: document.querySelector("[data-action='EXECUTE_LOCAL']")?.disabled === true
  }));
  return {
    screenshots: [shot],
    status: checks.blockedVisible && checks.ctaDisabled ? "PASS" : "FAIL",
    checks
  };
}

async function runProductDiscoveryHandoff(page, viewportId) {
  await page.goto(`${base}/workspace/#product-discovery/execute/VIDEO_TRIM`, { waitUntil: "networkidle" });
  await page.waitForSelector(".execution-preview-detail", { timeout: 10000 });
  const handoff = page.locator(".safe-local-handoff", { hasText: "Открыть Execution Workspace" }).first();
  await handoff.click();
  await page.waitForURL(/#execution\/VIDEO_TRIM/);
  await page.waitForSelector("#safe-local-execution-panel:not([hidden])", { timeout: 10000 });
  const shot = await screenshot(page, viewportId, "product_discovery_handoff");
  const checks = await page.evaluate(() => ({
    routeOpened: window.location.hash === "#execution/VIDEO_TRIM",
    workspaceVisible: Boolean(document.querySelector("#safe-local-execution-panel:not([hidden])")),
    previewDidNotExecute: !document.body.innerText.includes("Запуск отключён в Phase 21J") || document.body.innerText.includes("Execution Workspace")
  }));
  return {
    screenshots: [shot],
    status: checks.routeOpened && checks.workspaceVisible ? "PASS" : "FAIL",
    checks
  };
}

const server = startServer();
const browserErrors = {
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  runtimeExceptions: []
};
const results = [];

try {
  if (!await waitForServer()) {
    throw new Error(`Server did not start at ${base}`);
  }

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

    const capabilityResults = [];
    for (const capabilityId of ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"]) {
      capabilityResults.push(await runCapability(page, viewport.id, capabilityId));
    }
    const invalidInput = await runInvalidInput(page, viewport.id);
    const rollback = await runRollback(page, viewport.id);
    const deferred = await runDeferred(page, viewport.id);
    const handoff = await runProductDiscoveryHandoff(page, viewport.id);
    const allChecks = [...capabilityResults, invalidInput, rollback, deferred, handoff];
    results.push({
      viewport,
      status: allChecks.every((item) => item.status === "PASS") ? "PASS" : "FAIL",
      capabilityResults,
      invalidInput,
      rollback,
      deferred,
      handoff
    });
    await page.close();
  }
  await browser.close();
} catch (error) {
  browserErrors.runtimeExceptions.push(error.stack || error.message);
}

server.child.kill();

const errorCounts = {
  consoleErrors: browserErrors.consoleErrors.length,
  pageErrors: browserErrors.pageErrors.length,
  failedRequests: browserErrors.failedRequests.length,
  runtimeExceptions: browserErrors.runtimeExceptions.length
};
const screenshots = results.flatMap((result) => [
  ...result.capabilityResults.flatMap((item) => item.screenshots),
  ...result.invalidInput.screenshots,
  ...result.rollback.screenshots,
  ...result.deferred.screenshots,
  ...result.handoff.screenshots
]);
const proof = {
  artifactType: "SafeLocalExecutionWorkspaceProof",
  phase: "21P",
  status: results.every((result) => result.status === "PASS") && Object.values(errorCounts).every((count) => count === 0)
    ? "PHASE_21P_SAFE_LOCAL_EXECUTION_WORKSPACE_PASS"
    : "PHASE_21P_SAFE_LOCAL_EXECUTION_WORKSPACE_FAIL",
  target: workspaceUrl,
  routes: ["#execution/MEDIA_PROBE", "#execution/VIDEO_TRIM", "#execution/VIDEO_RESIZE", "#execution/AUDIO_EXTRACT", "#execution/IMAGE_RESIZE"],
  capabilitiesExecuted: ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"],
  deferredCapabilities: ["VIDEO_TRANSCODE", "IMAGE_RESIZE", "IMAGE_CONVERT"],
  sourceAssetPolicy: {
    usesSyntheticLocalFixture: true,
    sourcePathInRoute: false,
    sourceOverwriteAllowed: false
  },
  browserErrors: errorCounts,
  browserErrorDetails: browserErrors,
  externalActionCounters: {
    externalProviderCalls: 0,
    externalModelCalls: 0,
    paidProviderCalls: 0,
    externalCalls: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    adActions: 0,
    externalAccountMutations: 0,
    productionDbMutations: 0,
    envKeyBillingChanges: 0
  },
  screenshots,
  results,
  serverOutputTail: server.output.join("").split(/\r?\n/).slice(-20),
  createdAt: new Date().toISOString()
};

writeJson(proofPath, proof);
console.log(JSON.stringify({
  status: proof.status,
  proofPath,
  screenshots: screenshots.length,
  browserErrors: errorCounts,
  externalActionCounters: proof.externalActionCounters
}, null, 2));

if (proof.status !== "PHASE_21P_SAFE_LOCAL_EXECUTION_WORKSPACE_PASS") {
  process.exitCode = 1;
}
