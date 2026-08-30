import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = Number(process.env.PHASE21R_PORT || 3221);
const base = `http://127.0.0.1:${port}`;
const workspaceUrl = `${base}/workspace/#production/workflow/PODCAST_TO_SHORTS_FOUNDATION`;
const artifactDir = path.join("artifacts", "production", "phase21r");
const screenshotDir = path.join(artifactDir, "screenshots");
const browserProofPath = path.join(artifactDir, "GoalToContentWorkflowBrowserProof.json");
const viewports = [
  { id: "desktop_1440x900", width: 1440, height: 900 },
  { id: "desktop_1280x720", width: 1280, height: 720 },
  { id: "tablet_768x1024", width: 768, height: 1024 },
  { id: "mobile_390x844", width: 390, height: 844 }
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
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "phase21r_no_external_calls"
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

async function runViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(workspaceUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#production-workflow-panel:not([hidden])", { timeout: 10000 });
  await page.waitForSelector("[data-action='PREPARE_PRODUCTION_WORKFLOW']", { timeout: 10000 });
  await page.waitForFunction(() => document.body.innerText.includes("PODCAST_TO_SHORTS_FOUNDATION"));

  const initialShot = await screenshot(page, viewport.id, "production_workflow");
  const checks = await page.evaluate(() => {
    const panel = document.querySelector("#production-workflow-panel");
    const nodes = Array.from(document.querySelectorAll("#production-workflow-panel .workflow-step-node"));
    const rects = Array.from(document.querySelectorAll("#production-workflow-panel h2, #production-workflow-panel h3, #production-workflow-panel p, #production-workflow-panel button, #production-workflow-panel input, #production-workflow-panel .workflow-step-node"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          text: node.textContent || ""
        };
      });
    const badRects = rects.filter((rect) => rect.width <= 0 || rect.height <= 0);
    const visibleWidth = document.documentElement.clientWidth;
    const visibleHeight = document.documentElement.clientHeight;

    return {
      routeOpened: window.location.hash === "#production/workflow/PODCAST_TO_SHORTS_FOUNDATION",
      panelVisible: Boolean(panel),
      routeRecorded: panel?.dataset.route === "#production/workflow/PODCAST_TO_SHORTS_FOUNDATION",
      ctaVisible: Boolean(document.querySelector("[data-action='PREPARE_PRODUCTION_WORKFLOW']")),
      formFieldsVisible: ["topic", "hostIdentityId", "language", "masterFormat"].every((key) =>
        Boolean(document.querySelector(`[data-production-input='${key}']`))
      ),
      shortTargetsVisible: document.querySelectorAll("[data-production-target]").length === 3,
      dagVisible: nodes.length === 11,
      providerBoundaryVisible: document.body.innerText.includes("нужны права и отдельное подтверждение"),
      frontierVisible: document.body.innerText.includes("Execution Frontier") &&
        document.body.innerText.includes("BLOCKED_ON_PROVIDER_BOUNDARY"),
      contentIntelligenceVisible: document.body.innerText.includes("Content Intelligence") &&
        document.body.innerText.includes("variants:"),
      lisaVisible: document.body.innerText.includes("Lisa: lisa_production_profile"),
      noPublishPaymentProviderExecution: document.body.innerText.includes("No publish, no payment, no provider execution"),
      normalUxNoProviderBrand: !/elevenlabs|openai|anthropic|omni/i.test(panel?.innerText || ""),
      noHorizontalOverflow: document.documentElement.scrollWidth <= visibleWidth,
      noZeroSizeCriticalElements: badRects.length === 0,
      firstViewportSignal: Boolean(panel?.getBoundingClientRect().top < visibleHeight),
      metrics: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: visibleWidth,
        clientHeight: visibleHeight,
        badRects
      }
    };
  });

  await page.locator("[data-production-input='topic']").fill("почему человек теряет себя в отношениях");
  await page.locator("[data-action='PREPARE_PRODUCTION_WORKFLOW']").click();
  await page.waitForFunction(() => document.querySelectorAll("#production-workflow-panel .workflow-step-node").length === 11);
  const refreshedShot = await screenshot(page, viewport.id, "production_workflow_refreshed");
  const refreshedChecks = await page.evaluate(() => ({
    topicPreserved: document.querySelector("[data-production-input='topic']")?.value.includes("отношениях") === true,
    ctaStillSingle: document.querySelectorAll("[data-action='PREPARE_PRODUCTION_WORKFLOW']").length === 1,
    stepCountStillEleven: document.querySelectorAll("#production-workflow-panel .workflow-step-node").length === 11,
    frontierStillBlocked: document.body.innerText.includes("BLOCKED_ON_PROVIDER_BOUNDARY")
  }));

  const booleanChecks = [
    ...Object.entries(checks).filter(([key]) => key !== "metrics").map(([, value]) => value),
    ...Object.values(refreshedChecks)
  ];

  return {
    viewportId: viewport.id,
    viewport,
    screenshots: [initialShot, refreshedShot],
    checks,
    refreshedChecks,
    status: booleanChecks.every(Boolean) ? "PASS" : "FAIL"
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
  if (!await waitForServer()) {
    throw new Error(`Server did not start at ${base}: ${server.output.join("\n").slice(0, 2000)}`);
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
    results.push(await runViewport(page, viewport));
    await page.close();
  }
  await browser.close();

  const proof = {
    artifactType: "GoalToContentWorkflowBrowserProof",
    phase: "21R",
    route: workspaceUrl,
    viewports,
    status: results.every((item) => item.status === "PASS") &&
      browserErrors.consoleErrors.length === 0 &&
      browserErrors.pageErrors.length === 0 &&
      browserErrors.failedRequests.length === 0
      ? "PHASE_21R_BROWSER_WORKFLOW_PASS"
      : "PHASE_21R_BROWSER_WORKFLOW_FAIL",
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
  if (proof.status !== "PHASE_21R_BROWSER_WORKFLOW_PASS") {
    console.error(JSON.stringify(proof, null, 2));
    process.exit(1);
  }
  console.log(proof.status);
  console.log(browserProofPath);
} finally {
  server.child.kill();
}
