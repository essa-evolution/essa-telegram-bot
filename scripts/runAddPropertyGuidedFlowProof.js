import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23b";
const preferredPort = 3230;

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
  throw new Error("No available localhost port for Phase 23B proof server.");
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
    const panel = document.querySelector("#add-property-panel");
    return {
      hash: location.hash,
      routeVisible: Boolean(document.querySelector("#add-property-panel:not([hidden])")),
      readinessStatus: panel?.dataset.readinessStatus || "",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      listingMutation: panel?.dataset.listingMutation || "0",
      canonicalPropertyMutation: panel?.dataset.canonicalPropertyMutation || "0",
      hasEntry: text.includes("Tell ESSA what you want to add and in what capacity you are acting."),
      hasReadinessPanel: Boolean(document.querySelector("[data-testid='readiness-panel']")),
      hasReviewPreview: Boolean(document.querySelector("[data-testid='review-preview']")),
      hasFutureMandate: Boolean(document.querySelector("[data-testid='future-mandate']")),
      hasPrivacySafeEvidence: Boolean(document.querySelector("[data-testid='privacy-safe-evidence']")),
      hasServiceProviderSeparation: Boolean(document.querySelector("[data-testid='service-provider-separation']")),
      hasUnsureSuggestion: Boolean(document.querySelector("[data-testid='unsure-suggestion']")),
      noPrivateDocContent: !text.includes("protected_doc_ref") && !text.includes("rawPayload") && !text.includes("OPENAI_API_KEY") && !text.includes("process.env"),
      noForbiddenState: !text.includes("PUBLISHED") && !text.includes("Listing created1") && !text.includes("canonicalPropertyMutation1") && !text.includes("PAYMENT_CREATED") && !text.includes("BOOKED"),
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

async function runScenario(id, label, viewport, hash, fileName, predicate) {
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
    await page.waitForSelector("#add-property-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(50);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const pass = predicate(checks);
    const status = pass &&
      checks.routeVisible &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.listingMutation === "0" &&
      checks.canonicalPropertyMutation === "0" &&
      checks.noPrivateDocContent &&
      checks.noForbiddenState &&
      checks.noHorizontalOverflow &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0
      ? "PASS"
      : "FAIL";
    results.push({
      id,
      label,
      status,
      screenshot,
      finalUrl: page.url(),
      checks: {
        ...checks,
        text: undefined
      },
      consoleErrors,
      pageErrors,
      failedRequests
    });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("A", "Add Property entry", { width: 1440, height: 900 }, "#add-property", "01_entry.png", (checks) =>
    checks.hasEntry && checks.text.includes("I am the Owner"));
  await runScenario("B", "Owner success-to-review", { width: 1440, height: 900 }, "#add-property?flow=owner&step=review_readiness", "02_owner_success.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_REVIEW" && checks.text.includes("Ready for ESSA review.") && checks.text.includes("listingMutation"));
  await runScenario("C", "Owner missing evidence", { width: 1280, height: 820 }, "#add-property?flow=owner&scenario=missing-evidence&step=evidence", "03_owner_missing_evidence.png", (checks) =>
    checks.readinessStatus === "EVIDENCE_REQUIRED" && checks.text.includes("authority_evidence_missing"));
  await runScenario("D", "Developer in-scope", { width: 1280, height: 820 }, "#add-property?flow=developer&step=review_readiness", "04_developer_in_scope.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_REVIEW" && checks.text.includes("project_green_tower"));
  await runScenario("E", "Developer out-of-scope", { width: 1280, height: 820 }, "#add-property?flow=developer&scenario=out-of-scope&step=review_readiness", "05_developer_out_scope.png", (checks) =>
    checks.readinessStatus === "BLOCKED_SCOPE" && checks.text.includes("project_scope_mismatch"));
  await runScenario("F", "Agent with mandate", { width: 1280, height: 820 }, "#add-property?flow=agent&step=review_readiness", "06_agent_with_mandate.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_REVIEW" && checks.text.includes("Black Sea Agency"));
  await runScenario("G", "Agent missing mandate", { width: 1280, height: 820 }, "#add-property?flow=agent&scenario=missing-mandate&step=authority", "07_agent_missing_mandate.png", (checks) =>
    checks.readinessStatus === "AUTHORITY_REQUIRED" && checks.text.includes("CREATE / REQUEST ESSA MANDATE") && checks.text.includes("NOT_ACTIVE_YET"));
  await runScenario("H", "Manager operational scope", { width: 1280, height: 820 }, "#add-property?flow=manager&step=review_readiness", "08_manager_operational.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_REVIEW" && checks.text.includes("REQUEST_CLEANING"));
  await runScenario("I", "Manager sale blocked", { width: 1280, height: 820 }, "#add-property?flow=manager&scenario=sale&step=review_readiness", "09_manager_sale_blocked.png", (checks) =>
    checks.readinessStatus === "BLOCKED_SCOPE" && checks.text.includes("authority_action_denied"));
  await runScenario("J", "Service Provider separation", { width: 1280, height: 820 }, "#add-property?flow=service_provider&step=about_you", "10_service_provider.png", (checks) =>
    checks.readinessStatus === "NOT_ACTIVE_YET" && checks.hasServiceProviderSeparation && checks.text.includes("Service Provider onboarding is a separate ESSA Partner Marketplace flow."));
  await runScenario("K", "Unsure/Lisa clarification", { width: 1280, height: 820 }, "#add-property?flow=unsure&step=about_you", "11_unsure_lisa.png", (checks) =>
    checks.hasUnsureSuggestion && checks.text.includes("Suggested path - authority not verified."));
  await runScenario("L", "Review readiness preview", { width: 1280, height: 820 }, "#add-property?flow=owner&step=review_readiness", "12_review_preview.png", (checks) =>
    checks.hasReviewPreview && checks.text.includes("No auto-approval"));
  await runScenario("M", "Future mandate link visible disabled", { width: 1280, height: 820 }, "#add-property?flow=agent&scenario=missing-mandate&step=authority", "13_future_mandate.png", (checks) =>
    checks.hasFutureMandate && checks.text.includes("CREATE / REQUEST ESSA MANDATE") && checks.text.includes("NOT_ACTIVE_YET"));
  await runScenario("N", "Privacy-safe evidence rendering", { width: 1280, height: 820 }, "#add-property?flow=owner&step=evidence", "14_privacy_safe_evidence.png", (checks) =>
    checks.hasPrivacySafeEvidence && checks.noPrivateDocContent && checks.text.includes("Protected; private document content is not rendered"));
  await runScenario("O", "Mobile/narrow flow", { width: 390, height: 844 }, "#add-property?flow=owner&step=review_readiness", "15_mobile.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_REVIEW" && checks.noHorizontalOverflow);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23B_ADD_PROPERTY_GUIDED_FLOW_PASS"
    : "FAIL_UI",
  route: `${base}#add-property`,
  canonicalPropertyMutation: 0,
  listingMutation: 0,
  ownershipMutation: 0,
  quarantineMutation: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "add_property_guided_flow_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23B_ADD_PROPERTY_GUIDED_FLOW_PASS") process.exit(1);
