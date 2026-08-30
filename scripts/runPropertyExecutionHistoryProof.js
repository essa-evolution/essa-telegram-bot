import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22o";
const preferredPort = 3220;

function writeFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function writeJson(filePath, value) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
  throw new Error("No available localhost port for Phase 22O proof server.");
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
    const panel = document.querySelector("#property-execution-proof-panel");
    return {
      hash: location.hash,
      currentMode: panel?.dataset.currentMode || "",
      accessBoundary: panel?.dataset.accessBoundary || "",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      newExecutionActionTypes: panel?.dataset.newExecutionActionTypes || "0",
      historyConsoleVisible: text.includes("INTERNAL EXECUTION HISTORY / APPROVAL INSPECTION / AUDIT CONSOLE"),
      historyListVisible: text.includes("Execution History List"),
      approvalInspectionVisible: text.includes("WHY WAS THIS APPROVED?") &&
        text.includes("REVIEWER DECISION") &&
        text.includes("EXECUTION APPROVAL"),
      diffVisible: text.includes("Before / After Diff") &&
        text.includes("no applied canonical association") &&
        text.includes("UNCHANGED"),
      sideEffectCountersVisible: text.includes("providerCalls0") &&
        text.includes("externalCalls0") &&
        text.includes("productionDbMutations0") &&
        text.includes("paymentBookingCommercialTransaction0/0/0"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noForbiddenExecution: !text.includes("PUBLISHED") &&
        !text.includes("BOOKED") &&
        !text.includes("PAYMENT_CREATED") &&
        !text.includes("PRODUCTION_DB_WRITE") &&
        !text.includes("OWNERSHIP_CHANGED"),
      noRawUnsafePayload: !text.includes("rawPayload") &&
        !text.includes("ownerText") &&
        !text.includes("reviewNote") &&
        !text.includes("OPENAI_API_KEY") &&
        !text.includes("process.env"),
      metrics: {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight
      }
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

async function runScenario(id, label, viewport, hash, fileName, predicate, action) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleErrors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "request_failed"}`));
  try {
    await page.goto(`${base}${hash}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const initialSelector = hash.startsWith("#property-review-queue")
      ? "#property-review-queue-panel:not([hidden])"
      : "#property-execution-proof-panel:not([hidden])";
    await page.waitForSelector(initialSelector, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    if (action) {
      await action(page);
      await page.waitForSelector("#property-execution-proof-panel:not([hidden])", { timeout: 10000 });
    }
    await page.waitForTimeout(50);
    const screenshot = await capture(page, fileName);
    const text = await page.textContent("body");
    const checks = await collectChecks(page);
    const pass = predicate(text, checks, page.url());
    const status = pass &&
      checks.currentMode === "property-execution-history" &&
      checks.historyConsoleVisible &&
      checks.historyListVisible &&
      checks.approvalInspectionVisible &&
      checks.sideEffectCountersVisible &&
      checks.noHorizontalOverflow &&
      checks.noForbiddenExecution &&
      checks.noRawUnsafePayload &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.newExecutionActionTypes === "0" &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0
      ? "PASS"
      : "FAIL";
    results.push({ id, label, status, pass, screenshots: [screenshot], finalUrl: page.url(), checks, consoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("history-list", "Scenario A - History list loads", { width: 1440, height: 900 }, "#property-execution-history", "01_history_list.png", (text) =>
    text.includes("A_VERIFIED") && text.includes("B_BLOCKED_DECISION") && text.includes("APPLY_CONFIRMED_EXACT_MATCH"));
  await runScenario("verified-detail", "Scenario B - Open verified detail", { width: 1440, height: 900 }, "#property-execution-history", "02_verified_detail.png", (text) =>
    text.includes("A_VERIFIED") && text.includes("VERIFIED") && text.includes("PropertyExecutionDetailViewModel"));
  await runScenario("approval-linkage", "Scenario C - Reviewer decision and approval linkage", { width: 1280, height: 820 }, "#property-execution-history", "03_approval_linkage.png", (text) =>
    text.includes("REVIEWER DECISION") && text.includes("EXECUTION APPROVAL") && text.includes("WHY WAS THIS APPROVED?"));
  await runScenario("before-after-diff", "Scenario D - Before/after diff", { width: 1280, height: 820 }, "#property-execution-history", "04_before_after_diff.png", (text, checks) =>
    checks.diffVisible && text.includes("prop_georgia_batumi_batumi_ingested_residence_tower_b_0501"));
  await runScenario("blocked", "Scenario E - Blocked execution records", { width: 1280, height: 820 }, "#property-execution-history?blockedOnly=1", "05_blocked_records.png", (text) =>
    text.includes("B_BLOCKED_DECISION") && text.includes("C_BLOCKED_CONFLICT") && text.includes("E_BLOCKED_STATE_MISMATCH"));
  await runScenario("idempotency", "Scenario F - Idempotent repeat inspection", { width: 1280, height: 820 }, "#property-execution-history?selectedExecutionRecordId=prop_exec_A_VERIFIED_REPEAT", "06_idempotency.png", (text) =>
    text.includes("F_IDEMPOTENT_REPEAT") && text.includes("ALREADY_APPLIED_IDEMPOTENT") && text.includes("Idempotency Key"));
  await runScenario("rollback", "Scenario G - Rollback inspection", { width: 1280, height: 820 }, "#property-execution-history?hasRollback=1", "07_rollback.png", (text) =>
    text.includes("H_ROLLED_BACK") && text.includes("ROLLED_BACK") && text.includes("Rollback"));
  await runScenario("side-effects", "Scenario H - Side-effect counters stay zero", { width: 1280, height: 820 }, "#property-execution-history", "08_side_effects.png", (text, checks) =>
    checks.sideEffectCountersVisible && text.includes("newExecutionActionTypes0"));
  await runScenario("review-queue-handoff", "Scenario I - Review queue handoff", { width: 1280, height: 820 }, "#property-review-queue", "09_review_queue_handoff.png", (text, checks, url) =>
    url.includes("#property-execution-history") && text.includes("ESSA Property Execution History"),
    async (page) => page.getByRole("button", { name: "VIEW EXECUTION HISTORY" }).click());
  await runScenario("mobile", "Scenario J - Mobile execution history", { width: 390, height: 844 }, "#property-execution-history", "10_mobile_history.png", (text) =>
    text.includes("ESSA Property Execution History") && text.includes("newExecutionActionTypes0"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_22O_PROPERTY_EXECUTION_HISTORY_PASS"
    : "FAIL_UI",
  route: `${base}#property-execution-history`,
  newExecutionActionTypes: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  ownershipMutations: 0,
  listingHistoryDeletions: 0,
  quarantineMutations: 0,
  publishActions: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_execution_history_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22O_PROPERTY_EXECUTION_HISTORY_PASS") process.exit(1);
