import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23m";
const preferredPort = 3340;

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
  throw new Error("No available localhost port for Phase 23M proof server.");
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
      appendStatus: panel?.dataset.appendStatus || "",
      appendPreflightStatus: panel?.dataset.appendPreflightStatus || "",
      localConversationMessageIntents: panel?.dataset.localConversationMessageIntents || "0",
      localConversationMessagesAppended: panel?.dataset.localConversationMessagesAppended || "0",
      localPropertyConversationsCreated: panel?.dataset.localPropertyConversationsCreated || "0",
      localConversationMessagesCreated: panel?.dataset.localConversationMessagesCreated || "0",
      localMessagesDeliveredInsideEssa: panel?.dataset.localMessagesDeliveredInsideEssa || "0",
      messageSupersessionsLocal: panel?.dataset.messageSupersessionsLocal || "0",
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
      formalOffersCreated: panel?.dataset.formalOffersCreated || "0",
      counterOffersCreated: panel?.dataset.counterOffersCreated || "0",
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
      hasContinuationControls: Boolean(document.querySelector("[data-testid='conversation-continuation-controls']")),
      hasAppendIntent: Boolean(document.querySelector("[data-testid='conversation-message-intent']")),
      hasAppendResult: Boolean(document.querySelector("[data-testid='conversation-message-append']")),
      hasSummary: Boolean(document.querySelector("[data-testid='conversation-summary']")),
      hasFutureHandoffs: Boolean(document.querySelector("[data-testid='conversation-future-handoffs']")),
      hasMessages: Boolean(document.querySelector("[data-testid='property-conversation-messages']")),
      hasAudit: Boolean(document.querySelector("[data-testid='property-conversation-audit']")),
      hasCounters: Boolean(document.querySelector("[data-testid='property-conversation-side-effects']")),
      privateContactSafe: !/phoneReveals[1-9]|emailReveals[1-9]/i.test(text),
      noForbiddenExecution: !/\bEMAIL_SENT\b|\bSMS_SENT\b|\bWHATSAPP_SENT\b|\bTELEGRAM_SENT\b|\bOFFER_CREATED\b|\bCOUNTER_OFFER_CREATED\b|\bBOOKING_CREATED\b|\bPAYMENT_SENT\b|\bPRODUCTION_CHAT\b|\bEXTERNAL_ACTIVE\b/i.test(text),
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

function boundaryPass(checks, allowDuplicateIdempotent = false) {
  return (allowDuplicateIdempotent || checks.duplicateMessagesCreated === "0") &&
    checks.externalMessagesSent === "0" &&
    checks.emailActions === "0" &&
    checks.smsActions === "0" &&
    checks.telegramActions === "0" &&
    checks.whatsappActions === "0" &&
    checks.phoneReveals === "0" &&
    checks.emailReveals === "0" &&
    checks.privateDocumentShares === "0" &&
    checks.offerEntitiesCreated === "0" &&
    checks.formalOffersCreated === "0" &&
    checks.counterOffersCreated === "0" &&
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
    checks.noHorizontalOverflow;
}

