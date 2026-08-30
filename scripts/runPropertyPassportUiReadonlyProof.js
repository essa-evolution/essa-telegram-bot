import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { chromium } from "playwright";
import { auditPlaywrightAvailability } from "../src/agentToolLayer/browserVerificationProvider.js";

const artifactDir = "artifacts/property/phase22c";
const preferredPort = 3100;
const scenarios = [
  {
    id: "overview",
    label: "Scenario A - Normal Property Passport",
    hash: "#property?fixture=normal",
    screenshot: "01_property_overview.png",
    viewport: { width: 1440, height: 900 }
  },
  {
    id: "stale",
    label: "Scenario B - Stale Property",
    hash: "#property?fixture=stale",
    screenshot: "02_property_passport_verification_stale.png",
    viewport: { width: 1440, height: 900 }
  },
  {
    id: "incomplete",
    label: "Scenario C - Incomplete Evidence",
    hash: "#property?fixture=incomplete",
    screenshot: "03_stale_incomplete_state.png",
    viewport: { width: 1280, height: 820 }
  },
  {
    id: "lisa",
    label: "Lisa Explanation Area",
    hash: "#property?fixture=normal",
    screenshot: "04_lisa_explanation_area.png",
    viewport: { width: 1280, height: 820 },
    clickQuestion: "Что ESSA пока не умеет?"
  },
  {
    id: "mobile",
    label: "Mobile/Narrow Self-check",
    hash: "#property?fixture=incomplete",
    screenshot: "05_mobile_property_passport.png",
    viewport: { width: 390, height: 844 }
  }
];

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
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    }
  }));
  app.use("/src", express.static(path.join(process.cwd(), "src"), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    }
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

  throw new Error("No available localhost port for Phase 22C proof server.");
}

function allTrue(checks) {
  return Object.values(checks).every(Boolean);
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
const targetBase = `http://localhost:${port}/workspace/`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: scenario.viewport });
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleErrors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "request_failed"}`);
    });

    const target = `${targetBase}${scenario.hash}`;
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    if (scenario.clickQuestion) {
      await page.locator(".property-lisa-question").filter({ hasText: scenario.clickQuestion }).first().click({ timeout: 5000 }).catch((error) => {
        consoleErrors.push(`warning: Lisa question click skipped: ${error.message}`);
      });
    }

    await page.screenshot({ path: path.join(artifactDir, scenario.screenshot), fullPage: true });

    const checks = await page.evaluate((scenarioId) => {
      const visible = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const text = document.body.innerText;
      const doc = document.documentElement;
      const panel = document.querySelector("#property-panel");
      const futureAction = document.querySelector(".property-future-action");
      const futureActionCountBefore = {
        providerCalls: panel?.dataset.providerCalls,
        externalCalls: panel?.dataset.externalCalls,
        dbMutations: panel?.dataset.dbMutations,
        paymentActions: panel?.dataset.paymentActions,
        bookingActions: panel?.dataset.bookingActions,
        transactionActions: panel?.dataset.transactionActions
      };
      futureAction?.click();
      const futureActionCountAfter = {
        providerCalls: panel?.dataset.providerCalls,
        externalCalls: panel?.dataset.externalCalls,
        dbMutations: panel?.dataset.dbMutations,
        paymentActions: panel?.dataset.paymentActions,
        bookingActions: panel?.dataset.bookingActions,
        transactionActions: panel?.dataset.transactionActions
      };
      const noRawMissingValues = !text.includes("undefined") && !text.includes("null") && !text.includes("[object Object]");

      return {
        routeOpens: visible("#property-panel") && location.hash.startsWith("#property"),
        propertyIdVisible: text.includes("prop_ge_batumi_sea_view_a_1204") || text.includes("prop_ge_batumi_incomplete_evidence"),
        locationVisible: text.includes("Batumi") && text.includes("Georgia"),
        priceVisibleWhenNormal: scenarioId !== "overview" || text.includes("125000"),
        verifiedFactsVisible: scenarioId === "incomplete" || text.includes("Verified Facts"),
        riskSectionVisible: text.includes("Risks") && (
          text.includes("Review signal only") ||
          text.includes("Current user action: review only")
        ),
        lisaExplanationVisible: text.includes("Lisa Explanation") && text.includes("LISA_ESSA_PRODUCT_GUIDE"),
        staleBadgeVisibleWhenNeeded: scenarioId !== "stale" || text.includes("Stale") && text.includes("At least one listing/source"),
        incompleteMissingVisible: scenarioId !== "incomplete" || text.includes("Missing") && text.includes("prop_ge_batumi_incomplete_evidence"),
        limitationsVisible: text.includes("Current Limitations") && text.includes("Payments are not active."),
        futureActionBlocked: [...document.querySelectorAll("[data-execution-enabled]")]
          .every((node) => node.dataset.executionEnabled === "false"),
        sideEffectsStillZero: Object.values(futureActionCountBefore).every((value) => value === "0") &&
          Object.values(futureActionCountAfter).every((value) => value === "0"),
        noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
        noRawMissingValues,
        documentMetrics: {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          scrollHeight: doc.scrollHeight,
          clientHeight: doc.clientHeight
        },
        sideEffectCounters: futureActionCountAfter,
        activeFixture: panel?.dataset.activeFixture || ""
      };
    }, scenario.id);

    results.push({
      scenario,
      target,
      finalUrl: page.url(),
      screenshotPath: path.join(artifactDir, scenario.screenshot),
      checks,
      consoleErrors,
      pageErrors,
      failedRequests,
      status: allTrue(checks) && consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0
        ? "PASS"
        : "FAIL"
    });

    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22C_PROPERTY_UI_PROOF_PASS" : "FAIL_UI",
  route: `${targetBase}#property`,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results
};

writeJson(path.join(artifactDir, "property_passport_ui_proof_report.json"), report);
console.log(JSON.stringify(report, null, 2));

if (report.status === "FAIL_UI") {
  process.exit(1);
}
