# ESSA Agent Skills Adoption Audit

Phase: `21R-TA1`

Status: research-only. Agent Skills was not installed, copied, enabled or executed. Phase 21S was not started.

## What Agent Skills Is

Agent Skills is a public open-source repository at `addyosmani/agent-skills` that packages software-development workflows as Markdown `SKILL.md` instruction files for coding agents. The upstream project describes the lifecycle as idea/spec/plan/build/test/review/ship and provides a meta-skill, `using-agent-skills`, for selecting the relevant workflow.

At research time, the GitHub API identified the repository as public, owned by `addyosmani`, licensed MIT, with default branch `main`, JavaScript as the primary language, `90889` stars, `9716` forks, `124` open issues, and latest repository push at `2026-08-28T23:31:50Z`.

## What It Is Not

Agent Skills is not an ESSA governance layer, not an execution approval system, not a Capability Fabric replacement, not a security authority, and not a deployment authority. It is external prompt/workflow material. If ever adopted, it must sit below ESSA development governance, security policy, approval gates and execution policy.

Canonical hierarchy:

`ESSA DEVELOPMENT GOVERNANCE -> ESSA SECURITY / APPROVAL / EXECUTION POLICIES -> OPTIONAL ENGINEERING SKILL -> CODEX / CODING AGENT -> CODE / TEST / REVIEW`

Never:

`AGENT SKILLS -> ESSA GOVERNANCE`

## Verified Upstream Facts

- Repository identity: `https://github.com/addyosmani/agent-skills`.
- Owner: `addyosmani`.
- Upstream README documents the team as Addy Osmani, Federico Bartoli and Joan Leon.
- License: MIT.
- Codex plugin manifest version observed: `0.6.8`.
- Current skill count verified from GitHub tree: `25` total.
- The current README says `25` total skills: `24` lifecycle skills plus `using-agent-skills`. Older indexed search snippets mentioning `24` are stale.
- Supported agents are documented as Claude Code, Cursor, Antigravity CLI, Gemini CLI, Windsurf, OpenCode, GitHub Copilot, Kiro, Codex, Command Code, other Markdown-instruction agents, and 70+ agents through the open skills CLI.
- Installation mechanisms are documented as `npx skills add addyosmani/agent-skills`, per-skill `npx`, Claude/Codex plugin marketplace paths, tool-specific copy/install paths, and local clone for development.

## Skills Inventory

| Skill | Stage | Purpose | ESSA Fit | Risk | Radar |
|---|---|---|---|---|---|
| `using-agent-skills` | Meta | Route tasks to workflow skills | Useful routing vocabulary below Navigator | Medium prompt authority | `ADOPTION_REVIEW` |
| `interview-me` | Define | One-question requirement interview | Overlaps Navigator understanding | Low | `WATCH` |
| `idea-refine` | Define | Divergent/convergent idea refinement | Useful pattern only | Low/Medium file write | `WATCH` |
| `spec-driven-development` | Define | Spec before code | Similar to ESSA phase scope discipline | Low/Medium file write | `ADOPTION_REVIEW` |
| `constraint-driven-development` | Define | Written quality bar and anti-weakening guard | Genuine ESSA gap | Medium policy mutation | `ADOPTION_REVIEW` |
| `planning-and-task-breakdown` | Plan | Ordered small tasks | Mostly equivalent to ExecutionWorkflow | Low/Medium | `WATCH` |
| `incremental-implementation` | Build | Thin vertical slices | Similar to current phase discipline | Medium code mutation | `WATCH` |
| `test-driven-development` | Build/Verify | RED-GREEN-REFACTOR | Genuine gap: explicit RED evidence | Medium code mutation | `ADOPTION_REVIEW` |
| `context-engineering` | Build | Right context at the right time | Mostly equivalent to Navigator context | Medium prompt context | `WATCH` |
| `source-driven-development` | Build | Official-doc grounded implementation | Already strong via Technology Intelligence | Medium network research | `WATCH` |
| `doubt-driven-development` | Build/Review | Fresh-context adversarial review | Useful but risky if it calls external agents | High external-agent escalation | `SECURITY_REVIEW` |
| `frontend-ui-engineering` | Build | Accessible production UI | Mostly equivalent to Codex frontend rules | Medium | `WATCH` |
| `api-and-interface-design` | Build | Contract-first APIs/interfaces | Useful for ESSA public boundaries | Medium contract change | `WATCH` |
| `browser-testing-with-devtools` | Verify | Runtime browser inspection with DevTools MCP | ESSA has browser proof; security text useful | High browser/profile risk | `SECURITY_REVIEW` |
| `debugging-and-error-recovery` | Verify | Reproduce/localize/reduce/fix/guard | Useful named protocol | Medium git/test surface | `ADOPTION_REVIEW` |
| `code-review-and-quality` | Review | Five-axis review | Useful formal rubric | Low/Medium | `ADOPTION_REVIEW` |
| `code-simplification` | Review | Behavior-preserving simplification | Pattern useful, not novel | Medium refactor risk | `WATCH` |
| `security-and-hardening` | Review | Threat model and security checklist | ESSA already stronger, checklist useful | Medium/High | `WATCH` |
| `performance-optimization` | Review | Measure-first optimization | Future-only value | Medium | `WATCH` |
| `git-workflow-and-versioning` | Ship | Commits, branches, tags, releases | Conflicts unless wrapped | High git authority | `SECURITY_REVIEW` |
| `ci-cd-and-automation` | Ship | CI/CD and deployment automation | Future reference only | High deploy automation | `SECURITY_REVIEW` |
| `deprecation-and-migration` | Ship | Migration and removal discipline | Useful later | High removal/migration | `WATCH` |
| `documentation-and-adrs` | Ship | ADRs and docs | Equivalent to ESSA docs discipline | Low | `WATCH` |
| `observability-and-instrumentation` | Ship | Logs, metrics, tracing, alerts | Future privacy-gated topic | High telemetry data flow | `RESEARCH` |
| `shipping-and-launch` | Ship | Launch checklist, staged rollout, rollback | Pattern only; direct authority conflicts | High release authority | `SECURITY_REVIEW` |

