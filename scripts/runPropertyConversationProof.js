import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23l";
const preferredPort = 3330;

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
  throw new Error("No available localhost port for Phase 23L proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const panel = document.querySelector("#property-conversations-panel");
    const doc = document.documentElement;
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-conversations-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      executionStatus: panel?.dataset.executionStatus || "",
      gatewayDecision: panel?.dataset.gatewayDecision || "",
      conversationStatus: panel?.dataset.conversationStatus || "",
      messagePolicyStatus: panel?.dataset.messagePolicyStatus || "",
      localPropertyConversationsCreated: panel?.dataset.localPropertyConversationsCreated || "0",
      localConversationMessagesCreated: panel?.dataset.localConversationMessagesCreated || "0",
      localMessagesDeliveredInsideEssa: panel?.dataset.localMessagesDeliveredInsideEssa || "0",
      duplicateMessagesCreated: panel?.dataset.duplicateMessagesCreated || "0",
      externalMessagesSent: panel?.dataset.externalMessagesSent || "0",
      emailActions: panel?.dataset.emailActions || "0",
      smsActions: panel?.dataset.smsActions || "0",
      telegramActions: panel?.dataset.telegramActions || "0",
      whatsappActions: panel?.dataset.whatsappActions || "0",
      phoneReveals: panel?.dataset.phoneReveals || "0",
      emailReveals: panel?.dataset.emailReveals || "0",
      privateDocumentShares: panel?.dataset.privateDocumentShares || "0",
      offerEntitiesCreated: panel?.dataset.offerEntitiesCreated || "0",
      viewingBookings: panel?.dataset.viewingBookings || "0",
      reservationActions: panel?.dataset.reservationActions || "0",
      dealRoomActions: panel?.dataset.dealRoomActions || "0",
      canonicalPropertyMutations: panel?.dataset.canonicalPropertyMutations || "0",
      listingMutations: panel?.dataset.listingMutations || "0",
      publicationMutations: panel?.dataset.publicationMutations || "0",
      ownershipMutations: panel?.dataset.ownershipMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      paymentActions: panel?.dataset.paymentActions || "0",
      bookingActions: panel?.dataset.bookingActions || "0",
      commercialTransactionActions: panel?.dataset.commercialTransactionActions || "0",
      hasIntent: Boolean(document.querySelector("[data-testid='conversation-creation-intent']")),
      hasPolicy: Boolean(document.querySelector("[data-testid='conversation-policy']")),
      hasDetail: Boolean(document.querySelector("[data-testid='property-conversation-detail']")),
      hasParticipants: Boolean(document.querySelector("[data-testid='property-conversation-participants']")),
      hasMessages: Boolean(document.querySelector("[data-testid='property-conversation-messages']")),
      hasAudit: Boolean(document.querySelector("[data-testid='property-conversation-audit']")),
      hasGuide: Boolean(document.querySelector("[data-testid='property-conversation-guide']")),
      hasCounters: Boolean(document.querySelector("[data-testid='property-conversation-side-effects']")),
      privateContactSafe: !/\+995 555 123 456|buyer@example.com|seller@example.com|phoneReveals[1-9]|emailReveals[1-9]/i.test(text),
      noForbiddenExecution: !/\bEMAIL_SENT\b|\bSMS_SENT\b|\bWHATSAPP_SENT\b|\bTELEGRAM_SENT\b|\bOFFER_CREATED\b|\bBOOKING_CREATED\b|\bPAYMENT_SENT\b|\bPRODUCTION_CHAT\b|\bEXTERNAL_ACTIVE\b/i.test(text),
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
    await page.waitForSelector("#property-conversations-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.duplicateMessagesCreated === "0" &&
      checks.externalMessagesSent === "0" &&
      checks.emailActions === "0" &&
      checks.smsActions === "0" &&
      checks.telegramActions === "0" &&
      checks.whatsappActions === "0" &&
      checks.phoneReveals === "0" &&
      checks.emailReveals === "0" &&
      checks.privateDocumentShares === "0" &&
      checks.offerEntitiesCreated === "0" &&
      checks.viewingBookings === "0" &&
      checks.reservationActions === "0" &&
      checks.dealRoomActions === "0" &&
      checks.canonicalPropertyMutations === "0" &&
      checks.listingMutations === "0" &&
      checks.publicationMutations === "0" &&
      checks.ownershipMutations === "0" &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.paymentActions === "0" &&
      checks.bookingActions === "0" &&
      checks.commercialTransactionActions === "0" &&
      checks.privateContactSafe &&
      checks.noForbiddenExecution &&
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
  await runScenario("A", "approved handoff to conversation creation", { width: 1440, height: 900 }, "#property-conversations?case=owner", "01_handoff_conversation_creation.png", (checks) =>
    checks.executionStatus === "ACTIVE_LOCAL_PROOF" && checks.gatewayDecision === "READY");
  await runScenario("B", "buyer/seller thread visible", { width: 1440, height: 900 }, "#property-conversations?case=owner", "02_thread_visible.png", (checks) =>
    checks.hasParticipants && checks.hasMessages && checks.text.includes("BUYER") && checks.text.includes("OWNER"));
  await runScenario("C", "original buyer inquiry linked", { width: 1280, height: 820 }, "#property-conversations?case=owner", "03_buyer_inquiry_linked.png", (checks) =>
    checks.text.includes("Buyer inquiry") || checks.text.includes("I am interested"));
  await runScenario("D", "approved seller response delivered", { width: 1280, height: 820 }, "#property-conversations?case=owner", "04_seller_response_delivered.png", (checks) =>
    checks.text.includes("SELLER_RESPONSE_MESSAGE_DELIVERED_LOCAL_PROOF") && Number(checks.localMessagesDeliveredInsideEssa) >= 2);
  await runScenario("E", "buyer safe message", { width: 1280, height: 820 }, "#property-conversations?case=buyerViewing", "05_buyer_safe_message.png", (checks) =>
    checks.messagePolicyStatus === "DELIVERED_INSIDE_ESSA_LOCAL_PROOF" && checks.text.includes("Can I see the apartment tomorrow"));
  await runScenario("F", "seller safe reply", { width: 1280, height: 820 }, "#property-conversations?case=owner", "06_seller_safe_reply.png", (checks) =>
    checks.text.includes("Yes, we can discuss available times here"));
  await runScenario("G", "phone leak blocked", { width: 1280, height: 820 }, "#property-conversations?case=phoneLeak", "07_phone_leak_blocked.png", (checks) =>
    checks.messagePolicyStatus === "BLOCKED_CONTACT_POLICY");
  await runScenario("H", "WhatsApp leak blocked", { width: 1280, height: 820 }, "#property-conversations?case=whatsappLeak", "08_whatsapp_blocked.png", (checks) =>
    checks.messagePolicyStatus === "BLOCKED_CONTACT_POLICY");
  await runScenario("I", "payment request blocked", { width: 1280, height: 820 }, "#property-conversations?case=payment", "09_payment_blocked.png", (checks) =>
    checks.messagePolicyStatus === "BLOCKED_PAYMENT_POLICY");
  await runScenario("J", "offer-like message does not create Offer", { width: 1280, height: 820 }, "#property-conversations?case=offerText", "10_offer_text_no_offer.png", (checks) =>
    checks.offerEntitiesCreated === "0" && checks.messagePolicyStatus === "BLOCKED_OFFER_POLICY");
  await runScenario("K", "authority expires pause", { width: 1280, height: 820 }, "#property-conversations?case=authorityExpired", "11_authority_pause.png", (checks) =>
    checks.conversationStatus === "PAUSED_LOCAL" && checks.text.includes("ROUTE_REVIEW_REQUIRED"));
  await runScenario("L", "consent revoked pause", { width: 1280, height: 820 }, "#property-conversations?case=consentRevoked", "12_consent_revoked.png", (checks) =>
    checks.executionStatus === "BLOCKED");
  await runScenario("M", "Listing unpublished pause/review", { width: 1280, height: 820 }, "#property-conversations?case=unpublished", "13_unpublished_pause.png", (checks) =>
    checks.executionStatus === "BLOCKED");
  await runScenario("N", "close / rollback", { width: 1280, height: 820 }, "#property-conversations?case=closeRollback", "14_close_rollback.png", (checks) =>
    checks.text.includes("CLOSED_LOCAL") && checks.text.includes("ROLLED_BACK_LOCAL_PROOF"));
  await runScenario("O", "mobile/narrow conversation", { width: 390, height: 844 }, "#property-conversations?case=owner", "15_mobile_conversation.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasIntent && checks.hasPolicy && checks.hasDetail && checks.hasParticipants && checks.hasMessages && checks.hasAudit && checks.hasGuide && checks.hasCounters);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23L_PROPERTY_CONVERSATION_PASS"
    : "FAIL_UI",
  route: `${base}#property-conversations`,
  localPropertyConversationsCreated: "expected local proof count only",
  localConversationMessagesCreated: "expected local proof count only",
  localMessagesDeliveredInsideEssa: "expected local proof count only",
  duplicateMessagesCreated: 0,
  externalMessagesSent: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
  phoneReveals: 0,
  emailReveals: 0,
  privateDocumentShares: 0,
  offerEntitiesCreated: 0,
  viewingBookings: 0,
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

writeJson(path.join(artifactDir, "property_conversation_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23L_PROPERTY_CONVERSATION_PASS") process.exit(1);
