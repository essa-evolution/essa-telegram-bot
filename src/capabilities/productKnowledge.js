import {
  capabilityActivationStates,
  createProductContentIntent,
  createProductEducationCard,
  createProductKnowledgeNode
} from "./capabilityContracts.js";
import { getCapability } from "./capabilityRegistry.js";
import { createAdvertisingTruthCheck } from "./capabilityPolicy.js";
import { productIds } from "./productCapabilityMap.js";
import {
  creatorFirstBrandExpressionIds,
  getCreatorFirstBrandExpression,
  systemPrincipleIds
} from "../systemPrinciples/index.js";

export const productKnowledgeNodes = [
  createProductKnowledgeNode({
    nodeId: "essa_creator_first_system_principle",
    productId: productIds.navigator,
    capabilityId: "QUESTION_GENERATION",
    userNeed: "Что ESSA должна делать для меня?",
    userOutcome: "canonical Creator-First explanation grounded in the shared ESSA OS principle",
    plainLanguageDescription: "ESSA takes operational complexity onto itself and brings you decisions where your judgment, consent or authority matters. This is a shared ESSA OS principle, not a live-execution promise: money, publishing, providers, payments, deployment, external accounts, legal decisions and high-impact actions remain approval-gated.",
    exampleRequests: ["Что значит Creator-First?", "Почему ESSA должна готовить контекст перед вопросом?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: [
      "This node explains product behavior principles; it does not enable execution.",
      "Approval, payment, provider, publish, deploy and destructive gates remain authoritative."
    ],
    relatedCapabilities: ["DOCUMENTATION_LOOKUP", "SOURCE_COMPARE"],
    nextPossibleActions: ["explain_creator_first", "show_system_work_vs_human_decision", "prepare_decision_context"],
    metadata: {
      principleId: systemPrincipleIds.creatorFirst,
      brandExpressionIds: [
        creatorFirstBrandExpressionIds.philosophy,
        creatorFirstBrandExpressionIds.shortline
      ],
      canonicalShortline: getCreatorFirstBrandExpression(creatorFirstBrandExpressionIds.shortline)?.text
    }
  }),
  createProductKnowledgeNode({
    nodeId: "execution_input_approval_tokens",
    productId: productIds.navigator,
    capabilityId: "QUESTION_GENERATION",
    userNeed: "Как ESSA спрашивает только недостающие данные и подтверждения перед запуском?",
    userOutcome: "read-only execution input collection, validation and scoped approval token explanation",
    plainLanguageDescription: "ESSA сначала сверяет ExecutionIntentDraft, Preflight и доверенный контекст, переиспользует известные значения, спрашивает только то, что действительно отсутствует или требует человеческого решения, затем готовит scoped approval tokens for future execution. Phase 21M remains non-executing: tokens do not authorize provider calls, payments, publishing or deployment now.",
    exampleRequests: ["Что ещё нужно перед запуском?", "Почему ESSA просит это подтверждение?", "Что разрешает approval token?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: [
      "No actual execution.",
      "No provider/model calls.",
      "No payment, publish, deploy or external account mutation.",
      "Scoped approval tokens are local architecture metadata only in Phase 21M."
    ],
    relatedCapabilities: ["DOCUMENTATION_LOOKUP", "SOURCE_COMPARE"],
    nextPossibleActions: ["resolve_known_inputs", "collect_missing_inputs", "review_material_approvals"],
    metadata: {
      phase: "21M",
      creatorFirstPrincipleId: systemPrincipleIds.creatorFirst,
      readinessTerminalState: "READY_FOR_FUTURE_EXECUTION_PLUS_EXECUTION_DISABLED_PHASE_21M"
    }
  }),
  createProductKnowledgeNode({
    nodeId: "publishing_book_cover",
    productId: productIds.publishing,
    capabilityId: "BOOK_COVER",
    userNeed: "Мне нужна обложка книги",
    userOutcome: "cover concept and production-ready cover path",
    plainLanguageDescription: "Создать визуальную концепцию обложки книги и подготовить путь к финальному файлу.",
    exampleRequests: ["Сделай обложку для моей книги", "Придумай три варианта обложки"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["Image provider execution is not active in Phase 21D."],
    relatedCapabilities: ["IMAGE_GENERATE", "IMAGE_EDIT", "DOCUMENT_FORMAT"],
    nextPossibleActions: ["collect_book_title", "collect_style_reference", "create_cover_brief"]
  }),
  createProductKnowledgeNode({
    nodeId: "developer_website_generate",
    productId: productIds.developer,
    capabilityId: "WEBSITE_GENERATE",
    userNeed: "Мне нужен сайт",
    userOutcome: "website structure, design, code plan and verification path",
    plainLanguageDescription: "Опиши бизнес, и ESSA поможет собрать структуру, дизайн и код сайта, а затем проверить результат.",
    exampleRequests: ["Сделай сайт для ресторана", "Нужен лендинг для продукта"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["This registry entry is architecture-only until product execution policy is activated."],
    relatedCapabilities: ["ARCHITECTURE_DESIGN", "UI_GENERATE", "CODE_GENERATE", "BROWSER_OBSERVE", "UI_VERIFY"]
  }),
  createProductKnowledgeNode({
    nodeId: "production_reel_create",
    productId: productIds.production,
    capabilityId: "VIDEO_EDIT",
    userNeed: "Хочу сделать ролик",
    userOutcome: "short video workflow with captions, edit plan and export path",
    plainLanguageDescription: "ESSA Production разбирает смысл ролика, собирает монтажный план, субтитры и путь к экспорту.",
    exampleRequests: ["Сделай ролик", "Подготовь Reels из видео"],
    availabilityState: capabilityActivationStates.architectureOnly,
    relatedCapabilities: ["SEMANTIC_ANALYZE", "VIDEO_CAPTION", "VIDEO_TRIM", "VIDEO_EXPORT"]
  }),
  createProductKnowledgeNode({
    nodeId: "production_video_trim_safe_local",
    productId: productIds.production,
    capabilityId: "VIDEO_TRIM",
    userNeed: "Обрезать видео локально без изменения исходника.",
    userOutcome: "safe local video trim with a new derived artifact, source preservation, ffprobe verification and rollback by deleting the derived result",
    plainLanguageDescription: "ESSA может локально обрезать видео через строго разрешённую операцию VIDEO_TRIM: исходный файл не перезаписывается, создаётся новый derived artifact, результат проверяется ffprobe, rollback означает удалить созданный результат. Это не включает полный видеомонтаж, публикацию, провайдеров, оплату, рекламу или внешние аккаунты.",
    exampleRequests: ["Обрежь видео с 00:02 до 00:05", "Сделай новый файл из этого фрагмента видео"],
    availabilityState: capabilityActivationStates.localReady,
    limitations: [
      "Phase 21O proves VIDEO_TRIM through the generalized safe local runtime; broader VIDEO_EDIT remains architecture-only.",
      "No broad VIDEO_EDIT execution.",
      "No provider/model calls.",
      "No publish, deploy, payment, ads or external account mutation."
    ],
    relatedCapabilities: ["VIDEO_ANALYZE", "FRAME_EXTRACT", "VIDEO_EXPORT"],
    nextPossibleActions: ["prepare_video_trim_inputs", "run_safe_local_video_trim", "verify_trimmed_artifact"],
    metadata: {
      phase: "21N",
      executionClass: "SAFE_LOCAL_EXECUTION",
      sourcePreservationRequired: true,
      derivedArtifactRequired: true,
      verificationRequired: "ffprobe"
    }
  }),
  createProductKnowledgeNode({
    nodeId: "production_media_probe_safe_local",
    productId: productIds.production,
    capabilityId: "MEDIA_PROBE",
    userNeed: "Проверить параметры локального медиафайла без изменения файла.",
    userOutcome: "read-only local media observation with duration, dimensions, stream metadata, source preservation and ffprobe verification",
    plainLanguageDescription: "ESSA может локально определить длительность, размер, контейнер и параметры дорожек медиафайла. Это read-only проверка: исходный файл не меняется, derived artifact не создаётся, внешние сервисы не используются.",
    exampleRequests: ["Проверь параметры этого видео", "Сколько длится этот медиафайл и есть ли в нём аудио?"],
    availabilityState: capabilityActivationStates.localReady,
    limitations: [
      "Read-only local observation only.",
      "No media editing, publishing, providers, payment, ads or external accounts.",
      "Normal UX does not expose raw ffprobe output."
    ],
    relatedCapabilities: ["VIDEO_ANALYZE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"],
    nextPossibleActions: ["run_safe_local_media_probe", "review_media_observation", "prepare_safe_local_transform"],
    metadata: {
      phase: "21O",
      executionClass: "SAFE_LOCAL_EXECUTION",
      executionMode: "LOCAL_READ_ONLY",
      sourcePreservationRequired: true,
      derivedArtifactRequired: false,
      verificationRequired: "ffprobe"
    }
  }),
  createProductKnowledgeNode({
    nodeId: "production_video_resize_safe_local",
    productId: productIds.production,
    capabilityId: "VIDEO_RESIZE",
    userNeed: "Создать локальную версию видео другого размера без изменения исходника.",
    userOutcome: "safe local resized video artifact with source preservation, dimension verification and rollback by deleting the derived result",
    plainLanguageDescription: "ESSA может локально создать новую версию видео другого размера по заранее разрешённому профилю. Исходник не перезаписывается, результат проверяется ffprobe, rollback означает удалить созданную копию.",
    exampleRequests: ["Сделай локальную копию видео 320 на 180", "Уменьши видео в новый файл"],
    availabilityState: capabilityActivationStates.localReady,
    limitations: [
      "Only bounded resize profiles are enabled.",
      "No AI upscaling, generative fill or arbitrary FFmpeg flags.",
      "No broad VIDEO_EDIT execution, publishing, providers, payment, ads or external accounts."
    ],
    relatedCapabilities: ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_EXPORT"],
    nextPossibleActions: ["prepare_video_resize_inputs", "run_safe_local_video_resize", "verify_resized_artifact"],
    metadata: {
      phase: "21O",
      executionClass: "SAFE_LOCAL_EXECUTION",
      executionMode: "LOCAL_DERIVED_ARTIFACT",
      allowedProfiles: ["VIDEO_RESIZE_320x180"],
      sourcePreservationRequired: true,
      derivedArtifactRequired: true,
      verificationRequired: "ffprobe"
    }
  }),
  createProductKnowledgeNode({
    nodeId: "production_audio_extract_safe_local",
    productId: productIds.production,
    capabilityId: "AUDIO_EXTRACT",
    userNeed: "Извлечь аудиодорожку из локального медиафайла без изменения исходника.",
    userOutcome: "safe local extracted audio artifact with source preservation, audio stream verification and rollback by deleting the derived result",
    plainLanguageDescription: "ESSA может локально извлечь аудиодорожку в новый файл по разрешённому профилю. Исходное видео не меняется, результат проверяется ffprobe, внешние сервисы не используются.",
    exampleRequests: ["Извлеки аудио из этого видео", "Сделай WAV-копию аудиодорожки"],
    availabilityState: capabilityActivationStates.localReady,
    limitations: [
      "Only AUDIO_WAV_STANDARD is enabled in Phase 21O.",
      "No arbitrary codec flags.",
      "No provider/model calls, payment, publishing, ads or external account mutation."
    ],
    relatedCapabilities: ["MEDIA_PROBE", "VIDEO_TRIM", "AUDIO_ANALYZE"],
    nextPossibleActions: ["prepare_audio_extract_inputs", "run_safe_local_audio_extract", "verify_audio_artifact"],
    metadata: {
      phase: "21O",
      executionClass: "SAFE_LOCAL_EXECUTION",
      executionMode: "LOCAL_DERIVED_ARTIFACT",
      allowedProfiles: ["AUDIO_WAV_STANDARD"],
      sourcePreservationRequired: true,
      derivedArtifactRequired: true,
      verificationRequired: "ffprobe"
    }
  }),
  createProductKnowledgeNode({
    nodeId: "production_content_business_outcome",
    productId: productIds.production,
    capabilityId: "CONTENT_PERFORMANCE_ANALYZE",
    userNeed: "Понять, какой контент реально приводит клиентов.",
    userOutcome: "architecture-only content intelligence report separating views, conversions, revenue evidence and learning",
    plainLanguageDescription: "ESSA Production готовит архитектуру, где ролик оценивается не только по просмотрам: внимание, клики, лиды, покупки, стоимость, выручка и следующий контент остаются отдельными слоями. В Phase 21L-CR это локальные контракты и fixtures, без live analytics, tracking pixels, social APIs or payment providers.",
    exampleRequests: ["Какие ролики приводят покупателей?", "Сравни контент не только по просмотрам."],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["No live analytics connections.", "No user tracking or revenue invention.", "No publishing or ad execution."],
    relatedCapabilities: ["CONTENT_ANALYZE", "CONTENT_ATTRIBUTION", "CONTENT_ECONOMICS", "CONTENT_LEARN", "NEXT_CONTENT_RECOMMEND"],
    nextPossibleActions: ["review_content_asset_contract", "run_local_fixture_preview", "show_data_completeness"]
  }),
  createProductKnowledgeNode({
    nodeId: "production_offer_aware_content_plan",
    productId: productIds.production,
    capabilityId: "OFFER_AWARE_CONTENT_PLAN",
    userNeed: "Связать ролик с оффером и результатом.",
    userOutcome: "content plan references Business-owned offer, CTA and funnel without forcing every asset to be commercial",
    plainLanguageDescription: "Коммерческий контент может ссылаться на Business-owned offer, CTA и funnel, но ESSA Production не создает payment system и не навязывает revenue attribution каждому ролику. Некоммерческий, образовательный и trust-контент остаются допустимыми.",
    exampleRequests: ["Что мы продаем в этом ролике?", "Какой CTA поставить для этого продукта?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["Offer truth remains in ESSA Business.", "Transaction/revenue truth remains outside Production."],
    relatedCapabilities: ["BUSINESS_GROWTH_PLAN", "CAMPAIGN_PLAN", "CONTENT_ATTRIBUTION", "CONTENT_ECONOMICS"]
  }),
  createProductKnowledgeNode({
    nodeId: "production_hook_format_learning",
    productId: productIds.production,
    capabilityId: "CONTENT_LEARN",
    userNeed: "Понять, какие hooks/форматы лучше работают для конкретной аудитории.",
    userOutcome: "scoped content learning observations and future pattern insights without rewriting Lisa Character Core",
    plainLanguageDescription: "ESSA может архитектурно хранить, какие hooks, topics, formats, CTA, platform, audience и production mode связаны с результатами. Наблюдение, корреляция, гипотеза и validated insight не смешиваются; данные performance не переписывают Lisa Character Core.",
    exampleRequests: ["Что улучшить в следующем месяце контента?", "Какие hooks работают для этой аудитории?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["No automatic content generation in this phase.", "No correlation-as-causation claim."],
    relatedCapabilities: ["NEXT_CONTENT_RECOMMEND", "CONTENT_EXPERIMENT", "VIRAL_PATTERN_ANALYZE"]
  }),
  createProductKnowledgeNode({
    nodeId: "production_controlled_content_variants",
    productId: productIds.production,
    capabilityId: "CONTENT_EXPERIMENT",
    userNeed: "Создавать контролируемые варианты одного контента для тестирования.",
    userOutcome: "architecture-only master/variant experiment plan with explicit change sets, goal-aware winner detection and next-generation recommendations",
    plainLanguageDescription: "ESSA может архитектурно описать master content, варианты A/B/C, что именно изменилось, гипотезу, controlled variables, цель успеха и следующий набор тестов. Победитель определяется относительно цели кампании, а не только по просмотрам. Live platform testing, Trial Reels, ads, publishing and external services are not active.",
    exampleRequests: [
      "Сделай Hook A/B/C для одного ролика и объясни, что тестируем.",
      "Определи победителя относительно цели кампании, а не только просмотров.",
      "Построй следующую серию тестов на основе полученных сигналов."
    ],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: [
      "No live social testing.",
      "No automatic variant generation.",
      "No publishing or ad campaign execution.",
      "No external experiment service dependency."
    ],
    relatedCapabilities: ["CONTENT_PERFORMANCE_ANALYZE", "CONTENT_ECONOMICS", "CONTENT_LEARN", "NEXT_CONTENT_RECOMMEND"],
    nextPossibleActions: ["review_variant_lineage", "compare_goal_specific_winners", "prepare_next_generation_recommendation"]
  }),
  createProductKnowledgeNode({
    nodeId: "production_faceless_channel_factory",
    productId: productIds.production,
    capabilityId: "FACELESS_CHANNEL_BUILD",
    userNeed: "Создать faceless-медиа pipeline.",
    userOutcome: "architecture-only faceless channel factory from research through learning with approval gates",
    plainLanguageDescription: "ESSA Production описывает faceless channel factory как pipeline: research, ideas, scripts, voice, visuals, editing, captions, thumbnail, metadata, QA, approval, scheduling, publishing, analytics and learning. Production остается human/avatar/faceless/hybrid, not faceless-only.",
    exampleRequests: ["Создай faceless-канал.", "Собери pipeline для канала без съемок."],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["No autonomous publishing now.", "No social API connections.", "Autonomous future mode still inherits approval and policy rules."],
    relatedCapabilities: ["CONTENT_PLAN", "VOICE_GENERATE", "VIDEO_EDIT", "CONTENT_PERFORMANCE_ANALYZE", "CONTENT_LEARN"]
  }),
  createProductKnowledgeNode({
    nodeId: "business_capabilities",
    productId: productIds.business,
    capabilityId: "BUSINESS_ANALYZE",
    userNeed: "Что умеет ESSA для бизнеса?",
    userOutcome: "bounded business capability explanation",
    plainLanguageDescription: "ESSA Business помогает разбирать бизнес, аудит, рост, подготовку к продаже и маркетинговый план.",
    exampleRequests: ["Что есть для бизнеса?", "Помоги найти точки роста"],
    availabilityState: capabilityActivationStates.architectureOnly,
    relatedCapabilities: ["BUSINESS_AUDIT", "BUSINESS_GROWTH_PLAN", "BUSINESS_SALE_PREP", "MARKETING_PLAN"]
  }),
  createProductKnowledgeNode({
    nodeId: "business_lead_discovery",
    productId: productIds.business,
    capabilityId: "BUSINESS_DISCOVERY",
    userNeed: "Найти подходящие компании для B2B-предложения",
    userOutcome: "review-only public business lead intelligence with source, freshness and ESSA fit evidence",
    plainLanguageDescription: "ESSA может принять критерии бизнеса, собрать локальный проверочный список компаний из разрешенного источника и показать, где есть совпадение с продуктами ESSA. В Phase 21J-LI это работает только на локальных fixtures, без live scraping, отправки сообщений или CRM-записи.",
    exampleRequests: ["Найди рестораны в Батуми, которым может подойти ESSA", "Покажи компании для рекламного предложения"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["Live public-source discovery is not active.", "No scraping, outreach, CRM mutation or personal-contact harvesting is enabled."],
    relatedCapabilities: ["BUSINESS_DATA_NORMALIZE", "BUSINESS_DEDUPLICATE", "BUSINESS_ENTITY_VERIFY", "LEAD_QUALIFY", "ESSA_FIT_MATCH"],
    nextPossibleActions: ["collect_lead_discovery_request", "run_local_fixture_preview", "show_review_queue"]
  }),
  createProductKnowledgeNode({
    nodeId: "business_entity_verify",
    productId: productIds.business,
    capabilityId: "BUSINESS_ENTITY_VERIFY",
    userNeed: "Проверить, насколько надежна информация о компании",
    userOutcome: "verification status with source count, freshness and review requirement",
    plainLanguageDescription: "ESSA отделяет наблюдаемые публичные факты о компании от предположений и помечает stale or insufficient evidence before any future action.",
    exampleRequests: ["Проверь этот список компаний", "Какие лиды требуют обновления?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["Uses local fixture evidence only in Phase 21J-LI."],
    relatedCapabilities: ["BUSINESS_DISCOVERY", "BUSINESS_DATA_NORMALIZE", "BUSINESS_DEDUPLICATE"]
  }),
  createProductKnowledgeNode({
    nodeId: "business_essa_fit_match",
    productId: productIds.advertising,
    capabilityId: "ESSA_FIT_MATCH",
    userNeed: "Понять, какой продукт ESSA подходит компании",
    userOutcome: "product and capability match based on verified public need signals",
    plainLanguageDescription: "ESSA связывает наблюдаемые сигналы бизнеса с Advertising, Production, Business, Creator Network or Developer, without claiming unavailable execution.",
    exampleRequests: ["Каким компаниям подходит ESSA Advertising?", "Почему этот ресторан подходит для видео и рекламы?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["Fit matching is a review aid, not permission to send outreach."],
    relatedCapabilities: ["BUSINESS_NEED_ANALYZE", "LEAD_QUALIFY", "CAMPAIGN_PLAN", "CREATOR_MATCH"]
  }),
  createProductKnowledgeNode({
    nodeId: "property_local_passport_preview",
    productId: productIds.property,
    capabilityId: "PROPERTY_ANALYZE",
    userNeed: "Понять, что ESSA Property уже умеет сейчас",
    userOutcome: "read-only local Property discovery, structured query results, Property Passport, Comparison, source lineage, freshness, verification, risks and Lisa explanation",
    plainLanguageDescription: "ESSA Property сейчас умеет распознать property intent, преобразовать обычный запрос в structured Property query, показать bounded local Property results, открыть read-only Property Passport, сравнить найденные локальные Property records, and архитектурно подготовить local source ingestion/normalization gate before repository reads. Lisa explains source/freshness badges, risk flags, gaps and ingestion limitations. Live search, live listing imports, maps, provider ingestion, booking, transaction, payment, ownership/legal verification, KYC/KYB, signatures, provider integrations and Property Stay are not active.",
    exampleRequests: ["Покажи квартиры в Батуми", "Ищу квартиру до 150000 USD", "Что продаётся в Грузии?", "Что известно об этой квартире?", "Какие данные проверены?", "Есть ли риски?", "Откуда эта информация?", "Что значит Property Passport?"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: [
      "Live property search is not active; Phase 22G searches local repository data only.",
      "Phase 22H source ingestion is local fixture architecture only; live provider ingestion is not active.",
      "Live property search, maps and live listing imports are not active.",
      "Booking, transaction, payment and Property Stay are not active.",
      "Ownership, legal verification, KYC/KYB and signatures are not active.",
      "Phase 22G uses local repository/fixture data only."
    ],
    relatedCapabilities: ["PROPERTY_PRESENTATION", "INVESTMENT_PACKAGE", "BUSINESS_DISCOVERY", "BUSINESS_ENTITY_VERIFY"],
    nextPossibleActions: ["open_property_discovery", "open_property_overview", "open_property_passport_preview", "compare_local_properties", "ask_lisa_about_property_results", "explain_property_freshness", "inspect_property_gaps", "explain_ingestion_lineage", "explain_unavailable_live_features"]
  }),
  createProductKnowledgeNode({
    nodeId: "property_guided_add_property_intake",
    productId: productIds.property,
    capabilityId: "PROPERTY_ADD_INTAKE",
    userNeed: "Добавить объект в ESSA и понять, какие права/доказательства нужны",
    userOutcome: "guided local AddPropertyIntent with actor, organization, relationship, authority, evidence and review readiness",
    plainLanguageDescription: "ESSA Property может локально провести пользователя по Add Property intake: кто действует, кого представляет, какой объект или candidate добавляется, какая relationship заявлена, какое действие нужно, какие authority/evidence есть, чего не хватает и можно ли передать case на local review. Это не публикация Listing и не проверка собственности.",
    exampleRequests: ["Хочу добавить квартиру в ESSA", "Я агент и хочу добавить listing", "Я представляю девелопера", "Я управляю квартирой", "Я не уверен, какой путь выбрать"],
    availabilityState: capabilityActivationStates.localReady,
    limitations: [
      "Local guided proof only; no production persistence.",
      "No real identity, ownership, mandate, legal or jurisdiction verification.",
      "No government registry, provider-backed verification, document signing, listing creation, publication, booking, payment, transaction or Stay execution."
    ],
    relatedCapabilities: ["PROPERTY_ANALYZE", "PROPERTY_PRESENTATION", "BUSINESS_ENTITY_VERIFY"],
    nextPossibleActions: ["open_add_property_guided_intake", "collect_actor_declaration", "collect_authority_evidence_ref", "show_review_readiness", "route_to_existing_review_workflow"]
  }),
  createProductKnowledgeNode({
    nodeId: "music_vocal_replace",
    productId: productIds.musicFactory,
    capabilityId: "VOCAL_REPLACE",
    userNeed: "Перепой песню моим голосом",
    userOutcome: "rights-aware vocal replacement workflow plan",
    plainLanguageDescription: "ESSA Music Factory может спланировать замену вокала как workflow, но voice execution remains gated.",
    exampleRequests: ["Перепой песню моим голосом"],
    availabilityState: capabilityActivationStates.architectureOnly,
    limitations: ["Requires rights review and voice identity approval before any future execution."],
    relatedCapabilities: ["MUSIC_ANALYZE", "STEM_SEPARATE", "VOICE_REPLACE", "AUDIO_MIX"]
  })
];

export const productEducationCards = [
  createProductEducationCard({
    educationId: "education_essa_production_intro",
    productId: productIds.production,
    capabilityId: "VIDEO_EDIT",
    audience: "creator",
    problem: "User has raw footage but does not know how to turn it into a clear short video.",
    promise: "ESSA Production can turn a user goal into an edit workflow and verification path.",
    whatUserCanDo: "Загрузить/описать материал и попросить ролик, субтитры или монтажный план.",
    howItWorksPlainLanguage: "ESSA сначала понимает смысл, потом выбирает локальные инструменты или провайдеров по политике.",
    examplePrompt: "Как пользоваться ESSA Production?",
    stepSequence: ["describe_goal", "select_source", "semantic_plan", "edit_plan", "verify", "approval"],
    expectedOutcome: "A bounded production workflow explanation.",
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["как сделать reels", "как ESSA выбирает tools", "почему verification matters"],
    supportedFormats: ["ESSA in-app", "Telegram", "Instagram Reels future"]
  }),
  createProductEducationCard({
    educationId: "education_book_cover_angles",
    productId: productIds.publishing,
    capabilityId: "BOOK_COVER",
    audience: "author",
    problem: "Author needs a cover but does not know how to brief design work.",
    promise: "ESSA Publishing can turn a book idea into a cover direction and variants workflow.",
    whatUserCanDo: "Описать книгу, аудиторию и визуальный стиль.",
    howItWorksPlainLanguage: "ESSA maps the request to cover design capabilities and only advertises current availability.",
    examplePrompt: "Сделай обложку для моей книги.",
    stepSequence: ["book_context", "cover_brief", "visual_direction", "variants_future", "verification"],
    expectedOutcome: "A cover brief and future design workflow.",
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["Как сделать обложку книги", "3 ошибки в обложке", "Из текста книги в визуальную концепцию"],
    supportedFormats: ["ESSA in-app", "website", "short-form future"]
  }),
  createProductEducationCard({
    educationId: "education_lead_intelligence_how_searches",
    productId: productIds.business,
    capabilityId: "BUSINESS_DISCOVERY",
    audience: "business_owner",
    problem: "User wants to find relevant companies without guessing or spamming.",
    promise: "ESSA Lead Intelligence turns a market question into a reviewable local discovery preview.",
    whatUserCanDo: "Описать рынок, город, тип бизнеса и желаемое предложение.",
    howItWorksPlainLanguage: "Lisa explains that ESSA uses verified Product Knowledge, allowed public business fields and source/freshness checks before showing a review queue.",
    examplePrompt: "Найди рестораны в Батуми, которым может подойти ESSA.",
    stepSequence: ["lead_request", "allowed_sources", "normalize", "dedupe", "verify", "match_essa_fit", "human_review"],
    expectedOutcome: "A local, source-labeled business discovery preview.",
    limitations: ["No live scraping or outreach in Phase 21J-LI."],
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["как ESSA ищет B2B-клиентов", "почему качество лидов важнее количества", "как не превращать discovery в спам"],
    supportedFormats: ["ESSA in-app", "website", "Telegram", "Reels future", "TikTok future", "YouTube Shorts future", "email/newsletter future"]
  }),
  createProductEducationCard({
    educationId: "education_lead_intelligence_verification",
    productId: productIds.business,
    capabilityId: "BUSINESS_ENTITY_VERIFY",
    audience: "founder",
    problem: "Lead lists become risky when source, freshness and evidence are unclear.",
    promise: "ESSA marks source count, stale data and review requirements before any business action.",
    whatUserCanDo: "Попросить проверить список или показать, какие записи требуют обновления.",
    howItWorksPlainLanguage: "ESSA keeps observed facts separate from inferred opportunities and refuses personal/sensitive data by default.",
    examplePrompt: "Проверь качество этих лидов.",
    stepSequence: ["source_review", "freshness_check", "evidence_count", "privacy_filter", "review_required"],
    expectedOutcome: "A verification result that is safe to review locally.",
    limitations: ["Does not prove real-world existence beyond allowed source evidence."],
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["почему лиды устаревают", "как ESSA проверяет публичные факты", "почему личные данные не нужны для B2B discovery"],
    supportedFormats: ["ESSA in-app", "website", "Telegram", "email/newsletter future"]
  }),
  createProductEducationCard({
    educationId: "education_lead_intelligence_fit",
    productId: productIds.advertising,
    capabilityId: "ESSA_FIT_MATCH",
    audience: "marketer",
    problem: "A company may be interesting, but the right ESSA product angle is unclear.",
    promise: "ESSA maps observed needs to Advertising, Production, Business, Creator Network or Developer paths.",
    whatUserCanDo: "Попросить объяснить, почему конкретной компании подходит реклама, видео, сайт или creator brief.",
    howItWorksPlainLanguage: "Lisa can turn one verified capability match into several honest education angles without promising unavailable execution.",
    examplePrompt: "Почему этому ресторану может подойти ESSA Advertising?",
    stepSequence: ["need_signal", "product_match", "capability_match", "claim_check", "content_angle"],
    expectedOutcome: "A product-fit explanation with safe wording.",
    limitations: ["Fit does not authorize outreach or provider execution."],
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["ресторан без сайта", "кафе с устаревшим сайтом", "бренд без коротких видео", "creator brief for local business"],
    supportedFormats: ["Reels future", "TikTok future", "YouTube Shorts future", "YouTube future", "Telegram", "ESSA in-app", "website", "email/newsletter future"]
  }),
  createProductEducationCard({
    educationId: "education_property_passport_preview",
    productId: productIds.property,
    capabilityId: "PROPERTY_ANALYZE",
    audience: "real_estate_user",
    problem: "User wants to understand a property without mixing facts, guesses and stale listing data.",
    promise: "ESSA Property can turn a simple local property question into structured read-only discovery results, then open Passport or Comparison with source/freshness/risk context.",
    whatUserCanDo: "Попросить квартиры в Батуми, объекты в Грузии, квартиру до указанного бюджета, обзор объекта, проверенные данные, риски, источники, freshness или объяснение Lisa.",
    howItWorksPlainLanguage: "Lisa explains the understood query filters, local matches, verified facts, inferred facts, stale data, source lineage, ingestion lineage, risks and gaps from local repository data, and clearly says that live search, listing imports, provider ingestion, maps, booking, payments, transactions and legal/ownership verification are not active.",
    examplePrompt: "Покажи квартиры в Батуми до 130000 USD.",
    stepSequence: ["property_intent", "local_source_ingestion_fixture", "validation", "normalization", "canonical_resolution", "local_repository_read", "bounded_results", "passport_or_compare", "freshness_check", "truthful_explanation"],
    expectedOutcome: "A safe read-only local Property discovery result with Passport/Comparison actions.",
    limitations: [
      "Local repository/fixtures only in Phase 22G.",
      "Phase 22H ingestion uses local fixture adapters only.",
      "No live providers, listing imports, maps, booking, payments, transactions, legal verification, signatures or Property Stay."
    ],
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["как искать локальные Property records в ESSA", "что такое Property Passport", "почему Property не равно Listing", "как ESSA показывает stale data", "что пока не активно в ESSA Property"],
    supportedFormats: ["ESSA in-app", "Telegram", "website", "email/newsletter future"]
  }),
  createProductEducationCard({
    educationId: "education_property_guided_add_property",
    productId: productIds.property,
    capabilityId: "PROPERTY_ADD_INTAKE",
    audience: "real_estate_owner_agent_developer_manager",
    problem: "User wants to add a property but role, organization, authority, evidence and review readiness are mixed together.",
    promise: "ESSA guides the user through actor, organization, relationship, authority, Property/candidate, intent, evidence and review readiness without creating a listing.",
    whatUserCanDo: "Выбрать Owner, Developer, Agent/Agency, Property Manager, Authorized Representative, Service Provider or I am not sure, then see what is known, claimed, provided, missing and ready for review.",
    howItWorksPlainLanguage: "Lisa explains why a claim is not authority, why membership is not mandate, why management does not imply sale authority and why jurisdiction may require later review. Navigator routes into the branch but cannot bypass authority.",
    examplePrompt: "Хочу добавить квартиру в ESSA.",
    stepSequence: ["about_you", "organization", "property_relationship", "property", "intent", "authority", "evidence", "review_readiness"],
    expectedOutcome: "A local AddPropertyIntent and authority-aware review readiness preview.",
    limitations: [
      "No real verification, legal sufficiency, provider calls, production DB write, listing creation, publication, booking, payment or transaction."
    ],
    availabilityState: capabilityActivationStates.localReady,
    contentAngles: ["как добавить объект в ESSA", "почему агенту нужен mandate", "чем Property Manager отличается от Owner", "что значит READY_FOR_LOCAL_REVIEW", "почему Service Provider идет в отдельный будущий flow"],
    supportedFormats: ["ESSA in-app", "Telegram", "website", "email/newsletter future", "Reels future", "TikTok future", "YouTube Shorts future"]
  }),
  createProductEducationCard({
    educationId: "education_lead_intelligence_no_spam",
    productId: productIds.creatorNetwork,
    capabilityId: "OUTREACH_PREPARE",
    audience: "growth_operator",
    problem: "Business discovery can become spam if sending is mixed with research.",
    promise: "ESSA keeps discovery, review and future outreach as separate gated phases.",
    whatUserCanDo: "Подготовить локальный brief for review, not a send action.",
    howItWorksPlainLanguage: "Phase 21J-LI can prepare safe context and explicitly disables send counts, dispatch, CRM mutation and social automation.",
    examplePrompt: "Подготовь review brief для этих компаний.",
    stepSequence: ["verified_lead", "fit_reason", "human_review", "policy_check", "future_channel_approval"],
    expectedOutcome: "A non-sending outreach-prep preview.",
    limitations: ["Outreach sending is disabled and future-only."],
    availabilityState: capabilityActivationStates.architectureOnly,
    contentAngles: ["как подготовить B2B brief без спама", "review before outreach", "Creator Network briefs from Product Knowledge"],
    supportedFormats: ["ESSA in-app", "website", "Telegram", "email/newsletter future"]
  })
];

export function createProductContentIntentFromEducation(educationId, options = {}) {
  const card = productEducationCards.find((item) => item.educationId === educationId);
  if (!card) return null;
  const capability = getCapability(card.capabilityId);

  return createProductContentIntent({
    productId: card.productId,
    capabilityId: card.capabilityId,
    channel: options.channel || "ESSA in-app",
    format: options.format || "guide_card",
    audience: card.audience,
    hook: options.hook || card.problem,
    problem: card.problem,
    demonstration: card.howItWorksPlainLanguage,
    steps: card.stepSequence,
    outcome: card.expectedOutcome,
    CTA: card.callToActionFuture,
    LisaCharacterContext: options.LisaCharacterContext || null,
    sourceCapabilityVersion: capability?.version || null,
    sourceProductVersion: card.sourceVersion,
    requiresFreshnessCheck: true
  });
}

export function explainKnowledgeNode(node, capability = getCapability(node.capabilityId)) {
  const truth = createAdvertisingTruthCheck(capability);
  return {
    nodeId: node.nodeId,
    productId: node.productId,
    capabilityId: node.capabilityId,
    explanation: node.plainLanguageDescription,
    availabilityState: truth.availabilityState,
    maySayAvailableNow: truth.maySayAvailableNow,
    requiredWording: truth.requiredWording,
    examples: [...node.exampleRequests],
    limitations: [...node.limitations]
  };
}
