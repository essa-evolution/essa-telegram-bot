import assert from "node:assert/strict";
import {
  buildBoundedPropertyDiscoveryQueryContext,
  buildPropertyDiscoveryGuideStep,
  createLisaPropertyDiscoveryExplanation,
  discoverProperties,
  parsePropertyDiscoveryQuery,
  propertyDiscoveryQueryContract
} from "../src/property/index.js";
import {
  buildPropertyComparisonViewModel,
  buildPropertyHash,
  parsePropertyHash
} from "../workspace/modules/propertyPassportUi.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const query = parsePropertyDiscoveryQuery("Квартира в Батуми до 130000 USD");
check(
  propertyDiscoveryQueryContract.readOnly === true &&
    propertyDiscoveryQueryContract.fields.includes("maxPrice") &&
    propertyDiscoveryQueryContract.prohibited.includes("external_search"),
  "A PropertyDiscoveryQuery contract is read-only",
  propertyDiscoveryQueryContract
);

check(
  query.city === "Batumi" &&
    query.propertyType === "APARTMENT_UNIT" &&
    query.maxPrice === 130000 &&
    query.currency === "USD",
  "B query parsing extracts safe city/type/max price/currency",
  query
);

check(
  parsePropertyDiscoveryQuery("Покажи объекты").country === "NOT_SPECIFIED" &&
    parsePropertyDiscoveryQuery("Покажи объекты").minPrice === null,
  "C parser does not invent unspecified filters"
);

const cityDiscovery = discoverProperties("Квартира в Батуми");
check(
  cityDiscovery.matchedCount === 3 &&
    cityDiscovery.results.every((result) => result.summary.city === "Batumi"),
  "D city/property type discovery returns local Batumi results",
  cityDiscovery.results.map((result) => result.summary)
);

const countryDiscovery = discoverProperties("Покажи объекты в Грузии");
check(
  countryDiscovery.matchedCount === 3 &&
    countryDiscovery.results.every((result) => result.summary.country === "Georgia"),
  "E country filter returns local Georgia results"
);

const priceDiscovery = discoverProperties("Квартира в Батуми до 130000 USD");
check(
  priceDiscovery.matchedCount === 1 &&
    priceDiscovery.results[0].summary.observedPrice === 125000 &&
    priceDiscovery.warnings.some((warning) => warning.includes("missing observed price")),
  "F max price uses observed price and does not treat missing price as zero",
  { matched: priceDiscovery.results.map((result) => result.summary), warnings: priceDiscovery.warnings }
);

const currencyMismatch = discoverProperties({
  ...parsePropertyDiscoveryQuery("Квартира в Батуми до 130000 USD"),
  currency: "GEL"
});
check(
  currencyMismatch.results.some((result) => result.priceComparable === false) &&
    currencyMismatch.warnings.some((warning) => warning.includes("FX conversion is not active")),
  "G currency mismatch is marked non-comparable without FX conversion",
  { warnings: currencyMismatch.warnings }
);

const stale = discoverProperties("Квартира в Батуми").results.find((result) => result.states.includes("STALE"));
const incomplete = discoverProperties("Квартира в Батуми").results.find((result) => result.summary.evidenceCompleteness === "INCOMPLETE_LOCAL_EVIDENCE");
check(
  stale?.states.includes("STALE") &&
    incomplete?.states.includes("MISSING") &&
    incomplete?.states.includes("NEEDS_PROFESSIONAL_REVIEW"),
  "H stale and incomplete results remain visible with explicit states",
  { stale, incomplete }
);

const empty = discoverProperties("Вилла в Тбилиси до 1 USD");
check(
  empty.status === "NO_MATCHES_IN_CURRENT_PROPERTY_DATA" &&
    empty.matchedCount === 0 &&
    empty.warnings.includes("NO_MATCHES_IN_CURRENT_PROPERTY_DATA"),
  "I empty state does not create fake properties",
  empty
);

check(
  cityDiscovery.modelType === "PropertyDiscoveryResult" &&
    cityDiscovery.results.every((result) => result.modelType === "PropertyDiscoveryResultItem") &&
    cityDiscovery.deterministicSort === "LOCAL_REPOSITORY_ORDER",
  "J discovery result model is explicit and unranked"
);

const navigatorContext = buildBoundedPropertyDiscoveryQueryContext({ query: "Покажи квартиры в Батуми" });
const lisa = createLisaPropertyDiscoveryExplanation(cityDiscovery);
check(
  navigatorContext.intent === "PROPERTY_DISCOVERY" &&
    navigatorContext.blockedLiveActions.includes("live_search") &&
    lisa.roleId === "LISA_ESSA_PRODUCT_GUIDE" &&
    lisa.humanExplanation.includes("local ESSA Property"),
  "K Navigator and Lisa explain bounded discovery truthfully",
  { navigator: navigatorContext.boundedContextMetadata, lisa }
);

const passportHash = buildPropertyHash({ fixtureId: cityDiscovery.results[0].alias, section: "passport" });
const parsedPassport = parsePropertyHash(passportHash);
check(
  parsedPassport.fixtureId === cityDiscovery.results[0].alias &&
    parsedPassport.section === "passport" &&
    parsedPassport.mode === "passport",
  "L discovery result opens canonical Passport route",
  { passportHash, parsedPassport }
);

const compareIds = cityDiscovery.results.map((result) => result.alias).slice(0, 3);
const comparison = buildPropertyComparisonViewModel({ itemIds: compareIds });
check(
  comparison.compared.length >= 2 &&
    comparison.selectedPropertyIds.includes("prop_ge_batumi_sea_view_a_1204"),
  "M discovery results hand off to existing Comparison through canonical IDs",
  { compareIds, selectedPropertyIds: comparison.selectedPropertyIds }
);

const guide = buildPropertyDiscoveryGuideStep(2, priceDiscovery);
check(
  guide.title === "Budget?" &&
    guide.answer.includes("Missing prices are not treated as zero") &&
    guide.executionEnabled === false,
  "N guided discovery is read-only and supports skipped/missing fields",
  guide
);

check(
  [cityDiscovery, countryDiscovery, priceDiscovery, currencyMismatch, empty, navigatorContext, lisa, comparison].every((item) =>
    item.providerCalls === 0 &&
      item.externalCalls === 0 &&
      item.dbMutations === 0 &&
      item.payments === 0
  ),
  "O provider/external/db/payment counts remain zero"
);

check(
  [cityDiscovery, priceDiscovery, empty].every((item) =>
    item.bookingActions === 0 &&
      item.transactionActions === 0
  ),
  "P booking/payment/transaction actions remain zero"
);

assert.equal(failures, 0);
console.log("Property discovery flow tests passed.");
