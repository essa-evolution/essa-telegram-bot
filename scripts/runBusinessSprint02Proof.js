import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const artifactDir = "artifacts/business/phase-sprint02";
const storePath = path.resolve("artifacts/business/sprint02-proof-store.json");
fs.mkdirSync(artifactDir, { recursive: true });
fs.rmSync(storePath, { force: true });

async function findPort(start = 3400) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No available localhost port for Business Sprint 02 proof.");
}

function startServer(port) {
  const child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "development",
      ESSA_BUSINESS_LOCAL_AUTH: "1",
      ESSA_BUSINESS_STORE_PATH: storePath,
      SUPABASE_URL: "",
      VITE_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_ANON_KEY: "",
      VITE_SUPABASE_ANON_KEY: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return child;
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Server exited early with ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error("Timed out waiting for local server.");
}

async function runScenario(browser, baseUrl, viewport, label) {
  const page = await browser.newPage({ viewport });
  const failedRequests = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/workspace/#business`, { waitUntil: "networkidle" });
  await page.fill("input[name='name']", `Sprint 02 Proof ${label}`);
  await page.fill("input[name='industry']", "Hospitality");
  await page.fill("input[name='location']", "Tbilisi, Georgia");
  await page.fill("input[name='website']", "proof.example");
  await page.fill("textarea[name='description']", "A small business with a clear offer and inconsistent demand.");
  await page.fill("textarea[name='productsServices']", "Coffee, brunch, events");
  await page.fill("textarea[name='targetAudience']", "Local customers and visitors");
  await page.fill("textarea[name='currentSituation']", "Good customer feedback, inconsistent weekday flow.");
  await page.fill("textarea[name='goals']", "increase qualified leads");
  await page.fill("textarea[name='challenges']", "customer acquisition is inconsistent");
  await page.locator(".business-intake-form button[type='submit']").click();
  try {
    await page.waitForSelector(".business-result", { timeout: 10000 });
  } catch (error) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(`Business result did not render. Body: ${bodyText.slice(0, 1000)} Console: ${consoleErrors.join(" | ")} PageErrors: ${pageErrors.join(" | ")}`);
  }
  await page.getByRole("button", { name: "Approve offer" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "REQUEST ESSA TO START" }).click();
  await page.waitForTimeout(300);
  const text = await page.locator("body").innerText();
  const screenshotPath = path.join(artifactDir, `${label}_business_flow.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();
  return {
    label,
    viewport,
    pass: text.includes("ESSA BUSINESS") &&
      text.includes("Diagnosis") &&
      text.includes("Growth Plan") &&
      text.includes("Commercial Request") &&
      text.includes("No payment was collected"),
    screenshotPath,
    failedRequests,
    consoleErrors,
    pageErrors
  };
}

async function runReloadProof(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/workspace/#business`, { waitUntil: "networkidle" });
  await page.waitForSelector(".business-card", { timeout: 10000 });
  const text = await page.locator("body").innerText();
  const screenshotPath = path.join(artifactDir, "mobile_returning_user_after_restart.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();
  return {
    pass: text.includes("Sprint 02 Proof") && text.includes("MY BUSINESS"),
    screenshotPath
  };
}

const port = await findPort();
const baseUrl = `http://localhost:${port}`;
let server = startServer(port);
await waitForServer(baseUrl, server);
const authStatus = await fetch(`${baseUrl}/api/business/auth/status`).then((response) => response.json());
const authProbe = await fetch(`${baseUrl}/api/business`, {
  headers: {
    "Content-Type": "application/json",
    "x-essa-user-id": "demo_client_a"
  }
}).then(async (response) => ({ status: response.status, body: await response.json() }));
if (!authProbe.body?.ok) {
  throw new Error(`Business auth probe failed: ${JSON.stringify({ authStatus, authProbe })}`);
}

const browser = await chromium.launch();
const results = [];
try {
  results.push(await runScenario(browser, baseUrl, { width: 1440, height: 900 }, "desktop"));
  results.push(await runScenario(browser, baseUrl, { width: 390, height: 844 }, "mobile"));
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
  server = startServer(port);
  await waitForServer(baseUrl, server);
  const reload = await runReloadProof(browser, baseUrl);
  results.push({ label: "restart_reload", ...reload });
} finally {
  await browser.close();
  if (server.exitCode == null) server.kill();
}

const report = {
  artifactType: "BusinessSprint02UiProof",
  baseUrl,
  storePath,
  results,
  pass: results.every((result) => result.pass && (!result.failedRequests || result.failedRequests.length === 0)),
  providerCalls: 0,
  modelCalls: 0,
  paymentActions: 0,
  externalActions: 0,
  createdAt: new Date().toISOString()
};

const reportPath = path.join(artifactDir, "BusinessSprint02UiProof.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (!report.pass) process.exit(1);
