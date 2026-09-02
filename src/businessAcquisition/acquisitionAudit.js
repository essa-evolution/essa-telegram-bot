import { createAcquisitionAuditArtifact } from "./businessAcquisitionContracts.js";

export function createBusinessAcquisitionProof({
  prospect,
  digitalAudit,
  score,
  demoProject,
  acquisitionOffer,
  activationReadiness,
  sourceFiles = []
} = {}) {
  return createAcquisitionAuditArtifact({
    prospectId: prospect?.prospectId,
    digitalAuditId: digitalAudit?.auditId,
    scoreId: score?.scoreId,
    demoProjectId: demoProject?.demoProjectId,
    acquisitionOfferId: acquisitionOffer?.acquisitionOfferId,
    lifecycleState: demoProject?.lifecycleState,
    exactArtifacts: sourceFiles,
    sourceRefs: prospect?.sourceRefs || [],
    counters: {
      businessProfileCreated: activationReadiness?.businessProfileCreated === true,
      providerCalls: 0,
      externalCalls: 0,
      externalModelCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0,
      crmMutationEnabled: false,
      outreachSendEnabled: false
    }
  });
}
