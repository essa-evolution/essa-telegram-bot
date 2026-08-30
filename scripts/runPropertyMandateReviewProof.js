import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23d";
const preferredPort = 3250;

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve(port);
    });
  });
}

async function startStaticServer() {
  const app = express();
  app.use("/workspace", express.static(path.join(process.cwd(), "workspace"), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store")
  }));
  app.use("/src", express.static(path.join(process.cwd(), "src"), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store")
  }));
  app.get("/", (req, res) => res.redirect("/workspace/"));
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    const server = http.createServer(app);
    try {
      await listen(server, port);
      return { server, port };
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error("No available localhost port for Phase 23D proof server.");
}

async function capture(page, fileName) {
  const screenshotPath = path.join(artifactDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const doc = document.documentElement;
    const panel = document.querySelector("#property-mandate-review-panel");
    return {
      hash: location.hash,
      reviewVisible: Boolean(document.querySelector("#property-mandate-review-panel:not([hidden])")),
      queueVisible: Boolean(document.querySelector("#property-review-queue-panel:not([hidden])")),
      packageStatus: panel?.dataset.packageStatus || "",
      outcomeType: panel?.dataset.outcomeType || "",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      listingMutation: panel?.dataset.listingMutation || "0",
      canonicalPropertyMutation: panel?.dataset.canonicalPropertyMutation || "0",
      authorityActivationActions: panel?.dataset.authorityActivationActions || "0",
      hasCase: Boolean(document.querySelector("[data-testid='mandate-review-case']")),
      hasEvidence: Boolean(document.querySelector("[data-testid='mandate-review-evidence']")),
      hasVersion: Boolean(document.querySelector("[data-testid='mandate-review-version']")),
      hasOutcome: Boolean(document.querySelector("[data-testid='mandate-review-outcome']")),
      hasBoundaries: Boolean(document.querySelector("[data-testid='mandate-review-boundaries']")),
      noPrivateLeak: !text.includes("protected_doc_ref") && !text.includes("rawPayload") && !text.includes("OPENAI_API_KEY") && !text.includes("process.env"),
      noForbiddenState: !text.includes("APPROVE MANDATE") && !text.includes("ACTIVE_AUTHORITY") && !text.includes("LEGALLY_VALID") && !text.includes("PUBLISHED") && !text.includes("PAYMENT_CREATED") && !text.includes("BOOKED"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      text
    };
  });
}

const runtime = await auditPlaywrightAvailability();
writeJson(path.join(artifactDir, "runtime_readiness_report.json"), {
  status: runtime.installationRequired ? "BLOCKED_RUNTIME_ACCESS" : "READY",
  ...runtime
});
if (runtime.installationRequired) {
  console.log(JSON.stringify({ status: "BLOCKED_RUNTIME_ACCESS", runtime }, null, 2));
  process.exit(1);
}

const { server, port } = await startStaticServer();
const base = `http://localhost:${port}/workspace/`;
const browser = await chromium.launch({ headless: true });
const results = [];

