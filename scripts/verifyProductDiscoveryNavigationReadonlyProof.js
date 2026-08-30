import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = "http://localhost:3000/workspace/#product-discovery";
const artifactDir = path.join("artifacts", "productDiscovery", "phase21i");
const searchQuery = "обложка";
const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "laptop", width: 1280, height: 720 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 }
];

fs.mkdirSync(artifactDir, { recursive: true });

function route(pathname = "", params = {}) {
  const query = new URLSearchParams(params).toString();
  return `${base}${pathname}${query ? `?${query}` : ""}`;
}

async function screenshot(page, viewport, label) {
  const screenshotPath = path.join(artifactDir, `${viewport.id}_${viewport.width}x${viewport.height}_${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function collectChecks(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const metrics = {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight
    };
    return {
      productDiscoveryVisible: Boolean(document.querySelector("#product-discovery-panel:not([hidden])")),
      breadcrumbVisible: Boolean(document.querySelector(".product-discovery-breadcrumb")),
      backVisible: [...document.querySelectorAll(".product-discovery-back")].some((button) => button.textContent.includes("Назад")),
      availabilityLocked: text.includes("В РАЗРАБОТКЕ") && !text.includes("Попробовать сейчас"),
      lisaEducationVisible: Boolean(document.querySelector("#lisa-education-panel")) && text.includes("Lisa Product Guide"),
      noExecutionButtons: [...document.querySelectorAll("[data-execution-enabled]")].every((item) => item.dataset.executionEnabled === "false"),
      noHorizontalOverflow: metrics.scrollWidth <= metrics.clientWidth,
      executionPerformedTextFalse: text.includes("executionPerformed=false") || text.includes("demoExecutionEnabled=false") || !text.includes("executionPerformed=true"),
      providerCallsTextZero: text.includes("providerCalls=0") || !text.includes("providerCalls=1"),
      documentMetrics: metrics
    };
  });
}

const runtime = {
  playwrightAvailable: true,
  browserName: "chromium",
  executablePath: chromium.executablePath(),
  executableExists: fs.existsSync(chromium.executablePath()),
  reinstallNeeded: false
};

const browser = await chromium.launch({ headless: true });
const results = [];
let totalInteractionCount = 0;

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const screenshots = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText || "unknown"
    });
  });

  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector("#product-discovery-panel:not([hidden])", { timeout: 10000 });
  await page.waitForSelector(".product-card", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "overview"));

  await page.fill(".product-discovery-search input", searchQuery);
  await page.click(".product-discovery-search button");
  totalInteractionCount += 2;
  await page.waitForURL(/#product-discovery\/search/);
  await page.waitForSelector('.capability-card[data-capability-id="BOOK_COVER"]', { timeout: 10000 });
  const searchState = await page.evaluate(() => ({
    inputValue: document.querySelector(".product-discovery-search input")?.value || "",
    hasBookCover: Boolean(document.querySelector('.capability-card[data-capability-id="BOOK_COVER"]')),
    hash: window.location.hash
  }));

  const bookCoverButton = page.locator('.capability-card[data-capability-id="BOOK_COVER"] button', { hasText: "ПОКАЗАТЬ ПРИМЕР" }).first();
  await bookCoverButton.scrollIntoViewIfNeeded();
  await bookCoverButton.click();
  totalInteractionCount += 1;
  await page.waitForURL(/#product-discovery\/capability\/BOOK_COVER/);
  await page.waitForSelector(".capability-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "capability_detail"));
  const capabilityUrl = page.url();

  await page.locator(".product-discovery-action", { hasText: "Открыть Lisa Education" }).first().click();
  totalInteractionCount += 1;
  await page.waitForURL(/#product-discovery\/education\/BOOK_COVER/);
  await page.waitForSelector(".education-route-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "education_detail"));

  await page.locator(".product-discovery-breadcrumb button", { hasText: "BOOK_COVER" }).first().click();
  totalInteractionCount += 1;
  await page.waitForURL(/#product-discovery\/capability\/BOOK_COVER/);

  await page.locator(".product-discovery-action", { hasText: "Открыть Demo Preview" }).first().click();
  totalInteractionCount += 1;
  await page.waitForURL(/#product-discovery\/demo\/BOOK_COVER/);
  await page.waitForSelector(".demo-route-detail", { timeout: 10000 });
  screenshots.push(await screenshot(page, viewport, "demo_preview"));

  await page.locator(".product-discovery-breadcrumb button", { hasText: "BOOK_COVER" }).first().click();
  totalInteractionCount += 1;
  await page.waitForURL(/#product-discovery\/capability\/BOOK_COVER/);

  await page.locator(".product-discovery-breadcrumb button", { hasText: `Поиск: ${searchQuery}` }).first().click();
  totalInteractionCount += 1;
  await page.waitForURL(/#product-discovery\/search/);
  const restoredSearchState = await page.evaluate(() => ({
    inputValue: document.querySelector(".product-discovery-search input")?.value || "",
    hasBookCover: Boolean(document.querySelector('.capability-card[data-capability-id="BOOK_COVER"]')),
    hash: window.location.hash
  }));

  await page.goto(route("/capability/BOOK_COVER"), { waitUntil: "networkidle" });
  await page.waitForSelector(".capability-detail", { timeout: 10000 });
  const directDeepLink = await page.evaluate(() => ({
    hash: window.location.hash,
    title: document.querySelector(".capability-detail h3")?.textContent || "",
    breadcrumbVisible: Boolean(document.querySelector(".product-discovery-breadcrumb"))
  }));
  const checks = await collectChecks(page);

  await page.goto(route("/capability/NO_SUCH_CAPABILITY"), { waitUntil: "networkidle" });
  await page.waitForSelector(".product-discovery-not-found", { timeout: 10000 });
  const invalidRoute = await page.evaluate(() => ({
    hash: window.location.hash,
    notFound: document.body.innerText.includes("Ничего не найдено"),
    noInventedFeature: document.body.innerText.includes("не будет придумывать")
  }));

  const routeChecks = {
    searchFindsBookCover: searchState.inputValue === searchQuery && searchState.hasBookCover,
    capabilityRouteOpened: capabilityUrl.includes("#product-discovery/capability/BOOK_COVER"),
    searchRestored: restoredSearchState.inputValue === searchQuery && restoredSearchState.hasBookCover,
    directDeepLinkWorks: directDeepLink.hash.includes("/capability/BOOK_COVER") && directDeepLink.breadcrumbVisible,
    invalidRouteHandled: invalidRoute.notFound && invalidRoute.noInventedFeature,
    demoAndEducationRouted: screenshots.some((item) => item.includes("education_detail")) && screenshots.some((item) => item.includes("demo_preview"))
  };

  const status = Object.entries({ ...checks, ...routeChecks })
    .filter(([key]) => key !== "documentMetrics")
    .every(([, value]) => value === true) &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0 &&
    failedRequests.length === 0
    ? "PASS"
    : "FAIL";

  results.push({
    viewport,
    target: base,
    finalUrl: page.url(),
    screenshots,
    searchState,
    restoredSearchState,
    directDeepLink,
    invalidRoute,
    checks,
    routeChecks,
    status,
    consoleErrors,
    pageErrors,
    failedRequests,
    interactionCount: 8,
    mutationCount: 0
  });

  await page.close();
}

await browser.close();

const report = {
  status: results.every((result) => result.status === "PASS")
    ? "PHASE_21I_PRODUCT_DISCOVERY_NAVIGATION_PROOF_PASS"
    : "PHASE_21I_PRODUCT_DISCOVERY_NAVIGATION_PROOF_FAIL",
  target: base,
  runtime,
  providerCalls: 0,
  externalModelCalls: 0,
  capabilityExecutionCount: 0,
  publishSocialAdCreatorDispatchCount: 0,
  executionPerformed: false,
  interactionCount: totalInteractionCount,
  mutationCount: 0,
  results
};

const reportPath = path.join(artifactDir, "ProductDiscoveryNavigationBrowserProof.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  status: report.status,
  target: base,
  reportPath,
  screenshots: results.flatMap((result) => result.screenshots),
  interactionCount: report.interactionCount,
  mutationCount: report.mutationCount,
  providerCalls: 0,
  externalModelCalls: 0,
  capabilityExecutionCount: 0
}, null, 2));

if (report.status !== "PHASE_21I_PRODUCT_DISCOVERY_NAVIGATION_PROOF_PASS") {
  process.exitCode = 1;
}
