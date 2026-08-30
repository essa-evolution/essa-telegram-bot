import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23o";
const preferredPort = 3360;

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
  throw new Error("No available localhost port for Phase 23O proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const panel = document.querySelector("#property-viewings-panel");
    const doc = document.documentElement;
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-viewings-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      confirmationStatus: panel?.dataset.confirmationStatus || "",
      confirmationPreflightStatus: panel?.dataset.confirmationPreflightStatus || "",
      localViewingRequestsCreated: panel?.dataset.localViewingRequestsCreated || "0",
      localViewingSlotsProposed: panel?.dataset.localViewingSlotsProposed || "0",
      localViewingsConfirmed: panel?.dataset.localViewingsConfirmed || "0",
      localViewingRescheduleRequests: panel?.dataset.localViewingRescheduleRequests || "0",
      localViewingsCancelled: panel?.dataset.localViewingsCancelled || "0",
      duplicateViewingsCreated: panel?.dataset.duplicateViewingsCreated || "0",
      propertyReservationsCreated: panel?.dataset.propertyReservationsCreated || "0",
      formalOffersCreated: panel?.dataset.formalOffersCreated || "0",
      counterOffersCreated: panel?.dataset.counterOffersCreated || "0",
      dealRoomActions: panel?.dataset.dealRoomActions || "0",
      externalCalendarEventsCreated: panel?.dataset.externalCalendarEventsCreated || "0",
      externalNotificationsSent: panel?.dataset.externalNotificationsSent || "0",
      emailActions: panel?.dataset.emailActions || "0",
      smsActions: panel?.dataset.smsActions || "0",
      telegramActions: panel?.dataset.telegramActions || "0",
      whatsappActions: panel?.dataset.whatsappActions || "0",
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
      hasRequest: Boolean(document.querySelector("[data-testid='property-viewing-request']")),
      hasAvailability: Boolean(document.querySelector("[data-testid='property-viewing-availability']")),
      hasSlots: Boolean(document.querySelector("[data-testid='property-viewing-slots']")),
      hasConfirmation: Boolean(document.querySelector("[data-testid='property-viewing-confirmation']")),
      hasLocation: Boolean(document.querySelector("[data-testid='property-viewing-location']")),
      hasHistory: Boolean(document.querySelector("[data-testid='property-viewing-history']")),
      hasGuide: Boolean(document.querySelector("[data-testid='property-viewing-guide']")),
      hasCounters: Boolean(document.querySelector("[data-testid='property-viewing-side-effects']")),
      noForbiddenExecution: !/\bCALENDAR_EVENT_CREATED\b|\bEMAIL_SENT\b|\bSMS_SENT\b|\bWHATSAPP_SENT\b|\bTELEGRAM_SENT\b|\bOFFER_CREATED\b|\bDEAL_ROOM_STARTED\b|\bPAYMENT_SENT\b|\bRESERVATION_CREATED\b|\bPRODUCTION_DB_WRITE\b/i.test(text),
      noPrivateLeak: !text.includes("OPENAI_API_KEY") && !text.includes("process.env") && !text.includes("access code") && !text.includes("rawPayload"),
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
  return checks.duplicateViewingsCreated === "0" &&
    checks.propertyReservationsCreated === "0" &&
    checks.formalOffersCreated === "0" &&
    checks.counterOffersCreated === "0" &&
    checks.dealRoomActions === "0" &&
    checks.externalCalendarEventsCreated === "0" &&
    checks.externalNotificationsSent === "0" &&
    checks.emailActions === "0" &&
    checks.smsActions === "0" &&
    checks.telegramActions === "0" &&
    checks.whatsappActions === "0" &&
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
    await page.waitForSelector("#property-viewings-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const pass = predicate(checks) && boundaryPass(checks) && consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0;
    results.push({ id, label, status: pass ? "PASS" : "FAIL", screenshot, finalUrl: page.url(), checks: { ...checks, text: undefined }, consoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("A", "Conversation to Request Viewing", { width: 1440, height: 900 }, "#property-viewings?case=owner", "01_conversation_request_viewing.png", (checks) =>
    checks.visible && checks.hasRequest && checks.localViewingRequestsCreated === "1");
  await runScenario("B", "buyer availability", { width: 1280, height: 820 }, "#property-viewings?case=owner", "02_buyer_availability.png", (checks) =>
    checks.hasAvailability && checks.text.includes("14:00-17:00 Asia/Tbilisi"));
  await runScenario("C", "seller availability", { width: 1280, height: 820 }, "#property-viewings?case=owner", "03_seller_availability.png", (checks) =>
    checks.text.includes("15:00-18:00 Asia/Tbilisi"));
  await runScenario("D", "proposed slots", { width: 1280, height: 820 }, "#property-viewings?case=owner", "04_proposed_slots.png", (checks) =>
    checks.localViewingSlotsProposed === "1" && checks.text.includes("15:00-16:00"));
  await runScenario("E", "slot selection", { width: 1280, height: 820 }, "#property-viewings?case=owner", "05_slot_selection.png", (checks) =>
    checks.text.includes("SLOT_SELECTED"));
  await runScenario("F", "owner confirmation", { width: 1280, height: 820 }, "#property-viewings?case=owner", "06_owner_confirmation.png", (checks) =>
    checks.confirmationStatus === "CONFIRMED_VIEWING_LOCAL_PROOF" && checks.localViewingsConfirmed === "1");
  await runScenario("G", "confirmed Viewing ID", { width: 1280, height: 820 }, "#property-viewings?case=owner", "07_confirmed_viewing_id.png", (checks) =>
    checks.text.includes("property_viewing_"));
  await runScenario("H", "agent confirmation", { width: 1280, height: 820 }, "#property-viewings?case=agent", "08_agent_confirmation.png", (checks) =>
    checks.confirmationStatus === "CONFIRMED_VIEWING_LOCAL_PROOF");
  await runScenario("I", "expired agent blocked", { width: 1280, height: 820 }, "#property-viewings?case=expiredAgent", "09_expired_agent_blocked.png", (checks) =>
    checks.confirmationStatus === "BLOCKED_SELLER_AUTHORITY");
  await runScenario("J", "manager without authority blocked", { width: 1280, height: 820 }, "#property-viewings?case=managerNoAuthority", "10_manager_no_authority.png", (checks) =>
    checks.confirmationStatus === "BLOCKED_SELLER_AUTHORITY");
  await runScenario("K", "manager explicit viewing authority success", { width: 1280, height: 820 }, "#property-viewings?case=managerViewingAuthority", "11_manager_viewing_success.png", (checks) =>
    checks.confirmationStatus === "CONFIRMED_VIEWING_LOCAL_PROOF");
  await runScenario("L", "location privacy", { width: 1280, height: 820 }, "#property-viewings?case=locationPrivacy", "12_location_privacy.png", (checks) =>
    checks.hasLocation && checks.text.includes("PUBLIC_LOCATION_ONLY") && checks.text.includes("Access codes shared"));
  await runScenario("M", "overlap conflict", { width: 1280, height: 820 }, "#property-viewings?case=overlapConflict", "13_overlap_conflict.png", (checks) =>
    checks.confirmationStatus === "BLOCKED_SLOT_CONFLICT");
  await runScenario("N", "reschedule/cancel", { width: 1280, height: 820 }, "#property-viewings?case=rescheduleCancel", "14_reschedule_cancel.png", (checks) =>
    checks.localViewingRescheduleRequests === "1" && checks.localViewingsCancelled === "1" && checks.text.includes("CANCELLED_LOCAL"));
  await runScenario("O", "mobile/narrow viewing UI", { width: 390, height: 844 }, "#property-viewings?case=owner", "15_mobile_viewing.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasRequest && checks.hasAvailability && checks.hasSlots && checks.hasConfirmation && checks.hasLocation && checks.hasHistory && checks.hasGuide && checks.hasCounters);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23O_PROPERTY_VIEWING_WORKFLOW_PASS"
    : "FAIL_UI",
  route: `${base}#property-viewings`,
  localViewingRequestsCreated: "expected local proof count only",
  localViewingSlotsProposed: "expected local proof count only",
  localViewingsConfirmed: "expected local proof count only",
  localViewingRescheduleRequests: "expected local proof count only",
  localViewingsCancelled: "expected local proof count only",
  duplicateViewingsCreated: 0,
  propertyReservationsCreated: 0,
  formalOffersCreated: 0,
  counterOffersCreated: 0,
  dealRoomActions: 0,
  externalCalendarEventsCreated: 0,
  externalNotificationsSent: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
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

writeJson(path.join(artifactDir, "property_viewing_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23O_PROPERTY_VIEWING_WORKFLOW_PASS") process.exit(1);
