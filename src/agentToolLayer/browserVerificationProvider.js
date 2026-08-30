import fs from "fs";
import path from "path";
import { executionGateDecisions } from "./executionGateway.js";

export const browserVisionCapabilities = {
  open: "browser_open",
  observe: "browser_observe",
  capture: "browser_capture",
  inspect: "browser_inspect",
  verify: "browser_verify"
};

export const browserObservationStatuses = {
  pass: "PASS",
  passWithWarnings: "PASS_WITH_WARNINGS",
  fail: "FAIL",
  blocked: "BLOCKED",
  installationRequired: "PLAYWRIGHT_INSTALLATION_REQUIRED"
};

export const browserForbiddenActions = [
  "click",
  "type",
  "submit",
  "login",
  "upload",
  "download",
  "form_mutation",
  "localStorage",
  "sessionStorage",
  "cookie",
  "external_navigation",
  "publish",
  "deploy",
  "payment",
  "destructive"
];

const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedPath = "/workspace/";
const allowedHashes = ["", "#navigator", "#product-discovery"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueText(items = [], limit = 12) {
  const seen = new Set();
  const output = [];

  for (const item of safeArray(items)) {
    const text = cleanText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text.slice(0, 300));
    if (output.length >= limit) break;
  }

  return output;
}

function requestText(input = {}) {
  return `${input.url || ""} ${input.target || ""} ${input.operation || ""} ${input.action || ""}`;
}

function normalizeAction(input = {}) {
  return String(`${input.action || ""} ${input.operation || ""} ${input.capability || ""}`).toLowerCase();
}

export function validateBrowserObservationInput(input = {}) {
  const errors = [];
  const urlText = input.url || input.target || "";
  let parsed = null;

  try {
    parsed = new URL(urlText);
  } catch {
    errors.push("invalid_url");
  }

  if (parsed) {
    if (!allowedOrigins.includes(parsed.origin)) errors.push("external_url_blocked");
    if (parsed.pathname !== allowedPath) errors.push("route_not_allowed");
    if (!allowedHashes.includes(parsed.hash)) errors.push("hash_route_not_allowed");
  }

  const actionText = normalizeAction(input);
  for (const forbidden of browserForbiddenActions) {
    if (actionText.includes(forbidden.toLowerCase())) {
      errors.push(`forbidden_${forbidden.toLowerCase()}_request`);
    }
  }

  if (input.readStorage || input.cookies || input.localStorage || input.sessionStorage || input.extractSecrets) {
    errors.push("secret_or_storage_inspection_blocked");
  }

  return {
    ok: errors.length === 0,
    errors,
    target: parsed ? parsed.toString() : urlText,
    origin: parsed?.origin || null,
    readOnly: true,
    localOnly: true,
    allowedOrigins: [...allowedOrigins]
  };
}

export function createBrowserObservationArtifact({
  target,
  finalUrl = null,
  title = null,
  timestamp = nowIso(),
  viewport = null,
  layoutEvidence = null,
  domStatus = null,
  visibleSections = [],
  visibleNavigation = [],
  visibleTextSummary = [],
  consoleErrors = [],
  pageErrors = [],
  failedRequests = [],
  screenshotRef = null,
  interactionCount = 0,
  mutationCount = 0,
  providerProvenance = {},
  verificationStatus = null,
  projectId = null,
  taskId = null,
  traceId = null
} = {}) {
  return {
    artifactId: createId("browser_observation"),
    type: "browser_observation",
    target,
    finalUrl,
    title,
    timestamp,
    viewport,
    layoutEvidence,
    domStatus,
    visibleSections: safeArray(visibleSections),
    visibleNavigation: safeArray(visibleNavigation),
    visibleTextSummary: safeArray(visibleTextSummary),
    consoleErrors: safeArray(consoleErrors),
    pageErrors: safeArray(pageErrors),
    failedRequests: safeArray(failedRequests),
    screenshotRef,
    interactionCount,
    mutationCount,
    readOnly: true,
    localOnly: true,
    providerProvenance,
    verificationStatus,
    projectId,
    taskId,
    traceId
  };
}

