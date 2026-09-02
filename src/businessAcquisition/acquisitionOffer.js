import { businessCurrencies, businessPaymentModels } from "../business/businessContracts.js";
import { createAcquisitionOffer } from "./businessAcquisitionContracts.js";

export function createConfigurableAcquisitionOffer({ prospect = {}, demoProject = {}, pricing = {} } = {}) {
  return createAcquisitionOffer({
    prospectId: prospect.prospectId,
    demoProjectId: demoProject.demoProjectId,
    title: `${prospect.legalOrDisplayName || "Business"} - ESSA acquisition offer`,
    pricingModel: pricing.pricingModel || businessPaymentModels.custom,
    currency: pricing.currency || businessCurrencies.usd,
    fixedPrice: pricing.fixedPrice ?? null,
    setupFee: pricing.setupFee ?? null,
    subscriptionAmount: pricing.subscriptionAmount ?? null,
    packageKey: pricing.packageKey || null,
    optionalModules: pricing.optionalModules || [
      "WEBSITE",
      "LEADS",
      "CRM",
      "CONTENT",
      "ADVERTISING",
      "ANALYTICS",
      "AUTOMATION"
    ],
    upgradePath: pricing.upgradePath || [
      "DEMO_PREVIEW",
      "OWNERSHIP_VERIFICATION",
      "AGREEMENT_OR_PAYMENT",
      "BUSINESS_WORKSPACE_ACTIVATION",
      "GROWTH_EXPANSION"
    ]
  });
}
