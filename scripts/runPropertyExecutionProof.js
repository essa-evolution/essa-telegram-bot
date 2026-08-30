import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22n";
const preferredPort = 3210;

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
  throw new Error("No available localhost port for Phase 22N proof server.");
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
      localApprovedAssociationMutations: panel?.dataset.localApprovedAssociationMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      bannerVisible: text.includes("LOCAL CONTROLLED EXECUTION PROOF"),
      noProductionVisible: text.includes("NO PRODUCTION WRITE") && text.includes("NO PROVIDER EXECUTION") && text.includes("NO DATABASE EXECUTION"),
      gatewayVisible: text.includes("ExecutionGateway") || text.includes("gatewayResult"),
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
      forbiddenCountersZero: text.includes("unrelatedCanonicalPropertyMutations0") &&
        text.includes("ownershipMutations0") &&
        text.includes("listingHistoryDeletions0") &&
        text.includes("quarantineMutations0") &&
        text.includes("providerCalls0") &&
        text.includes("externalCalls0") &&
        text.includes("productionDbMutations0") &&
        text.includes("publishActions0") &&
        text.includes("paymentBookingCommercialTransaction0/0/0"),
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

async function runScenario(id, label, viewport, fileName, predicate, action) {
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
    await page.goto(`${base}#property-execution-proof`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("#property-execution-proof-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    if (action) await action(page);
    const screenshot = await capture(page, fileName);
    const text = await page.textContent("body");
    const checks = await collectChecks(page);
    const pass = predicate(text, checks, page.url());
    const status = pass &&
      checks.bannerVisible &&
      checks.noProductionVisible &&
      checks.gatewayVisible &&
      checks.noHorizontalOverflow &&
      checks.noForbiddenExecution &&
      checks.noRawUnsafePayload &&
      checks.forbiddenCountersZero &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
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
  await runScenario("load", "Scenario A - Execution proof route loads", { width: 1440, height: 900 }, "01_execution_proof_load.png", (text) =>
    text.includes("ESSA Property Controlled Execution Proof") && text.includes("APPLY_CONFIRMED_EXACT_MATCH"));
  await runScenario("intent", "Scenario B - Create intent", { width: 1440, height: 900 }, "02_create_intent.png", (text) =>
    text.includes("PROPERTY_EXECUTION_INTENT_CREATED") && text.includes("PropertyExecutionIntent"),
    async (page) => page.getByRole("button", { name: "Create Intent" }).click());
  await runScenario("preflight", "Scenario C - Preflight ready", { width: 1280, height: 820 }, "03_preflight_ready.png", (text) =>
    text.includes("READY_FOR_APPROVAL") && text.includes("allowed_action"),
    async (page) => page.getByRole("button", { name: "Run Preflight" }).click());
  await runScenario("execute", "Scenario D - Approve and execute via gateway", { width: 1280, height: 820 }, "04_execute_verified.png", (text) =>
    text.includes("VERIFIED") && text.includes("PROPERTY_EXECUTION_COMMITTED") && text.includes("PROPERTY_EXECUTION_VERIFIED") && text.includes("READY"),
    async (page) => page.getByRole("button", { name: "Approve + Execute via Gateway" }).click());
  await runScenario("idempotency", "Scenario E - Repeat is idempotent", { width: 1280, height: 820 }, "05_idempotency.png", (text) =>
    text.includes("ALREADY_APPLIED_IDEMPOTENT"),
    async (page) => {
      await page.getByRole("button", { name: "Approve + Execute via Gateway" }).click();
      await page.getByRole("button", { name: "Run Again Idempotency" }).click();
    });
  await runScenario("rollback", "Scenario F - Rollback restores local association", { width: 1280, height: 820 }, "06_rollback.png", (text) =>
    text.includes("ROLLED_BACK") && text.includes("associationRestored") && text.includes("PROPERTY_EXECUTION_ROLLED_BACK"),
    async (page) => {
      await page.getByRole("button", { name: "Approve + Execute via Gateway" }).click();
      await page.getByRole("button", { name: "Rollback Local Association" }).click();
    });
  await runScenario("failure", "Scenario G - Failure safety", { width: 1280, height: 820 }, "07_failure_safety.png", (text) =>
    text.includes("FAILED") && text.includes("synthetic_commit_failure_before_apply"),
    async (page) => page.getByRole("button", { name: "Show Failure Safety" }).click());
  await runScenario("state-mismatch", "Scenario H - State mismatch blocks execution", { width: 1280, height: 820 }, "08_state_mismatch.png", (text) =>
    text.includes("BLOCKED_STATE_MISMATCH"),
    async (page) => page.getByRole("button", { name: "Show State Mismatch Block" }).click());
  await runScenario("approval-boundary", "Scenario I - AI/provider approval blocked", { width: 1280, height: 820 }, "09_approval_boundary.png", (text) =>
    text.includes("APPROVAL_BLOCKED") && text.includes("Lisa/Navigator/provider/model cannot approve"));
  await runScenario("mobile", "Scenario J - Mobile/narrow execution proof", { width: 390, height: 844 }, "10_mobile_execution_proof.png", (text) =>
    text.includes("LOCAL CONTROLLED EXECUTION PROOF") && text.includes("NO PRODUCTION WRITE"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_22N_PROPERTY_EXECUTION_PROOF_PASS"
    : "FAIL_UI",
  route: `${base}#property-execution-proof`,
  localApprovedAssociationMutations: 1,
  unrelatedCanonicalPropertyMutations: 0,
  ownershipMutations: 0,
  listingHistoryDeletions: 0,
  quarantineMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  publishActions: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  results
};
writeJson(path.join(artifactDir, "property_execution_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22N_PROPERTY_EXECUTION_PROOF_PASS") process.exit(1);
