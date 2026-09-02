import {
  acquisitionDemoTypes,
  acquisitionLifecycleStates,
  createDemoArtifact,
  createDemoProject
} from "./businessAcquisitionContracts.js";

function selectPrimaryDemoType(prospect = {}, digitalAudit = {}) {
  const options = digitalAudit.recommendedDemoTypes || [];
  const text = `${prospect.businessType} ${prospect.industry} ${prospect.subIndustry}`.toLowerCase();
  if (/restaurant|cafe|bistro|food/.test(text) && options.includes(acquisitionDemoTypes.restaurantMenuOrder)) {
    return acquisitionDemoTypes.restaurantMenuOrder;
  }
  if (/hotel|hospitality|venue/.test(text) && options.includes(acquisitionDemoTypes.hotelBookingExperience)) {
    return acquisitionDemoTypes.hotelBookingExperience;
  }
  if (/developer|construction|real estate|property/.test(text) && options.includes(acquisitionDemoTypes.developerPresentation)) {
    return acquisitionDemoTypes.developerPresentation;
  }
  return options[0] || acquisitionDemoTypes.serviceLandingPage;
}

export function createInstantDemoPlan({ prospect = {}, digitalAudit = {}, score = {} } = {}) {
  const demoType = selectPrimaryDemoType(prospect, digitalAudit);
  const demoProject = createDemoProject({
    prospectId: prospect.prospectId,
    demoType,
    title: `${prospect.legalOrDisplayName || "Business"} - ESSA demo concept`,
    lifecycleState: acquisitionLifecycleStates.demoReady,
    selectedBecause: [
      `score:${score.totalClass || "UNSCORED"}`,
      ...((digitalAudit.inferredOpportunities || []).slice(0, 3))
    ]
  });
  const artifact = createDemoArtifact({
    demoProjectId: demoProject.demoProjectId,
    prospectId: prospect.prospectId,
    artifactType: "DEMO_CONCEPT_BRIEF",
    title: `${demoProject.title} brief`,
    payload: {
      demoType,
      showDontExplain: true,
      observedFacts: digitalAudit.observedFacts || [],
      opportunitiesToShow: digitalAudit.inferredOpportunities || [],
      fullPaidDeliverable: false
    }
  });

  return {
    demoType,
    demoProject: {
      ...demoProject,
      artifacts: [artifact]
    },
    demoArtifact: artifact,
    providerCalls: 0,
    externalModelCalls: 0,
    buildPerformed: false,
    deploymentPerformed: false
  };
}
