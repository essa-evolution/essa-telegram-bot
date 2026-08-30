import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22g";
const preferredPort = 3150;

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
  throw new Error("No available localhost port for Phase 22G proof server.");
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
    const disabledExecutions = [...document.querySelectorAll("[data-execution-enabled]")].every((node) => node.dataset.executionEnabled === "false");
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
      currentMode: panel?.dataset.currentMode || "",
      discoveryStatus: panel?.dataset.discoveryStatus || "",
      discoveryMatchedCount: panel?.dataset.discoveryMatchedCount || "",
      resultCards: document.querySelectorAll(".property-discovery-card:not(.property-discovery-empty)").length,
      comparisonCards: document.querySelectorAll(".property-comparison-card").length,
      passportVisible: text.includes("Property Passport") || text.includes("Property Overview"),
      lisaVisible: text.includes("LISA_ESSA_PRODUCT_GUIDE"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawMissingValues: !text.includes("undefined") && !text.includes("[object Object]"),
      noForbiddenActions: !text.includes("Contact seller") && !text.includes("Buy now") && !text.includes("Book now") && !text.includes("Pay now"),
      disabledExecutions,
      sideEffectsStillZero: Object.values(counters).every((value) => value === "0" || value == null),
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
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "request_failed"}`));
  try {
    const scenarioResult = await fn(page);
    const checks = await collectChecks(page);
    const status = scenarioResult.pass &&
      checks.sideEffectsStillZero &&
      checks.noHorizontalOverflow &&
      checks.noRawMissingValues &&
      checks.noForbiddenActions &&
      checks.disabledExecutions &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0
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
  await runScenario("batumi-apartment", "Scenario A - Apartment in Batumi returns results", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "01_discovery_batumi_results.png");
    const text = await page.textContent("body");
    return { pass: text.includes("Property Discovery") && text.includes("3 local repository result"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("budget-filter", "Scenario B - Batumi apartment under 130000 USD filters results", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми до 130000 USD")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const screenshot = await capture(page, "02_discovery_budget_filter.png");
    const text = await page.textContent("body");
    return { pass: text.includes("1 local repository result") && text.includes("125000 USD"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("empty", "Scenario C - No matches returns safe empty state", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Вилла в Тбилиси до 1 USD")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const screenshot = await capture(page, "03_discovery_empty_state.png");
    const text = await page.textContent("body");
    return { pass: text.includes("NO_MATCHES_IN_CURRENT_PROPERTY_DATA") && text.includes("Live Property Search"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("stale", "Scenario D - Stale result shows stale warning", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const screenshot = await capture(page, "04_discovery_stale_warning.png");
    const text = await page.textContent("body");
    return { pass: text.includes("STALE") && text.includes("stale evidence"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("incomplete", "Scenario E - Incomplete result shows missing evidence warning", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const screenshot = await capture(page, "05_discovery_incomplete_evidence.png");
    const text = await page.textContent("body");
    return { pass: text.includes("INCOMPLETE_LOCAL_EVIDENCE") && text.includes("NEEDS_PROFESSIONAL_REVIEW"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("passport", "Scenario F - Discovery result opens Property Passport", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.locator(".property-discovery-card").first().getByRole("button", { name: "View Passport" }).click();
    const screenshot = await capture(page, "06_discovery_to_passport.png");
    const text = await page.textContent("body");
    return { pass: page.url().includes("section=passport") && text.includes("Property Passport"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("compare", "Scenario G - Discovery results open Compare", { width: 1440, height: 920 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.locator(".property-discovery-card").first().getByRole("button", { name: "Compare" }).click();
    const screenshot = await capture(page, "07_discovery_to_compare.png");
    const text = await page.textContent("body");
    return { pass: page.url().includes("mode=compare") && text.includes("Property Comparison"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("lisa", "Scenario H - Ask Lisa about current results", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.locator(".property-discovery-card").first().getByRole("button", { name: "Ask Lisa" }).click();
    const screenshot = await capture(page, "08_discovery_lisa_answer.png");
    const text = await page.textContent("body");
    return { pass: text.includes("local ESSA Property record") && text.includes("These are local repository results"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("guide", "Scenario I - Guide Me discovery flow", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}&discoveryGuide=1&discoveryGuideStep=2`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const screenshot = await capture(page, "09_discovery_guide.png");
    const text = await page.textContent("body");
    return { pass: text.includes("HELP ME FIND A PROPERTY") && text.includes("Budget?") && text.includes("Missing prices are not treated as zero"), screenshots: [screenshot], finalUrl: page.url() };
  });

  await runScenario("mobile", "Scenario J - Mobile/narrow viewport", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${base}#property?mode=discover&q=${encodeURIComponent("Квартира в Батуми")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const screenshot = await capture(page, "10_discovery_mobile.png");
    const text = await page.textContent("body");
    return { pass: text.includes("Property Discovery") && text.includes("LISA_ESSA_PRODUCT_GUIDE"), screenshots: [screenshot], finalUrl: page.url() };
  });
} finally {
  await browser.close();
  server.close();
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22G_PROPERTY_DISCOVERY_PROOF_PASS" : "FAIL_UI",
  route: `${base}#property?mode=discover`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results
};
writeJson(path.join(artifactDir, "property_discovery_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22G_PROPERTY_DISCOVERY_PROOF_PASS") process.exit(1);
