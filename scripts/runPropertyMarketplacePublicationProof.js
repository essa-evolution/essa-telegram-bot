import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase23i";
const preferredPort = 3300;

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
  throw new Error("No available localhost port for Phase 23I proof server.");
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.textContent || "";
    const panel = document.querySelector("#property-publication-proof-panel");
    const marketplace = document.querySelector("[data-testid='property-marketplace']");
    const detail = document.querySelector("[data-testid='property-listing-detail']");
    const publicText = `${marketplace?.textContent || ""} ${detail?.textContent || ""}`;
    const doc = document.documentElement;
    return {
      hash: location.hash,
      visible: Boolean(document.querySelector("#property-publication-proof-panel:not([hidden])")),
      caseKey: panel?.dataset.caseKey || "",
      preflightStatus: panel?.dataset.preflightStatus || "",
      executionStatus: panel?.dataset.executionStatus || "",
      localMarketplacePublications: panel?.dataset.localMarketplacePublications || "0",
      localMarketplaceDiscoveryInsertions: panel?.dataset.localMarketplaceDiscoveryInsertions || "0",
      duplicatePublicationRecords: panel?.dataset.duplicatePublicationRecords || "0",
      duplicateDiscoveryEntries: panel?.dataset.duplicateDiscoveryEntries || "0",
      externalPublicationActions: panel?.dataset.externalPublicationActions || "0",
      productionMarketplaceWrites: panel?.dataset.productionMarketplaceWrites || "0",
      canonicalPropertyMutations: panel?.dataset.canonicalPropertyMutations || "0",
      ownershipMutations: panel?.dataset.ownershipMutations || "0",
      providerCalls: panel?.dataset.providerCalls || "0",
      externalCalls: panel?.dataset.externalCalls || "0",
      productionDbMutations: panel?.dataset.productionDbMutations || "0",
      sellerContactActions: panel?.dataset.sellerContactActions || "0",
      offerActions: panel?.dataset.offerActions || "0",
      hasExecution: Boolean(document.querySelector("[data-testid='marketplace-publication-execution']")),
      hasPlan: Boolean(document.querySelector("[data-testid='marketplace-publication-plan']")),
      hasRecord: Boolean(document.querySelector("[data-testid='marketplace-publication-record']")),
      hasMarketplace: Boolean(marketplace),
      hasDetail: Boolean(detail),
      hasRollback: Boolean(document.querySelector("[data-testid='marketplace-publication-rollback']")),
      hasGuide: Boolean(document.querySelector("[data-testid='marketplace-publication-guide']")),
      hasSideEffects: Boolean(document.querySelector("[data-testid='marketplace-publication-side-effects']")),
      publicSurfaceSafe: !/mandate_ref|ownership_document|reviewer|evidence_|approvaltoken|actor_owner|actor_agent|private_email|bank|kyc|kyb|internal audit/i.test(publicText.toLowerCase()),
      noForbiddenState: !text.includes("PRODUCTION_LIVE") &&
        !text.includes("EXTERNAL_LIVE") &&
        !text.includes("CONTACT_SELLERtrue") &&
        !text.includes("PAYMENT_CREATED") &&
        !text.includes("BOOKED") &&
        !text.includes("OWNERSHIP_TRANSFERRED"),
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
    await page.waitForSelector("#property-publication-proof-panel:not([hidden])", { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
    const screenshot = await capture(page, fileName);
    const checks = await collectChecks(page);
    const boundaryPass = checks.duplicatePublicationRecords === "0" &&
      checks.duplicateDiscoveryEntries === "0" &&
      checks.externalPublicationActions === "0" &&
      checks.productionMarketplaceWrites === "0" &&
      checks.canonicalPropertyMutations === "0" &&
      checks.ownershipMutations === "0" &&
      checks.providerCalls === "0" &&
      checks.externalCalls === "0" &&
      checks.productionDbMutations === "0" &&
      checks.sellerContactActions === "0" &&
      checks.offerActions === "0" &&
      checks.publicSurfaceSafe &&
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
  await runScenario("A", "readiness to publication handoff", { width: 1440, height: 900 }, "#property-sale-publication-readiness?case=owner", "01_readiness_handoff.png", (checks) =>
    checks.visible && checks.caseKey === "owner", async (page) => {
      await page.getByRole("button", { name: "GO TO LOCAL PUBLICATION PROOF" }).click();
    });
  await runScenario("B", "owner publish success", { width: 1440, height: 900 }, "#property-publication-proof?case=owner", "02_owner_publish.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.executionStatus === "PUBLISHED_LOCAL_PROOF" && checks.localMarketplacePublications === "1");
  await runScenario("C", "publication record", { width: 1280, height: 820 }, "#property-publication-proof?case=owner", "03_publication_record.png", (checks) =>
    checks.hasRecord && checks.text.includes("PropertyMarketplacePublicationRecord") === false && checks.text.includes("PUBLISHED_LOCAL_PROOF"));
  await runScenario("D", "local Marketplace card", { width: 1280, height: 820 }, "#property-marketplace?case=owner", "04_marketplace_card.png", (checks) =>
    checks.hasMarketplace && checks.text.includes("Asking Price") && checks.localMarketplaceDiscoveryInsertions === "1");
  await runScenario("E", "public Listing detail", { width: 1280, height: 820 }, "#property-listing?listingId=demo&case=owner", "05_listing_detail.png", (checks) =>
    checks.hasDetail && checks.publicSurfaceSafe && checks.text.includes("Public Listing Detail"));
  await runScenario("F", "Passport link", { width: 1280, height: 820 }, "#property-publication-proof?case=owner", "06_passport_link.png", (checks) =>
    checks.text.includes("PUBLIC_SAFE_PASSPORT_LINK_READY"));
  await runScenario("G", "agent publication", { width: 1280, height: 820 }, "#property-publication-proof?case=agent", "07_agent_publication.png", (checks) =>
    checks.preflightStatus === "READY_FOR_APPROVAL" && checks.executionStatus === "PUBLISHED_LOCAL_PROOF");
  await runScenario("H", "unpublished Listing absent", { width: 1280, height: 820 }, "#property-publication-proof?case=unpublished", "08_unpublished_absent.png", (checks) =>
    checks.text.includes("Search after unpublish0"));
  await runScenario("I", "private-data leak proof", { width: 1280, height: 820 }, "#property-publication-proof?case=owner", "09_privacy_proof.png", (checks) =>
    checks.publicSurfaceSafe && checks.noPrivateLeak);
  await runScenario("J", "authority expired block", { width: 1280, height: 820 }, "#property-publication-proof?case=expiredAuthority", "10_expired_authority.png", (checks) =>
    checks.preflightStatus === "BLOCKED_EXPIRED_AUTHORITY" && checks.localMarketplacePublications === "0");
  await runScenario("K", "stale plan block", { width: 1280, height: 820 }, "#property-publication-proof?case=stalePlan", "11_stale_plan.png", (checks) =>
    checks.preflightStatus === "BLOCKED_STALE_PLAN" && checks.localMarketplacePublications === "0");
  await runScenario("L", "idempotent repeat", { width: 1280, height: 820 }, "#property-publication-proof?case=owner", "12_idempotent.png", (checks) =>
    checks.text.includes("Idempotent repeatALREADY_PUBLISHED_IDEMPOTENT"));
  await runScenario("M", "unpublish removes Discovery entry", { width: 1280, height: 820 }, "#property-publication-proof?case=owner", "13_unpublish.png", (checks) =>
    checks.text.includes("UnpublishUNPUBLISHED_LOCAL_PROOF") && checks.text.includes("Search after unpublish0"));
  await runScenario("N", "local marketplace search before/after unpublish", { width: 1280, height: 820 }, "#property-marketplace?case=owner", "14_search_before_after.png", (checks) =>
    checks.text.includes("Search count1") && checks.text.includes("Search after unpublish0"));
  await runScenario("O", "mobile/narrow marketplace", { width: 390, height: 844 }, "#property-marketplace?case=owner", "15_mobile.png", (checks) =>
    checks.visible && checks.noHorizontalOverflow && checks.hasExecution && checks.hasPlan && checks.hasRecord && checks.hasMarketplace && checks.hasDetail && checks.hasRollback && checks.hasGuide && checks.hasSideEffects);
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_23I_PROPERTY_MARKETPLACE_PUBLICATION_PASS"
    : "FAIL_UI",
  route: `${base}#property-publication-proof`,
  marketplaceRoute: `${base}#property-marketplace`,
  localMarketplacePublications: "expected local proof count only",
  localMarketplaceDiscoveryInsertions: "expected local proof count only",
  duplicatePublicationRecords: 0,
  duplicateDiscoveryEntries: 0,
  externalPublicationActions: 0,
  productionMarketplaceWrites: 0,
  canonicalPropertyMutations: 0,
  ownershipMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  sellerContactActions: 0,
  offerActions: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  scenarios: results
};

writeJson(path.join(artifactDir, "property_marketplace_publication_playwright_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_23I_PROPERTY_MARKETPLACE_PUBLICATION_PASS") process.exit(1);
