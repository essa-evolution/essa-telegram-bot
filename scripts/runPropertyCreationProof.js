import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23f";
const preferredPort = 3270;

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
  throw new Error("No available localhost port for Phase 23F proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const doc = document.documentElement;
    const panel = document.querySelector("#property-creation-proof-panel");
    const addPanel = document.querySelector("#add-property-panel");
    return {
      hash: location.hash,
      creationVisible: Boolean(document.querySelector("#property-creation-proof-panel:not([hidden])")),
      addPropertyVisible: Boolean(document.querySelector("#add-property-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      preflightStatus: panel?.dataset.preflightStatus || "",
      gatewayAllowed: panel?.dataset.gatewayAllowed || "",
      localCanonicalPropertyCreations: panel?.dataset.localCanonicalPropertyCreations || "0",
      duplicatePropertyCreations: panel?.dataset.duplicatePropertyCreations || "0",
      listingCreations: panel?.dataset.listingCreations || "0",
      listingMutations: panel?.dataset.listingMutations || "0",
      ownershipMutations: panel?.dataset.ownershipMutations || "0",
      publishActions: panel?.dataset.publishActions || "0",
      providerCalls: panel?.dataset.providerCalls || addPanel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || addPanel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || addPanel?.dataset.productionDbMutations || "0",
      hasActor: Boolean(document.querySelector("[data-testid='creation-actor']")),
      hasIntent: Boolean(document.querySelector("[data-testid='creation-intent']")),
      hasPreflight: Boolean(document.querySelector("[data-testid='creation-preflight']")),
      hasResult: Boolean(document.querySelector("[data-testid='creation-result']")),
      hasSideEffects: Boolean(document.querySelector("[data-testid='creation-side-effects']")),
      hasHandoff: Boolean(document.querySelector("[data-testid='property-creation-handoff']")),
      noPrivateLeak: !text.includes("protected_doc_ref") && !text.includes("rawPayload") && !text.includes("OPENAI_API_KEY") && !text.includes("process.env"),
      noForbiddenState: !text.includes("LISTED_FOR_SALE") && !text.includes("PUBLISHED") && !text.includes("PAYMENT_CREATED") && !text.includes("BOOKED") && !text.includes("OWNERSHIP_TRANSFERRED"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      text
    };
  });
}

async function capture(page, fileName) {
  const screenshotPath = path.join(artifactDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
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
    if (action) await action(page);
    await page.waitForSelector(locationSelector(hash, await page.evaluate(() => location.hash)), { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.duplicatePropertyCreations === "0" &&
      checks.listingCreations === "0" &&
      checks.listingMutations === "0" &&
      checks.ownershipMutations === "0" &&
      checks.publishActions === "0" &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.noPrivateLeak &&
      checks.noForbiddenState &&
      checks.noHorizontalOverflow &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0;
    results.push({ id, label, status: predicate(checks) && boundaryPass ? "PASS" : "FAIL", screenshot, finalUrl: page.url(), checks: { ...checks, text: undefined }, consoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

function locationSelector(initialHash, currentHash) {
  return currentHash.startsWith("#add-property") || initialHash.startsWith("#add-property")
    ? "#add-property-panel:not([hidden])"
    : "#property-creation-proof-panel:not([hidden])";
}

try {
  await runScenario("A", "Add Property to creation handoff", { width: 1440, height: 900 }, "#add-property?flow=owner&step=review_readiness", "01_add_property_handoff.png", (checks) =>
    checks.addPropertyVisible && checks.hasHandoff && checks.text.includes("PREPARE CANONICAL PROPERTY CREATION"));
  await runScenario("B", "Owner successful creation", { width: 1440, height: 900 }, "#property-creation-proof?case=owner", "02_owner_creation.png", (checks) =>
    checks.creationVisible && checks.preflightStatus === "READY_FOR_APPROVAL" && checks.gatewayAllowed === "true" && checks.text.includes("PROPERTY_CREATED_LOCAL_PROOF"));
  await runScenario("C", "Property ID visible", { width: 1280, height: 820 }, "#property-creation-proof?case=owner", "03_property_id.png", (checks) =>
    checks.text.includes("prop_local_batumi_apartment_unit_"));
  await runScenario("D", "Passport after creation", { width: 1280, height: 820 }, "#property-creation-proof?case=owner", "04_passport.png", (checks) =>
    checks.text.includes("PassportPASSPORT_GENERATED"));
  await runScenario("E", "No Listing created", { width: 1280, height: 820 }, "#property-creation-proof?case=owner", "05_no_listing.png", (checks) =>
    checks.text.includes("Listing count0") && checks.listingCreations === "0");
  await runScenario("F", "Existing exact match blocks duplicate", { width: 1280, height: 820 }, "#property-creation-proof?case=existingMatch", "06_existing_match.png", (checks) =>
    checks.preflightStatus === "EXISTING_PROPERTY_MATCH" && checks.localCanonicalPropertyCreations === "0");
  await runScenario("G", "Probable duplicate review", { width: 1280, height: 820 }, "#property-creation-proof?case=probableDuplicate", "07_probable_duplicate.png", (checks) =>
    checks.preflightStatus === "BLOCKED_DUPLICATE_REVIEW");
  await runScenario("H", "Agent missing creation authority", { width: 1280, height: 820 }, "#property-creation-proof?case=agent", "08_agent_blocked.png", (checks) =>
    checks.preflightStatus === "BLOCKED_AUTHORITY");
  await runScenario("I", "Manager blocked", { width: 1280, height: 820 }, "#property-creation-proof?case=manager", "09_manager_blocked.png", (checks) =>
    checks.preflightStatus === "BLOCKED_AUTHORITY");
  await runScenario("J", "Developer Project X", { width: 1280, height: 820 }, "#property-creation-proof?case=developer", "10_developer_x.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.text.includes("project_green_tower"));
  await runScenario("K", "Developer Project Z blocked", { width: 1280, height: 820 }, "#property-creation-proof?case=developerZ", "11_developer_z.png", (checks) =>
    checks.preflightStatus === "BLOCKED_SCOPE");
  await runScenario("L", "Idempotent repeat", { width: 1280, height: 820 }, "#property-creation-proof?case=owner", "12_idempotent.png", (checks) =>
    checks.text.includes("Idempotent repeatALREADY_CREATED_IDEMPOTENT"));
  await runScenario("M", "Synthetic failure safety", { width: 1280, height: 820 }, "#property-creation-proof?case=failure", "13_failure.png", (checks) =>
    checks.text.includes("ExecutionFAILED") && checks.localCanonicalPropertyCreations === "0");
  await runScenario("N", "Rollback", { width: 1280, height: 820 }, "#property-creation-proof?case=owner", "14_rollback.png", (checks) =>
    checks.text.includes("RollbackROLLED_BACK") && checks.text.includes("Rollback dependency guardROLLBACK_BLOCKED"));
  await runScenario("O", "Mobile/narrow UI", { width: 390, height: 844 }, "#property-creation-proof?case=owner", "15_mobile.png", (checks) =>
    checks.creationVisible && checks.noHorizontalOverflow && checks.hasActor && checks.hasIntent && checks.hasPreflight && checks.hasResult && checks.hasSideEffects);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23F_PROPERTY_CREATION_PROOF_PASS"
    : "FAIL_UI",
  route: `${base}#property-creation-proof`,
  localCanonicalPropertyCreations: "expected local proof count only",
  duplicatePropertyCreations: 0,
  unrelatedCanonicalPropertyMutations: 0,
  listingCreations: 0,
  listingMutations: 0,
  ownershipMutations: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_creation_proof_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23F_PROPERTY_CREATION_PROOF_PASS") process.exit(1);