export function verifyBrowserObservationArtifact(artifact = {}) {
  const final = artifact.finalUrl ? new URL(artifact.finalUrl) : null;
  const checks = {
    pageLoaded: artifact.domStatus === "loaded" || artifact.domStatus === "domcontentloaded",
    remainedOnLocalhost: Boolean(final && allowedOrigins.includes(final.origin)),
    workspaceRootExists: safeArray(artifact.visibleSections).some((item) => /workspace/i.test(String(item))),
    navigatorSurfaceExists: safeArray(artifact.visibleSections).some((item) => /navigator/i.test(String(item))) ||
      safeArray(artifact.visibleNavigation).some((item) => /navigator/i.test(String(item))) ||
      safeArray(artifact.visibleTextSummary).some((item) => /navigator/i.test(String(item))),
    mainUiNotBlank: safeArray(artifact.visibleTextSummary).join(" ").trim().length > 20,
    noFatalPageError: safeArray(artifact.pageErrors).length === 0,
    screenshotExists: Boolean(artifact.screenshotRef && fs.existsSync(artifact.screenshotRef)),
    noInteraction: artifact.interactionCount === 0,
    noMutation: artifact.mutationCount === 0
  };
  const hardFail = !checks.pageLoaded ||
    !checks.remainedOnLocalhost ||
    !checks.mainUiNotBlank ||
    !checks.noFatalPageError ||
    !checks.screenshotExists ||
    !checks.noInteraction ||
    !checks.noMutation;
  const warnings = [];

  if (!checks.workspaceRootExists) warnings.push("workspace_root_not_confirmed");
  if (!checks.navigatorSurfaceExists) warnings.push("navigator_surface_not_confirmed");
  if (safeArray(artifact.consoleErrors).length) warnings.push("console_errors_present");
  if (safeArray(artifact.failedRequests).length) warnings.push("failed_requests_present");

  return {
    status: hardFail
      ? browserObservationStatuses.fail
      : warnings.length
        ? browserObservationStatuses.passWithWarnings
        : browserObservationStatuses.pass,
    checks,
    warnings,
    visualReview: "VISUAL_REVIEW_REQUIRED"
  };
}

export function createBrowserObservationContext({
  artifact,
  maxTextItems = 8,
  findings = [],
  repairProposals = []
} = {}) {
  const verification = verifyBrowserObservationArtifact(artifact);
  const textItems = safeArray(artifact.visibleTextSummary).slice(0, maxTextItems);
  const observationFindings = [
    ...safeArray(artifact.pageErrors).map((error) => ({ type: "page_error", message: String(error).slice(0, 300) })),
    ...safeArray(artifact.consoleErrors).map((error) => ({ type: "console_error", message: String(error).slice(0, 300) })),
    ...safeArray(artifact.failedRequests).map((request) => ({ type: "failed_request", message: String(request).slice(0, 300) }))
  ];

  return {
    status: verification.status,
    target: artifact.target,
    finalUrl: artifact.finalUrl,
    visibleSections: safeArray(artifact.visibleSections).slice(0, 12),
    visibleNavigation: safeArray(artifact.visibleNavigation).slice(0, 12),
    visibleTextSummary: textItems,
    verification,
    screenshotRef: artifact.screenshotRef,
    uiFindings: [
      ...observationFindings,
      ...safeArray(findings)
    ],
    repairProposals: safeArray(repairProposals).map((proposal) => ({
      proposalId: proposal.proposalId,
      findingId: proposal.findingId,
      proposedAction: proposal.proposedAction,
      likelyFiles: safeArray(proposal.likelyFiles),
      likelyLayer: proposal.likelyLayer,
      changeClass: proposal.changeClass,
      riskLevel: proposal.riskLevel,
      requiresCodeChange: Boolean(proposal.requiresCodeChange),
      requiresBrowserMutation: Boolean(proposal.requiresBrowserMutation),
      requiresExternalProvider: Boolean(proposal.requiresExternalProvider),
      verificationPlan: safeArray(proposal.verificationPlan),
      approvalRequired: proposal.approvalRequired !== false,
      status: proposal.status
    })),
    interactionCount: artifact.interactionCount,
    mutationCount: artifact.mutationCount,
    boundedChars: JSON.stringify(textItems).length +
      JSON.stringify(observationFindings).length +
      JSON.stringify(findings).length +
      JSON.stringify(repairProposals).length,
    policy: {
      fullDomExcludedFromModelContext: true,
      providerIndependent: true,
      browserMayRepair: false
    }
  };
}

