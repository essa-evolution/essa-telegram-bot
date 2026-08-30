import assert from "node:assert/strict";
import {
  buildLocalLisaAnswer,
  buildPropertyFixtureStates
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
const normal = states.find((state) => state.id === "normal");
const stale = states.find((state) => state.id === "stale");
const incomplete = states.find((state) => state.id === "incomplete");
const normalView = buildPropertyPassportViewModel(normal);
const staleView = buildPropertyPassportViewModel(stale);
const incompleteView = buildPropertyPassportViewModel(incomplete);

check(
  states.length === 3 && Boolean(normal && stale && incomplete),
  "A local fixture selector states are available",
  { ids: states.map((state) => state.id) }
);

check(
  normalView.identitySection.propertyId === "prop_ge_batumi_sea_view_a_1204" &&
    normalView.marketSection.observedPrice === 125000 &&
    normalView.marketSection.currency === "USD",
  "B normal Property Overview fields render from PropertyPassportViewModel",
  normalView.marketSection
);

check(
  normalView.verificationSection.verifiedFacts.length >= 2 &&
    normalView.verificationSection.verifiedFacts.every((fact) => fact.badge.label === "Verified"),
  "C verified facts use Verified badge",
  normalView.verificationSection.verifiedFacts.map((fact) => ({ label: fact.label, badge: fact.badge.label }))
);

check(
  normalView.verificationSection.unverifiedFacts.some((fact) => fact.badge.label === "Unverified"),
  "D unverified facts remain separate",
  normalView.verificationSection.unverifiedFacts.map((fact) => ({ label: fact.label, badge: fact.badge.label }))
);

check(
  normalView.verificationSection.inferredFacts.some((fact) => fact.badge.label === "Inferred"),
  "E inferred facts remain separate and not verified",
  normalView.verificationSection.inferredFacts.map((fact) => ({ label: fact.label, badge: fact.badge.label }))
);

check(
  staleView.freshnessSection.badge.label === "Stale" &&
    staleView.freshnessSection.staleReason?.includes("stale"),
  "F stale fixture exposes Stale badge and explanation",
  staleView.freshnessSection
);

check(
  incompleteView.marketSection.observedPrice === null &&
    incompleteView.marketSection.badge.label === "Missing" &&
    incompleteView.hierarchySection.project === "Missing",
  "G incomplete fixture does not invent missing market or hierarchy data",
  {
    market: incompleteView.marketSection,
    hierarchy: incompleteView.hierarchySection
  }
);

check(
  normalView.sourcesSection.rows.length >= 2 &&
    normalView.sourcesSection.rows.every((row) => row.source && row.freshnessBadge?.label),
  "H sources render source lineage and freshness badges",
  normalView.sourcesSection.rows
);

check(
  normalView.risksSection.rows.every((row) => row.legalConclusion === false && row.explanation),
  "I risk explanations are human-readable and not legal conclusions",
  normalView.risksSection.rows
);

check(
  buildLocalLisaAnswer("Какие есть риски?", normalView).includes("Право собственности") &&
    buildLocalLisaAnswer("Что ESSA пока не умеет?", normalView).includes("Booking is not active."),
  "J local Ask Lisa answers stay deterministic and bounded",
  {
    risks: buildLocalLisaAnswer("Какие есть риски?", normalView),
    limitations: buildLocalLisaAnswer("Что ESSA пока не умеет?", normalView)
  }
);

check(
  normalView.limitationsSection.unavailableFeatures.some((row) => row.feature === "payment" && row.status === "NOT_ACTIVE") &&
    normalView.limitationsSection.unavailableFeatures.some((row) => row.feature === "transaction" && row.status === "NOT_ACTIVE"),
  "K future payment/booking/transaction features remain NOT_ACTIVE",
  normalView.limitationsSection.unavailableFeatures
);

check(
  [normalView, staleView, incompleteView].every((view) =>
    view.providerCalls === 0 &&
    view.externalCalls === 0 &&
    view.dbMutations === 0 &&
    view.payments === 0 &&
    view.bookingActions === 0 &&
    view.transactionActions === 0
  ),
  "L provider/external/db/payment/booking/transaction counts remain zero"
);

assert.equal(failures, 0);
console.log("Property Passport UI tests passed.");
