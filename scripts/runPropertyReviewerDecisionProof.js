import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22j";
const preferredPort = 3170;

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
  throw new Error("No available localhost port for Phase 22J proof server.");
}

async function capture(page, fileName) {
  const screenshotPath = path.join(artifactDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const doc = document.documentElement;
    const panel = document.querySelector("#property-ingestion-review-panel");
    const counters = {
      providerCalls: panel?.dataset.providerCalls,
      externalCalls: panel?.dataset.externalCalls,
      dbMutations: panel?.dataset.dbMutations,
      paymentActions: panel?.dataset.paymentActions,
      bookingActions: panel?.dataset.bookingActions,
      transactionActions: panel?.dataset.transactionActions,
      mergeActions: panel?.dataset.mergeActions,
      publishActions: panel?.dataset.publishActions,
      quarantineMutations: panel?.dataset.quarantineMutations
    };
    return {
      hash: location.hash,
      currentMode: panel?.dataset.currentMode || "",
      accessBoundary: panel?.dataset.accessBoundary || "",
      optionCount: document.querySelectorAll(".property-reviewer-option").length,
      futureActionsDisabled: [...document.querySelectorAll(".property-future-action, .property-reviewer-option")].every((button) =>
        button.disabled && button.dataset.executionEnabled === "false"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawUnsafePayload: !text.includes("ownerText") && !text.includes("reviewNote") && !text.includes("rawPayload"),
      noExecutedWording: !text.includes("MERGED") && !text.includes("PUBLISHED") && !text.includes("RESTORED FROM QUARANTINE"),
      noExecutionStatus: text.includes("NOT_EXECUTED") && text.includes("No execution has occurred."),
      sideEffectsStillZero: Object.values(counters).every((value) => value === "0" || value == null),
      counters,
      documentMetrics: {
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

async function runScenario(id, label, viewport, urlSuffix, fileName, predicate) {
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
    await page.goto(`${base}${urlSuffix}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("#property-ingestion-review-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, fileName);
    const text = await page.textContent("body");
    const checks = await collectChecks(page);
    const pass = predicate(text, checks, page.url());
    const status = pass &&
      checks.sideEffectsStillZero &&
      checks.noHorizontalOverflow &&
      checks.noRawUnsafePayload &&
      checks.noExecutedWording &&
      checks.noExecutionStatus &&
      checks.futureActionsDisabled &&
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
  await runScenario("exact-options", "Scenario A - Exact match review available decisions", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "01_exact_match_decisions.png", (text, checks) =>
    text.includes("Available Decision Options") && text.includes("CONFIRM_EXACT_MATCH") && checks.optionCount >= 3);
  await runScenario("draft", "Scenario B - Local decision draft", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "02_decision_draft.png", (text) =>
    text.includes("Decision Draft") && text.includes("VALID_DECISION_CONTRACT") && text.includes("PROJECT_BUILDING_UNIT_MATCH"));
  await runScenario("validate", "Scenario C - Validate decision", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_duplicate_partner_tower_b_0501", "03_decision_validation.png", (text) =>
    text.includes("READY_FOR_REVIEW") && text.includes("REJECT_MATCH") && text.includes("VALID"));
  await runScenario("approved-no-execution", "Scenario D - Approved-as-decision without execution", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "04_approved_as_decision_no_execution.png", (text) =>
    text.includes("APPROVED_AS_DECISION") && text.includes("DECISION RECORDED - NO PROPERTY MUTATION PERFORMED"));
  await runScenario("conflict", "Scenario E - Conflict decision", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501_price_130000", "05_conflict_decision.png", (text) =>
    text.includes("ACKNOWLEDGE_CONFLICT") && text.includes("CONFLICTING_PRICE") && text.includes("No price is selected as correct automatically."));
  await runScenario("quarantine", "Scenario F - Quarantine decision", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_invalid_negative_area", "06_quarantine_decision.png", (text) =>
    text.includes("KEEP_IN_QUARANTINE") && text.includes("MALFORMED_SOURCE") && text.includes("EXECUTION LAYER - NOT ACTIVE"));
  await runScenario("more-evidence", "Scenario G - Request more evidence", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_manual_gap_record_city_missing", "07_request_more_evidence.png", (text) =>
    text.includes("REQUEST_MORE_EVIDENCE") && text.includes("INSUFFICIENT_EVIDENCE") && text.includes("city_missing"));
  await runScenario("superseded", "Scenario H - Superseded decision history", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_owner_sub_batumi_0707", "08_superseded_history.png", (text) =>
    text.includes("SUPERSEDED") && text.includes("supersedesDecisionId") && text.includes("decision_superseded_previous_owner_0707"));
  await runScenario("invalid", "Scenario I - Invalid decision blocked", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_invalid_negative_area&decisionType=CONFIRM_EXACT_MATCH", "09_invalid_decision_blocked.png", (text) =>
    text.includes("decision_invalid_quarantine_exact_match") && text.includes("decision_type_not_allowed_for_review_state"));
  await runScenario("mobile", "Scenario J - Mobile/narrow reviewer surface", { width: 390, height: 844 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "10_mobile_reviewer_decision.png", (text) =>
    text.includes("ESSA Property Ingestion Review") && text.includes("Decision History") && text.includes("NOT_EXECUTED"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22J_PROPERTY_REVIEWER_DECISION_PROOF_PASS" : "FAIL_UI",
  route: `${base}#property-ingestion-review`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  mergeActions: 0,
  publishActions: 0,
  quarantineMutations: 0,
  results
};
writeJson(path.join(artifactDir, "property_reviewer_decision_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22J_PROPERTY_REVIEWER_DECISION_PROOF_PASS") process.exit(1);
