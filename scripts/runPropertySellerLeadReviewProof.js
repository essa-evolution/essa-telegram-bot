import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23k";
const preferredPort = 3320;

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
  throw new Error("No available localhost port for Phase 23K proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const panel = document.querySelector("#property-leads-panel");
    const doc = document.documentElement;
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-leads-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      sellerReviewStatus: panel?.dataset.sellerReviewStatus || "",
      sellerResponseReadinessStatus: panel?.dataset.sellerResponseReadinessStatus || "",
      sellerApprovalStatus: panel?.dataset.sellerApprovalStatus || "",
      conversationHandoffStatus: panel?.dataset.conversationHandoffStatus || "",
      dispatchStatus: panel?.dataset.dispatchStatus || "",
      sellerLeadReviewsLocal: panel?.dataset.sellerLeadReviewsLocal || "0",
      sellerResponseIntentsLocal: panel?.dataset.sellerResponseIntentsLocal || "0",
      sellerResponseApprovalsLocal: panel?.dataset.sellerResponseApprovalsLocal || "0",
      conversationHandoffsLocal: panel?.dataset.conversationHandoffsLocal || "0",
      messagesSent: panel?.dataset.messagesSent || "0",
      sellerNotificationsSent: panel?.dataset.sellerNotificationsSent || "0",
      buyerNotificationsSent: panel?.dataset.buyerNotificationsSent || "0",
      sellerPhoneReveals: panel?.dataset.sellerPhoneReveals || "0",
      sellerEmailReveals: panel?.dataset.sellerEmailReveals || "0",
      buyerPhoneReveals: panel?.dataset.buyerPhoneReveals || "0",
      buyerEmailReveals: panel?.dataset.buyerEmailReveals || "0",
      emailActions: panel?.dataset.emailActions || "0",
      smsActions: panel?.dataset.smsActions || "0",
      telegramActions: panel?.dataset.telegramActions || "0",
      whatsappActions: panel?.dataset.whatsappActions || "0",
      offerActions: panel?.dataset.offerActions || "0",
      reservationActions: panel?.dataset.reservationActions || "0",
      viewingBookings: panel?.dataset.viewingBookings || "0",
      dealRoomActions: panel?.dataset.dealRoomActions || "0",
      canonicalPropertyMutations: panel?.dataset.canonicalPropertyMutations || "0",
      listingMutations: panel?.dataset.listingMutations || "0",
      publicationMutations: panel?.dataset.publicationMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      paymentActions: panel?.dataset.paymentActions || "0",
      commercialTransactionActions: panel?.dataset.commercialTransactionActions || "0",
      hasSellerReview: Boolean(document.querySelector("[data-testid='seller-lead-review']")),
      hasResponseIntent: Boolean(document.querySelector("[data-testid='seller-response-intent']")),
      hasProjection: Boolean(document.querySelector("[data-testid='seller-response-projection']")),
      hasReadiness: Boolean(document.querySelector("[data-testid='seller-response-readiness']")),
      hasApproval: Boolean(document.querySelector("[data-testid='seller-response-approval']")),
      hasHandoff: Boolean(document.querySelector("[data-testid='seller-conversation-handoff']")),
      hasHistory: Boolean(document.querySelector("[data-testid='seller-review-history']")),
      hasGuide: Boolean(document.querySelector("[data-testid='seller-lead-guide']")),
      hasSideEffects: Boolean(document.querySelector("[data-testid='seller-review-side-effects']")),
      privateContactSafe: !/\+995 555 123 456|seller@example.com|buyer@example.com|sellerPhoneReveals[1-9]|sellerEmailReveals[1-9]|buyerPhoneReveals[1-9]|buyerEmailReveals[1-9]/i.test(text),
      noForbiddenState: !/\bMESSAGE_SENT\b|\bMESSAGE_DELIVERED\b|\bSELLER_CONTACTED\b|\bBUYER_CONTACTED\b|\bNEGOTIATING\b|\bACCEPT_OFFER\b|\bCOUNTER_OFFER\b|\bRESERVE\b|\bPAYMENT_SENT\b|\bPAYMENT_REQUESTED\b/i.test(text),
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
    await page.waitForSelector("#property-leads-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.messagesSent === "0" &&
      checks.sellerNotificationsSent === "0" &&
      checks.buyerNotificationsSent === "0" &&
      checks.sellerPhoneReveals === "0" &&
      checks.sellerEmailReveals === "0" &&
      checks.buyerPhoneReveals === "0" &&
      checks.buyerEmailReveals === "0" &&
      checks.emailActions === "0" &&
      checks.smsActions === "0" &&
      checks.telegramActions === "0" &&
      checks.whatsappActions === "0" &&
      checks.offerActions === "0" &&
      checks.reservationActions === "0" &&
      checks.viewingBookings === "0" &&
      checks.dealRoomActions === "0" &&
      checks.canonicalPropertyMutations === "0" &&
      checks.listingMutations === "0" &&
      checks.publicationMutations === "0" &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.paymentActions === "0" &&
      checks.commercialTransactionActions === "0" &&
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
  await runScenario("A", "Seller inbox opens Lead", { width: 1440, height: 900 }, "#property-leads?case=owner", "01_seller_inbox_opens_lead.png", (checks) =>
    checks.visible && checks.hasSellerReview && checks.hasResponseIntent);
  await runScenario("B", "Owner lead review", { width: 1440, height: 900 }, "#property-leads?case=owner", "02_owner_lead_review.png", (checks) =>
    checks.sellerReviewStatus === "READY_FOR_RESPONSE_REVIEW" && checks.text.includes("OWNER"));
  await runScenario("C", "Agent lead review", { width: 1280, height: 820 }, "#property-leads?case=agent", "03_agent_lead_review.png", (checks) =>
    checks.sellerReviewStatus === "READY_FOR_RESPONSE_REVIEW" && checks.text.includes("AUTHORIZED_AGENT"));
  await runScenario("D", "Buyer consent summary", { width: 1280, height: 820 }, "#property-leads?case=owner", "04_buyer_consent_summary.png", (checks) =>
    checks.text.includes("CONTACT_INSIDE_ESSA_ONLY") || checks.text.includes("Inside ESSA only"));
  await runScenario("E", "safe response preview", { width: 1280, height: 820 }, "#property-leads?case=owner", "05_safe_response_preview.png", (checks) =>
    checks.hasProjection && checks.text.includes("Public-Safe Response Projection"));
  await runScenario("F", "local response approval", { width: 1280, height: 820 }, "#property-leads?case=owner", "06_local_response_approval.png", (checks) =>
    checks.sellerApprovalStatus === "APPROVED_LOCAL_NOT_SENT" && checks.sellerResponseApprovalsLocal === "1");
  await runScenario("G", "future conversation handoff NOT_DISPATCHED", { width: 1280, height: 820 }, "#property-leads?case=owner", "07_handoff_not_dispatched.png", (checks) =>
    checks.conversationHandoffStatus === "READY_FOR_FUTURE_CONVERSATION" && checks.dispatchStatus === "NOT_ACTIVE");
  await runScenario("H", "expired agent route blocked/reresolved", { width: 1280, height: 820 }, "#property-leads?case=expiredAgent", "08_expired_agent_reresolved.png", (checks) =>
    checks.text.includes("RERESOLVED_TO_OWNER_LOCAL") && checks.text.includes("Original seller route expired"));
  await runScenario("I", "buyer consent revoked", { width: 1280, height: 820 }, "#property-leads?case=revokedConsent", "09_buyer_consent_revoked.png", (checks) =>
    checks.sellerResponseReadinessStatus === "BLOCKED_BUYER_CONSENT");
  await runScenario("J", "seller phone leak blocked", { width: 1280, height: 820 }, "#property-leads?case=phoneLeak", "10_phone_leak_blocked.png", (checks) =>
    checks.sellerResponseReadinessStatus === "BLOCKED_PRIVACY" && checks.text.includes("[seller_phone_hidden]"));
  await runScenario("K", "WhatsApp mode blocked", { width: 1280, height: 820 }, "#property-leads?case=whatsapp", "11_whatsapp_blocked.png", (checks) =>
    checks.sellerResponseReadinessStatus === "BLOCKED_CONTACT_MODE");
  await runScenario("L", "payment request blocked", { width: 1280, height: 820 }, "#property-leads?case=payment", "12_payment_blocked.png", (checks) =>
    checks.sellerResponseReadinessStatus === "BLOCKED_POLICY");
  await runScenario("M", "Listing unpublished block", { width: 1280, height: 820 }, "#property-leads?case=unpublished", "13_unpublished_blocked.png", (checks) =>
    checks.sellerResponseReadinessStatus === "BLOCKED_LISTING_STATE");
  await runScenario("N", "response change invalidates approval", { width: 1280, height: 820 }, "#property-leads?case=changedAfterApproval", "14_changed_response_stale.png", (checks) =>
    checks.text.includes("STALE_REVISION_REQUIRED"));
  await runScenario("O", "mobile/narrow seller inbox", { width: 390, height: 844 }, "#property-leads?case=owner", "15_mobile_seller_inbox.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasSellerReview && checks.hasResponseIntent && checks.hasProjection && checks.hasReadiness && checks.hasApproval && checks.hasHandoff && checks.hasHistory && checks.hasGuide && checks.hasSideEffects);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23K_PROPERTY_SELLER_LEAD_REVIEW_PASS"
    : "FAIL_UI",
  route: `${base}#property-leads`,
  sellerLeadReviewsLocal: "expected local proof count only",
  sellerResponseIntentsLocal: "expected local proof count only",
  sellerResponseApprovalsLocal: "expected local proof count only",
  conversationHandoffsLocal: "expected local proof count only",
  messagesSent: 0,
  sellerNotificationsSent: 0,
  buyerNotificationsSent: 0,
  sellerPhoneReveals: 0,
  sellerEmailReveals: 0,
  buyerPhoneReveals: 0,
  buyerEmailReveals: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
  offerActions: 0,
  reservationActions: 0,
  viewingBookings: 0,
  dealRoomActions: 0,
  canonicalPropertyMutations: 0,
  listingMutations: 0,
  publicationMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_seller_lead_review_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23K_PROPERTY_SELLER_LEAD_REVIEW_PASS") process.exit(1);
