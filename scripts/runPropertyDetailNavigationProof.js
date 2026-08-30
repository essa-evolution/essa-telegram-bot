import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22d";
const preferredPort = 3120;

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
  throw new Error("No available localhost port for Phase 22D proof server.");
}

async function capture(page, fileName) {
  const screenshotPath = path.join(artifactDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const doc = document.documentElement;
    const panel = document.querySelector("#property-panel");
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const counters = {
      providerCalls: panel?.dataset.providerCalls,
      externalCalls: panel?.dataset.externalCalls,
      dbMutations: panel?.dataset.dbMutations,
      paymentActions: panel?.dataset.paymentActions,
      bookingActions: panel?.dataset.bookingActions,
      transactionActions: panel?.dataset.transactionActions
    };

    return {
      hash: location.hash,
      propertyVisible: visible("#property-panel"),
      productDiscoveryVisible: visible("#product-discovery-panel"),
      currentSection: panel?.dataset.currentSection || "",
      propertyIdVisible: text.includes("prop_ge_batumi_sea_view_a_1204") || text.includes("prop_ge_batumi_incomplete_evidence"),
      navVisible: visible(".property-section-nav"),
      activeNavVisible: visible(".property-section-nav .active"),
      sourceDrillDownVisible: text.includes("LOCAL DEMO SOURCE") && text.includes("Source ID:"),
      factTraceVisible: text.includes("Source trace:") && text.includes("confidence"),
      verificationDetailVisible: text.includes("Verified") && text.includes("Unverified") && text.includes("Inferred") && text.includes("Missing"),
      riskDetailVisible: text.includes("Professional verification will be required") && text.includes("Not a legal conclusion"),
      lisaContextVisible: text.includes("currentProduct=ESSA_PROPERTY") && text.includes("availableReadOnlyActions="),
      guideVisible: text.includes("GUIDE ME THROUGH THIS PROPERTY"),
      guideCompleted: text.includes("What ESSA cannot do yet.") && text.includes("Booking is not active."),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawMissingValues: !text.includes("undefined") && !text.includes("[object Object]"),
      sideEffectsStillZero: Object.values(counters).every((value) => value === "0"),
      counters,
      documentMetrics: {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight
      }
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

async function runScenario(id, label, viewport, fn) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleErrors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "request_failed"}`);
  });

  try {
    const scenarioResult = await fn(page);
    const checks = await collectChecks(page);
    const status = scenarioResult.pass && checks.sideEffectsStillZero && checks.noHorizontalOverflow && checks.noRawMissingValues &&
      consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0
      ? "PASS"
      : "FAIL";
    results.push({ id, label, status, ...scenarioResult, checks, consoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("handoff", "Scenario A - Product Discovery to ESSA Property handoff", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#product-discovery/search?q=property`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const handoffScreenshot = await capture(page, "01_product_discovery_handoff.png");
    await page.getByRole("button", { name: "ОТКРЫТЬ PROPERTY PASSPORT" }).first().click();
    await page.waitForFunction(() => location.hash.startsWith("#property"), null, { timeout: 5000 });
    const overviewScreenshot = await capture(page, "02_property_overview_with_navigation.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("ESSA Property / Real Estate") && text.includes("Property Overview"),
      screenshots: [handoffScreenshot, overviewScreenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("sections", "Scenario B - Overview to Verification to Sources to Risks", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#property?section=overview`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("link", { name: "Verification" }).click();
    await page.waitForFunction(() => location.hash.includes("section=verification"));
    const verificationScreenshot = await capture(page, "03_verification_detail.png");
    await page.getByRole("link", { name: "Sources" }).click();
    await page.waitForFunction(() => location.hash.includes("section=sources"));
    const sourceScreenshot = await capture(page, "04_source_drill_down.png");
    await page.getByRole("link", { name: "Risks" }).click();
    await page.waitForFunction(() => location.hash.includes("section=risks"));
    const riskScreenshot = await capture(page, "05_risk_detail.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Source trace:") && text.includes("Professional verification will be required"),
      screenshots: [verificationScreenshot, sourceScreenshot, riskScreenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("stale-trace", "Scenario C - Stale fixture risk detail and source traceability", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?fixture=stale&section=risks`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "06_stale_risk_source_trace.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("STALE_LISTING_DATA") && text.includes("LOCAL DEMO SOURCE") && text.includes("Source trace:"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("incomplete-lisa", "Scenario D - Incomplete fixture missing/unverified and Lisa", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?fixture=incomplete&section=lisa`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: "Что ESSA пока не умеет?" }).click();
    const screenshot = await capture(page, "07_incomplete_lisa_context.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("prop_ge_batumi_incomplete_evidence") && text.includes("Missing") && text.includes("Payments are not active."),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("guide", "Scenario E - Guide Me read-only walkthrough", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: "GUIDE ME THROUGH THIS PROPERTY" }).click();
    for (let index = 0; index < 6; index += 1) {
      await page.getByRole("button", { name: "Next" }).click();
    }
    const screenshot = await capture(page, "08_guided_mode_complete.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("7/7 What ESSA cannot do yet.") && text.includes("Booking is not active."),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("mobile", "Scenario F - Mobile/narrow navigation", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${base}#property?fixture=incomplete&section=sources`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("link", { name: "Lisa" }).click();
    await page.waitForFunction(() => location.hash.includes("section=lisa"));
    const screenshot = await capture(page, "09_mobile_navigation.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Property Passport sections") || text.includes("Lisa Explanation"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22D_PROPERTY_DETAIL_NAVIGATION_PROOF_PASS" : "FAIL_UI",
  route: `${base}#property`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results
};

writeJson(path.join(artifactDir, "property_detail_navigation_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));

if (report.status === "FAIL_UI") process.exit(1);