export function createBrowserAuditReport(context = {}) {
  return {
    status: context.status,
    target: context.target,
    finalUrl: context.finalUrl,
    visibleSections: context.visibleSections,
    visibleNavigation: context.visibleNavigation,
    screenshotRef: context.screenshotRef,
    verificationStatus: context.verification?.status || null,
    warnings: context.verification?.warnings || [],
    uiFindings: context.uiFindings,
    interactionCount: context.interactionCount,
    mutationCount: context.mutationCount,
    boundedChars: context.boundedChars
  };
}

export function createFutureBrowserRepairContract() {
  return {
    executable: false,
    loop: ["OBSERVE", "UIFinding", "RepairProposal", "approval/policy", "coding agent", "local change", "reload", "REOBSERVE", "VERIFY"],
    restrictions: {
      browserRepairsCode: false,
      humanApprovalRequiredBeforeMutation: true,
      playwrightProviderMaySelfApprove: false
    }
  };
}

export async function auditPlaywrightAvailability() {
  let modulePath = null;
  let playwrightAvailable = false;
  let executablePath = null;
  let executableExists = false;
  let browserName = null;
  let pathResolutionError = null;

  try {
    modulePath = await import.meta.resolve?.("playwright");
    playwrightAvailable = Boolean(modulePath);
  } catch {
    playwrightAvailable = false;
  }

  const browserCache = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  let browserRuntimeExists = false;
  let browserRuntimeAuditError = null;

  if (playwrightAvailable) {
    try {
      const playwright = await import("playwright");
      browserName = playwright.chromium?.name?.() || "chromium";
      executablePath = playwright.chromium?.executablePath?.() || null;
      executableExists = Boolean(executablePath && fs.existsSync(executablePath));
    } catch (error) {
      pathResolutionError = error.message || String(error);
    }
  }

  try {
    browserRuntimeExists = executableExists || Boolean(browserCache && fs.existsSync(browserCache) &&
      fs.readdirSync(browserCache).some((entry) => /chromium|chrome|firefox|webkit/i.test(entry)));
  } catch (error) {
    browserRuntimeAuditError = error.message || String(error);
    browserRuntimeExists = executableExists;
  }

  return {
    playwrightAvailable,
    modulePath,
    browserName,
    executablePath,
    executableExists,
    browserRuntimeExists,
    browserCache,
    pathResolutionError,
    browserRuntimeAuditError,
    installationRequired: !playwrightAvailable || !browserRuntimeExists,
    proposedInstallCommand: "npm install -D playwright",
    proposedBrowserInstallCommand: "npx playwright install chromium",
    diskImplication: "Chromium browser binaries are typically hundreds of MB locally."
  };
}

