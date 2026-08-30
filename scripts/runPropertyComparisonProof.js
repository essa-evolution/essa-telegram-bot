import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22e";
const preferredPort = 3130;

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
  throw new Error("No available localhost port for Phase 22E proof server.");
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
      compareVisible: visible(".property-comparison-panel"),
      comparisonCards: document.querySelectorAll(".property-comparison-card").length,
      deltasVisible: visible(".property-comparison-deltas"),
      lisaVisible: text.includes("Lisa Comparison Explanation") && text.includes("selectedPropertyIds="),
      guideVisible: text.includes("GUIDE ME THROUGH THE COMPARISON"),
      sourceAwareVisible: text.includes("Source-Aware Comparison") && text.includes("Source lineage:"),
      neutralLabelsVisible: text.includes("LOWER OBSERVED PRICE") && text.includes("MORE VERIFIED DATA"),
      noRecommendation: !text.includes("BUY THIS PROPERTY") && !text.includes("THIS IS THE BEST PROPERTY") && !text.includes("Property Score"),
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
      checks.noRecommendation && consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0
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
  await runScenario("normal-stale", "Scenario A - Normal + stale comparison", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "01_comparison_overview.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Normal/current property") && text.includes("Stale listing example") && text.includes("Property Comparison"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("normal-incomplete", "Scenario B - Normal + incomplete comparison", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "05_source_evidence_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Incomplete evidence example") && text.includes("MORE EVIDENCE GAPS") && text.includes("Missing / not available"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("three-property", "Scenario C - Three-property comparison", { width: 1440, height: 920 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "03_verification_comparison.png");
    const cardCount = await page.locator(".property-comparison-card").count();
    const text = await page.textContent("body");
    return {
      pass: cardCount === 3 && text.includes("Verified / Unverified / Inferred"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("price-freshness", "Scenario D - Price/freshness delta", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "02_price_freshness_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("LOWER OBSERVED PRICE") && text.includes("STALE DATA") && text.includes("No live valuation is performed"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("risk-delta", "Scenario E - Risk delta", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "04_risk_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("ADDITIONAL RISK FLAGS") && text.includes("not a recommendation"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("source-coverage", "Scenario F - Source coverage delta", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const text = await page.textContent("body");
    return {
      pass: text.includes("STRONGER SOURCE COVERAGE") && text.includes("Source-Aware Comparison") && text.includes("freshness"),
      screenshots: [],
      finalUrl: page.url()
    };
  });

  await runScenario("lisa-comparison", "Scenario G - Lisa comparison explanation", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: "Какие риски различаются?" }).click();
    const screenshot = await capture(page, "06_lisa_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("LISA_ESSA_PRODUCT_GUIDE") && text.includes("selectedPropertyIds=") && text.includes("not legal conclusions"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("compare-guide", "Scenario H - Compare guided mode", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: "GUIDE ME THROUGH THE COMPARISON" }).click();
    for (let index = 0; index < 7; index += 1) {
      await page.getByRole("button", { name: "Next" }).click();
    }
    const screenshot = await capture(page, "07_guided_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("8/8 Limitations") && text.includes("Does not call providers"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("mobile", "Scenario I - Mobile/narrow comparison", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${base}#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "08_mobile_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Property Comparison") && text.includes("Lisa Comparison Explanation"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22E_PROPERTY_COMPARISON_PROOF_PASS" : "FAIL_UI",
  route: `${base}#property?mode=compare&items=normal,stale,incomplete`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results
};

writeJson(path.join(artifactDir, "property_comparison_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