## Meta-Skill And Routing Behavior

`using-agent-skills` is a Markdown router, not an executable resolver. It maps task types to skill names with a flowchart and quick reference. The host discovers skills from `name` and `description` frontmatter, then loads the full `SKILL.md` when relevant.

Compared with ESSA:

- ESSA Navigator is broader because it handles user intent, context, product knowledge, response modes and authority.
- Capability Fabric and Capability Resolver are more structured than Agent Skills routing.
- ExecutionWorkflow provides explicit execution states and proof artifacts; Agent Skills provides human-readable workflow discipline.
- Technology Intelligence already has source trust tiers, adoption gates and security review states.

Useful routing ideas Agent Skills has: a simple developer-facing phase-to-skill table, assumption surfacing, confusion management, and anti-rationalization as a first-class pattern.

## Development Loop Comparison

Agent Skills:

`IDEA -> SPEC -> PLAN -> IMPLEMENT -> TEST -> REVIEW -> SHIP`

ESSA execution discipline:

`GOAL -> UNDERSTAND -> CONTEXT -> PLAN -> APPROVAL -> CAPABILITY RESOLUTION -> EXECUTE -> VERIFY -> SAVE -> CONTINUE/COMPLETE`

Current ESSA/Codex phase discipline:

`SCOPE -> ARCHITECTURE AUDIT -> REUSE -> IMPLEMENT -> TEST -> SECURITY CHECK -> BROWSER/PROOF -> REGRESSION -> FINAL REPORT -> STOP BOUNDARY`

Conclusion: Agent Skills is narrower and more developer-workflow-focused. ESSA is broader and governance-first. Agent Skills can improve local engineering discipline, but it should not replace ESSA routing or approval.

## Methodology Findings

Anti-rationalization: genuinely useful. Upstream skill anatomy explicitly makes rationalization/reality tables a core writing principle. ESSA has rules and boundaries, but not always per-workflow excuses paired with rebuttals.

Evidence-before-completion: already stronger in ESSA. ESSA proof artifacts, browser proofs, regression lists and checkpoint reports exceed upstream's general evidence checklist.

TDD: useful gap. ESSA runs tests and regressions, but it does not always require a captured RED failure before implementation. Pattern extraction is valuable.

Debugging: useful gap. The stop-the-line protocol, reproduce/localize/reduce/fix/guard, would fit ESSA failure handling well.

Browser testing: ESSA already has browser proof workflows. Upstream's security guidance around isolated profiles, untrusted browser content and credential boundaries is worth extracting.

Code review: useful gap. A formal five-axis rubric can make ESSA checkpoint review more consistent.

Shipping/release: not safe for direct use. Any skill that can lead to push, deploy, publish, release tags, feature flags, CI/CD, production monitoring or rollback must remain below ESSA authorization.

