import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionDemoTypes,
  createGeneratedPreview,
  createPreviewGenerationRequest,
  previewGenerationStatuses
} from "./businessAcquisitionContracts.js";
import {
  evaluatePreviewGenerationSafetyGate,
  runPreviewQc
} from "./previewQc.js";

export const localPreviewGeneratorVersion = "business-acquisition-local-preview-generator-v1";

function stableId(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function safeList(items = []) {
  return items.filter(Boolean).map((item) => String(item));
}

function firstSourceDate(prospect = {}) {
  return prospect.sourceRefs?.[0]?.retrievedAt || "source date unavailable";
}

function businessFacts(prospect = {}, demoPlan = {}) {
  return safeList([
    prospect.legalOrDisplayName ? `Business name observed: ${prospect.legalOrDisplayName}` : null,
    prospect.city || prospect.country ? `Location observed: ${[prospect.city, prospect.region, prospect.country].filter(Boolean).join(", ")}` : null,
    prospect.website ? `Public website observed: ${prospect.website}` : "No public website/domain was present in the checked source record.",
    prospect.publicBusinessEmail ? "Public business email was present in the checked source record." : null,
    prospect.publicBusinessPhone ? "Public business phone was present in the checked source record." : null,
    ...(demoPlan.contentInputs?.observedFacts || [])
  ]);
}

function placeholder(label, reason) {
  return { label, reason, placeholder: true };
}

function contentModelFor(demoType, prospect = {}, demoPlan = {}) {
  const name = prospect.legalOrDisplayName || "Demo Business";
  const facts = businessFacts(prospect, demoPlan);
  const common = {
    headline: `${name} preview concept`,
    factsUsed: facts,
    assumptions: demoPlan.assumptions || [],
    placeholders: [
      placeholder("Demo content", "Production content requires client approval."),
      placeholder("Request availability", "Live availability is not verified."),
      placeholder("Price on request", "Prices are not verified and must not be fabricated.")
    ],
    notice: "This is not the official business website."
  };

  const variants = {
    [acquisitionDemoTypes.serviceLandingPreview]: {
      ...common,
      layout: "service_landing",
      sections: ["Service promise", "Observed public facts", "Request form preview", "Next step"],
      primaryCta: "Request a quote",
      cards: ["Service area", "Inquiry details", "Contact business"]
    },
    [acquisitionDemoTypes.catalogPreviewV2]: {
      ...common,
      layout: "catalog_grid",
      sections: ["Store intro", "Example categories", "Item preview pattern", "Inquiry CTA"],
      primaryCta: "Ask about availability",
      cards: ["Example category", "Example item", "Contact business"]
    },
    [acquisitionDemoTypes.storefrontPreview]: {
      ...common,
      layout: "storefront",
      sections: ["Shop intro", "Category tiles", "Message ordering preview", "Contact path"],
      primaryCta: "Order by message",
      cards: ["Example category", "Example layout", "Request availability"]
    },
    [acquisitionDemoTypes.bookingFlowPreview]: {
      ...common,
      layout: "booking_flow",
      sections: ["Availability request", "Guest details", "Confirmation preview", "Follow-up"],
      primaryCta: "Request availability",
      cards: ["Select dates", "Contact business", "Confirmation pending"]
    },
    [acquisitionDemoTypes.projectPortfolioPreview]: {
      ...common,
      layout: "project_portfolio",
      sections: ["Project categories", "Capability overview", "Case placeholder", "Quote request"],
      primaryCta: "Request a project estimate",
      cards: ["Example project category", "Scope placeholder", "Contact business"]
    },
    [acquisitionDemoTypes.menuOrderPreview]: {
      ...common,
      layout: "menu_order",
      sections: ["Menu sections", "Dish card pattern", "Pickup/order preview", "Contact footer"],
      primaryCta: "Start an order request",
      cards: ["Example menu section", "Demo item", "Contact business"]
    },
    [acquisitionDemoTypes.leadCapturePreview]: {
      ...common,
      layout: "lead_capture",
      sections: ["Offer summary", "Qualification questions", "Contact form preview", "Follow-up promise"],
      primaryCta: "Send request",
      cards: ["Need summary", "Contact details", "Review next step"]
    }
  };
  return variants[demoType] || null;
}

function renderHtml({ prospect, demoPlan, contentModel, previewId }) {
  const facts = contentModel.factsUsed.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("");
  const sections = contentModel.sections.map((section) => `<span>${escapeHtml(section)}</span>`).join("");
  const cards = contentModel.cards.map((card) => `<article><strong>${escapeHtml(card)}</strong><p>Demo placeholder. Replace with verified client-approved information before production.</p></article>`).join("");
  const assumptions = safeList(contentModel.assumptions).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const placeholders = contentModel.placeholders.map((item) => `<li><strong>${escapeHtml(item.label)}</strong>: ${escapeHtml(item.reason)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(contentModel.headline)} - ESSA demo</title>
  <link rel="stylesheet" href="./preview.css">
</head>
<body>
  <header class="demo-bar">
    <strong>ESSA DEMO / CONCEPT</strong>
    <span>Preview status: PREVIEW_READY_FOR_HUMAN_REVIEW</span>
    <span>Generated by ESSA Preview Engine</span>
  </header>
  <main class="preview ${escapeHtml(contentModel.layout)}">
    <section class="hero">
      <p class="eyebrow">Local generated preview</p>
      <h1>${escapeHtml(contentModel.headline)}</h1>
      <p>${escapeHtml(demoPlan.expectedValue || "Bounded preview of ESSA value.")}</p>
      <a class="cta" href="#contact">${escapeHtml(contentModel.primaryCta)}</a>
    </section>
    <section class="notice">
      <strong>This is not the official business website.</strong>
      <span>Source snapshot date: ${escapeHtml(firstSourceDate(prospect))}</span>
      <span>Preview ID: ${escapeHtml(previewId)}</span>
    </section>
    <section class="flow">${sections}</section>
    <section class="cards">${cards}</section>
    <section>
      <h2>Facts Used</h2>
      <ul>${facts}</ul>
    </section>
    <section>
      <h2>Assumptions</h2>
      <ul>${assumptions || "<li>No production assumptions are approved.</li>"}</ul>
    </section>
    <section>
      <h2>Placeholders</h2>
      <ul>${placeholders}</ul>
    </section>
    <section id="contact" class="contact">
      <h2>Next Step</h2>
      <p>Human review is required before any generated preview, outreach, publishing, payment or production handoff.</p>
    </section>
  </main>
</body>
</html>
`;
}

function renderCss() {
  return `:root {
  color-scheme: light;
  --ink: #17201a;
  --muted: #5d665f;
  --line: #d9ded8;
  --paper: #fbfcf8;
  --accent: #1d6f5f;
  --accent-2: #9a4f2f;
  --soft: #edf4ef;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, sans-serif; background: var(--paper); color: var(--ink); }
.demo-bar { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; padding: 12px 18px; background: var(--ink); color: white; font-size: 13px; }
.preview { max-width: 1080px; margin: 0 auto; padding: 28px 18px 48px; }
.hero { padding: 28px 0; border-bottom: 1px solid var(--line); }
.eyebrow { margin: 0 0 8px; color: var(--accent); font-weight: 700; text-transform: uppercase; font-size: 12px; }
h1 { margin: 0 0 12px; font-size: 36px; line-height: 1.1; letter-spacing: 0; }
h2 { margin-top: 28px; font-size: 20px; letter-spacing: 0; }
.cta { display: inline-block; margin-top: 12px; color: white; background: var(--accent); padding: 10px 14px; text-decoration: none; border-radius: 6px; }
.notice { display: grid; gap: 6px; padding: 14px; margin: 18px 0; border: 1px solid var(--line); background: var(--soft); border-radius: 6px; }
.flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
.flow span { border: 1px solid var(--line); padding: 12px; border-radius: 6px; background: white; min-height: 56px; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.cards article { border: 1px solid var(--line); border-top: 4px solid var(--accent-2); padding: 14px; border-radius: 6px; background: white; min-height: 130px; }
li { margin: 6px 0; color: var(--muted); }
.booking_flow .flow span, .menu_order .flow span { border-top: 4px solid var(--accent); }
.project_portfolio .cards article { border-top-color: #325f9d; }
.catalog_grid .cards article, .storefront .cards article { border-top-color: #7b6f22; }
@media (max-width: 760px) {
  h1 { font-size: 28px; }
  .flow, .cards { grid-template-columns: 1fr; }
}
`;
}

function artifactRecord(name, relativePath, format) {
  return {
    artifactName: name,
    relativePath,
    format,
    generated: true,
    productionDeliverable: false,
    publishAllowed: false
  };
}

export function generateLocalPreviewPackage({
  demoPlan = {},
  prospect = {},
  request: requestInput = {},
  outputRoot = "artifacts/business/acquisition-preview"
} = {}) {
  const request = createPreviewGenerationRequest({
    demoPlanId: demoPlan.demoPlanId,
    prospectId: prospect.prospectId,
    demoType: demoPlan.demoType,
    sourceSnapshotRefs: demoPlan.sourceSnapshotRefs,
    evidenceRefs: demoPlan.evidenceRefs,
    brandInputs: demoPlan.brandInputs,
    ...requestInput
  });
  const gate = evaluatePreviewGenerationSafetyGate({ request, prospect, demoPlan });
  if (!gate.generationAllowed) {
    return {
      ok: false,
      status: previewGenerationStatuses.blocked,
      request,
      safetyGate: gate,
      providerCalls: 0,
      externalCalls: 0
    };
  }

  const previewId = `preview_${stableId({
    demoPlanId: demoPlan.demoPlanId,
    prospectId: prospect.prospectId,
    demoType: demoPlan.demoType,
    idempotencyKey: request.idempotencyKey || "default",
    version: requestInput.version || "1.0.0"
  })}`;
  const packageDir = path.join(outputRoot, previewId);
  const contentModel = contentModelFor(demoPlan.demoType, prospect, demoPlan);
  const html = renderHtml({ prospect, demoPlan, contentModel, previewId });
  const css = renderCss();
  const relativeBase = path.posix.join(outputRoot.replaceAll("\\", "/"), previewId);
  const artifacts = {
    "preview.json": path.posix.join(relativeBase, "preview.json"),
    "index.html": path.posix.join(relativeBase, "index.html"),
    "preview.css": path.posix.join(relativeBase, "preview.css"),
    "audit.json": path.posix.join(relativeBase, "audit.json"),
    "content-spec.json": path.posix.join(relativeBase, "content-spec.json"),
    "navigation-flow.json": path.posix.join(relativeBase, "navigation-flow.json")
  };
  const generatedPreview = createGeneratedPreview({
    previewId,
    demoPlanId: demoPlan.demoPlanId,
    prospectId: prospect.prospectId,
    demoType: demoPlan.demoType,
    version: requestInput.version || "1.0.0",
    sourceSnapshotRefs: request.sourceSnapshotRefs,
    evidenceRefs: request.evidenceRefs,
    generatedArtifacts: [
      artifactRecord("preview.json", artifacts["preview.json"], "json"),
      artifactRecord("index.html", artifacts["index.html"], "html"),
      artifactRecord("preview.css", artifacts["preview.css"], "css"),
      artifactRecord("audit.json", artifacts["audit.json"], "json"),
      artifactRecord("content-spec.json", artifacts["content-spec.json"], "json"),
      artifactRecord("navigation-flow.json", artifacts["navigation-flow.json"], "json")
    ],
    contentModel,
    layoutModel: { layout: contentModel.layout, sections: contentModel.sections },
    ctaModel: { primaryCta: contentModel.primaryCta, liveSubmissionEnabled: false },
    brandModel: {
      displayName: prospect.legalOrDisplayName || "Neutral demo identity",
      logoInvented: false,
      sloganInvented: false,
      officialClaim: false
    },
    assumptions: demoPlan.assumptions || [],
    missingInputs: demoPlan.missingInputs || [],
    placeholdersUsed: contentModel.placeholders,
    blockedClaims: gate.blockedClaims,
    generatorVersion: localPreviewGeneratorVersion,
    expiresAt: requestInput.expiresAt || null
  });
  const qc = runPreviewQc({ request, prospect, demoPlan, generatedPreview, artifacts, html });
  const finalPreview = { ...generatedPreview, qcStatus: qc.status, auditRef: artifacts["audit.json"] };
  const audit = {
    artifactType: "BusinessAcquisitionGeneratedPreviewAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_C",
    status: qc.status === "BLOCKED" ? "PREVIEW_QC_BLOCKED" : previewGenerationStatuses.readyForHumanReview,
    prospectId: prospect.prospectId,
    demoPlanId: demoPlan.demoPlanId,
    previewId,
    generationRequestId: request.generationRequestId,
    sourceSnapshotRefs: request.sourceSnapshotRefs,
    evidenceRefs: request.evidenceRefs,
    artifactPaths: artifacts,
    contentFactsUsed: contentModel.factsUsed,
    assumptionsUsed: finalPreview.assumptions,
    placeholdersUsed: finalPreview.placeholdersUsed,
    qc,
    warnings: [...gate.warnings, ...qc.warnings],
    blockedClaims: [...new Set([...gate.blockedClaims, ...qc.blockedClaims])],
    generatorVersion: localPreviewGeneratorVersion,
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    outreachActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };

  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, "preview.json"), JSON.stringify(finalPreview, null, 2));
  fs.writeFileSync(path.join(packageDir, "index.html"), html);
  fs.writeFileSync(path.join(packageDir, "preview.css"), css);
  fs.writeFileSync(path.join(packageDir, "audit.json"), JSON.stringify(audit, null, 2));
  fs.writeFileSync(path.join(packageDir, "content-spec.json"), JSON.stringify(contentModel, null, 2));
  fs.writeFileSync(path.join(packageDir, "navigation-flow.json"), JSON.stringify({
    demoType: demoPlan.demoType,
    steps: contentModel.sections,
    cta: contentModel.primaryCta,
    liveActionsEnabled: false
  }, null, 2));

  return {
    ok: qc.status !== "BLOCKED",
    status: qc.status === "BLOCKED" ? "PREVIEW_QC_BLOCKED" : previewGenerationStatuses.readyForHumanReview,
    request,
    generatedPreview: finalPreview,
    qc,
    audit,
    packageDir: packageDir.replaceAll("\\", "/"),
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    outreachActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}
