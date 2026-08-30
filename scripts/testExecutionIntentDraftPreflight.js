import {
  buildExecutionPreflightViewModel,
  createExecutionIntentAuditArtifact,
  createExecutionIntentDraft,
  executionIntentClasses,
  executionIntentDraftStatuses,
  inputReadinessStatuses,
  phase21KHardGuards,
  preflightExecutionIntentDraft,
  providerActivationStatuses,
  productIds
} from "../src/capabilities/index.js";
import { createLeadSourceReplacementProbe } from "../src/leadIntelligence/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function draftFor(primaryCapabilityId, overrides = {}, options = {}) {
  return createExecutionIntentDraft({
    requestId: `${primaryCapabilityId}_request`,
    traceId: `${primaryCapabilityId}_trace`,
    userNeed: overrides.userNeed || `Need ${primaryCapabilityId}`,
    productId: overrides.productId,
    primaryCapabilityId,
    ...overrides
  }, {
    createdAt: "2026-08-20T00:00:00.000Z",
    ...options
  });
}

const book = draftFor("BOOK_COVER", {
  productId: productIds.publishing,
  userNeed: "Сделай обложку для моей книги"
});
check(
  book.primaryCapabilityId === "BOOK_COVER" &&
    book.requiredCapabilityIds.includes("IMAGE_GENERATE") &&
    book.executionEnabled === false &&
    book.providerCalls === 0,
  "A BOOK_COVER creates provider-independent ExecutionIntentDraft",
  book
);

const website = draftFor("WEBSITE_GENERATE", {
  productId: productIds.developer,
  userNeed: "Сделай сайт для ресторана"
}, {
  providedInputs: {
    business_description: "Restaurant in Batumi",
    site_goal: "Bookings",
    pages: "Home, menu, booking"
  }
});
check(
  website.primaryCapabilityId === "WEBSITE_GENERATE" &&
    website.requiredCapabilityIds.includes("UI_VERIFY") &&
    website.futureToolRequirements.includes("browser_verification"),
  "B WEBSITE_GENERATE carries website dependencies and future tool requirements",
  website.futureToolRequirements
);

const video = draftFor("VIDEO_EDIT", {
  productId: productIds.production,
  userNeed: "Сделай ролик"
}, {
  providedInputs: {
    source_video: "local.mp4",
    video_goal: "Promo",
    target_format: "Reels"
  }
});
check(
  video.primaryCapabilityId === "VIDEO_EDIT" &&
    video.expectedArtifacts.includes("RenderArtifact") &&
    video.verificationPlan.some((item) => item.includes("ffprobe")),
  "C VIDEO_EDIT carries media artifacts and verification plan",
  { artifacts: video.expectedArtifacts, verification: video.verificationPlan }
);

const vocal = draftFor("VOCAL_REPLACE", {
  productId: productIds.musicFactory,
  userNeed: "Перепой песню моим голосом"
});
check(
  vocal.primaryCapabilityId === "VOCAL_REPLACE" &&
    vocal.executionClass === executionIntentClasses.destructiveOrHighImpact &&
    vocal.approvals.some((item) => item.type === "LEGAL_OR_POLICY_REVIEW"),
  "D VOCAL_REPLACE is high-impact and rights-gated",
  { executionClass: vocal.executionClass, approvals: vocal.approvals }
);

const lead = draftFor("BUSINESS_DISCOVERY", {
  productId: productIds.business,
  userNeed: "Найди рестораны в Батуми, которым может подойти ESSA Advertising."
}, {
  providedInputs: {
    target_market: "restaurants",
    geography: "Batumi",
    industries: "hospitality",
    public_sources: "local fixture only",
    data_policy: "PUBLIC_BUSINESS_DATA_ONLY",
    qualification_policy: "human review"
  }
});
const leadPreflight = preflightExecutionIntentDraft(lead);
check(
  lead.primaryCapabilityId === "BUSINESS_DISCOVERY" &&
    lead.requiredCapabilityIds.includes("BUSINESS_ENTITY_VERIFY") &&
    lead.activationRequirements.includes("LIVE_SOURCE_ACTIVATION_REQUIRED") &&
    leadPreflight.blockers.includes("LIVE_SOURCE_ACTIVATION_REQUIRED") &&
    leadPreflight.providerCalls === 0,
  "E BUSINESS_DISCOVERY draft recognizes Lead Intelligence and blocks live source activation",
  { draft: lead, preflight: leadPreflight }
);

const trim = draftFor("VIDEO_TRIM", {
  productId: productIds.production,
  userNeed: "Обрежь видео"
}, {
  providedInputs: {
    source_video: "local.mp4",
    time_range: "00:01-00:03"
  }
});
check(
  trim.executionClass === executionIntentClasses.localOnly &&
    trim.localSteps.some((step) => step.capabilityId === "VIDEO_TRIM") &&
    trim.providerActivation.includes(providerActivationStatuses.localOnlyNoProviderRequired),
  "F local-only capability remains local-only in draft",
  trim
);

