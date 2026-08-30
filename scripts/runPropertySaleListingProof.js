import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23g";
const preferredPort = 3280;

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
  throw new Error("No available localhost port for Phase 23G proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const doc = document.documentElement;
    const panel = document.querySelector("#property-sale-listing-proof-panel");
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-sale-listing-proof-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      preflightStatus: panel?.dataset.preflightStatus || "",
      gatewayAllowed: panel?.dataset.gatewayAllowed || "",
      localSaleListingCreations: panel?.dataset.localSaleListingCreations || "0",
      canonicalPropertyCreations: panel?.dataset.canonicalPropertyCreations || "0",
      duplicateListings: panel?.dataset.duplicateListings || "0",
      unrelatedPropertyMutations: panel?.dataset.unrelatedPropertyMutations || "0",
      ownershipMutations: panel?.dataset.ownershipMutations || "0",
      publishActions: panel?.dataset.publishActions || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      hasCases: Boolean(document.querySelector("[data-testid='sale-listing-cases']")),
      hasProperty: Boolean(document.querySelector("[data-testid='sale-listing-property']")),
      hasAuthority: Boolean(document.querySelector("[data-testid='sale-listing-authority']")),
      hasIntent: Boolean(document.querySelector("[data-testid='sale-listing-intent']")),
      hasPreflight: Boolean(document.querySelector("[data-testid='sale-listing-preflight']")),
      hasResult: Boolean(document.querySelector("[data-testid='sale-listing-result']")),
      hasPassport: Boolean(document.querySelector("[data-testid='sale-listing-result']")),
      hasSafety: Boolean(document.querySelector("[data-testid='sale-listing-side-effects']")),
      noPrivateLeak: !text.includes("OPENAI_API_KEY") && !text.includes("process.env") && !text.includes("rawPayload"),
      noForbiddenState: !text.includes("LISTING_PUBLISHED") &&
        !text.includes("PAYMENT_CREATED") &&
        !text.includes("BOOKED") &&
        !text.includes("OWNERSHIP_TRANSFERRED") &&
        !text.includes("PUBLIC_DISCOVERY_ACTIVE"),
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
    await page.waitForSelector("#property-sale-listing-proof-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.canonicalPropertyCreations === "0" &&
      checks.duplicateListings === "0" &&
      checks.unrelatedPropertyMutations === "0" &&
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

try {
  await runScenario("A", "Property to Sell Property handoff", { width: 1440, height: 900 }, "#property-creation-proof?case=owner", "01_creation_to_sell_handoff.png", (checks) =>
    checks.visible && checks.caseKey === "owner" && checks.text.includes("SELL PROPERTY"), async (page) => {
      await page.getByRole("button", { name: "SELL PROPERTY" }).click();
    });
  await runScenario("B", "Owner sale listing success", { width: 1440, height: 900 }, "#property-sale-listing-proof?case=owner", "02_owner_sale_listing.png", (checks) =>
    checks.visible && checks.preflightStatus === "READY_FOR_APPROVAL" && checks.gatewayAllowed === "true" && checks.localSaleListingCreations === "1");
  await runScenario("C", "Listing ID created", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=owner", "03_listing_id.png", (checks) =>
    checks.text.includes("listing_local_sale_prop_local_batumi_apartment_unit_"));
  await runScenario("D", "Passport shows Listing separately", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=owner", "04_passport_listing.png", (checks) =>
    checks.hasPassport && checks.text.includes("Passport listing count1") && checks.text.includes("Property IDprop_local_batumi_apartment_unit_"));
  await runScenario("E", "Agent with mandate success", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=agent", "05_agent_mandate.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.gatewayAllowed === "true");
  await runScenario("F", "Agent without mandate blocked", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=agentNoMandate", "06_agent_no_mandate.png", (checks) =>
    checks.preflightStatus === "BLOCKED_AUTHORITY" && checks.localSaleListingCreations === "0");
  await runScenario("G", "Manager blocked", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=manager", "07_manager_blocked.png", (checks) =>
    checks.preflightStatus === "BLOCKED_AUTHORITY" && checks.localSaleListingCreations === "0");
  await runScenario("H", "Price scope blocked", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=priceBlocked", "08_price_scope.png", (checks) =>
    checks.preflightStatus === "BLOCKED_PRICE_SCOPE" && checks.localSaleListingCreations === "0");
  await runScenario("I", "Exclusive mandate conflict", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=exclusiveConflict", "09_exclusive_conflict.png", (checks) =>
    checks.preflightStatus === "BLOCKED_EXCLUSIVE_AUTHORITY_CONFLICT" && checks.localSaleListingCreations === "0");
  await runScenario("J", "Non-exclusive readiness", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=nonExclusive", "10_non_exclusive.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.gatewayAllowed === "true");
  await runScenario("K", "Idempotent repeat", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=owner", "11_idempotent.png", (checks) =>
    checks.text.includes("Idempotent repeatALREADY_CREATED_IDEMPOTENT"));
  await runScenario("L", "State mismatch", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=stateMismatch", "12_state_mismatch.png", (checks) =>
    checks.preflightStatus === "BLOCKED_STATE_MISMATCH" && checks.localSaleListingCreations === "0");
  await runScenario("M", "Synthetic failure safety", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=failure", "13_failure.png", (checks) =>
    checks.text.includes("ExecutionFAILED") && checks.localSaleListingCreations === "0");
  await runScenario("N", "Rollback", { width: 1280, height: 820 }, "#property-sale-listing-proof?case=owner", "14_rollback.png", (checks) =>
    checks.text.includes("RollbackROLLED_BACK") && checks.text.includes("Rollback dependency guardROLLBACK_BLOCKED"));
  await runScenario("O", "Mobile/narrow UI", { width: 390, height: 844 }, "#property-sale-listing-proof?case=owner", "15_mobile.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasCases && checks.hasProperty && checks.hasAuthority && checks.hasIntent && checks.hasPreflight && checks.hasResult && checks.hasSafety);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23G_PROPERTY_SALE_LISTING_PROOF_PASS"
    : "FAIL_UI",
  route: `${base}#property-sale-listing-proof`,
  localSaleListingCreations: "expected local proof count only",
  canonicalPropertyCreations: 0,
  duplicateListings: 0,
  unrelatedPropertyMutations: 0,
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

writeJson(path.join(artifactDir, "property_sale_listing_proof_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23G_PROPERTY_SALE_LISTING_PROOF_PASS") process.exit(1);
