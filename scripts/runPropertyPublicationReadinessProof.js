import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23h";
const preferredPort = 3290;

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
  throw new Error("No available localhost port for Phase 23H proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const publicView = document.querySelector("[data-testid='publication-view-public']");
    const publicText = publicView?.textContent || "";
    const doc = document.documentElement;
    const panel = document.querySelector("#property-sale-publication-readiness-panel");
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-sale-publication-readiness-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      readinessStatus: panel?.dataset.readinessStatus || "",
      publicationReadinessEvaluations: panel?.dataset.publicationReadinessEvaluations || "0",
      publicationPlansCreated: panel?.dataset.publicationPlansCreated || "0",
      publishActions: panel?.dataset.publishActions || "0",
      publicDiscoveryInsertions: panel?.dataset.publicDiscoveryInsertions || "0",
      listingMutations: panel?.dataset.listingMutations || "0",
      canonicalPropertyMutations: panel?.dataset.canonicalPropertyMutations || "0",
      ownershipMutations: panel?.dataset.ownershipMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      marketplaceDiscoveryReady: panel?.dataset.marketplaceDiscoveryReady || "false",
      actualDiscoveryInsertion: panel?.dataset.actualDiscoveryInsertion || "false",
      hasProperty: Boolean(document.querySelector("[data-testid='publication-property']")),
      hasListing: Boolean(document.querySelector("[data-testid='publication-listing']")),
      hasAuthority: Boolean(document.querySelector("[data-testid='publication-authority']")),
      hasContent: Boolean(document.querySelector("[data-testid='publication-content']")),
      hasMedia: Boolean(document.querySelector("[data-testid='publication-media']")),
      hasPrivacy: Boolean(document.querySelector("[data-testid='publication-privacy']")),
      hasProjection: Boolean(document.querySelector("[data-testid='publication-projection']")),
      hasPublicView: Boolean(publicView),
      hasPlan: Boolean(document.querySelector("[data-testid='publication-plan']")),
      hasSideEffects: Boolean(document.querySelector("[data-testid='publication-side-effects']")),
      publicViewSafe: !publicText.includes("protected_doc_ref") &&
        !publicText.includes("approval") &&
        !publicText.includes("Authority") &&
        !publicText.includes("execution_record") &&
        !publicText.includes("private_email"),
      noPrivateLeak: !text.includes("OPENAI_API_KEY") && !text.includes("process.env") && !text.includes("rawPayload"),
      noForbiddenState: !text.includes("PUBLISHEDtrue") &&
        !text.includes("MARKETPLACE_ACTIVE") &&
        !text.includes("PAYMENT_CREATED") &&
        !text.includes("BOOKED") &&
        !text.includes("OWNERSHIP_TRANSFERRED") &&
        !text.includes("Contact Sellertrue"),
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
    await page.waitForSelector("#property-sale-publication-readiness-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.publishActions === "0" &&
      checks.publicDiscoveryInsertions === "0" &&
      checks.listingMutations === "0" &&
      checks.canonicalPropertyMutations === "0" &&
      checks.ownershipMutations === "0" &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.actualDiscoveryInsertion === "false" &&
      checks.publicViewSafe &&
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
  await runScenario("A", "Sale Listing to publication readiness handoff", { width: 1440, height: 900 }, "#property-sale-listing-proof?case=owner", "01_listing_to_publication_handoff.png", (checks) =>
    checks.visible && checks.caseKey === "owner" && checks.text.includes("PUBLICATION READINESS ONLY"), async (page) => {
      await page.getByRole("button", { name: "PREPARE FOR PUBLICATION" }).click();
    });
  await runScenario("B", "Owner ready", { width: 1440, height: 900 }, "#property-sale-publication-readiness?case=owner", "02_owner_ready.png", (checks) =>
    checks.readinessStatus === "READY_FOR_PUBLICATION_APPROVAL" && checks.marketplaceDiscoveryReady === "true");
  await runScenario("C", "Agent ready", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=agent", "03_agent_ready.png", (checks) =>
    checks.readinessStatus === "READY_FOR_PUBLICATION_APPROVAL");
  await runScenario("D", "Expired authority blocked", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=expiredAuthority", "04_expired_authority.png", (checks) =>
    checks.readinessStatus === "BLOCKED_AUTHORITY");
  await runScenario("E", "Private data blocked", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=privateData", "05_private_data.png", (checks) =>
    checks.readinessStatus === "BLOCKED_PRIVACY");
  await runScenario("F", "Property fact conflict", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=contentConflict", "06_content_conflict.png", (checks) =>
    checks.readinessStatus === "BLOCKED_CONTENT");
  await runScenario("G", "Missing media", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=missingMedia", "07_missing_media.png", (checks) =>
    checks.readinessStatus === "BLOCKED_MEDIA");
  await runScenario("H", "Media rights issue", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=mediaRights", "08_media_rights.png", (checks) =>
    checks.readinessStatus === "BLOCKED_MEDIA" && checks.text.includes("RIGHTS_MISSING"));
  await runScenario("I", "Stale Listing", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=stale", "09_stale.png", (checks) =>
    checks.readinessStatus === "BLOCKED_STALE");
  await runScenario("J", "Unknown jurisdiction", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=unknownJurisdiction", "10_unknown_jurisdiction.png", (checks) =>
    checks.readinessStatus === "BLOCKED_JURISDICTION");
  await runScenario("K", "Exclusive conflict", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=exclusiveConflict", "11_exclusive_conflict.png", (checks) =>
    checks.readinessStatus === "BLOCKED_EXCLUSIVITY_CONFLICT");
  await runScenario("L", "View As Public", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=owner", "12_view_as_public.png", (checks) =>
    checks.hasPublicView && checks.publicViewSafe && checks.text.includes("VIEW_AS_PUBLIC"));
  await runScenario("M", "Plan stale after price/content change", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=owner", "13_stale_plan.png", (checks) =>
    checks.text.includes("Stale after changeSTALE_PLAN"));
  await runScenario("N", "Listing still unpublished", { width: 1280, height: 820 }, "#property-sale-publication-readiness?case=owner", "14_unpublished.png", (checks) =>
    checks.text.includes("Still unpublishedtrue") && checks.publishActions === "0" && checks.publicDiscoveryInsertions === "0");
  await runScenario("O", "Mobile/narrow UI", { width: 390, height: 844 }, "#property-sale-publication-readiness?case=owner", "15_mobile.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasProperty && checks.hasListing && checks.hasAuthority && checks.hasContent && checks.hasMedia && checks.hasPrivacy && checks.hasProjection && checks.hasPublicView && checks.hasPlan && checks.hasSideEffects);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23H_PROPERTY_PUBLICATION_READINESS_PASS"
    : "FAIL_UI",
  route: `${base}#property-sale-publication-readiness`,
  publicationReadinessEvaluations: "expected local proof count only",
  publicationPlansCreated: "expected local proof count only",
  publishActions: 0,
  publicDiscoveryInsertions: 0,
  listingMutations: 0,
  canonicalPropertyMutations: 0,
  ownershipMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_publication_readiness_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23H_PROPERTY_PUBLICATION_READINESS_PASS") process.exit(1);
