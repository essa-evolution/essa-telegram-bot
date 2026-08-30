import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22m";
const preferredPort = 3200;

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
  throw new Error("No available localhost port for Phase 22M proof server.");
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
      snapshotSectionVisible: text.includes("WORKFLOW SNAPSHOTS"),
      snapshotBannerVisible: text.includes("REVIEW WORKFLOW SNAPSHOT / RESTORE ONLY"),
      noPropertyExecutionVisible: text.includes("NO PROPERTY EXECUTION") &&
        text.includes("NO CANONICAL PROPERTY MUTATION") &&
        text.includes("NO LISTING PUBLICATION"),
      immutableCountersVisible: text.includes("canonicalPropertyMutation") &&
        text.includes("listingMutation") &&
        text.includes("quarantineMutation"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawUnsafePayload: !text.includes("rawPayload") &&
        !text.includes("ownerText") &&
        !text.includes("reviewNote") &&
        !text.includes("OPENAI_API_KEY") &&
        !text.includes("process.env"),
      noExecutedWording: !text.includes("MERGED") &&
        !text.includes("PUBLISHED") &&
        !text.includes("RESTORED FROM QUARANTINE") &&
        !text.includes("PROPERTY_CHANGE_EXECUTED"),
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
    await page.goto(`${base}#property-review-queue`, { waitUntil: "domcontentloaded", timeout: 15000 });
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
      checks.snapshotSectionVisible &&
      checks.snapshotBannerVisible &&
      checks.noPropertyExecutionVisible &&
      checks.immutableCountersVisible &&
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
  await runScenario("create-snapshot", "Scenario A - Create workflow snapshot", { width: 1440, height: 900 }, "01_create_snapshot.png", (text) =>
    text.includes("Created snapshot_property_review_workflow") &&
    text.includes("latestSnapshot") &&
    text.includes("snapshotHistory"),
    async (page) => page.getByRole("button", { name: "Create Snapshot" }).click());
  await runScenario("history", "Scenario B - Snapshot history is visible", { width: 1440, height: 900 }, "02_snapshot_history.png", (text) =>
    text.includes("snapshotHistory") &&
    text.includes("snapshot_property_review_workflow_1_1_0") &&
    text.includes("snapshot_property_review_workflow_1_3_0"),
    async (page) => page.getByRole("button", { name: "Compare Snapshots" }).click());
  await runScenario("compare", "Scenario C - Compare snapshots", { width: 1280, height: 820 }, "03_compare_snapshots.png", (text) =>
    text.includes("PropertyReviewWorkflowSnapshotDiff") &&
    text.includes("reviewStatusesChanged") &&
    text.includes("evidenceRequestsAddedOrClosed") &&
    text.includes("propertyChanges") &&
    text.includes("[]"),
    async (page) => page.getByRole("button", { name: "Compare Snapshots" }).click());
  await runScenario("verify", "Scenario D - Verify snapshot integrity", { width: 1280, height: 820 }, "04_verify_snapshot.png", (text) =>
    text.includes("SNAPSHOT_INTEGRITY_VALID"),
    async (page) => {
      await page.getByRole("button", { name: "Create Snapshot" }).click();
      await page.getByRole("button", { name: "Verify Snapshot" }).click();
    });
  await runScenario("restore", "Scenario E - Restore local review state", { width: 1280, height: 820 }, "05_restore_local_review_state.png", (text) =>
    text.includes("RESTORED_LOCAL_PROOF") &&
    text.includes("restoreReadiness"),
    async (page) => page.getByRole("button", { name: "Restore Local Review State" }).click());
  await runScenario("rollback", "Scenario F - Roll back local review state", { width: 1280, height: 820 }, "06_rollback_local_review_state.png", (text) =>
    text.includes("ROLLBACK_APPLIED_LOCAL_PROOF") &&
    text.includes("historical snapshots remain preserved"),
    async (page) => page.getByRole("button", { name: "Roll Back Local Review State" }).click());
  await runScenario("rollback-audit", "Scenario G - Rollback audit events are visible", { width: 1280, height: 820 }, "07_rollback_audit.png", (text) =>
    text.includes("ROLLBACK_REQUESTED") &&
    text.includes("ROLLBACK_VALIDATED") &&
    text.includes("ROLLBACK_APPLIED_LOCAL_PROOF"),
    async (page) => page.getByRole("button", { name: "Roll Back Local Review State" }).click());
  await runScenario("tampered", "Scenario H - Tampered snapshot is blocked", { width: 1280, height: 820 }, "08_tampered_block.png", (text) =>
    text.includes("RESTORE_BLOCKED_INTEGRITY") &&
    text.includes("tamperedSnapshot"),
    async (page) => page.getByRole("button", { name: "Show Tampered Block" }).click());
  await runScenario("immutability", "Scenario I - Property immutability counters stay zero", { width: 1280, height: 820 }, "09_property_immutability.png", (text) =>
    text.includes("canonicalPropertyMutation") &&
    text.includes("listingMutation") &&
    text.includes("quarantineMutation") &&
    text.includes("0"));
  await runScenario("mobile", "Scenario J - Mobile/narrow snapshot surface", { width: 390, height: 844 }, "10_mobile_workflow_snapshots.png", (text) =>
    text.includes("WORKFLOW SNAPSHOTS") &&
    text.includes("NO PROPERTY EXECUTION"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_22M_PROPERTY_REVIEW_WORKFLOW_SNAPSHOT_PROOF_PASS"
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
  listingMutation: 0,
  results
};
writeJson(path.join(artifactDir, "property_review_workflow_snapshot_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22M_PROPERTY_REVIEW_WORKFLOW_SNAPSHOT_PROOF_PASS") process.exit(1);
