# ESSA Product Discovery UI

Phase 21F adds a read-only Product Discovery and Lisa Education surface inside the existing ESSA Workspace.

## Scope

The surface explains what ESSA can do, what is available now, what requires activation, and what is still architecture-only. It does not execute workflows, call providers, activate payment, deploy, publish, post to social platforms, or mutate user projects.

## Source Of Truth

UI view models are built from:

- Capability Registry
- Product Capability Map
- Product Knowledge Graph
- Capability Availability
- Phase 21E ProductDiscoveryResponse
- ProductEducationCard data

There is no separate marketing truth store in the UI. Product copy, examples, limitations, availability state, freshness, and source versions come from the capability/product knowledge layer.

## Product Discovery Surface

The Workspace route `#product-discovery` renders:

- product overview cards
- product-level availability summaries
- bounded search results
- capability cards
- product detail state
- capability detail state
- Lisa Product Guide education panel
- optional debug/provenance metadata

The broad overview uses bounded ProductDiscoveryResponse data and renders a product/domain overview before capability details. It never dumps all registered capabilities at once.

## CapabilityCardViewModel

The UI-ready capability card includes:

- `capabilityId`
- `productId`
- `title`
- `plainLanguageDescription`
- `userOutcome`
- `availabilityState`
- `availabilityLabel`
- `activationRequirement`
- `exampleRequests`
- `relatedCapabilities`
- `limitations`
- `freshnessStatus`
- `educationEligible`
- `contentEligible`
- `sourceVersion`
- `costLabel`
- `uiActions`

Normal presentation is provider-independent. Provider names are only kept in debug metadata.

## ProductAvailabilitySummary

Each product card/detail can render:

- `totalCapabilities`
- `activeCount`
- `localReadyCount`
- `readyForActivationCount`
- `paymentRequiredCount`
- `architectureOnlyCount`
- `unavailableCount`
- `staleCount`

This is computed from current capability/product availability, not hard-coded in Workspace UI.

## Availability Labels

Availability badges map state to user-facing labels:

- `ACTIVE` -> `ДОСТУПНО`
- `LOCAL_READY` -> `РАБОТАЕТ ЛОКАЛЬНО`
- `PROVIDER_READY` / `READY_FOR_ACTIVATION` -> `ГОТОВО К АКТИВАЦИИ`
- `READY_FOR_KEY` -> `НУЖЕН КЛЮЧ`
- `READY_FOR_PAYMENT` -> `НУЖНА ОПЛАТА ПРОВАЙДЕРА`
- `ARCHITECTURE_ONLY` -> `В РАЗРАБОТКЕ`
- `UNAVAILABLE` / `DISABLED` / `DEGRADED` -> `ВРЕМЕННО НЕДОСТУПНО`
- stale knowledge -> `ОБНОВЛЕНИЕ ДАННЫХ ТРЕБУЕТСЯ`

`ARCHITECTURE_ONLY` must never render as active.

## Navigator Handoff

Navigator remains the interaction layer. The Product Discovery UI consumes the same structured ProductDiscoveryResponse produced by Phase 21E. Navigator does not generate HTML; it supplies bounded data that the UI can render as product and capability cards.

## Lisa Education Surface

The Lisa panel renders structured ProductEducationCard data:

- `Что это?`
- `Что можно сделать?`
- `Как это работает?`
- `Пример запроса`
- `Что получится?`
- `Что пока недоступно?`

Lisa Character Core remains authoritative. Lisa is the product guide, not a separate marketing persona. In Phase 21F, there is no TTS, generated video, generated social copy, or external LLM.

## Product Education & Growth

The UI exposes future metadata for:

- Reels
- TikTok
- YouTube Shorts
- YouTube
- Telegram
- ESSA in-app
- website
- email/newsletter

This metadata can later feed education content, Creator Network briefs, and ESSA Advertising briefs, but Phase 21F only renders eligibility and structured education data.

## Search And Filter

The search box asks: `Что вы хотите сделать?`

Search uses the local Phase 21E bridge and returns bounded results. Filters can narrow by availability. The implementation is deliberately small to preserve cognitive simplicity.

## Bounded Retrieval

The overview uses a bounded product list. Specific search uses a bounded capability result set. Product detail renders product-specific capabilities only.

## Execution Boundary

All UI actions have `executionEnabled=false`.

Future execution must still pass through:

Navigator -> Intent -> Capability Resolver -> Capability Composition -> Intelligence Fabric -> Agent Tool Layer -> Policy -> ExecutionIntent -> Approval -> ExecutionGateway -> Provider / Local Tool -> Verification

The Product Discovery UI cannot bypass this chain.

## Responsive Behavior

The UI uses wrapping grids and mobile breakpoints inherited from the Workspace. On mobile, product cards, capability cards, search controls, and detail blocks collapse to one column.

## Future Activation Path

The smallest future activation step is still read-only: add richer drill-down data and demos that remain non-executing. Execution buttons can become active only after provider activation, explicit approval UX, ExecutionGateway integration, and verification reporting are connected.
