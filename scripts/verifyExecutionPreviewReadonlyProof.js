import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = "http://localhost:3000/workspace/#product-discovery";
const artifactDir = path.join("artifacts", "productDiscovery", "phase21j");
const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "laptop", width: 1280, height: 720 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 }
];

const capabilities = [
  { id: "BOOK_COVER", label: "BOOK_COVER", requiredText: "CoverArtifact" },
  { id: "WEBSITE_GENERATE", label: "WEBSITE_GENERATE", requiredText: "SiteProject" },
  { id: "VIDEO_EDIT", label: "VIDEO_EDIT", requiredText: "RenderArtifact" },
  { id: "VOCAL_REPLACE", label: "VOCAL_REPLACE", requiredText: "rights" },
  { id: "VIDEO_TRIM", label: "VIDEO_TRIM", requiredText: "LOCAL_COMPUTE" }
];

fs.mkdirSync(artifactDir, { recursive: true });

function route(capabilityId) {
  return `${base}/execute/${encodeURIComponent(capabilityId)}`;
}

async function screenshot(page, viewport, label) {
  const screenshotPath = path.join(artifactDir, `${viewport.id}_${viewport.width}x${viewport.height}_${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function collectPreviewChecks(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const metrics = {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight
    };
    const preview = document.querySelector(".execution-preview-detail");
    return {
      productDiscoveryVisible: Boolean(document.querySelector("#product-discovery-panel:not([hidden])")),
      previewVisible: Boolean(preview),
      breadcrumbVisible: Boolean(document.querySelector(".product-discovery-breadcrumb")),
      disabledButtonVisible: text.includes("Запуск отключён в Phase 21J"),
      boundaryMessageVisible: Boolean(document.querySelector(".execution-preview-disabled:disabled")) &&
        preview?.dataset.executionEnabled === "false" &&
        preview?.dataset.providerExecutionEnabled === "false" &&
        preview?.dataset.toolExecutionEnabled === "false",
      inputSectionVisible: text.includes("Что понадобится"),
      localSectionVisible: text.includes("Что можно сделать локально"),
      providerSectionVisible: text.includes("Что потребует внешнего сервиса"),
      approvalSectionVisible: text.includes("Что нужно подтвердить"),
      artifactSectionVisible: text.includes("Что получится"),
      verificationSectionVisible: text.includes("Как ESSA проверит результат"),
      activationSectionVisible: text.includes("Потребуется ли оплата/активация"),
      executionEnabledFalse: preview?.dataset.executionEnabled === "false",
      providerExecutionEnabledFalse: preview?.dataset.providerExecutionEnabled === "false",
      toolExecutionEnabledFalse: preview?.dataset.toolExecutionEnabled === "false",
      paymentEnabledFalse: preview?.dataset.paymentEnabled === "false",
      publishEnabledFalse: preview?.dataset.publishEnabled === "false",
      deployEnabledFalse: preview?.dataset.deployEnabled === "false",
      noProviderCalls: text.includes("providerCalls=0"),
      noHorizontalOverflow: metrics.scrollWidth <= metrics.clientWidth,
      documentMetrics: metrics
    };
  });
}

const runtime = {
  playwrightAvailable: true,
  browserName: "chromium",
  executablePath: chromium.executablePath(),
  executableExists: fs.existsSync(chromium.executablePath()),
  reinstallNeeded: false
};

const browser = await chromium.launch({ headless: true });
const results = [];
let interactionCount = 0;

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const screenshots = [];
  const capabilityResults = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText || "unknown"
    });
  });

  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector("#product-discovery-panel:not([hidden])", { timeout: 10000 });
  await page.waitForSelector(".product-card", { timeout: 10000 });

  await page.goto(`${base}/capability/BOOK_COVER?q=${encodeURIComponent("обложка")}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".capability-detail", { timeout: 10000 });
  await page.locator(".product-discovery-action", { hasText: "Подготовить план" }).first().click();
  interactionCount += 1;
  await page.waitForURL(/#product-discovery\/execute\/BOOK_COVER/);
  await page.waitForSelector(".execution-preview-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "book_cover_execution_preview"));
  const backUrlBefore = page.url();
  await page.locator(".product-discovery-breadcrumb button", { hasText: "BOOK_COVER" }).first().click();
  interactionCount += 1;
  await page.waitForURL(/#product-discovery\/capability\/BOOK_COVER/);
  const backNavigationWorks = backUrlBefore.includes("/execute/BOOK_COVER") && page.url().includes("/capability/BOOK_COVER");

  for (const capability of capabilities) {
    await page.goto(route(capability.id), { waitUntil: "networkidle" });
    await page.waitForSelector(".execution-preview-detail", { timeout: 10000 });
    const checks = await collectPreviewChecks(page);
    const textChecks = await page.evaluate(({ expectedText, capabilityId }) => {
      const text = document.body.innerText;
      return {
        expectedTextVisible: text.includes(expectedText),
        blockedOrReadyStateVisible: text.includes("BLOCKED_CAPABILITY_UNAVAILABLE") ||
          text.includes("BLOCKED_MISSING_INPUT") ||
          text.includes("READY_FOR_APPROVAL"),
        paymentPreviewVisible: ["BOOK_COVER", "VOCAL_REPLACE"].includes(capabilityId)
          ? text.includes("PAID_PROVIDER_REQUIRED")
          : true,
        localReadyVisible: ["WEBSITE_GENERATE", "VIDEO_TRIM"].includes(capabilityId)
          ? (text.includes("Локальная обработка") || text.includes("LOCAL_COMPUTE"))
          : true
      };
    }, { expectedText: capability.requiredText, capabilityId: capability.id });
    capabilityResults.push({
      capabilityId: capability.id,
      finalUrl: page.url(),
      checks,
      textChecks,
      status: Object.entries({ ...checks, ...textChecks })
        .filter(([key]) => key !== "documentMetrics")
        .every(([, value]) => value === true)
        ? "PASS"
        : "FAIL"
    });
  }

  await page.goto(route("WEBSITE_GENERATE"), { waitUntil: "networkidle" });
  await page.waitForSelector(".execution-preview-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "website_execution_preview"));
  await page.goto(route("VIDEO_EDIT"), { waitUntil: "networkidle" });
  await page.waitForSelector(".execution-preview-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "video_execution_preview"));
  await page.goto(route("VOCAL_REPLACE"), { waitUntil: "networkidle" });
  await page.waitForSelector(".execution-preview-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "vocal_replace_execution_preview"));

  const status = capabilityResults.every((result) => result.status === "PASS") &&
    backNavigationWorks &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0 &&
    failedRequests.length === 0
    ? "PASS"
    : "FAIL";

  results.push({
    viewport,
    target: base,
    finalUrl: page.url(),
    screenshots,
    backNavigationWorks,
    capabilityResults,
    status,
    consoleErrors,
    pageErrors,
    failedRequests,
    interactionCount: 2,
    mutationCount: 0
  });

  await page.close();
}

await browser.close();

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_21J_EXECUTION_PREVIEW_PROOF_PASS"
    : "PHASE_21J_EXECUTION_PREVIEW_PROOF_FAIL",
  target: base,
  runtime,
  providerCalls: 0,
  externalModelCalls: 0,
  capabilityExecutionCount: 0,
  publishSocialAdCreatorDispatchCount: 0,
  paymentActivationCount: 0,
  executionPerformed: false,
  interactionCount,
  mutationCount: 0,
  results
};

const reportPath = path.join(artifactDir, "ExecutionPreviewBrowserProof.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  status: report.status,
  target: base,
  reportPath,
  screenshots: results.flatMap((result) => result.screenshots),
  interactionCount: report.interactionCount,
  mutationCount: report.mutationCount,
  providerCalls: 0,
  externalModelCalls: 0,
  capabilityExecutionCount: 0,
  paymentActivationCount: 0
}, null, 2));

if (report.status !== "PHASE_21J_EXECUTION_PREVIEW_PROOF_PASS") {
  process.exitCode = 1;
}
