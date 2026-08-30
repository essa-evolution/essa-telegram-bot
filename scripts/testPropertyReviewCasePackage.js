import assert from "assert";
import fs from "fs";
import {
  buildPropertyIngestionReviewViewModel,
  buildPropertyReviewCasePackage,
  classifyPropertyProfessionalReviewRequirements,
  createLisaPropertyReviewCasePackageExplanation,
  createPropertyReviewHandoff,
  createVersionedPropertyReviewCasePackage,
  exportPropertyReviewCasePackageJson,
  exportPropertyReviewCasePackageMarkdown,
  propertyProfessionalReviewRequirements,
  propertyReviewCasePackageContract,
  propertyReviewCaseStatuses,
  propertyReviewExecutionReadiness,
  propertyReviewHandoffStatuses,
  propertyReviewHandoffTargetRoles,
  sanitizePropertyReviewCasePackage
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

const viewModel = buildPropertyIngestionReviewViewModel();
const exact = viewModel.queue.find((item) => item.ingestionId === "ingest_agency_listing_tower_b_0501");
const conflict = viewModel.queue.find((item) => item.ingestionId === "ingest_agency_listing_tower_b_0501_price_130000");
const quarantine = viewModel.queue.find((item) => item.ingestionId === "ingest_invalid_negative_area");
const gaps = viewModel.queue.find((item) => item.ingestionId === "ingest_manual_gap_record_city_missing");
const owner = viewModel.queue.find((item) => item.ingestionId === "ingest_owner_sub_batumi_0707");
const noDecisionView = buildPropertyIngestionReviewViewModel({ reviewerDecisions: [] });
const noDecision = noDecisionView.queue.find((item) => item.ingestionId === "ingest_agency_listing_tower_b_0501");

assert.equal(propertyReviewCasePackageContract.modelType, "PropertyReviewCasePackage");
assert.equal(propertyReviewCasePackageContract.executionStatus, "NOT_EXECUTED");
assert.equal(propertyReviewCasePackageContract.executionReadiness, propertyReviewExecutionReadiness.notEnabled);
assert.ok(["summary", "sourceSummary", "validationSummary", "normalizationSummary", "identityResolutionSummary", "evidenceSummary", "reviewerDecisionSummary", "auditSummary", "professionalReviewRequirements", "provenance", "integrity"].every((key) =>
  Object.prototype.hasOwnProperty.call(propertyReviewCasePackageContract, key)));
pass("A package contract has required fields", propertyReviewCasePackageContract);

assert.equal(exact.reviewCasePackage.caseStatus, propertyReviewCaseStatuses.reviewedDecisionRecorded);
assert.equal(conflict.reviewCasePackage.caseStatus, propertyReviewCaseStatuses.blockedByConflict);
assert.equal(quarantine.reviewCasePackage.caseStatus, propertyReviewCaseStatuses.blockedByQuarantine);
assert.equal(gaps.reviewCasePackage.caseStatus, propertyReviewCaseStatuses.blockedByMissingEvidence);
assert.equal(noDecision.reviewCasePackage.caseStatus, propertyReviewCaseStatuses.readyForHumanReview);
pass("B package readiness states classify cases", {
  exact: exact.reviewCasePackage.caseStatus,
  conflict: conflict.reviewCasePackage.caseStatus,
  quarantine: quarantine.reviewCasePackage.caseStatus,
  gaps: gaps.reviewCasePackage.caseStatus,
  noDecision: noDecision.reviewCasePackage.caseStatus
});

assert.ok(exact.reviewCasePackage.evidenceSummary.evidenceRefs.length > 0);
assert.ok(exact.reviewCasePackage.evidenceSummary.sourceLineage.length > 0);
assert.ok(exact.reviewCasePackage.listingSnapshotIds.length > 0);
pass("C evidence bundle is present and bounded", exact.reviewCasePackage.evidenceSummary);

assert.ok(exact.reviewCasePackage.provenance.every((entry) => entry.trace.includes("SourceRecord -> Ingestion Audit")));
assert.ok(exact.reviewCasePackage.provenance.some((entry) => entry.statementId === "case_summary"));
pass("D source traceability links statements to evidence", exact.reviewCasePackage.provenance);

assert.equal(exact.reviewCasePackage.reviewerDecisionSummary.decisionId, "decision_exact_confirm_agency_0501");
assert.equal(noDecision.reviewCasePackage.reviewerDecisionSummary.status, "NO REVIEWER DECISION RECORDED");
pass("E reviewer decision inclusion handles present and absent decisions", {
  exact: exact.reviewCasePackage.reviewerDecisionSummary,
  none: noDecision.reviewCasePackage.reviewerDecisionSummary
});

assert.ok(owner.reviewCasePackage.auditSummary.decisionHistory.some((decision) => decision.decisionStatus === "SUPERSEDED"));
assert.ok(owner.reviewCasePackage.auditSummary.decisionAuditTrail.some((record) => record.eventType === "DECISION_SUPERSEDED"));
pass("F decision history and supersession are preserved", owner.reviewCasePackage.auditSummary);

assert.ok(classifyPropertyProfessionalReviewRequirements(conflict).includes(propertyProfessionalReviewRequirements.complianceReviewRequired));
assert.ok(classifyPropertyProfessionalReviewRequirements(quarantine).includes(propertyProfessionalReviewRequirements.sourceClarificationRequired));
assert.ok(classifyPropertyProfessionalReviewRequirements(gaps).includes(propertyProfessionalReviewRequirements.additionalDocumentsRequired));
pass("G professional review classification is bounded", {
  conflict: conflict.reviewCasePackage.professionalReviewRequirements,
  quarantine: quarantine.reviewCasePackage.professionalReviewRequirements,
  gaps: gaps.reviewCasePackage.professionalReviewRequirements
});

assert.ok(viewModel.queue.every((item) => item.reviewCasePackage.executionReadiness === propertyReviewExecutionReadiness.notEnabled));
assert.ok(viewModel.queue.every((item) => item.reviewCasePackage.executionStatus === "NOT_EXECUTED"));
pass("H execution readiness remains disabled for every package");

const v2 = createVersionedPropertyReviewCasePackage({
  reviewItem: exact,
  previousPackage: exact.reviewCasePackage,
  generatedAt: "2026-08-21T00:00:00.000Z",
  reasonForNewVersion: "NEW_EVIDENCE_LOCAL_PROOF"
});
assert.equal(v2.packageVersion, "1.1.0");
assert.equal(v2.previousPackage.packageId, exact.reviewCasePackage.packageId);
assert.notEqual(v2.integrity.fingerprint, exact.reviewCasePackage.integrity.fingerprint);
pass("I package versioning links prior package", v2);

const rebuilt = buildPropertyReviewCasePackage({ reviewItem: exact });
assert.equal(rebuilt.integrity.fingerprint, exact.reviewCasePackage.integrity.fingerprint);
assert.equal(rebuilt.integrity.algorithm, "local-fnv1a-32");
pass("J integrity fingerprint is deterministic", rebuilt.integrity);

const jsonExport = exportPropertyReviewCasePackageJson(exact.reviewCasePackage);
const markdownExport = exportPropertyReviewCasePackageMarkdown(exact.reviewCasePackage);
assert.ok(JSON.parse(jsonExport).packageId === exact.reviewCasePackage.packageId);
assert.ok(markdownExport.includes("Property Review Case Package"));
assert.ok(markdownExport.includes("Execution: NOT_EXECUTED / EXECUTION_NOT_ENABLED"));
pass("K JSON and human-readable exports are local and readable", {
  jsonBytes: jsonExport.length,
  markdownBytes: markdownExport.length
});

const exportText = `${jsonExport}\n${markdownExport}`;
assert.ok(!exportText.includes("rawPayload"));
assert.ok(!exportText.includes("ownerText"));
assert.ok(!exportText.includes("reviewNote"));
assert.ok(!exportText.includes("OPENAI_API_KEY"));
assert.throws(() => sanitizePropertyReviewCasePackage({ summary: "rawPayload should fail" }), /Unsafe data/);
pass("L sanitization excludes unsafe raw payload and secrets");

const handoff = createPropertyReviewHandoff({
  packageValue: exact.reviewCasePackage,
  targetRole: propertyReviewHandoffTargetRoles.propertyCompliance,
  requestedReviewType: propertyProfessionalReviewRequirements.complianceReviewRequired,
  status: propertyReviewHandoffStatuses.handedOffLocalProof
});
assert.equal(handoff.modelType, "PropertyReviewHandoff");
assert.equal(handoff.dispatchPerformed, false);
assert.equal(handoff.externalCalls, 0);
pass("M handoff contract is local proof only", handoff);

const lisa = createLisaPropertyReviewCasePackageExplanation(conflict.reviewCasePackage);
assert.ok(lisa.explanation.includes("REVIEWED_DECISION_RECORDED means"));
assert.ok(lisa.explanation.includes("No execution has occurred"));
assert.equal(lisa.providerCalls, 0);
pass("N Lisa bounded explanation explains package and execution boundary", lisa);

assert.equal(exact.reviewCasePackage.providerCalls, 0);
assert.equal(exact.reviewCasePackage.externalCalls, 0);
assert.equal(exact.reviewCasePackage.dbMutations, 0);
assert.equal(exact.reviewCasePackage.payments, 0);
assert.equal(exact.reviewCasePackage.bookingActions, 0);
assert.equal(exact.reviewCasePackage.transactionActions, 0);
assert.equal(exact.reviewCasePackage.mergeActions, 0);
assert.equal(exact.reviewCasePackage.publishActions, 0);
assert.equal(exact.reviewCasePackage.quarantineMutations, 0);
pass("O package side-effect counters remain zero");

const source = fs.readFileSync("src/property/propertyReviewCasePackage.js", "utf8");
assert.ok(!source.includes("createClient("));
assert.ok(!source.includes("supabase."));
assert.ok(!source.includes("axios."));
assert.ok(!source.includes("fetch("));
assert.ok(!source.includes("sendMail"));
assert.ok(!source.includes("executeMerge"));
assert.ok(!source.includes("publishListing"));
pass("P package module has no provider/repository/execution dispatch path");

const ui = fs.readFileSync("workspace/modules/propertyIngestionReviewUi.js", "utf8");
assert.ok(ui.includes("BUILD REVIEW CASE PACKAGE"));
assert.ok(ui.includes("Review Case Package"));
assert.ok(ui.includes("Package Preview"));
assert.ok(ui.includes("Local Package Export / Handoff"));
pass("Q review console package preview is wired");

console.log("Property review case package tests passed.");
