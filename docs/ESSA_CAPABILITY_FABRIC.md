# ESSA Capability Fabric

Phase 21D separates what ESSA can do from which provider may eventually perform it. Products compose capabilities. Providers implement capabilities. The user asks for outcomes, and ESSA resolves the product, capability, workflow, routing, verification, and approval path.

## Capability vs Provider

Capability identity is provider-independent. `BOOK_COVER`, `WEBSITE_GENERATE`, `VIDEO_TRIM`, and `VOCAL_REPLACE` remain ESSA capabilities whether the future implementation uses a local tool, OpenAI, Anthropic, ElevenLabs, OmniVoice, or another provider. Provider names may appear only in provider capability maps, not as capability identities.

## Product vs Capability

ESSA products are user-facing domains such as ESSA Production, Music Factory, Publishing, Books, Mirror, Business, Advertising, Creator Network, Property, Developer, Kids/Lumi, Voice, Research, Navigator, and Workspace. Products map to capabilities. A product can expose many capabilities, and a capability can support many products.

## Composition

High-level outcomes compose smaller capabilities. `WEBSITE_GENERATE` requires architecture, UI, code, browser observation, and UI verification. `BOOK_COVER` requires image/design capabilities. `VOCAL_REPLACE` requires music analysis, stem separation, voice replacement, audio mix, and export. `CapabilityCompositionPlan` is non-executing and records dependencies, local candidates, provider candidates, verification, cost class, and approval points.

## Availability

Capabilities carry availability states: `ARCHITECTURE_ONLY`, `LOCAL_READY`, `PROVIDER_READY`, `READY_FOR_KEY`, `READY_FOR_PAYMENT`, `READY_FOR_ACTIVATION`, `ACTIVE`, `DEGRADED`, `UNAVAILABLE`, and `DISABLED`. This prevents ESSA, Lisa, Navigator, marketing, or tutorials from claiming an architecture-only capability is live.

## Product Knowledge Graph

`ProductKnowledgeNode` is the source for plain-language explanations, onboarding, help, tutorials, product search, Navigator answers, and future Lisa education. Nodes connect product, capability, user need, outcome, examples, limitations, related capabilities, availability, next actions, and version.

## Product Education

`ProductEducationCard` explains how a user can use a product/capability without inventing features. One capability can produce many education angles. `ProductContentIntent` is a future, non-executing content contract for channels such as Instagram Reels, TikTok, YouTube, Telegram, in-app, website, email, and newsletter. No publishing happens in Phase 21D.

## Lisa Product Guide

`LISA_ESSA_PRODUCT_GUIDE` uses Lisa Character Core but cannot mutate it. Lisa should explain ESSA in simple direct language, not technical documentation tone. Her future product education must resolve from Capability Registry, Product Knowledge Graph, and current Availability State.

## Source Of Truth And Freshness

Marketing and education content must never invent product capability. If a capability is `ARCHITECTURE_ONLY`, content must say it is planned or being prepared, not active. Every future content artifact records capability version, product version, availability state, generated time, and freshness status. Capability or availability changes mark older tutorials as `STALE_CONTENT`.

## Provider Replacement

Provider replacement changes provider selection only. If `IMAGE_GENERATE` moves from Provider A to Provider B, `IMAGE_GENERATE` and product knowledge remain unchanged. Normal users do not need provider names to ask for outcomes.

## Bounded Discovery

Navigator can answer "What can ESSA do?" by searching capability/product knowledge and using ContextBudget to include only relevant nodes. It must not load the entire ESSA catalog into every prompt.

## Safety Inheritance

Capabilities cannot bypass Agent Tool Layer, ExecutionGateway, approval, cost, or publish/deploy policies. Publish, deploy, payment, external mutation, destructive, security-sensitive, and high-risk capabilities must preserve approval points and verification.

## Rollback

Rollback is local: remove `src/capabilities/`, `scripts/testCapabilityFabric.js`, and this document. Phase 21D does not change provider credentials, billing, env, Render secrets, deployment, publishing, or social posting.

