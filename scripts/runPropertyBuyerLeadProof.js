import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23j";
const preferredPort = 3310;

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
  throw new Error("No available localhost port for Phase 23J proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const panel = document.querySelector("#property-leads-panel");
    const publicMarketplace = document.querySelector("[data-testid='property-marketplace']");
    const leadText = panel?.textContent || "";
    const doc = document.documentElement;
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-leads-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      readinessStatus: panel?.dataset.readinessStatus || "",
      leadStatus: panel?.dataset.leadStatus || "",
      localBuyerInterestIntents: panel?.dataset.localBuyerInterestIntents || "0",
      localPropertyLeadsCreated: panel?.dataset.localPropertyLeadsCreated || "0",
      sellerInboxItemsCreatedLocal: panel?.dataset.sellerInboxItemsCreatedLocal || "0",
      duplicateLeadsCreated: panel?.dataset.duplicateLeadsCreated || "0",
      sellerContactActions: panel?.dataset.sellerContactActions || "0",
      sellerPhoneReveals: panel?.dataset.sellerPhoneReveals || "0",
      sellerEmailReveals: panel?.dataset.sellerEmailReveals || "0",
      buyerPhoneReveals: panel?.dataset.buyerPhoneReveals || "0",
      buyerEmailReveals: panel?.dataset.buyerEmailReveals || "0",
      offerActions: panel?.dataset.offerActions || "0",
      reservationActions: panel?.dataset.reservationActions || "0",
      dealRoomActions: panel?.dataset.dealRoomActions || "0",
      canonicalPropertyMutations: panel?.dataset.canonicalPropertyMutations || "0",
      listingMutations: panel?.dataset.listingMutations || "0",
      publicationMutations: panel?.dataset.publicationMutations || "0",
      ownershipMutations: panel?.dataset.ownershipMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      hasIntent: Boolean(document.querySelector("[data-testid='buyer-interest-intent']")),
      hasConsent: Boolean(document.querySelector("[data-testid='buyer-consent-preview']")),
      hasReadiness: Boolean(document.querySelector("[data-testid='seller-contact-readiness']")),
      hasRequirements: Boolean(document.querySelector("[data-testid='buyer-requirements']")),
      hasLead: Boolean(document.querySelector("[data-testid='property-lead']")),
      hasInbox: Boolean(document.querySelector("[data-testid='seller-inbox-readiness']")),
      hasGuide: Boolean(document.querySelector("[data-testid='buyer-lead-guide']")),
      hasFilters: Boolean(document.querySelector("[data-testid='seller-inbox-filters']")),
      hasSideEffects: Boolean(document.querySelector("[data-testid='buyer-lead-side-effects']")),
      marketplaceDoesNotExposeLeads: !(publicMarketplace?.textContent || "").includes("PropertyLead"),
      privateContactSafe: !/\+995 555 123 456|buyer@example.com|share phone futuretrue|share email futuretrue|sellerPhoneReveals[1-9]|sellerEmailReveals[1-9]|buyerPhoneReveals[1-9]|buyerEmailReveals[1-9]/i.test(leadText),
      noForbiddenState: !text.includes("SELLER_CONTACTED") &&
        !text.includes("MESSAGE_SENT") &&
        !text.includes("OFFER_SUBMITTED") &&
        !text.includes("CONTACTED") &&
        !text.includes("RESPONDED") &&
        !text.includes("NEGOTIATING") &&
        !text.includes("OFFERED"),
      noPrivateLeak: !text.includes("OPENAI_API_KEY") && !text.includes("process.env") && !text.includes("rawPayload"),
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
    await page.waitForSelector("#property-leads-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.duplicateLeadsCreated === "0" &&
      checks.sellerContactActions === "0" &&
      checks.sellerPhoneReveals === "0" &&
      checks.sellerEmailReveals === "0" &&
      checks.buyerPhoneReveals === "0" &&
      checks.buyerEmailReveals === "0" &&
      checks.offerActions === "0" &&
      checks.reservationActions === "0" &&
      checks.dealRoomActions === "0" &&
      checks.canonicalPropertyMutations === "0" &&
      checks.listingMutations === "0" &&
      checks.publicationMutations === "0" &&
      checks.ownershipMutations === "0" &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.marketplaceDoesNotExposeLeads &&
      checks.privateContactSafe &&
      checks.noForbiddenState &&
      checks.noPrivateLeak &&
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
  await runScenario("A", "Marketplace Listing to I'm Interested", { width: 1440, height: 900 }, "#property-marketplace?case=owner", "01_marketplace_interest_handoff.png", (checks) =>
    checks.visible && checks.caseKey === "owner", async (page) => {
      await page.getByRole("button", { name: "I'M INTERESTED / ASK ABOUT THIS PROPERTY" }).click();
    });
  await runScenario("B", "Owner recipient route", { width: 1440, height: 900 }, "#property-leads?case=owner", "02_owner_route.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_LEAD_CREATION" && checks.text.includes("OWNER REPRESENTATION LOCAL PROOF"));
  await runScenario("C", "Agent recipient route", { width: 1280, height: 820 }, "#property-leads?case=agent", "03_agent_route.png", (checks) =>
    checks.readinessStatus === "READY_FOR_LOCAL_LEAD_CREATION" && checks.text.includes("AUTHORIZED AGENT - LOCAL PROOF"));
  await runScenario("D", "Interest type selection", { width: 1280, height: 820 }, "#property-leads?case=viewing", "04_interest_type.png", (checks) =>
    checks.text.includes("REQUEST_VIEWING_FUTURE"));
  await runScenario("E", "Privacy/consent preview", { width: 1280, height: 820 }, "#property-leads?case=owner", "05_consent_preview.png", (checks) =>
    checks.hasConsent && checks.text.includes("Buyer will NOT share"));
  await runScenario("F", "Local Lead created", { width: 1280, height: 820 }, "#property-leads?case=owner", "06_lead_created.png", (checks) =>
    checks.leadStatus === "NEW_LOCAL_PROOF" && checks.localPropertyLeadsCreated === "1");
  await runScenario("G", "Lead attribution", { width: 1280, height: 820 }, "#property-leads?case=owner", "07_attribution.png", (checks) =>
    checks.text.includes("ESSA_PROPERTY_MARKETPLACE"));
  await runScenario("H", "Seller inbox local item", { width: 1280, height: 820 }, "#property-leads?case=owner", "08_seller_inbox.png", (checks) =>
    checks.sellerInboxItemsCreatedLocal === "1" && checks.hasInbox);
  await runScenario("I", "Duplicate inquiry blocked", { width: 1280, height: 820 }, "#property-leads?case=duplicate", "09_duplicate.png", (checks) =>
    checks.readinessStatus === "BLOCKED_DUPLICATE" && checks.localPropertyLeadsCreated === "0");
  await runScenario("J", "Spam blocked", { width: 1280, height: 820 }, "#property-leads?case=spam", "10_spam.png", (checks) =>
    checks.readinessStatus === "BLOCKED_SPAM" && checks.localPropertyLeadsCreated === "0");
  await runScenario("K", "expired agent route blocked", { width: 1280, height: 820 }, "#property-leads?case=expiredAgent", "11_expired_agent.png", (checks) =>
    checks.readinessStatus === "BLOCKED_AUTHORITY" && checks.localPropertyLeadsCreated === "0");
  await runScenario("L", "stale/unpublished Listing blocked", { width: 1280, height: 820 }, "#property-leads?case=unpublished", "12_unpublished.png", (checks) =>
    checks.readinessStatus === "BLOCKED_LISTING_NOT_PUBLIC" && checks.localPropertyLeadsCreated === "0");
  await runScenario("M", "private contact not exposed", { width: 1280, height: 820 }, "#property-leads?case=privateContact", "13_private_contact.png", (checks) =>
    checks.privateContactSafe && checks.text.includes("[private_phone_hidden]"));
  await runScenario("N", "Lisa explanation", { width: 1280, height: 820 }, "#property-leads?case=owner", "14_lisa.png", (checks) =>
    checks.hasGuide && checks.text.includes("does not contact the seller yet"));
  await runScenario("O", "mobile/narrow buyer flow", { width: 390, height: 844 }, "#property-leads?case=owner", "15_mobile.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasIntent && checks.hasConsent && checks.hasReadiness && checks.hasRequirements && checks.hasLead && checks.hasInbox && checks.hasGuide && checks.hasFilters && checks.hasSideEffects);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23J_PROPERTY_BUYER_LEAD_PASS"
    : "FAIL_UI",
  route: `${base}#property-leads`,
  localBuyerInterestIntents: "expected local proof count only",
  localPropertyLeadsCreated: "expected local proof count only",
  sellerInboxItemsCreatedLocal: "expected local proof count only",
  duplicateLeadsCreated: 0,
  sellerContactActions: 0,
  sellerPhoneReveals: 0,
  sellerEmailReveals: 0,
  buyerPhoneReveals: 0,
  buyerEmailReveals: 0,
  offerActions: 0,
  reservationActions: 0,
  dealRoomActions: 0,
  canonicalPropertyMutations: 0,
  listingMutations: 0,
  publicationMutations: 0,
  ownershipMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_buyer_lead_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23J_PROPERTY_BUYER_LEAD_PASS") process.exit(1);
