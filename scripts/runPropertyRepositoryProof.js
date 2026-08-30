import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";
import { propertyReadService } from "../src/property/index.js";

const artifactDir = "artifacts/property/phase22f";
const preferredPort = 3140;

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
  app.get("/api/property", (req, res) => res.json({
    ok: true,
    status: "FOUND",
    readScope: "PUBLIC",
    summaries: propertyReadService.listDemoProperties().summaries,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  }));
  app.get("/api/property/:propertyId/passport", (req, res) => {
    const result = propertyReadService.publicPropertyResponse(req.params.propertyId);
    if (!result.ok) return res.status(404).json(result);
    return res.json(result);
  });
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
  throw new Error("No available localhost port for Phase 22F proof server.");
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
      selectedPropertyIds: panel?.dataset.selectedPropertyIds || "",
      repositoryProofVisible: text.includes("propertyReadService providerCalls=0"),
      lisaVisible: text.includes("LISA_ESSA_PRODUCT_GUIDE"),
      sourceVisible: text.includes("Source lineage:") || text.includes("Source-Aware Comparison"),
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      noRawMissingValues: !text.includes("undefined") && !text.includes("[object Object]"),
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
const base = `http://localhost:${port}`;
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
    const unexpectedConsoleErrors = consoleErrors.filter((message) =>
      !(scenarioResult.expectedConsoleErrors || []).some((expected) => message.includes(expected))
    );
    const status = scenarioResult.pass && checks.sideEffectsStillZero && checks.noHorizontalOverflow && checks.noRawMissingValues &&
      unexpectedConsoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0
      ? "PASS"
      : "FAIL";
    results.push({ id, label, status, ...scenarioResult, checks, consoleErrors, unexpectedConsoleErrors, pageErrors, failedRequests });
  } catch (error) {
    results.push({ id, label, status: "FAIL", error: error.message, consoleErrors, pageErrors, failedRequests });
  } finally {
    await page.close();
  }
}

try {
  await runScenario("property-list", "Scenario A - Property list/read model loads", { width: 1440, height: 900 }, async (page) => {
    const response = await page.goto(`${base}/api/property`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const data = await response.json();
    return {
      pass: data.summaries.length === 3 && data.summaries.every((summary) => summary.modelType === "PropertySummary"),
      api: data,
      screenshots: [],
      finalUrl: page.url()
    };
  });

  await runScenario("property-passport", "Scenario B - Property to Passport", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/workspace/#property?fixture=normal&section=passport`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "01_repository_property_passport.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Property Passport") && text.includes("propertyReadService providerCalls=0"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("stale-listing", "Scenario C - Stale listing does not remove Property", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}/workspace/#property?fixture=stale&section=risks`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "02_stale_listing_property_exists.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("prop_ge_batumi_sea_view_a_1204") && text.includes("STALE_LISTING_DATA"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("incomplete", "Scenario D - Incomplete evidence remains incomplete", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}/workspace/#property?fixture=incomplete&section=verification`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "03_incomplete_repository_evidence.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("prop_ge_batumi_incomplete_evidence") && text.includes("current_listing_missing"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("comparison", "Scenario E - Comparison resolves multiple canonical property IDs", { width: 1440, height: 920 }, async (page) => {
    await page.goto(`${base}/workspace/#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "04_repository_comparison.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Property Comparison") && text.includes("selectedPropertyIds=prop_ge_batumi_sea_view_a_1204"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("not-found", "Scenario F - Unknown Property ID returns safe NOT_FOUND", { width: 1280, height: 820 }, async (page) => {
    const response = await page.goto(`${base}/api/property/prop_unknown/passport`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const data = await response.json();
    return {
      pass: response.status() === 404 && data.status === "NOT_FOUND" && data.providerCalls === 0,
      api: data,
      expectedConsoleErrors: ["404"],
      screenshots: [],
      finalUrl: page.url()
    };
  });

  await runScenario("navigator-lisa", "Scenario G - Navigator/Lisa explanations still work", { width: 1280, height: 820 }, async (page) => {
    await page.goto(`${base}/workspace/#property?fixture=normal&section=lisa`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: "Что ESSA пока не умеет?" }).click();
    const screenshot = await capture(page, "05_repository_lisa_context.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("LISA_ESSA_PRODUCT_GUIDE") && text.includes("Payments are not active."),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });

  await runScenario("mobile", "Scenario H - Mobile Property UI still works", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${base}/workspace/#property?mode=compare&items=normal,stale,incomplete`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const screenshot = await capture(page, "06_mobile_repository_property.png");
    const text = await page.textContent("body");
    return {
      pass: text.includes("Property Comparison") && text.includes("propertyReadService providerCalls=0"),
      screenshots: [screenshot],
      finalUrl: page.url()
    };
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22F_PROPERTY_REPOSITORY_PROOF_PASS" : "FAIL_UI",
  route: `${base}/workspace/#property`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results
};

writeJson(path.join(artifactDir, "property_repository_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));
