import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const target = "http://localhost:3000/workspace/#product-discovery";
const artifactDir = "artifacts/productDiscovery/phase21f";
const viewports = [
  { id: "desktop", width: 1440, height: 900, screenshot: "desktop_1440x900_product_discovery.png" },
  { id: "laptop", width: 1280, height: 720, screenshot: "laptop_1280x720_product_discovery.png" },
  { id: "tablet", width: 768, height: 1024, screenshot: "tablet_768x1024_product_discovery.png" },
  { id: "mobile", width: 390, height: 844, screenshot: "mobile_390x844_product_discovery.png" }
];

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function allTrue(checks) {
  return Object.values(checks).every(Boolean);
}

const runtime = await auditPlaywrightAvailability();
writeJson(path.join(artifactDir, "runtime_readiness_report.json"), {
  status: runtime.installationRequired ? "BLOCKED_RUNTIME_ACCESS" : "READY",
  rootCause: runtime.installationRequired ? "SANDBOX_ACCESS_FAILURE_OR_RUNTIME_UNAVAILABLE" : "SANDBOX_ACCESS_FAILURE_FIXED_BY_UNSANDBOXED_READ_ONLY_PROOF",
  reinstallNeeded: false,
  ...runtime
});

if (runtime.installationRequired) {
  console.log(JSON.stringify({ status: "BLOCKED_RUNTIME_ACCESS", runtime }, null, 2));
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleErrors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "request_failed"}`);
    });

    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: path.join(artifactDir, viewport.screenshot), fullPage: true });

    const checks = await page.evaluate(() => {
      const visible = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const count = (selector) => document.querySelectorAll(selector).length;
      const text = document.body.innerText;
      const doc = document.documentElement;
      const architectureBadges = [...document.querySelectorAll(".availability-badge")]
        .filter((badge) => badge.dataset.availabilityState === "ARCHITECTURE_ONLY")
        .map((badge) => badge.textContent.trim());

      return {
        surfaceLoads: visible("#product-discovery-panel"),
        broadOverviewRenders: text.includes("Overview: 8 продуктов") && text.includes("каталог 100 возможностей"),
        productCardsVisible: count(".product-card") >= 4,
        availabilityBadgesVisible: count(".availability-badge") >= 4,
        lisaProductGuideVisible: visible("#lisa-education-panel") && text.includes("Lisa Product Guide"),
        noFullCapabilityDump: !text.includes("TEXT_GENERATE") && !text.includes("IMAGE_BACKGROUND_REMOVE"),
        noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
        architectureOnlyNotActive: architectureBadges.length > 0 && architectureBadges.every((label) => label === "В РАЗРАБОТКЕ"),
        executionDisabled: [...document.querySelectorAll("[data-execution-enabled]")]
          .every((node) => node.dataset.executionEnabled === "false"),
        sourceOfTruthEvidence: text.includes("providerCalls=0") && text.includes("executionPerformed=false"),
        availabilityBadgeText: [...document.querySelectorAll(".availability-badge")]
          .map((badge) => badge.textContent.trim())
          .slice(0, 12),
        productCardTitles: [...document.querySelectorAll(".product-card h3")]
          .map((node) => node.textContent.trim())
          .slice(0, 8),
        lisaText: document.querySelector("#lisa-education-panel")?.innerText.slice(0, 500) || "",
        documentMetrics: {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          scrollHeight: doc.scrollHeight,
          clientHeight: doc.clientHeight
        }
      };
    });

    results.push({
      viewport,
      target,
      finalUrl: page.url(),
      screenshotPath: path.join(artifactDir, viewport.screenshot),
      checks,
      status: allTrue({
        surfaceLoads: checks.surfaceLoads,
        broadOverviewRenders: checks.broadOverviewRenders,
        productCardsVisible: checks.productCardsVisible,
        availabilityBadgesVisible: checks.availabilityBadgesVisible,
        lisaProductGuideVisible: checks.lisaProductGuideVisible,
        noFullCapabilityDump: checks.noFullCapabilityDump,
        noHorizontalOverflow: checks.noHorizontalOverflow,
        architectureOnlyNotActive: checks.architectureOnlyNotActive,
        executionDisabled: checks.executionDisabled
      }) && consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0
        ? "PASS"
        : "FAIL",
      consoleErrors,
      pageErrors,
      failedRequests,
      interactionCount: 0,
      mutationCount: 0
    });

    await page.close();
  }
} finally {
  await browser.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_21F_VISUAL_PROOF_PASS_WITH_WARNINGS"
    : "FAIL_UI",
  target,
  runtimeStatus: "READY",
  providerCalls: 0,
  externalModelCalls: 0,
  executionPerformed: false,
  interactionCount: 0,
  mutationCount: 0,
  results
};

writeJson(path.join(artifactDir, "ProductDiscoveryBrowserObservationArtifact.json"), {
  type: "ProductDiscoveryBrowserObservationArtifact",
  target,
  createdAt: new Date().toISOString(),
  results
});
writeJson(path.join(artifactDir, "responsive_verification_report.json"), report);
console.log(JSON.stringify(report, null, 2));

if (report.status === "FAIL_UI") {
  process.exit(1);
}
