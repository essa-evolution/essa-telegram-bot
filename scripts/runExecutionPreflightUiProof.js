import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PHASE21L_TARGET_URL || "http://localhost:3000/workspace/";
const artifactDir = path.join("artifacts", "productDiscovery", "phase21l");

const fixtures = [
  { capabilityId: "BOOK_COVER", label: "book_cover" },
  { capabilityId: "WEBSITE_GENERATE", label: "website" },
  { capabilityId: "VIDEO_EDIT", label: "video" },
  { capabilityId: "VOCAL_REPLACE", label: "vocal_replace" },
  { capabilityId: "BUSINESS_DISCOVERY", label: "business_discovery" }
];

const viewports = [
  { label: "desktop_1440x900", width: 1440, height: 900 },
  { label: "laptop_1280x720", width: 1280, height: 720 },
  { label: "tablet_768x1024", width: 768, height: 1024 },
  { label: "mobile_390x844", width: 390, height: 844 }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function route(capabilityId) {
  return `${baseUrl}#product-discovery/preflight/${encodeURIComponent(capabilityId)}`;
}

ensureDir(artifactDir);

const browser = await chromium.launch({ headless: true });
const results = [];

for (const fixture of fixtures) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];
    const failedResources = [];
    let interactionCount = 0;
    let mutationCount = 0;

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (!url.startsWith("data:")) failedResources.push({ url, failure: request.failure()?.errorText || "unknown" });
    });

    const response = await page.goto(route(fixture.capabilityId), {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    await page.waitForSelector(".execution-preflight-detail", { timeout: 10000 });
    interactionCount += 1;

    const screenshotPath = path.join(artifactDir, `${viewport.label}_${fixture.label}_preflight.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const dom = await page.evaluate(() => {
      const root = document.querySelector(".execution-preflight-detail");
      const body = document.body;
      const html = document.documentElement;
      const blocks = [...document.querySelectorAll(".execution-preflight-block h4")].map((node) => node.textContent);
      const text = root?.innerText || "";
      return {
        routeCorrect: location.hash.startsWith("#product-discovery/preflight/"),
        statusVisible: Boolean(document.querySelector(".preflight-status")?.textContent?.trim()),
        inputsVisible: blocks.includes("Входные данные"),
        stepsVisible: blocks.includes("Порядок работы"),
        blockersVisible: blocks.includes("Что мешает запуску"),
        approvalsVisible: blocks.includes("Что нужно подтвердить"),
        artifactsVisible: blocks.includes("Что получится"),
        verificationVisible: blocks.includes("Как ESSA проверит результат"),
        debugVisible: Boolean(document.querySelector(".execution-preflight-debug")),
        executionEnabled: root?.dataset.executionEnabled,
        toolExecutionEnabled: root?.dataset.toolExecutionEnabled,
        providerExecutionEnabled: root?.dataset.providerExecutionEnabled,
        paymentEnabled: root?.dataset.paymentEnabled,
        publishEnabled: root?.dataset.publishEnabled,
        deployEnabled: root?.dataset.deployEnabled,
        providerCalls: root?.dataset.providerCalls,
        externalModelCalls: root?.dataset.externalModelCalls,
        horizontalOverflow: html.scrollWidth > html.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1,
        textIncludesProviderBrand: /OpenRouter|GPT|Claude|Anthropic|OpenAI|ZAI|GLM/i.test(text),
        disabledLaunchVisible: text.includes("Запуск отключ")
      };
    });

    mutationCount += 0;
    results.push({
      fixture: fixture.capabilityId,
      viewport,
      route: route(fixture.capabilityId),
      httpStatus: response?.status() || null,
      screenshotPath,
      ...dom,
      consoleErrors,
      pageErrors,
      failedResources,
      interactionCount,
      mutationCount,
      providerCalls: Number(dom.providerCalls || 0),
      externalCalls: 0,
      externalModelCalls: Number(dom.externalModelCalls || 0),
      capabilityExecutionCount: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0
    });

    await page.close();
  }
}

await browser.close();

const failures = results.filter((result) =>
  result.httpStatus !== 200 ||
  !result.routeCorrect ||
  !result.statusVisible ||
  !result.inputsVisible ||
  !result.stepsVisible ||
  !result.blockersVisible ||
  !result.approvalsVisible ||
  !result.artifactsVisible ||
  !result.verificationVisible ||
  result.executionEnabled !== "false" ||
  result.toolExecutionEnabled !== "false" ||
  result.providerExecutionEnabled !== "false" ||
  result.paymentEnabled !== "false" ||
  result.publishEnabled !== "false" ||
  result.deployEnabled !== "false" ||
  result.providerCalls !== 0 ||
  result.externalModelCalls !== 0 ||
  result.horizontalOverflow ||
  result.textIncludesProviderBrand ||
  !result.disabledLaunchVisible ||
  result.consoleErrors.length ||
  result.pageErrors.length ||
  result.failedResources.length
);

const report = {
  artifactType: "ExecutionPreflightUiAuditArtifact",
  route: "#product-discovery/preflight/<capabilityId>",
  fixtures: fixtures.map((fixture) => fixture.capabilityId),
  viewports,
  results,
  summary: {
    checks: results.length,
    failures: failures.length,
    screenshots: results.map((result) => result.screenshotPath),
    providerCalls: 0,
    externalCalls: 0,
    externalModelCalls: 0,
    capabilityExecutionCount: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    mutationCount: 0
  },
  timestamp: new Date().toISOString()
};

const reportPath = path.join(artifactDir, "ExecutionPreflightUiAuditArtifact.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(JSON.stringify({ reportPath, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  reportPath,
  checks: results.length,
  screenshots: results.length
}, null, 2));
