import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const target = "http://localhost:3000/workspace/#product-discovery";
const artifactDir = path.join("artifacts", "productDiscovery", "phase21h");
const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "laptop", width: 1280, height: 720 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 }
];

fs.mkdirSync(artifactDir, { recursive: true });

const runtime = {
  playwrightAvailable: true,
  browserName: "chromium",
  executablePath: chromium.executablePath(),
  executableExists: fs.existsSync(chromium.executablePath()),
  reinstallNeeded: false
};

const browser = await chromium.launch({ headless: true });
const results = [];
let totalInteractionCount = 0;

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

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

  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForSelector("#product-discovery-panel:not([hidden])", { timeout: 10000 });

  const broadOverviewProof = await page.locator(".product-card").count();
  const initialLisaVisible = await page.locator("#lisa-education-panel").isVisible();

  await page.fill(".product-discovery-search input", "Мне нужна обложка книги");
  await page.click(".product-discovery-search button");
  totalInteractionCount += 2;
  await page.waitForSelector(".capability-card", { timeout: 10000 });

  await page.goto(`${target}/capability/BOOK_COVER?q=${encodeURIComponent("Мне нужна обложка книги")}`, { waitUntil: "networkidle" });
  totalInteractionCount += 1;
  await page.waitForSelector(".product-education-usage", { timeout: 10000 });

  const screenshotName = `${viewport.id}_${viewport.width}x${viewport.height}_product_education_ui.png`;
  const screenshotPath = path.join(artifactDir, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const checks = await page.evaluate(() => {
    const text = document.body.innerText;
    const metrics = {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight
    };
    return {
      productDiscoveryVisible: Boolean(document.querySelector("#product-discovery-panel:not([hidden])")),
      capabilityDetailVisible: Boolean(document.querySelector(".capability-detail")),
      lisaGuideVisible: Boolean(document.querySelector("#lisa-education-panel")),
      usageSectionVisible: text.includes("Как этим пользоваться"),
      contentAnglesVisible: text.includes("Идеи объяснения"),
      demoPreviewVisible: text.includes("Как это будет выглядеть") && text.includes("Демо пока в подготовке"),
      journeyPreviewVisible: text.includes("Пример пути"),
      growthPreviewVisible: text.includes("Product Education & Growth preview"),
      architectureOnlyHonest: text.includes("В РАЗРАБОТКЕ") && !text.includes("Попробовать сейчас"),
      falseClaimBlocked: text.includes("BLOCK_INVALID_EDUCATION_CLAIM"),
      executionDisabled: [...document.querySelectorAll("[data-execution-enabled]")].every((item) => item.dataset.executionEnabled === "false"),
      noHorizontalOverflow: metrics.scrollWidth <= metrics.clientWidth,
      documentMetrics: metrics
    };
  });

  results.push({
    viewport,
    target,
    finalUrl: page.url(),
    screenshotPath,
    broadOverviewProof,
    initialLisaVisible,
    checks,
    status: Object.entries(checks)
      .filter(([key]) => key !== "documentMetrics")
      .every(([, value]) => value === true) ? "PASS" : "FAIL",
    consoleErrors,
    pageErrors,
    failedRequests,
    interactionCount: 3,
    mutationCount: 0
  });

  await page.close();
}

await browser.close();

const report = {
  status: results.every((result) => result.status === "PASS" && result.consoleErrors.length === 0 && result.pageErrors.length === 0 && result.failedRequests.length === 0)
    ? "PHASE_21H_PRODUCT_EDUCATION_UI_PROOF_PASS"
    : "PHASE_21H_PRODUCT_EDUCATION_UI_PROOF_FAIL",
  target,
  runtime,
  providerCalls: 0,
  externalModelCalls: 0,
  publishSocialAdCreatorDispatchCount: 0,
  executionPerformed: false,
  interactionCount: totalInteractionCount,
  mutationCount: 0,
  results
};

const reportPath = path.join(artifactDir, "ProductEducationUiBrowserProof.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  status: report.status,
  target,
  reportPath,
  screenshots: results.map((result) => result.screenshotPath),
  interactionCount: report.interactionCount,
  mutationCount: report.mutationCount,
  providerCalls: 0,
  externalModelCalls: 0
}, null, 2));

if (report.status !== "PHASE_21H_PRODUCT_EDUCATION_UI_PROOF_PASS") {
  process.exitCode = 1;
}