async function runScenario(id, label, viewport, hash, fileName, predicate, options = {}) {
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
    const pass = predicate(checks) &&
      boundaryPass(checks, options.allowDuplicateIdempotent) &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0;
    results.push({
      id,
      label,
      status: pass ? "PASS" : "FAIL",
      screenshot,
      finalUrl: page.url(),
      checks: { ...checks, text: undefined },
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
  await runScenario("A", "existing conversation opens", { width: 1440, height: 900 }, "#property-conversations?case=buyerSafe", "01_existing_conversation_opens.png", (checks) =>
    checks.visible && checks.conversationStatus === "ACTIVE_LOCAL_PROOF" && checks.hasContinuationControls && checks.hasAppendIntent);
  await runScenario("B", "buyer sends safe message", { width: 1440, height: 900 }, "#property-conversations?case=buyerSafe", "02_buyer_safe_message.png", (checks) =>
    checks.appendStatus === "DELIVERED_INSIDE_ESSA_LOCAL_PROOF" && Number(checks.localConversationMessagesAppended) >= 1 && checks.text.includes("Is the apartment still available"));
  await runScenario("C", "seller sends safe reply", { width: 1440, height: 900 }, "#property-conversations?case=sellerSafe", "03_seller_safe_reply.png", (checks) =>
    checks.appendStatus === "DELIVERED_INSIDE_ESSA_LOCAL_PROOF" && checks.text.includes("Yes, it is still available"));
  await runScenario("D", "deterministic sequence", { width: 1280, height: 820 }, "#property-conversations?case=sellerSafe", "04_deterministic_sequence.png", (checks) =>
    /1\.\s+BUYER/.test(checks.text) && /2\.\s+(SELLER|OWNER|AGENT)/.test(checks.text) && /3\.\s+(SELLER|OWNER|AGENT)/.test(checks.text));
  await runScenario("E", "unread/read state", { width: 1280, height: 820 }, "#property-conversations?case=buyerSafe", "05_read_unread_state.png", (checks) =>
    checks.hasSummary && checks.text.includes("Unread buyer/seller") && checks.text.includes("Read states"));
  await runScenario("F", "buyer phone blocked", { width: 1280, height: 820 }, "#property-conversations?case=phoneBlocked", "06_phone_blocked.png", (checks) =>
    checks.appendPreflightStatus === "BLOCKED_CONTACT_POLICY");
  await runScenario("G", "seller email/WhatsApp blocked", { width: 1280, height: 820 }, "#property-conversations?case=sellerEmailWhatsapp", "07_seller_email_whatsapp_blocked.png", (checks) =>
    checks.appendPreflightStatus === "BLOCKED_CONTACT_POLICY");
  await runScenario("H", "payment instruction blocked", { width: 1280, height: 820 }, "#property-conversations?case=payment", "08_payment_instruction_blocked.png", (checks) =>
    checks.appendPreflightStatus === "BLOCKED_PAYMENT_POLICY");
  await runScenario("I", "offer-like text remains conversation only", { width: 1280, height: 820 }, "#property-conversations?case=offerText", "09_offer_like_no_offer.png", (checks) =>
    checks.appendStatus === "DELIVERED_INSIDE_ESSA_LOCAL_PROOF" && checks.formalOffersCreated === "0" && checks.offerEntitiesCreated === "0" && checks.text.includes("Offer-like"));
  await runScenario("J", "reply-to-message", { width: 1280, height: 820 }, "#property-conversations?case=reply", "10_reply_to_message.png", (checks) =>
    checks.appendStatus === "DELIVERED_INSIDE_ESSA_LOCAL_PROOF" && checks.text.includes("Reply to"));
  await runScenario("K", "message supersession", { width: 1280, height: 820 }, "#property-conversations?case=supersession", "11_message_supersession.png", (checks) =>
    Number(checks.messageSupersessionsLocal) === 1 && checks.text.includes("SUPERSEDED"));
  await runScenario("L", "duplicate/idempotent append", { width: 1280, height: 820 }, "#property-conversations?case=idempotent", "12_idempotent_append.png", (checks) =>
    checks.text.includes("ALREADY_DELIVERED_IDEMPOTENT") && checks.duplicateMessagesCreated === "0");
  await runScenario("M", "agent authority expires pause", { width: 1280, height: 820 }, "#property-conversations?case=agentAuthorityExpired", "13_authority_expired_pause.png", (checks) =>
    checks.conversationStatus === "PAUSED_LOCAL" && checks.appendPreflightStatus === "BLOCKED_AUTHORITY");
  await runScenario("N", "consent revoked pause", { width: 1280, height: 820 }, "#property-conversations?case=consentRevoked", "14_consent_revoked_pause.png", (checks) =>
    checks.conversationStatus === "PAUSED_LOCAL" && checks.appendPreflightStatus === "BLOCKED_BUYER_CONSENT");
  await runScenario("O", "mobile/narrow continuation UI", { width: 390, height: 844 }, "#property-conversations?case=buyerSafe", "15_mobile_continuation.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasContinuationControls && checks.hasAppendIntent && checks.hasAppendResult && checks.hasSummary && checks.hasFutureHandoffs && checks.hasMessages && checks.hasAudit && checks.hasCounters);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23M_PROPERTY_CONVERSATION_CONTINUATION_PASS"
    : "FAIL_UI",
  route: `${base}#property-conversations`,
  localConversationMessageIntents: "expected local proof count only",
  localConversationMessagesAppended: "expected local proof count only",
  localMessagesDeliveredInsideEssa: "expected local proof count only",
  messageSupersessionsLocal: "expected local proof count only",
  duplicateMessagesCreated: 0,
  externalMessagesSent: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
  phoneReveals: 0,
  emailReveals: 0,
  privateDocumentShares: 0,
  formalOffersCreated: 0,
  counterOffersCreated: 0,
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

writeJson(path.join(artifactDir, "property_conversation_continuation_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23M_PROPERTY_CONVERSATION_CONTINUATION_PASS") process.exit(1);
