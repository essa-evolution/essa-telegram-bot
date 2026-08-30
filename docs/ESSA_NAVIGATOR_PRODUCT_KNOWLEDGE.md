# ESSA Navigator Product Knowledge

Phase 21E connects Navigator to the Phase 21D Capability Fabric and Product Knowledge Graph as a read-only self-knowledge layer. Navigator can discover products and capabilities locally, but cannot execute product workflows or choose providers directly.

## Ownership Boundaries

Navigator is the interaction and navigation layer. Capability Fabric defines what ESSA can do. Product Knowledge explains ESSA in human terms. Intelligence Fabric decides what intelligence, if any, is appropriate for a future task. Agent Tool Layer and ExecutionGateway control execution. Providers are replaceable implementations. Verification is proof. Lisa Product Guide is the public human explanation role. Product Education & Growth is future education and distribution.

## Discovery Flow

User query -> `ProductDiscoveryIntent` -> Navigator Product Knowledge Bridge -> capability/product search -> availability check -> bounded ProductKnowledge context -> `ProductDiscoveryResponse`.

The response is data for Navigator. Phase 21E does not generate model prose, execute composition plans, mutate projects, publish, deploy, or call providers.

## Availability Language

Availability states map to deterministic language keys and cost classes. `ARCHITECTURE_ONLY` cannot be described as active. `READY_FOR_PAYMENT` must disclose that paid provider activation is required. Local/product discovery itself remains free/local.

## Bounded Retrieval

Navigator does not receive all capabilities on every query. Broad catalog questions return product/domain overview first. Specific questions retrieve a small relevant set plus context budget metadata: candidate count, selected count, excluded count, chars, estimated tokens, and budget status.

## Discovery vs Execution

Navigator may resolve `WEBSITE_GENERATE`, build a non-executing composition plan, and suggest a next action. It must not execute. Future execution remains: Navigator -> Intent -> Capability Resolver -> Capability Composition -> Intelligence Router if needed -> Agent Tool Layer -> Policy -> ExecutionIntent -> Approval -> ExecutionGateway -> Provider/Local Tool -> Verification.

## Freshness And Provider Independence

Responses carry source versions and freshness status. Stale product knowledge returns `KNOWLEDGE_REFRESH_REQUIRED`. Navigator vocabulary remains provider-independent: `IMAGE_GENERATE`, not "OpenAI image feature."

## Lisa And Product Education

Lisa Product Guide consumes the same bounded ProductKnowledge source as Navigator and cannot mutate Lisa Character Core. ProductEducationCard and future ProductContentIntent can reuse discovery results later for Reels, TikTok, YouTube, Telegram, in-app, website, and email/newsletter without creating a separate truth store.

## Rollback

Remove `src/navigator/productKnowledgeBridge.js`, `docs/ESSA_NAVIGATOR_PRODUCT_KNOWLEDGE.md`, `scripts/testNavigatorProductKnowledge.js`, and the small productDiscovery additions in `src/navigator/contextEngine.js` and `src/navigator/navigatorOrchestrator.js`.