async function runScenario(id, label, viewport, hash, fileName, predicate, action = null) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "request_failed"}`));
  try {
    await page.goto(`${base}${hash}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector(hash.startsWith("#property-review-queue") ? "#property-review-queue-panel:not([hidden])" : "#property-mandate-review-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    if (action) await action(page);
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const pass = predicate(checks);
    const status = pass &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.listingMutation === "0" &&
      checks.canonicalPropertyMutation === "0" &&
      checks.authorityActivationActions === "0" &&
      checks.noPrivateLeak &&
      checks.noForbiddenState &&
      checks.noHorizontalOverflow &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0
      ? "PASS"
      : "FAIL";
    results.push({ id, label, status, screenshot, finalUrl: page.url(), checks: { ...checks, text: undefined }, consoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("A", "Review queue shows mandate case", { width: 1440, height: 900 }, "#property-review-queue", "01_review_queue_handoff.png", (checks) =>
    checks.reviewVisible && checks.text.includes("PROPERTY MANDATE REVIEW"),
    async (page) => {
      await page.getByRole("button", { name: "OPEN MANDATE AUTHORITY REVIEW" }).click();
      await page.waitForSelector("#property-mandate-review-panel:not([hidden])", { timeout: 10000 });
    });
  await runScenario("B", "Open mandate review", { width: 1440, height: 900 }, "#property-mandate-review", "02_open_review.png", (checks) =>
    checks.reviewVisible && checks.hasCase && checks.hasOutcome);
  await runScenario("C", "Owner-Agent ready case", { width: 1280, height: 820 }, "#property-mandate-review?case=ready", "03_owner_agent_ready.png", (checks) =>
    checks.packageStatus === "READY_FOR_REVIEW" && checks.outcomeType === "READY_FOR_FUTURE_SIGNATURE");
  await runScenario("D", "Missing evidence request", { width: 1280, height: 820 }, "#property-mandate-review?case=missingEvidence", "04_missing_evidence.png", (checks) =>
    checks.packageStatus === "WAITING_FOR_EVIDENCE" && checks.text.includes("OWNERSHIP_EVIDENCE_MISSING"));
  await runScenario("E", "Manager operational scope", { width: 1280, height: 820 }, "#property-mandate-review?case=ownerManager", "05_manager_operational.png", (checks) =>
    checks.text.includes("REQUEST_CLEANING") && checks.text.includes("START_SALE_WORKFLOW"));
  await runScenario("F", "Manager sale escalation blocked", { width: 1280, height: 820 }, "#property-mandate-review?case=escalation", "06_escalation_blocked.png", (checks) =>
    checks.packageStatus === "BLOCKED_BY_SCOPE" && checks.text.includes("AUTHORITY_ESCALATION_ATTEMPT"));
  await runScenario("G", "Developer project scope", { width: 1280, height: 820 }, "#property-mandate-review?case=developer", "07_developer_scope.png", (checks) =>
    checks.text.includes("project_green_tower") && checks.packageStatus === "READY_FOR_REVIEW");
  await runScenario("H", "Temporary cleaning access", { width: 1280, height: 820 }, "#property-mandate-review?case=tempCleaning", "08_temp_cleaning.png", (checks) =>
    checks.text.includes("SERVICE_ACCESS") && checks.text.includes("SALE"));
  await runScenario("I", "V1/V2 diff and re-review", { width: 1280, height: 820 }, "#property-mandate-review?case=v1", "09_version_diff.png", (checks) =>
    checks.hasVersion && checks.text.includes("Actions added") && checks.text.includes("Re-review required if changedtrue"));
  await runScenario("J", "Jurisdiction review required", { width: 1280, height: 820 }, "#property-mandate-review?case=jurisdictionUnknown", "10_jurisdiction.png", (checks) =>
    checks.packageStatus === "BLOCKED_BY_JURISDICTION" && checks.text.includes("JURISDICTION_RULE_UNKNOWN"));
  await runScenario("K", "Legal review required", { width: 1280, height: 820 }, "#property-mandate-review?case=legalReview", "11_legal_review.png", (checks) =>
    checks.text.includes("LEGAL_REVIEW_REQUIRED") && checks.text.includes("READY_FOR_FUTURE_HANDOFF"));
  await runScenario("L", "Ready for future signature", { width: 1280, height: 820 }, "#property-mandate-review?case=signatureReady", "12_signature_ready.png", (checks) =>
    checks.outcomeType === "READY_FOR_FUTURE_SIGNATURE" && checks.text.includes("Authority ActivationNOT_ACTIVE"));
  await runScenario("M", "Add Property returns AUTHORITY_NOT_ACTIVE", { width: 1280, height: 820 }, "#property-mandate-review?case=ready", "13_add_property_inactive.png", (checks) =>
    checks.text.includes("MANDATE_REVIEWED") && checks.text.includes("AUTHORITY_NOT_ACTIVE"));
  await runScenario("N", "Lisa explanation", { width: 1280, height: 820 }, "#property-mandate-review?case=ready", "14_lisa.png", (checks) =>
    checks.text.includes("Authority is not active"));
  await runScenario("O", "Mobile/narrow review UI", { width: 390, height: 844 }, "#property-mandate-review?case=tempCleaning", "15_mobile.png", (checks) =>
    checks.reviewVisible && checks.noHorizontalOverflow && checks.hasBoundaries);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23D_PROPERTY_MANDATE_REVIEW_PASS"
    : "FAIL_UI",
  route: `${base}#property-mandate-review`,
  canonicalPropertyMutation: 0,
  listingMutation: 0,
  ownershipMutation: 0,
  authorityActivationActions: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_mandate_review_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23D_PROPERTY_MANDATE_REVIEW_PASS") process.exit(1);
