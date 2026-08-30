import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23n";
const preferredPort = 3350;

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
  throw new Error("No available localhost port for Phase 23N proof server.");
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
      conversationStatus: panel?.dataset.conversationStatus || "",
      routeChangeReadinessEvaluations: panel?.dataset.routeChangeReadinessEvaluations || "0",
      participantChangeIntentsLocal: panel?.dataset.participantChangeIntentsLocal || "0",
      sellerParticipantChangesLocal: panel?.dataset.sellerParticipantChangesLocal || "0",
      newLeadsCreated: panel?.dataset.newLeadsCreated || "0",
      newConversationsCreated: panel?.dataset.newConversationsCreated || "0",
      messagesReassigned: panel?.dataset.messagesReassigned || "0",
      messageHistoryDeletions: panel?.dataset.messageHistoryDeletions || "0",
      attributionMutations: panel?.dataset.attributionMutations || "0",
      contactReveals: panel?.dataset.contactReveals || "0",
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
      hasRouteReadiness: Boolean(document.querySelector("[data-testid='conversation-route-readiness']")),
      hasParticipantChange: Boolean(document.querySelector("[data-testid='conversation-participant-change']")),
      hasRouteHistory: Boolean(document.querySelector("[data-testid='conversation-route-history']")),
      hasMessages: Boolean(document.querySelector("[data-testid='property-conversation-messages']")),
      hasCounters: Boolean(document.querySelector("[data-testid='property-conversation-side-effects']")),
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

function boundaryPass(checks) {
  return checks.newLeadsCreated === "0" &&
    checks.newConversationsCreated === "0" &&
    checks.messagesReassigned === "0" &&
    checks.messageHistoryDeletions === "0" &&
    checks.attributionMutations === "0" &&
    checks.contactReveals === "0" &&
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
    checks.noForbiddenExecution &&
    checks.noPrivateLeak &&
    checks.noHorizontalOverflow;
}

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
    const pass = predicate(checks) &&
      boundaryPass(checks) &&
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
  await runScenario("A", "expired Agent pauses conversation", { width: 1440, height: 900 }, "#property-conversations?case=ownerFallback", "01_expired_agent_pauses.png", (checks) =>
    checks.visible && checks.text.includes("REPRESENTATIVE AUTHORITY CHANGED"));
  await runScenario("B", "route review opens", { width: 1440, height: 900 }, "#property-conversations?case=ownerFallback", "02_route_review_opens.png", (checks) =>
    checks.hasRouteReadiness && checks.hasParticipantChange && checks.hasRouteHistory);
  await runScenario("C", "Owner fallback resolved", { width: 1280, height: 820 }, "#property-conversations?case=ownerFallback", "03_owner_fallback.png", (checks) =>
    checks.text.includes("OWNER_FALLBACK_AVAILABLE") && checks.text.includes("Owner"));
  await runScenario("D", "owner participant-change success", { width: 1280, height: 820 }, "#property-conversations?case=ownerFallback", "04_owner_change_success.png", (checks) =>
    checks.text.includes("ROUTE_CHANGED_LOCAL_PROOF") && checks.sellerParticipantChangesLocal === "1");
  await runScenario("E", "old Agent preserved in history", { width: 1280, height: 820 }, "#property-conversations?case=ownerFallback", "05_old_agent_preserved.png", (checks) =>
    checks.text.includes("INACTIVE_ROUTE_LOCAL") && checks.text.includes("Outgoing"));
  await runScenario("F", "old Agent cannot message", { width: 1280, height: 820 }, "#property-conversations?case=ownerFallback", "06_old_agent_blocked.png", (checks) =>
    checks.text.includes("Old seller append") && checks.text.includes("BLOCKED_PARTICIPANT"));
  await runScenario("G", "Owner can message through existing 23M path", { width: 1280, height: 820 }, "#property-conversations?case=ownerFallback", "07_owner_message_23m.png", (checks) =>
    checks.text.includes("New seller append") && checks.text.includes("DELIVERED_INSIDE_ESSA_LOCAL_PROOF"));
  await runScenario("H", "Agent A to Agent B", { width: 1280, height: 820 }, "#property-conversations?case=agentB", "08_agent_b.png", (checks) =>
    checks.text.includes("Authorized Agent B") && checks.text.includes("ROUTE_CHANGED_LOCAL_PROOF"));
  await runScenario("I", "multiple agents requires review", { width: 1280, height: 820 }, "#property-conversations?case=multipleAgents", "09_multiple_agents_review.png", (checks) =>
    checks.text.includes("MULTIPLE_REPLACEMENTS_REVIEW_REQUIRED") && checks.sellerParticipantChangesLocal === "0");
  await runScenario("J", "no valid route blocked", { width: 1280, height: 820 }, "#property-conversations?case=noValidRoute", "10_no_valid_route.png", (checks) =>
    checks.text.includes("BLOCKED_NO_AUTHORIZED_ROUTE") && checks.sellerParticipantChangesLocal === "0");
  await runScenario("K", "manager blocked", { width: 1280, height: 820 }, "#property-conversations?case=managerBlocked", "11_manager_blocked.png", (checks) =>
    checks.text.includes("BLOCKED_INCOMING_AUTHORITY"));
  await runScenario("L", "cleaner blocked", { width: 1280, height: 820 }, "#property-conversations?case=cleanerBlocked", "12_cleaner_blocked.png", (checks) =>
    checks.text.includes("BLOCKED_INCOMING_AUTHORITY"));
  await runScenario("M", "consent revoked blocks replacement", { width: 1280, height: 820 }, "#property-conversations?case=consentRevokedRoute", "13_consent_blocks.png", (checks) =>
    checks.text.includes("BLOCKED_BUYER_CONSENT") && checks.sellerParticipantChangesLocal === "0");
  await runScenario("N", "Listing unpublished prevents automatic resume", { width: 1280, height: 820 }, "#property-conversations?case=listingUnpublishedRoute", "14_listing_unpublished.png", (checks) =>
    checks.text.includes("UNPUBLISHED_LOCAL_PROOF") && checks.sellerParticipantChangesLocal === "0");
  await runScenario("O", "mobile/narrow route-change UI", { width: 390, height: 844 }, "#property-conversations?case=ownerFallback", "15_mobile_route_change.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasRouteReadiness && checks.hasParticipantChange && checks.hasRouteHistory && checks.hasMessages && checks.hasCounters);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23N_PROPERTY_CONVERSATION_ROUTE_CHANGE_PASS"
    : "FAIL_UI",
  route: `${base}#property-conversations`,
  routeChangeReadinessEvaluations: "expected local proof count only",
  participantChangeIntentsLocal: "expected local proof count only",
  sellerParticipantChangesLocal: "expected local proof count only",
  newLeadsCreated: 0,
  newConversationsCreated: 0,
  messagesReassigned: 0,
  messageHistoryDeletions: 0,
  attributionMutations: 0,
  externalMessagesSent: 0,
  contactReveals: 0,
  viewingBookings: 0,
  formalOffersCreated: 0,
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

writeJson(path.join(artifactDir, "property_conversation_route_change_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23N_PROPERTY_CONVERSATION_ROUTE_CHANGE_PASS") process.exit(1);
