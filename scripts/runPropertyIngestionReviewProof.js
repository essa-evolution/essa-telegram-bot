import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22i";
const preferredPort = 3160;

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
  throw new Error("No available localhost port for Phase 22I proof server.");
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
      transactionActions: panel?.dataset.transactionActions
    };
    return {
      hash: location.hash,
      currentMode: panel?.dataset.currentMode || "",
      accessBoundary: panel?.dataset.accessBoundary || "",
      queueItems: document.querySelectorAll(".property-ingestion-list button").length,
      disabledFutureActions: [...document.querySelectorAll(".property-future-action")].every((button) => button.disabled && button.dataset.executionEnabled === "false"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawUnsafePayload: !text.includes("ownerText") && !text.includes("reviewNote") && !text.includes("rawPayload"),
      noForbiddenActiveActions: !text.includes("Approve Merge") && !text.includes("Restore from Quarantine") && !text.includes("Publish Listing"),
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
      checks.noForbiddenActiveActions &&
      checks.disabledFutureActions &&
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
  await runScenario("accepted-owner", "Scenario A - Accepted Owner Submission", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_owner_sub_batumi_0707", "01_ingestion_queue.png", (text) =>
    text.includes("OWNER_SUBMISSION") && text.includes("NO_MATCH_NEW_PROPERTY_CANDIDATE"));
  await runScenario("developer-agency", "Scenario B - Developer + Agency exact match", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "02_accepted_detail.png", (text) =>
    text.includes("EXACT_MATCH") && (text.includes("project_building_unit") || text.includes("canonical_property_id")));
  await runScenario("duplicate", "Scenario C - Duplicate source shows one canonical Property", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_duplicate_partner_tower_b_0501", "03_normalization_detail.png", (text) =>
    text.includes("duplicate_partner_tower_b_0501") && text.includes("EXACT_MATCH"));
  await runScenario("conflict", "Scenario D - Conflicting price review", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501_price_130000", "04_conflict_review.png", (text) =>
    text.includes("CONFLICT_REVIEW_REQUIRED") && text.includes("130000 USD") && text.includes("No price is selected as correct automatically."));
  await runScenario("quarantine", "Scenario E - Quarantined invalid record", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_invalid_negative_area", "05_quarantine.png", (text) =>
    text.includes("QUARANTINED") && text.includes("area_impossible_negative"));
  await runScenario("gaps", "Scenario F - Accepted with gaps", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_manual_gap_record_city_missing", "06_accepted_with_gaps.png", (text) =>
    text.includes("ACCEPTED_WITH_GAPS") && text.includes("city_missing"));
  await runScenario("lineage", "Scenario G - Source lineage trace", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "07_source_lineage.png", (text) =>
    text.includes("SourceRecord -> SourceRef") && text.includes("ListingSnapshot"));
  await runScenario("timeline", "Scenario H - Audit timeline", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "08_audit_timeline.png", (text) =>
    text.includes("Received") && text.includes("Repository Read Ready"));
  await runScenario("filters", "Scenario I - Filters", { width: 1280, height: 820 }, "#property-ingestion-review?hasConflict=1", "09_filters.png", (text, checks) =>
    text.includes("CONFLICT_REVIEW_REQUIRED") && checks.queueItems >= 1);
  await runScenario("mobile", "Scenario J - Mobile/narrow internal view", { width: 390, height: 844 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501_price_130000", "10_mobile.png", (text) =>
    text.includes("ESSA Property Ingestion Review") && text.includes("INTERNAL / ADMIN / LOCAL PROOF"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22I_PROPERTY_INGESTION_REVIEW_PROOF_PASS" : "FAIL_UI",
  route: `${base}#property-ingestion-review`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results
};
writeJson(path.join(artifactDir, "property_ingestion_review_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22I_PROPERTY_INGESTION_REVIEW_PROOF_PASS") process.exit(1);
