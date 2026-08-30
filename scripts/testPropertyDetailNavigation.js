import assert from "node:assert/strict";
import {
  buildLisaSectionAnswer,
  buildLocalLisaAnswer,
  buildPropertyFixtureStates,
  buildPropertyGuideStep,
  buildPropertyHash,
  buildPropertyUiContext,
  parsePropertyHash,
  propertyGuideSteps,
  propertySections
} from "../workspace/modules/propertyPassportUi.js";
import { buildPropertyPassportViewModel } from "../src/property/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const states = buildPropertyFixtureStates();
const stale = states.find((state) => state.id === "stale");
const incomplete = states.find((state) => state.id === "incomplete");
const staleView = buildPropertyPassportViewModel(stale);
const incompleteView = buildPropertyPassportViewModel(incomplete);

check(
  propertySections.map((item) => item.id).join(",") === "overview,passport,compare,verification,sources,risks,documents,lisa",
  "A Property detail navigation sections are canonical",
  propertySections
);

check(
  parsePropertyHash("#property?fixture=stale&section=risks").fixtureId === "stale" &&
    parsePropertyHash("#property?fixture=incomplete&section=sources").section === "sources" &&
    parsePropertyHash("#property?section=unknown").section === "overview",
  "B route section parsing supports fixture + section coexistence",
  {
    staleRisks: parsePropertyHash("#property?fixture=stale&section=risks"),
    incompleteSources: parsePropertyHash("#property?fixture=incomplete&section=sources"),
    fallback: parsePropertyHash("#property?section=unknown")
  }
);

check(
  buildPropertyHash({ fixtureId: "stale", section: "risks" }) === "#property?fixture=stale&section=risks" &&
    buildPropertyHash({ fixtureId: "normal", section: "overview" }) === "#property",
  "C deep-link builder preserves readable route state"
);

check(
  staleView.verificationSection.verifiedFacts.concat(staleView.verificationSection.unverifiedFacts, staleView.verificationSection.inferredFacts)
    .every((fact) => fact.source && fact.observedAt && fact.confidence && fact.verificationStatus),
  "D fact to source traceability is available for all fact types",
  {
    verified: staleView.verificationSection.verifiedFacts,
    unverified: staleView.verificationSection.unverifiedFacts,
    inferred: staleView.verificationSection.inferredFacts
  }
);

check(
  staleView.sourcesSection.rows.some((row) => row.sourceType === "LOCAL_FIXTURE" && row.freshnessStatus === "STALE") &&
    staleView.sourcesSection.rows.every((row) => row.source && row.observedAt && row.effectiveAt && row.confidence && row.verificationStatus),
  "E source drill-down contains source name/id, dates, freshness, confidence and verification",
  staleView.sourcesSection.rows
);

check(
  buildLisaSectionAnswer("sources", staleView).includes("Sources") &&
    buildLisaSectionAnswer("risks", staleView).includes("Risks") &&
    buildLisaSectionAnswer("verification", staleView).includes("Verification"),
  "F Lisa contextual section explanations are deterministic",
  {
    sources: buildLisaSectionAnswer("sources", staleView),
    risks: buildLisaSectionAnswer("risks", staleView),
    verification: buildLisaSectionAnswer("verification", staleView)
  }
);

const context = buildPropertyUiContext({ fixtureId: "stale", section: "sources", viewModel: staleView });
check(
  context.currentProduct === "ESSA_PROPERTY" &&
    context.currentRoute === "#property?fixture=stale&section=sources" &&
    context.currentSection === "sources" &&
    context.availableReadOnlyActions.includes("open_risks") &&
    context.providerCalls === 0,
  "G Lisa UI context is bounded to current Product route/section and read-only actions",
  context
);

const firstGuide = buildPropertyGuideStep(0, staleView);
const lastGuide = buildPropertyGuideStep(propertyGuideSteps.length - 1, staleView);
check(
  firstGuide.title === "What is this property?" &&
    firstGuide.canBack === false &&
    firstGuide.canNext === true &&
    lastGuide.title === "What ESSA cannot do yet." &&
    lastGuide.answer.includes("Booking is not active."),
  "H Guide Me progression has bounded read-only steps",
  { firstGuide, lastGuide }
);

check(
  incompleteView.marketSection.observedPrice === null &&
    incompleteView.verificationSection.unverifiedFacts.length >= 1 &&
    buildLocalLisaAnswer("Что ESSA пока не умеет?", incompleteView).includes("Payments are not active."),
  "I incomplete fixture keeps missing/unverified state and local limitations",
  {
    market: incompleteView.marketSection,
    unverified: incompleteView.verificationSection.unverifiedFacts
  }
);

check(
  [staleView, incompleteView].every((view) =>
    view.providerCalls === 0 &&
    view.externalCalls === 0 &&
    view.dbMutations === 0 &&
    view.payments === 0 &&
    view.bookingActions === 0 &&
    view.transactionActions === 0
  ),
  "J unavailable execution remains blocked with zero side effects"
);

assert.equal(failures, 0);
console.log("Property detail navigation tests passed.");