export function createPlaywrightBrowserVerificationProvider({
  browserEngine = "chromium",
  timeoutMs = 15000,
  artifactDir = "artifacts/agentToolLayer/browser/phase20n"
} = {}) {
  return {
    providerId: "playwright_browser_verification",
    capabilities: Object.values(browserVisionCapabilities),
    readOnly: true,
    localOnly: true,
    browserEngine,
    executable: false,
    approvalRequirement: "explicit_execution_gateway_ready",
    networkPolicy: "localhost_only",
    allowedOrigins: [...allowedOrigins],
    timeoutMs,
    artifactPolicy: {
      screenshotDir: artifactDir,
      fullDomCapture: false,
      secretsStorageCookiesHeaders: false
    },
    async observe({ executionIntent, gateResult } = {}) {
      if (gateResult?.decision !== executionGateDecisions.ready) {
        return {
          ok: false,
          status: browserObservationStatuses.blocked,
          reason: "execution_gate_not_ready",
          providerCallMade: false
        };
      }

      const input = gateResult.safeInput || executionIntent?.normalizedInput || {};
      const validation = validateBrowserObservationInput(input);
      if (!validation.ok) {
        return {
          ok: false,
          status: browserObservationStatuses.blocked,
          reason: validation.errors[0],
          validation,
          providerCallMade: false
        };
      }

      if (!/browser_observe|inspect_local_page|local_dev_server/i.test(requestText(input))) {
        return {
          ok: false,
          status: browserObservationStatuses.blocked,
          reason: "unsupported_browser_observation_request",
          providerCallMade: false
        };
      }

      fs.mkdirSync(artifactDir, { recursive: true });
      const availability = await auditPlaywrightAvailability();
      if (availability.installationRequired) {
        return {
          ok: false,
          status: browserObservationStatuses.installationRequired,
          availability,
          providerCallMade: false
        };
      }

      let playwright = null;
      let browser = null;
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      const startedAt = nowIso();

      try {
        playwright = await import("playwright");
        const engine = playwright[browserEngine];
        if (!engine?.launch) {
          throw new Error(`Unsupported Playwright browser engine: ${browserEngine}`);
        }

        const requestedViewport = input.viewport && Number.isFinite(Number(input.viewport.width)) && Number.isFinite(Number(input.viewport.height))
          ? { width: Number(input.viewport.width), height: Number(input.viewport.height) }
          : { width: 1365, height: 768 };
        const screenshotFileName = String(input.screenshotName || "workspace_navigator_readonly.png")
          .replace(/[^a-z0-9_.-]+/gi, "_")
          .replace(/^_+|_+$/g, "") || "workspace_navigator_readonly.png";

        browser = await engine.launch({ headless: true });
        const page = await browser.newPage({ viewport: requestedViewport });

        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) {
            consoleErrors.push(`${message.type()}: ${message.text()}`);
          }
        });
        page.on("pageerror", (error) => {
          pageErrors.push(error.message || String(error));
        });
        page.on("requestfailed", (request) => {
          const failure = request.failure();
          failedRequests.push(`${request.url()} :: ${failure?.errorText || "request_failed"}`);
        });

        const response = await page.goto(validation.target, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs
        });
        await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 5000) }).catch(() => {});

        const screenshotPath = path.join(artifactDir, screenshotFileName);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const title = await page.title();
        const finalUrl = page.url();
        const bodyText = cleanText(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
        const sectionTexts = uniqueText(await page.locator("main, section, header, nav, aside, [role='main'], [role='navigation'], .workspace-shell, .workspace-main, .navigator").allTextContents().catch(() => []));
        const navigationTexts = uniqueText(await page.locator("nav, [role='navigation'], a, button").allTextContents().catch(() => []), 16);
        const visibleTextSummary = uniqueText([
          bodyText.slice(0, 500),
          ...sectionTexts,
          ...navigationTexts
        ], 10);
        const layoutEvidence = await page.evaluate(() => {
          const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
          };
          const documentMetrics = {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            bodyScrollWidth: document.body?.scrollWidth || 0
          };
          const criticalSelectors = [
            { key: "workspaceShell", selector: ".workspace-shell" },
            { key: "workspaceNavigation", selector: ".sidebar" },
            { key: "navigationList", selector: ".nav-list" },
            { key: "mainPanel", selector: ".main-panel" },
            { key: "workspaceTitle", selector: "#workspace-title" },
            { key: "navigatorChatHistory", selector: ".chat-panel[aria-label='История диалога с ESSA Navigator']" },
            { key: "navigatorPrompt", selector: ".prompt-bar" },
            { key: "productionStudioPanel", selector: "#production-studio-panel" },
            { key: "metricsPanel", selector: ".metrics-panel" }
          ];
          const normalizedCriticalSelectors = criticalSelectors.map((item) =>
            item.key === "navigatorChatHistory"
              ? { ...item, selector: ".chat-panel" }
              : item
          );
          const rectFor = (element) => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              display: style.display,
              visibility: style.visibility,
              overflowX: style.overflowX,
              overflowY: style.overflowY,
              hidden: element.hidden === true,
              ariaLabel: element.getAttribute("aria-label"),
              text: String(element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160)
            };
          };
          const regionEntries = normalizedCriticalSelectors.map((item) => {
            const element = document.querySelector(item.selector);
            const rect = rectFor(element);
            return {
              element,
              region: {
                ...item,
                exists: Boolean(element),
                visible: Boolean(rect && rect.display !== "none" && rect.visibility !== "hidden" && rect.hidden !== true && rect.width > 0 && rect.height > 0),
                rect,
                zeroSize: Boolean(rect && (rect.width === 0 || rect.height === 0)),
                outsideViewport: Boolean(rect && (rect.right > viewport.width || rect.x < 0 || rect.bottom < 0 || rect.y > viewport.height))
              }
            };
          });
          const visibleRegions = regionEntries.filter((entry) => entry.region.visible && entry.region.rect && entry.element);
          const overlaps = [];
          const clippedTextElements = Array.from(document.querySelectorAll([
            ".nav-list a",
            ".nav-list button",
            ".nav-item",
            ".prompt-bar button",
            ".prompt-bar input",
            ".prompt-bar textarea",
            "#workspace-title"
          ].join(","))).map((element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const text = String(element.textContent || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "")
              .replace(/\s+/g, " ")
              .trim();
            const partiallyVisibleHorizontally = rect.x < viewport.width && rect.right > 0;
            const horizontallyClipped = (partiallyVisibleHorizontally && (rect.x < 0 || rect.right > viewport.width)) ||
              element.scrollWidth > element.clientWidth + 1;
            const verticallyClipped = element.scrollHeight > element.clientHeight + 4;
            return {
              tagName: element.tagName.toLowerCase(),
              className: String(element.className || "").slice(0, 120),
              text: text.slice(0, 120),
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                right: Math.round(rect.right),
                bottom: Math.round(rect.bottom)
              },
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              clientHeight: element.clientHeight,
              scrollHeight: element.scrollHeight,
              display: style.display,
              visibility: style.visibility,
              horizontallyClipped,
              verticallyClipped
            };
          }).filter((item) =>
            item.text &&
            item.display !== "none" &&
            item.visibility !== "hidden" &&
            (item.horizontallyClipped || item.verticallyClipped)
          );

          for (let i = 0; i < visibleRegions.length; i += 1) {
            for (let j = i + 1; j < visibleRegions.length; j += 1) {
              const aEntry = visibleRegions[i];
              const bEntry = visibleRegions[j];
              if (aEntry.element.contains(bEntry.element) || bEntry.element.contains(aEntry.element)) {
                continue;
              }
              const a = aEntry.region;
              const b = bEntry.region;
              const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
              const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
              const area = xOverlap * yOverlap;
              const smaller = Math.max(1, Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height));
              if (area > 0 && area / smaller > 0.25) {
                overlaps.push({
                  a: a.key,
                  b: b.key,
                  overlapArea: Math.round(area),
                  smallerAreaRatio: Number((area / smaller).toFixed(2))
                });
              }
            }
          }

          return {
            viewport,
            documentMetrics,
            horizontalOverflow: documentMetrics.scrollWidth > viewport.width,
            horizontalOverflowPixels: Math.max(0, documentMetrics.scrollWidth - viewport.width),
            criticalRegions: regionEntries.map((entry) => entry.region),
            geometryOverlaps: overlaps,
            clippedTextElements,
            visibleTextLength: String(document.body?.innerText || "").trim().length
          };
        });

        const artifact = createBrowserObservationArtifact({
          target: validation.target,
          finalUrl,
          title,
          timestamp: startedAt,
          viewport: page.viewportSize(),
          layoutEvidence,
          domStatus: response ? "domcontentloaded" : "loaded",
          visibleSections: sectionTexts,
          visibleNavigation: navigationTexts,
          visibleTextSummary,
          consoleErrors,
          pageErrors,
          failedRequests,
          screenshotRef: screenshotPath,
          interactionCount: 0,
          mutationCount: 0,
          providerProvenance: {
            providerId: "playwright_browser_verification",
            browserEngine,
            playwrightModule: availability.modulePath,
            providerSelfVerified: false,
            executionGateDecision: gateResult.decision,
            localOnly: true,
            readOnly: true
          },
          projectId: executionIntent?.projectId || null,
          taskId: executionIntent?.taskId || null,
          traceId: executionIntent?.traceId || null
        });
        const verification = verifyBrowserObservationArtifact(artifact);
        artifact.verificationStatus = verification.status;
        const context = createBrowserObservationContext({ artifact });
        const report = createBrowserAuditReport(context);
        const artifactPath = path.join(artifactDir, "browser_observation_artifact.json");
        const contextPath = path.join(artifactDir, "browser_observation_context.json");
        const reportPath = path.join(artifactDir, "browser_observation_report.json");

        writeJson(artifactPath, artifact);
        writeJson(contextPath, context);
        writeJson(reportPath, report);

        return {
          ok: verification.status !== browserObservationStatuses.fail,
          status: verification.status,
          artifact,
          context,
          report,
          verification,
          paths: {
            screenshotPath,
            artifactPath,
            contextPath,
            reportPath
          },
          providerCallMade: true
        };
      } catch (error) {
        return {
          ok: false,
          status: browserObservationStatuses.fail,
          reason: error.message || String(error),
          consoleErrors,
          pageErrors,
          failedRequests,
          providerCallMade: true
        };
      } finally {
        if (browser) {
          await browser.close().catch(() => {});
        }
      }
    }
  };
}
