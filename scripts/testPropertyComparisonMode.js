import assert from "node:assert/strict";
import {
  buildLisaComparisonAnswer,
  buildPropertyCompareGuideStep,
  buildPropertyComparisonUiContext,
  buildPropertyComparisonViewModel,
  buildPropertyHash,
  parsePropertyHash,
  propertyCompareGuideSteps
} from "../workspace/modules/propertyPassportUi.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const twoWay = buildPropertyComparisonViewModel({ itemIds: ["normal", "stale"] });
const normalIncomplete = buildPropertyComparisonViewModel({ itemIds: ["normal", "incomplete"] });
const threeWay = buildPropertyComparisonViewModel({ itemIds: ["normal", "stale", "incomplete"] });

check(
  twoWay.viewModelType === "PropertyComparisonViewModel" &&
    twoWay.compared.length === 2 &&
    twoWay.selectedFixtureIds.join(",") === "normal,stale",
  "A PropertyComparisonViewModel supports 2-property comparison",
  twoWay.selectedFixtureIds
);

check(
  threeWay.compared.length === 3 &&
    threeWay.selectedFixtureIds.join(",") === "normal,stale,incomplete",
  "B PropertyComparisonViewModel supports 3-property comparison",
  threeWay.selectedFixtureIds
);

check(
  twoWay.deltas.some((delta) => delta.label === "STALE DATA" && delta.text.includes("stale")) &&
    twoWay.compared.some((entry) => entry.fixtureId === "stale" && entry.sources.staleCount >= 1),
  "C stale delta is explicit and source-aware",
  twoWay.deltas
);

check(
  normalIncomplete.deltas.some((delta) => delta.label === "MORE EVIDENCE GAPS" && delta.fixtureId === "incomplete") &&
    normalIncomplete.compared.some((entry) => entry.fixtureId === "incomplete" && entry.market.observedPrice === null),
  "D missing-data delta uses Missing / not available instead of invented defaults",
  normalIncomplete.compared.find((entry) => entry.fixtureId === "incomplete")
);

check(
  threeWay.compared.every((entry) =>
    Number.isInteger(entry.verification.verified) &&
      Number.isInteger(entry.verification.unverified) &&
      Number.isInteger(entry.verification.inferred)
  ) &&
    threeWay.deltas.some((delta) => delta.label === "MORE VERIFIED DATA"),
  "E verified/unverified/inferred deltas are represented",
  threeWay.compared.map((entry) => ({ id: entry.fixtureId, verification: entry.verification }))
);

check(
  threeWay.deltas.some((delta) => delta.label === "ADDITIONAL RISK FLAGS") &&
    threeWay.compared.every((entry) => Array.isArray(entry.risks.flags)),
  "F risk delta is factual and not a recommendation",
  threeWay.deltas.find((delta) => delta.label === "ADDITIONAL RISK FLAGS")
);

check(
  twoWay.deltas.every((delta) => typeof delta.sourceLineage === "string" && delta.sourceLineage.length > 0) &&
    twoWay.compared.every((entry) => Array.isArray(entry.sources.rows)),
  "G source lineage is retained for compared values",
  twoWay.deltas.map((delta) => ({ label: delta.label, sourceLineage: delta.sourceLineage }))
);

const mixedCurrency = structuredClone(twoWay);
mixedCurrency.compared[1].market.currency = "GEL";
const mixedCurrencyAnswer = buildLisaComparisonAnswer("Почему их нельзя сравнить напрямую?", {
  ...mixedCurrency,
  currencyComparability: "NOT DIRECTLY COMPARABLE - currencies differ and FX conversion is not active."
});
check(
  mixedCurrencyAnswer.includes("NOT DIRECTLY COMPARABLE") &&
    !mixedCurrencyAnswer.toLowerCase().includes("fx conversion is active"),
  "H currency non-comparability boundary is truthful",
  { mixedCurrencyAnswer }
);

check(
  buildLisaComparisonAnswer("Какой объект дешевле по наблюдаемой цене?", twoWay).includes("lower observed fixture price") &&
    !buildLisaComparisonAnswer("Чем отличаются эти объекты?", twoWay).includes("THIS IS THE BEST PROPERTY") &&
    !buildLisaComparisonAnswer("Чем отличаются эти объекты?", twoWay).includes("BUY"),
  "I Lisa comparison stays factual and avoids recommendation language",
  {
    price: buildLisaComparisonAnswer("Какой объект дешевле по наблюдаемой цене?", twoWay),
    general: buildLisaComparisonAnswer("Чем отличаются эти объекты?", twoWay)
  }
);

check(
  buildPropertyHash({ mode: "compare", selectedItems: ["normal", "stale", "incomplete"] }) === "#property?mode=compare&items=normal%2Cstale%2Cincomplete" &&
    parsePropertyHash("#property?mode=compare&items=normal,stale,incomplete").mode === "compare" &&
    parsePropertyHash("#property?mode=compare&items=normal,stale,incomplete").selectedItems.length === 3,
  "J route/deep link supports comparison item selection",
  parsePropertyHash("#property?mode=compare&items=normal,stale,incomplete")
);

const guideFirst = buildPropertyCompareGuideStep(0, threeWay);
const guideLast = buildPropertyCompareGuideStep(propertyCompareGuideSteps.length - 1, threeWay);
check(
  guideFirst.title === "Identity" &&
    guideFirst.canBack === false &&
    guideFirst.canNext === true &&
    guideLast.title === "Limitations" &&
    guideLast.answer.includes("Does not call providers"),
  "K guided comparison has bounded read-only steps",
  { guideFirst, guideLast }
);

const context = buildPropertyComparisonUiContext({
  comparison: threeWay,
  selectedItems: ["normal", "stale", "incomplete"],
  currentDimension: "risks"
});
check(
  context.currentProduct === "ESSA_PROPERTY" &&
    context.mode === "compare" &&
    context.selectedPropertyIds.length === 3 &&
    context.availableComparisonActions.includes("explain_risks") &&
    context.providerCalls === 0,
  "L contextual Lisa comparison state keeps selected properties and zero side effects",
  context
);

check(
  [twoWay, normalIncomplete, threeWay].every((comparison) =>
    comparison.providerCalls === 0 &&
    comparison.externalCalls === 0 &&
    comparison.dbMutations === 0 &&
    comparison.payments === 0 &&
    comparison.bookingActions === 0 &&
    comparison.transactionActions === 0 &&
    comparison.compared.every((entry) =>
      entry.providerCalls === 0 &&
        entry.externalCalls === 0 &&
        entry.dbMutations === 0 &&
        entry.payments === 0 &&
        entry.bookingActions === 0 &&
        entry.transactionActions === 0
    )
  ),
  "M comparison mode has no provider/external/db/payment/booking/transaction side effects"
);

assert.equal(failures, 0);
console.log("Property comparison mode tests passed.");
