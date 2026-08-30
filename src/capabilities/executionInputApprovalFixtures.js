import {
  buildExecution21MFlow,
  createExecutionApprovalDecision,
  createExecutionApprovalRequest,
  createExecutionInputAnswer,
  createExecutionInputCollectionRequest,
  createExecutionInputDraft,
  createExecutionInputResolution,
  createExecutionInputResolution as resolution,
  createAuthorizationFingerprint,
  detectMaterialChanges,
  executionApprovalStates,
  executionApprovalTypes,
  executionInputFreshnessStates,
  executionInputMateriality,
  executionInputResolutionStates,
  executionInputSourceTypes,
  issueScopedApprovalToken,
  revokeApprovalToken,
  scopedApprovalTokenStatuses,
  verifyScopedApprovalToken
} from "./executionInputApproval.js";
import { createExecutionIntentDraft } from "./executionIntentDraft.js";
import { productIds } from "./productCapabilityMap.js";

export function createExecutionInputApprovalFixture() {
  const bookDraft = createExecutionIntentDraft({
    intentId: "book_cover_intent",
    requestId: "book_cover_request",
    traceId: "book_cover_trace",
    userNeed: "Сделай обложку для моей книги",
    productId: productIds.publishing,
    primaryCapabilityId: "BOOK_COVER"
  }, {
    createdAt: "2026-08-29T00:00:00.000Z"
  });

  const bookSources = {
    projectContext: {
      book_title: "Life OS",
      author: "Lisa",
      language: "русский"
    }
  };
  const bookAnswers = [
    createExecutionInputAnswer({
      questionId: "book_style_question",
      requirementId: "genre_theme",
      inputKey: "genre_theme",
      rawValue: "creator-first business memoir",
      timestamp: "2026-08-29T00:01:00.000Z"
    }),
    createExecutionInputAnswer({
      questionId: "book_style_question_2",
      requirementId: "desired_style",
      inputKey: "desired_style",
      rawValue: "minimal cinematic",
      timestamp: "2026-08-29T00:02:00.000Z"
    })
  ];
  const bookFlow = buildExecution21MFlow({
    intentId: "book_cover_intent",
    requestId: "book_cover_request",
    traceId: "book_cover_trace",
    userNeed: "Сделай обложку для моей книги",
    productId: productIds.publishing,
    primaryCapabilityId: "BOOK_COVER"
  }, bookSources, bookAnswers, {}, {
    createdAt: "2026-08-29T00:00:00.000Z",
    intentVersion: "7"
  });

  const websiteFlow = buildExecution21MFlow({
    intentId: "website_intent",
    requestId: "website_request",
    traceId: "website_trace",
    userNeed: "Сделай сайт для ресторана",
    productId: productIds.developer,
    primaryCapabilityId: "WEBSITE_GENERATE"
  }, {
    projectContext: {
      business_description: "Restaurant in Batumi",
      site_goal: "Bookings",
      pages: "Home, menu, booking"
    }
  }, [
    createExecutionInputAnswer({ requirementId: "domain_intent", inputKey: "domain_intent", rawValue: "future custom domain" }),
    createExecutionInputAnswer({ requirementId: "cta", inputKey: "cta", rawValue: "Book a table" })
  ], {
    [executionApprovalTypes.deploy]: executionApprovalStates.deferred
  }, {
    intentVersion: "3",
    materialChanges: []
  });

  const videoTrimFlow = buildExecution21MFlow({
    intentId: "video_trim_intent",
    requestId: "video_trim_request",
    traceId: "video_trim_trace",
    userNeed: "Обрежь видео",
    productId: productIds.production,
    primaryCapabilityId: "VIDEO_TRIM"
  }, {
    currentUserInputs: {
      source_video: "local.mp4",
      time_range: "00:01-00:03"
    },
    validationContext: {
      mediaDurationSeconds: 20
    }
  }, [], {}, {
    intentVersion: "1"
  });

  const vocalReplaceFlow = buildExecution21MFlow({
    intentId: "vocal_replace_intent",
    requestId: "vocal_replace_request",
    traceId: "vocal_replace_trace",
    userNeed: "Перепой песню моим голосом",
    productId: productIds.musicFactory,
    primaryCapabilityId: "VOCAL_REPLACE"
  }, {
    currentUserInputs: {
      source_song: "song.wav",
      voice_reference: "lisa_voice_identity_ref",
      rights_consent: "confirmed_for_local_architecture_fixture"
    }
  }, [], {
    [executionApprovalTypes.legalPolicy]: executionApprovalStates.approved,
    [executionApprovalTypes.humanReview]: executionApprovalStates.approved,
    [executionApprovalTypes.externalAccount]: executionApprovalStates.deferred,
    [executionApprovalTypes.providerActivation]: executionApprovalStates.deferred,
    [executionApprovalTypes.payment]: executionApprovalStates.deferred,
    [executionApprovalTypes.destructiveHighImpact]: executionApprovalStates.approved
  }, {
    intentVersion: "2"
  });

  const businessDiscoveryFlow = buildExecution21MFlow({
    intentId: "business_discovery_intent",
    requestId: "business_discovery_request",
    traceId: "business_discovery_trace",
    userNeed: "Найди рестораны в Батуми",
    productId: productIds.business,
    primaryCapabilityId: "BUSINESS_DISCOVERY"
  }, {
    currentUserInputs: {
      target_market: "restaurants",
      geography: "Batumi",
      industries: "hospitality",
      public_sources: "local fixture only",
      data_policy: "PUBLIC_BUSINESS_DATA_ONLY"
    }
  }, [], {}, {
    intentVersion: "4"
  });

  const publishRequest = createExecutionApprovalRequest({
    approvalRequestId: "publish_asset_x_request",
    intentId: "publish_intent",
    intentVersion: "7",
    capabilityId: "PUBLISHING_PACKAGE",
    approvalType: executionApprovalTypes.publish,
    scope: {
      action: "publish",
      contentAssetId: "contentAssetX",
      externalAccount: "accountY",
      intentVersion: "7"
    },
    actionSummary: "Publish contentAssetX to accountY once.",
    consequenceSummary: "Future publish would affect external accountY; Phase 21M only records approval.",
    costClass: "FREE_LOCAL",
    riskClass: "PUBLISH",
    reversibility: "LIMITED_ROLLBACK",
    externalEffect: "FUTURE_PUBLICATION"
  });
  const publishApproved = createExecutionApprovalDecision({
    approvalRequestId: publishRequest.approvalRequestId,
    decision: executionApprovalStates.approved,
    userActorRef: "lisa",
    acknowledgedScope: publishRequest.scope,
    intentVersion: "7"
  });
  const publishToken = issueScopedApprovalToken(publishRequest, publishApproved, {
    tokenId: "publish_asset_x_account_y_token",
    materialParameters: {
      contentAssetId: "contentAssetX",
      externalAccount: "accountY"
    }
  });
  const publishScopeMismatch = verifyScopedApprovalToken(publishToken, {
    intentId: "publish_intent",
    intentVersion: "7",
    capabilityId: "PUBLISHING_PACKAGE",
    scope: {
      action: "publish",
      contentAssetId: "contentAssetX",
      externalAccount: "accountZ",
      intentVersion: "7"
    }
  });

  const costRequest = createExecutionApprovalRequest({
    approvalRequestId: "ad_budget_100_request",
    intentId: "ad_intent",
    intentVersion: "1",
    capabilityId: "CAMPAIGN_PLAN",
    approvalType: executionApprovalTypes.cost,
    scope: {
      action: "approve_ad_budget",
      budget: 100,
      currency: "USD",
      maxCostClass: "METERED"
    },
    costClass: "METERED",
    riskClass: "FINANCIAL",
    externalEffect: "FUTURE_AD_SPEND"
  });
  const costDecision = createExecutionApprovalDecision({
    approvalRequestId: costRequest.approvalRequestId,
    decision: executionApprovalStates.approved,
    userActorRef: "lisa",
    acknowledgedScope: costRequest.scope,
    intentVersion: "1"
  });
  const costToken = issueScopedApprovalToken(costRequest, costDecision, {
    tokenId: "budget_100_token",
    materialParameters: { budget: 100, currency: "USD" }
  });
  const costExpansionChanges = detectMaterialChanges(
    { budget: 100, currency: "USD" },
    { budget: 500, currency: "USD" }
  );
  const nonMaterialChanges = detectMaterialChanges(
    { displayLabel: "Campaign A" },
    { displayLabel: "Campaign A - draft" }
  );

  const rejectionDecision = createExecutionApprovalDecision({
    approvalRequestId: publishRequest.approvalRequestId,
    decision: executionApprovalStates.rejected,
    userActorRef: "lisa",
    acknowledgedScope: publishRequest.scope,
    intentVersion: "7"
  });
  const revokedToken = revokeApprovalToken(publishToken);

  return {
    bookDraft,
    bookFlow,
    websiteFlow,
    videoTrimFlow,
    vocalReplaceFlow,
    businessDiscoveryFlow,
    publish: {
      request: publishRequest,
      decision: publishApproved,
      token: publishToken,
      scopeMismatch: publishScopeMismatch
    },
    costChange: {
      request: costRequest,
      decision: costDecision,
      token: costToken,
      materialChanges: costExpansionChanges
    },
    nonMaterialChange: {
      changes: nonMaterialChanges,
      fingerprintStableForPresentationOnly: createAuthorizationFingerprint({
        intentId: costToken.intentId,
        intentVersion: costToken.intentVersion,
        capabilityId: costToken.capabilityId,
        approvalType: costToken.approvalType,
        scope: costToken.scope,
        materialParameters: { budget: 100, currency: "USD" },
        costClass: costRequest.costClass,
        externalEffect: costRequest.externalEffect
      }) === costToken.authorizationFingerprint
    },
    rejection: {
      decision: rejectionDecision,
      token: issueScopedApprovalToken(publishRequest, rejectionDecision)
    },
    revocation: {
      before: publishToken,
      after: revokedToken
    },
    staleMaterialResolution: createExecutionInputResolution({
      requirementId: "payment_account",
      status: executionInputResolutionStates.stale,
      sourceType: executionInputSourceTypes.userProvidedPrevious,
      freshness: executionInputFreshnessStates.stale,
      materiality: executionInputMateriality.highImpact,
      userConfirmationRequired: true,
      reason: "PAYMENT_ACCOUNT_FROM_LAST_YEAR_REQUIRES_CONFIRMATION"
    }),
    unsafeMaterialInference: resolution({
      requirementId: "ad_budget",
      status: executionInputResolutionStates.invalid,
      sourceType: executionInputSourceTypes.safeInference,
      materiality: executionInputMateriality.highImpact,
      validationState: "INVALID",
      reason: "SAFE_INFERENCE_CANNOT_INFER_BUDGET"
    }),
    statuses: {
      revoked: scopedApprovalTokenStatuses.revoked
    }
  };
}

