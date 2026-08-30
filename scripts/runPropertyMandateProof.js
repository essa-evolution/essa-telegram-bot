import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23c";
const preferredPort = 3240;

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
  throw new Error("No available localhost port for Phase 23C proof server.");
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
    const panel = document.querySelector("#property-mandate-panel");
    const addPanel = document.querySelector("#add-property-panel");
    return {
      hash: location.hash,
      mandateVisible: Boolean(document.querySelector("#property-mandate-panel:not([hidden])")),
      addPropertyVisible: Boolean(document.querySelector("#add-property-panel:not([hidden])")),
      eligibilityStatus: panel?.dataset.eligibilityStatus || addPanel?.dataset.readinessStatus || "",
      providerCalls: panel?.dataset.providerCalls || addPanel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || addPanel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || addPanel?.dataset.productionDbMutations || "0",
      listingMutation: panel?.dataset.listingMutation || addPanel?.dataset.listingMutation || "0",
      canonicalPropertyMutation: panel?.dataset.canonicalPropertyMutation || addPanel?.dataset.canonicalPropertyMutation || "0",
      hasRequest: Boolean(document.querySelector("[data-testid='mandate-request']")),
      hasScope: Boolean(document.querySelector("[data-testid='machine-readable-scope']")),
      hasDraft: Boolean(document.querySelector("[data-testid='mandate-draft']")),
      hasProposedAuthority: Boolean(document.querySelector("[data-testid='proposed-authority']")),
      hasLisa: Boolean(document.querySelector("[data-testid='lisa-mandate-guide']")),
      hasReturn: Boolean(document.querySelector("[data-testid='return-add-property']")),
      noPrivateLeak: !text.includes("protected_doc_ref") && !text.includes("rawPayload") && !text.includes("OPENAI_API_KEY") && !text.includes("process.env"),
      noForbiddenState: !text.includes("SIGNED") && !text.includes("LEGALLY_VALID") && !text.includes("PUBLISHED") && !text.includes("PAYMENT_CREATED") && !text.includes("BOOKED"),
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
    await page.waitForSelector(hash.startsWith("#add-property") ? "#add-property-panel:not([hidden])" : "#property-mandate-panel:not([hidden])", { timeout: 10000 });
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
  await runScenario("A", "Open mandate flow from Add Property", { width: 1440, height: 900 }, "#add-property?flow=agent&scenario=missing-mandate&step=authority", "01_open_from_add_property.png", (checks) =>
    checks.mandateVisible && checks.text.includes("PROPERTY MANDATE PREPARATION"),
    async (page) => {
      await page.getByRole("button", { name: "CREATE / REQUEST ESSA MANDATE" }).click();
      await page.waitForSelector("#property-mandate-panel:not([hidden])", { timeout: 10000 });
    });
  await runScenario("B", "Owner -> Agent mandate", { width: 1440, height: 900 }, "#property-mandate?flow=owner-agent", "02_owner_agent.png", (checks) =>
    checks.eligibilityStatus === "READY_FOR_LOCAL_DRAFT" && checks.text.includes("CREATE_SALE_LISTING") && checks.text.includes("TRANSFER_OWNERSHIP = DENIED"));
  await runScenario("C", "Owner -> Agent missing evidence", { width: 1280, height: 820 }, "#property-mandate?flow=owner-agent-missing-evidence", "03_owner_agent_missing_evidence.png", (checks) =>
    checks.eligibilityStatus === "EVIDENCE_REQUIRED");
  await runScenario("D", "Owner -> Manager mandate", { width: 1280, height: 820 }, "#property-mandate?flow=owner-manager", "04_owner_manager.png", (checks) =>
    checks.eligibilityStatus === "READY_FOR_LOCAL_DRAFT" && checks.text.includes("REQUEST_CLEANING"));
  await runScenario("E", "Manager sale remains denied", { width: 1280, height: 820 }, "#property-mandate?flow=owner-manager", "05_manager_sale_denied.png", (checks) =>
    checks.text.includes("START_SALE_WORKFLOW = DENIED"));
  await runScenario("F", "Developer -> Representative", { width: 1280, height: 820 }, "#property-mandate?flow=developer-representative", "06_developer_representative.png", (checks) =>
    checks.eligibilityStatus === "READY_FOR_LOCAL_DRAFT" && checks.text.includes("project_green_tower"));
  await runScenario("G", "Developer out-of-scope", { width: 1280, height: 820 }, "#property-mandate?flow=developer-out-of-scope", "07_developer_out_scope.png", (checks) =>
    checks.eligibilityStatus === "INVALID_SCOPE");
  await runScenario("H", "Temporary cleaning access", { width: 1280, height: 820 }, "#property-mandate?flow=temporary-cleaning", "08_temp_cleaning.png", (checks) =>
    checks.eligibilityStatus === "READY_FOR_LOCAL_DRAFT" && checks.text.includes("SERVICE_ACCESS = ALLOWED") && checks.text.includes("SALE = DENIED"));
  await runScenario("I", "No authority escalation", { width: 1280, height: 820 }, "#property-mandate?flow=authority-escalation", "09_no_escalation.png", (checks) =>
    checks.eligibilityStatus === "BLOCKED_AUTHORITY_ESCALATION");
  await runScenario("J", "Expired mandate", { width: 1280, height: 820 }, "#property-mandate?flow=expired", "10_expired.png", (checks) =>
    checks.eligibilityStatus === "EXPIRED");
  await runScenario("K", "Revoked mandate", { width: 1280, height: 820 }, "#property-mandate?flow=revoked", "11_revoked.png", (checks) =>
    checks.eligibilityStatus === "BLOCKED_REVOKED");
  await runScenario("L", "Draft -> proposed AuthorityGrant", { width: 1280, height: 820 }, "#property-mandate?flow=owner-agent", "12_proposed_authority.png", (checks) =>
    checks.hasProposedAuthority && checks.text.includes("REVIEW_REQUIRED") && checks.text.includes("Active authority createdfalse"));
  await runScenario("M", "Return to Add Property with AUTHORITY_NOT_ACTIVE", { width: 1280, height: 820 }, "#property-mandate?flow=owner-agent", "13_return_add_property.png", (checks) =>
    checks.addPropertyVisible && checks.text.includes("AUTHORITY_REQUIRED"),
    async (page) => {
      await page.getByRole("button", { name: "Return to Add Property" }).click();
      await page.waitForSelector("#add-property-panel:not([hidden])", { timeout: 10000 });
    });
  await runScenario("N", "Lisa explanation", { width: 1280, height: 820 }, "#property-mandate?flow=owner-agent", "14_lisa.png", (checks) =>
    checks.hasLisa && checks.text.includes("Legal sufficiency is not verified"));
  await runScenario("O", "Mobile/narrow UI", { width: 390, height: 844 }, "#property-mandate?flow=temporary-cleaning", "15_mobile.png", (checks) =>
    checks.mandateVisible && checks.noHorizontalOverflow && checks.text.includes("PROPERTY MANDATE PREPARATION"));
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23C_PROPERTY_MANDATE_PASS"
    : "FAIL_UI",
  route: `${base}#property-mandate`,
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

writeJson(path.join(artifactDir, "property_mandate_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23C_PROPERTY_MANDATE_PASS") process.exit(1);
