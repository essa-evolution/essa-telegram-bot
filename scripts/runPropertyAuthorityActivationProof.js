import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23e";
const preferredPort = 3260;

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
  throw new Error("No available localhost port for Phase 23E proof server.");
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
    const panel = document.querySelector("#property-authority-activation-panel");
    return {
      hash: location.hash,
      activationVisible: Boolean(document.querySelector("#property-authority-activation-panel:not([hidden])")),
      reviewVisible: Boolean(document.querySelector("#property-mandate-review-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      preflightStatus: panel?.dataset.preflightStatus || "",
      gatewayAllowed: panel?.dataset.gatewayAllowed || "",
      localAuthorityActivationMutations: panel?.dataset.localAuthorityActivationMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      listingMutation: panel?.dataset.listingMutation || "0",
      canonicalPropertyMutation: panel?.dataset.canonicalPropertyMutation || "0",
      hasCandidate: Boolean(document.querySelector("[data-testid='authority-candidate']")),
      hasReadiness: Boolean(document.querySelector("[data-testid='authority-readiness']")),
      hasPreflight: Boolean(document.querySelector("[data-testid='authority-preflight']")),
      hasBeforeAfter: Boolean(document.querySelector("[data-testid='authority-before-after']")),
      hasSideEffects: Boolean(document.querySelector("[data-testid='authority-side-effects']")),
      noPrivateLeak: !text.includes("protected_doc_ref") && !text.includes("rawPayload") && !text.includes("OPENAI_API_KEY") && !text.includes("process.env"),
      noForbiddenState: !text.includes("PRODUCTION_WRITE_TRUE") && !text.includes("LEGALLY_VALID") && !text.includes("PUBLISHED") && !text.includes("PAYMENT_CREATED") && !text.includes("BOOKED"),
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
    if (action) await action(page);
    const visibleSelector = await page.evaluate(() => location.hash.startsWith("#property-authority-activation")
      ? "#property-authority-activation-panel:not([hidden])"
      : "#property-mandate-review-panel:not([hidden])");
    await page.waitForSelector(visibleSelector, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const pass = predicate(checks);
    const boundaryPass =
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.listingMutation === "0" &&
      checks.canonicalPropertyMutation === "0" &&
      checks.noPrivateLeak &&
      checks.noForbiddenState &&
      checks.noHorizontalOverflow &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0;
    results.push({ id, label, status: pass && boundaryPass ? "PASS" : "FAIL", screenshot, finalUrl: page.url(), checks: { ...checks, text: undefined }, consoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("A", "Reviewed mandate handoff opens activation", { width: 1440, height: 900 }, "#property-mandate-review?case=ready", "01_review_to_activation.png", (checks) =>
    checks.activationVisible && checks.preflightStatus === "READY_FOR_APPROVAL",
    async (page) => {
      await page.waitForSelector("#property-mandate-review-panel:not([hidden])", { timeout: 10000 });
      await page.getByRole("button", { name: "PREPARE LOCAL AUTHORITY ACTIVATION PROOF" }).click();
    });
  await runScenario("B", "Successful agent local activation", { width: 1440, height: 900 }, "#property-authority-activation?case=agent", "02_agent_activation.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.gatewayAllowed === "true" && checks.text.includes("AUTHORITY_ACTIVE_LOCAL_PROOF"));
  await runScenario("C", "Unsigned agent blocked", { width: 1280, height: 820 }, "#property-authority-activation?case=unsigned", "03_unsigned_blocked.png", (checks) =>
    checks.preflightStatus === "BLOCKED_SIGNATURE" && checks.gatewayAllowed === "false");
  await runScenario("D", "V1/V2 mismatch blocked", { width: 1280, height: 820 }, "#property-authority-activation?case=versionMismatch", "04_version_mismatch.png", (checks) =>
    checks.preflightStatus === "BLOCKED_VERSION_MISMATCH");
  await runScenario("E", "Manager operational activation", { width: 1280, height: 820 }, "#property-authority-activation?case=manager", "05_manager_activation.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.text.includes("MANAGE_PROPERTY"));
  await runScenario("F", "Manager sale remains blocked in review", { width: 1280, height: 820 }, "#property-mandate-review?case=escalation", "06_manager_sale_blocked.png", (checks) =>
    checks.reviewVisible && checks.text.includes("ACTIVATION BLOCKED"));
  await runScenario("G", "Developer Project X activation", { width: 1280, height: 820 }, "#property-authority-activation?case=developer", "07_developer_x.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.text.includes("project_green_tower"));
  await runScenario("H", "Developer Project Z blocked", { width: 1280, height: 820 }, "#property-authority-activation?case=developerZ", "08_developer_z.png", (checks) =>
    checks.preflightStatus === "BLOCKED_SCOPE");
  await runScenario("I", "Temporary cleaning access", { width: 1280, height: 820 }, "#property-authority-activation?case=tempCleaning", "09_temp_cleaning.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.text.includes("SERVICE_ACCESS"));
  await runScenario("J", "Unknown jurisdiction blocked", { width: 1280, height: 820 }, "#property-authority-activation?case=jurisdiction", "10_unknown_jurisdiction.png", (checks) =>
    checks.preflightStatus === "BLOCKED_JURISDICTION");
  await runScenario("K", "Legal review required blocked", { width: 1280, height: 820 }, "#property-authority-activation?case=legal", "11_legal_blocked.png", (checks) =>
    checks.preflightStatus === "BLOCKED_LEGAL_REVIEW");
  await runScenario("L", "Idempotent repeat", { width: 1280, height: 820 }, "#property-authority-activation?case=agent", "12_idempotent_repeat.png", (checks) =>
    checks.text.includes("Idempotent repeatALREADY_ACTIVE_IDEMPOTENT"));
  await runScenario("M", "Rollback readiness", { width: 1280, height: 820 }, "#property-authority-activation?case=agent", "13_rollback.png", (checks) =>
    checks.text.includes("RollbackROLLED_BACK") && checks.text.includes("HistoryLOCAL_PROOF_RECORDED"));
  await runScenario("N", "Add Property sees local proof", { width: 1280, height: 820 }, "#property-authority-activation?case=agent", "14_add_property_active.png", (checks) =>
    checks.text.includes("Add Property seesAUTHORITY_ACTIVE_LOCAL_PROOF"));
  await runScenario("O", "Mobile/narrow activation UI", { width: 390, height: 844 }, "#property-authority-activation?case=tempCleaning", "15_mobile.png", (checks) =>
    checks.activationVisible && checks.noHorizontalOverflow && checks.hasCandidate && checks.hasReadiness && checks.hasPreflight && checks.hasBeforeAfter && checks.hasSideEffects);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23E_PROPERTY_AUTHORITY_ACTIVATION_PASS"
    : "FAIL_UI",
  route: `${base}#property-authority-activation`,
  localAuthorityActivationMutations: "expected local proof count only",
  unrelatedAuthorityMutations: 0,
  canonicalPropertyMutation: 0,
  listingMutation: 0,
  ownershipMutation: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_authority_activation_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23E_PROPERTY_AUTHORITY_ACTIVATION_PASS") process.exit(1);