## Supply-Chain Findings

- License risk is low: MIT verified.
- Installation risk is medium: `npx`, marketplace and clone paths pull external repository content into the agent environment.
- Hook risk is high if enabled in Claude-oriented environments: `hooks/hooks.json` can execute a bash `SessionStart` hook that injects the meta-skill. The Codex plugin manifest documents an empty Codex hook config, so Codex should not auto-load Claude hooks through that manifest.
- Script risk exists: at least one skill script was present, `skills/idea-refine/scripts/idea-refine.sh`.
- Dependency risk exists: documented paths rely on `npx`, git, bash, `jq`, and optional MCP/DevTools/CI/deployment tooling depending on skill.
- Update risk exists: direct marketplace or `npx` adoption can pull newer upstream content unless pinned and reviewed.

## Prompt And Instruction Security

All upstream skill files are untrusted external prompt material. They must be analyzed as data until adopted through ESSA review.

No sampled/targeted upstream file showed a direct malicious instruction to ignore parent policy or expose secrets. However, legitimate workflow instructions can still become dangerous: git, browser, CI/CD, deployment, observability and ship skills can lead an agent toward commands or external systems that ESSA must gate.

Future adopted skills must be unable to independently:

- push
- publish
- deploy
- purchase
- activate providers
- change billing
- change secrets
- mutate production databases
- change external account permissions
- send repository/private data externally
- perform destructive Git operations

## Top Candidate Skills Or Patterns

1. `test-driven-development` pattern
   Adds RED-GREEN-REFACTOR and bug reproduction before fix. Best adopted as native ESSA pattern with recorded RED evidence for behavior changes.

2. `debugging-and-error-recovery` pattern
   Adds stop-the-line debugging and recurrence guard. Best adopted as native ESSA failure-handling checklist.

3. `code-review-and-quality` pattern
   Adds five-axis review and verify-the-verification. Best adopted as read-only ESSA checkpoint rubric.

4. `using-agent-skills` meta pattern
   Adds a simple developer skill vocabulary and assumption/confusion behavior. Best extracted below Navigator as a possible future Engineering Skill Resolver.

5. `constraint-driven-development` pattern
   Adds explicit quality-bar anti-weakening detection. Best researched for a future native ESSA constraints artifact.

## Adoption Mode Assessment

Mode A, direct skill adoption: not recommended now. It would install external prompt material and potentially hooks/scripts into the agent environment, with overlapping authority.

Mode B, pattern extraction: recommended. Study the upstream design and implement the useful parts natively inside ESSA, keeping ESSA governance authoritative.

Mode C, hybrid: possible later after security review. It would require pinned versions, no hooks by default, no external provider actions, no push/deploy authority, and an ESSA wrapper around every command or file mutation.

## ESSA Engineering Skills Layer

ESSA could benefit from a future native layer:

`Navigator -> Development Goal -> Engineering Skill Resolver -> Engineering Workflow -> Codex -> Verification -> Evidence -> Human Authority Boundary`

This should be architecture analysis only until a future approved phase. It should not duplicate Capability Fabric or ExecutionWorkflow. It should be a developer-workflow adapter below governance, not a new governance root.

## Final Recommendation

Repository-level recommendation: `RESEARCH`.

Per-skill recommendation varies:

- `ADOPTION_REVIEW`: `using-agent-skills`, `spec-driven-development`, `constraint-driven-development`, `test-driven-development`, `debugging-and-error-recovery`, `code-review-and-quality`
- `SECURITY_REVIEW`: `doubt-driven-development`, `browser-testing-with-devtools`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `shipping-and-launch`
- `RESEARCH`: `observability-and-instrumentation`
- `WATCH`: the remaining skills

Installation is not recommended now. No implementation should happen before Phase 21S. The smallest safe next action is to later draft a native ESSA Engineering Skills concept note focused on TDD RED evidence, debugging stop-the-line, review rubric and anti-rationalization tables.

## Research Artifacts

- JSON: `artifacts/research/AgentSkillsResearchAdoptionAudit.json`
- Documentation: `docs/ESSA_AGENT_SKILLS_ADOPTION_AUDIT.md`

External actions performed: read-only public GitHub/API/raw research only.

External actions not performed: no clone, no install, no upstream script execution, no MCP enablement, no Codex config mutation, no push/fetch/pull, no deploy, no provider call, no key/billing change.