check(
  book.status === executionIntentDraftStatuses.inputRequired &&
    book.missingInputs.some((item) => item.readiness === inputReadinessStatuses.requiresUserInput),
  "G missing required inputs produce INPUT_REQUIRED",
  book.missingInputs
);

check(
  book.executionClass === executionIntentClasses.paidProviderRequired ||
    book.providerActivation.includes(providerActivationStatuses.capabilityRequiresProvider),
  "H provider-required case is represented without provider brand exposure",
  { executionClass: book.executionClass, providerActivation: book.providerActivation }
);

check(
  book.costApprovalRequired === true &&
    book.costClass === "PAID_PROVIDER_REQUIRED",
  "I payment-required cost class needs approval and no payment",
  { costClass: book.costClass, costApprovalRequired: book.costApprovalRequired, paymentActions: book.paymentActions }
);

check(
  website.availabilitySnapshot.state === "ARCHITECTURE_ONLY" &&
    website.activationRequirements.includes("architecture-only capability"),
  "J architecture-only capability remains non-executable",
  website.availabilitySnapshot
);

const stale = draftFor("BOOK_COVER", {
  productId: productIds.publishing
}, {
  sourceVersionOverride: "0.0.1"
});
check(
  stale.status === executionIntentDraftStatuses.staleRevalidationRequired &&
    stale.freshnessStatus === "STALE_REVALIDATION_REQUIRED",
  "K stale metadata requires revalidation",
  { status: stale.status, freshness: stale.freshnessStatus }
);

check(
  vocal.approvals.length > 0 &&
    vocal.approvals.every((approval) => approval.autoApproved === false),
  "L approval-required case never auto-approves",
  vocal.approvals
);

const publish = draftFor("PUBLISHING_PACKAGE", {
  productId: productIds.publishing,
  userNeed: "Опубликуй книгу"
});
check(
  publish.executionClass === executionIntentClasses.publishRequired &&
    publish.approvals.some((item) => item.type === "PUBLISH_APPROVAL"),
  "M publish-required case is high-impact gated",
  { executionClass: publish.executionClass, approvals: publish.approvals }
);

const outreachSend = draftFor("OUTREACH_SEND", {
  productId: productIds.business,
  userNeed: "Отправь письма лидам"
});
check(
  outreachSend.executionClass === executionIntentClasses.unavailable &&
    outreachSend.safetyClassification === "HIGH_IMPACT" &&
    outreachSend.executionEnabled === false,
  "N destructive/high-impact external outreach stays unavailable",
  outreachSend
);

const providerReplacement = createLeadSourceReplacementProbe("BUSINESS_DISCOVERY");
check(
  providerReplacement.businessDiscoveryMeaningStable === true &&
    lead.primaryCapabilityId === "BUSINESS_DISCOVERY",
  "O provider replacement does not change capability identity",
  providerReplacement
);

check(
  lead.contextEconomy.policy.neverSendFullMemoryAutomatically === true &&
    lead.contextEconomy.budget.usedChars <= 1800,
  "P bounded context avoids full catalog load",
  lead.contextEconomy
);

check(
  website.rollbackPlan.length > 0 &&
    preflightExecutionIntentDraft(website).rollbackReady === true,
  "Q rollback-ready future intent exposes rollback plan",
  website.rollbackPlan
);

const sendPreflight = preflightExecutionIntentDraft(outreachSend);
check(
  sendPreflight.rollbackReady === false ||
    sendPreflight.blockers.includes("CAPABILITY_UNAVAILABLE"),
  "R rollback-limited/high-impact action cannot proceed",
  sendPreflight
);

const bookPreflight = preflightExecutionIntentDraft(book);
check(
  bookPreflight.gatewayMode === "PREFLIGHT_ONLY" &&
    bookPreflight.gatewayResult.executed === false &&
    [executionIntentDraftStatuses.preflightBlocked, executionIntentDraftStatuses.approvalRequired].includes(bookPreflight.status),
  "S ExecutionGateway preflight bridge is non-executing",
  bookPreflight
);

const viewModel = buildExecutionPreflightViewModel({
  primaryCapabilityId: "VIDEO_TRIM",
  productId: productIds.production,
  userNeed: "Обрежь видео"
}, {
  providedInputs: {
    source_video: "local.mp4",
    time_range: "00:01-00:03"
  }
});
const audit = createExecutionIntentAuditArtifact(trim, preflightExecutionIntentDraft(trim));
check(
  viewModel.executionEnabled === false &&
    viewModel.preflight.executableNow === false &&
    audit.executionPerformed === false &&
    Object.entries(phase21KHardGuards).every(([key, value]) => viewModel[key] === value),
  "T hard Phase 21K execution block is always present",
  { viewModel: { actionLabel: viewModel.actionLabel, preflight: viewModel.preflight }, audit }
);

if (failures > 0) {
  console.error(`Execution Intent Draft Preflight tests failed: ${failures}`);
  process.exit(1);
}

console.log("Execution Intent Draft Preflight tests passed.");
