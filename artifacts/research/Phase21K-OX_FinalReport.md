# Phase 21K-OX Final Report

Timestamp: 2026-08-27T04:47:56.5168075+04:00

Source of truth: `artifacts/research/OxAlphaResearchArtifact.json`

Status: COMPLETE THROUGH PHASE 21K-OX ONLY. Phase 21L was not started.

## 36-Point Report

1. Research source accepted: `OxAlphaResearchArtifact.json` controls this phase.
2. Original Ox Alpha candidate assumption replaced with canonical `GLM-5.3-Flash`.
3. Canonical external model id recorded as `z-ai/glm-5.3-flash`.
4. `Ox Alpha` preserved only as historical stealth alias metadata.
5. `stealth/ox-alpha` preserved only as historical OpenRouter alias metadata.
6. Z.ai recorded as the confirmed developer/operator from the research artifact.
7. Current ESSA status set to `WATCH_RESEARCH_ONLY`.
8. No Ox Alpha, Z.ai, OpenRouter, OpenCode, or other external provider call was made.
9. No API key was created.
10. No provider credential requirement was added for Z.ai.
11. No OpenRouter connection was added.
12. No ESSA source, secret, media, memory, or user data was sent externally.
13. Tech Radar created at `docs/ESSA_TECH_RADAR.md`.
14. Tech Radar blocks Ox Alpha as active/default/current model identity.
15. Tech Radar records promotion gates for live metadata, security, legal, pricing, route, and benchmark revalidation.
16. Security metadata blocks ESSA source, secrets, and user media for GLM-5.3-Flash.
17. Security metadata records route-dependent retention/training conflicts.
18. Provider Health marks Z.ai/GLM-5.3-Flash as research-only and not selectable.
19. Provider Health records no live health check.
20. Quality History records GLM-5.3-Flash as unscored public-research-only metadata.
21. Quality History does not import vendor or community benchmark claims as ESSA scores.
22. Intelligence Router blocks explicit Ox Alpha requests.
23. Intelligence Router blocks explicit GLM-5.3-Flash/Z.ai requests.
24. Intelligence Router does not silently fall back when a blocked GLM/Ox model is explicitly requested.
25. Local deterministic routing is preserved for FFmpeg video rendering and similar local tasks.
26. Capability profiles distinguish video input/understanding from video rendering.
27. Capability profiles do not claim audio input for GLM-5.3-Flash.
28. Capability profiles mark structured output as partial rather than schema-verified.
29. Capability map marks GLM-5.3-Flash as research-only and non-executable.
30. Capability map does not verify GLM-5.3-Flash video editing/export.
31. Benchmark architecture includes GLM-5.3-Flash only as a disabled research candidate.
32. Benchmark runner returns `provider_disabled_research_only` for GLM-5.3-Flash.
33. Benchmark runner records `networkCallStatus: NOT_EXECUTED` for the GLM candidate.
34. Documentation updated in `docs/ESSA_INTELLIGENCE_FABRIC.md`.
35. Tests A-X added in `scripts/testPhase21KOxGlmResearch.js`.
36. Phase stop is encoded as `21K-OX`; `21L` remains blocked/not started.

## Regression Scope

- Existing Intelligence Fabric dry-routing remains provider-independent.
- Existing local-first media behavior remains local.
- Existing benchmark safety behavior remains non-executing by default.
- Existing Phase 21K hard execution preflight remains non-executing.

## Recommended Next State

Stop after Phase 21K-OX. Any later phase must begin with explicit user instruction and fresh revalidation before provider activation or external benchmark execution.

