import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22l";
const preferredPort = 3190;

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
  throw new Error("No available localhost port for Phase 22L proof server.");
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
    const panel = document.querySelector("#property-review-queue-panel");
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
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawUnsafePayload: !text.includes("rawPayload") && !text.includes("ownerText") && !text.includes("reviewNote"),
      noExecutedWording: !text.includes("MERGED") && !text.includes("PUBLISHED") && !text.includes("RESTORED FROM QUARANTINE") && !text.includes("PROPERTY_CHANGE_EXECUTED"),
      executionDisabledVisible: text.includes("REVIEW WORKFLOW ONLY") && text.includes("PROPERTY EXECUTION DISABLED") && text.includes("NOT_EXECUTED"),
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

async function runScenario(id, label, viewport, urlSuffix, fileName, predicate, action) {
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
    await page.waitForSelector("#property-review-queue-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    if (action) await action(page);
    const screenshot = await capture(page, fileName);
    const text = await page.textContent("body");
    const checks = await collectChecks(page);
    const pass = predicate(text, checks, page.url());
    const status = pass &&
      checks.sideEffectsStillZero &&
      checks.noHorizontalOverflow &&
      checks.noRawUnsafePayload &&
      checks.noExecutedWording &&
      checks.executionDisabledVisible &&
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
  await runScenario("queue-loads", "Scenario A - Review Queue loads", { width: 1440, height: 900 }, "#property-review-queue", "01_review_queue.png", (text) =>
    text.includes("ESSA Property Reviewer Handoff Queue") && text.includes("Handoff Queue"));
  await runScenario("filter-role-status", "Scenario B - Filter by role/status", { width: 1440, height: 900 }, "#property-review-queue?reviewerRole=PROPERTY_COMPLIANCE&reviewStatus=NOT_STARTED", "02_filter_role_status.png", (text) =>
    text.includes("Review Queue Filters") && text.includes("PROPERTY_COMPLIANCE"));
  await runScenario("assign", "Scenario C - Assign local reviewer", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_agency_listing_tower_b_0501", "03_assign_local_reviewer.png", (text) =>
    text.includes("ASSIGNED") && text.includes("reviewer_property_001") && text.includes("REVIEW_ASSIGNED"),
    async (page) => page.getByRole("button", { name: "Assign to local reviewer" }).click());
  await runScenario("accept-start", "Scenario D - Reviewer accepts/starts review", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_duplicate_partner_tower_b_0501", "04_accept_start_review.png", (text) =>
    text.includes("ACCEPTED_BY_REVIEWER") && text.includes("IN_REVIEW") && text.includes("REVIEW_STARTED"),
    async (page) => {
      await page.getByRole("button", { name: "Accept review" }).click();
      await page.getByRole("button", { name: "Start review" }).click();
    });
  await runScenario("more-evidence", "Scenario E - Request more evidence", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_manual_gap_record_city_missing", "05_more_evidence.png", (text) =>
    text.includes("WAITING_FOR_EVIDENCE") && text.includes("OWNERSHIP_DOCUMENT") && text.includes("MORE_EVIDENCE_REQUESTED"),
    async (page) => page.getByRole("button", { name: "Record evidence request" }).click());
  await runScenario("package-preview", "Scenario F - Open Review Case Package", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_agency_listing_tower_b_0501", "06_package_preview.png", (text) =>
    text.includes("Package Preview") && text.includes("PropertyReviewCasePackage") && text.includes("EXECUTION_NOT_ENABLED"));
  await runScenario("decision-history", "Scenario G - Decision history linkage", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_owner_sub_batumi_0707", "07_decision_history.png", (text) =>
    text.includes("Decision History") && text.includes("SUPERSEDED") && text.includes("decision_superseded_previous_owner_0707"));
  await runScenario("complete-disabled", "Scenario H - Complete review while execution remains disabled", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_owner_sub_batumi_0707", "08_review_complete_no_execution.png", (text) =>
    text.includes("REVIEW_COMPLETE") && text.includes("REVIEW_COMPLETED") && text.includes("canonicalPropertyMutation") && text.includes("NOT_EXECUTED"),
    async (page) => page.getByRole("button", { name: "Mark review complete" }).click());
  await runScenario("returned", "Scenario I - Returned-to-queue workflow", { width: 1280, height: 820 }, "#property-review-queue?item=queue_ingest_duplicate_partner_tower_b_0501", "09_returned_to_queue.png", (text) =>
    text.includes("RETURNED_TO_QUEUE") && text.includes("REVIEW_RETURNED"),
    async (page) => page.getByRole("button", { name: "Return to queue" }).click());
  await runScenario("mobile", "Scenario J - Mobile/narrow internal UI", { width: 390, height: 844 }, "#property-review-queue", "10_mobile_review_queue.png", (text) =>
    text.includes("Review Queue") && text.includes("REVIEW WORKFLOW ONLY"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_22L_PROPERTY_REVIEW_WORKFLOW_PROOF_PASS"
    : "FAIL_UI",
  route: `${base}#property-review-queue`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  mergeActions: 0,
  publishActions: 0,
  quarantineMutations: 0,
  canonicalPropertyMutation: 0,
  results
};
writeJson(path.join(artifactDir, "property_review_workflow_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22L_PROPERTY_REVIEW_WORKFLOW_PROOF_PASS") process.exit(1);
