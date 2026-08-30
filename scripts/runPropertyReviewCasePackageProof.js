import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";
import {
  buildPropertyIngestionReviewViewModel,
  exportPropertyReviewCasePackageJson,
  exportPropertyReviewCasePackageMarkdown
} from "../src/property/index.js";

const artifactDir = "artifacts/property/phase22k";
const preferredPort = 3180;

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
  throw new Error("No available localhost port for Phase 22K proof server.");
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
      packageExecutionReadiness: panel?.dataset.packageExecutionReadiness || "",
      buildButtonDisabled: [...document.querySelectorAll("button")].filter((button) => button.textContent.includes("BUILD REVIEW CASE PACKAGE")).every((button) => button.disabled),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawUnsafePayload: !text.includes("ownerText") && !text.includes("reviewNote") && !text.includes("rawPayload"),
      noExecutedWording: !text.includes("MERGED") && !text.includes("PUBLISHED") && !text.includes("RESTORED FROM QUARANTINE"),
      noExecutionStatus: text.includes("NOT_EXECUTED") && text.includes("EXECUTION_NOT_ENABLED"),
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

const vm = buildPropertyIngestionReviewViewModel({ selectedIngestionId: "ingest_agency_listing_tower_b_0501" });
writeFile(path.join(artifactDir, "sample_case_package.json"), exportPropertyReviewCasePackageJson(vm.selected.reviewCasePackage));
writeFile(path.join(artifactDir, "sample_case_package.md"), exportPropertyReviewCasePackageMarkdown(vm.selected.reviewCasePackage));

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
      checks.buildButtonDisabled &&
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
  await runScenario("build-package", "Scenario A - Open review item and build package preview", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "01_build_case_package.png", (text) =>
    text.includes("BUILD REVIEW CASE PACKAGE") && text.includes("Review Case Package"));
  await runScenario("summary", "Scenario B - Full case summary", { width: 1440, height: 900 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "02_case_summary.png", (text) =>
    text.includes("REVIEWED_DECISION_RECORDED") && text.includes("No merge or repository mutation has been executed."));
  await runScenario("conflict", "Scenario C - Conflict package", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501_price_130000", "03_conflict_package.png", (text) =>
    text.includes("BLOCKED_BY_CONFLICT") && text.includes("COMPLIANCE_REVIEW_REQUIRED"));
  await runScenario("quarantine", "Scenario D - Quarantine package", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_invalid_negative_area", "04_quarantine_package.png", (text) =>
    text.includes("BLOCKED_BY_QUARANTINE") && text.includes("SOURCE_CLARIFICATION_REQUIRED"));
  await runScenario("history", "Scenario E - Decision history and supersession", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_owner_sub_batumi_0707", "05_decision_history_package.png", (text) =>
    text.includes("SUPERSEDED") && text.includes("decision_superseded_previous_owner_0707"));
  await runScenario("professional-review", "Scenario F - Professional review requirements", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_manual_gap_record_city_missing", "06_professional_review.png", (text) =>
    text.includes("BLOCKED_BY_MISSING_EVIDENCE") && text.includes("ADDITIONAL_DOCUMENTS_REQUIRED"));
  await runScenario("version-integrity", "Scenario G - Package version and integrity", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "07_version_integrity.png", (text) =>
    text.includes("packageVersion") && text.includes("local-fnv1a-32") && text.includes("LOCAL_NEW_EVIDENCE_VERSION_PROOF"));
  await runScenario("exports", "Scenario H - Local JSON and human-readable export", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "08_local_exports.png", (text) =>
    text.includes("jsonExportReady") && text.includes("humanReadableExportReady") && text.includes("READY_FOR_HANDOFF"));
  await runScenario("lisa", "Scenario I - Lisa explains package", { width: 1280, height: 820 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501_price_130000", "09_lisa_package.png", (text) =>
    text.includes("REVIEWED_DECISION_RECORDED means a decision is auditable") && text.includes("No execution has occurred."));
  await runScenario("mobile", "Scenario J - Mobile/narrow package view", { width: 390, height: 844 }, "#property-ingestion-review?item=ingest_agency_listing_tower_b_0501", "10_mobile_case_package.png", (text) =>
    text.includes("Review Case Package") && text.includes("EXECUTION_NOT_ENABLED"));
} finally {
  await browser.close();
  server.close();
}

const sampleJson = fs.readFileSync(path.join(artifactDir, "sample_case_package.json"), "utf8");
const sampleMarkdown = fs.readFileSync(path.join(artifactDir, "sample_case_package.md"), "utf8");
const exportChecks = {
  jsonExportExists: sampleJson.includes("PropertyReviewCasePackage"),
  markdownExportExists: sampleMarkdown.includes("Property Review Case Package"),
  sanitized: !`${sampleJson}\n${sampleMarkdown}`.includes("rawPayload") &&
    !`${sampleJson}\n${sampleMarkdown}`.includes("ownerText") &&
    !`${sampleJson}\n${sampleMarkdown}`.includes("reviewNote")
};

const report = {
  status: results.every((result) => result.status === "PASS") && Object.values(exportChecks).every(Boolean)
    ? "PHASE_22K_PROPERTY_REVIEW_CASE_PACKAGE_PROOF_PASS"
    : "FAIL_UI",
  route: `${base}#property-ingestion-review`,
  exportChecks,
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
writeJson(path.join(artifactDir, "property_review_case_package_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22K_PROPERTY_REVIEW_CASE_PACKAGE_PROOF_PASS") process.exit(1);
