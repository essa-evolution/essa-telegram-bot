# ESSA Production Skill

## Purpose

This skill describes how an external production agent can assist ESSA without owning ESSA.

Claude, OpenAI, Gemini, local agents or future providers may consume this skill. ESSA remains the source of truth for identity, policy, tools, artifacts, verification and approvals.

## Ownership Rules

- ESSA Navigator owns orchestration.
- ESSA GoalState and ContextPack own task state and context.
- ESSA ActionPolicy owns permissions and approvals.
- ESSA CapabilityRegistry and ToolBroker own provider/tool routing.
- ESSA artifacts own project history and provenance.
- Production agents return plans and tool requests; they do not keep hidden state.

## Lisa Sources

- Lisa Character Core is provider-independent.
- LisaProductionProfile is provider-independent.
- DynamicExpressionContext describes the current performance mode.
- ProductionIntent describes the current project goal and platform.

Production agents may receive these as controlled context. They must not rewrite them or add provider-specific assumptions to them.

## Allowed Production Tool Surface

Use only controlled ESSA tool contracts:

- inspect_media
- transcribe_media
- semantic_edit
- create_edit_plan
- subtitle_render
- ffmpeg_render
- verify_render

Future tools such as image_request, voice_request, asset_lookup and publishing_prepare require explicit ESSA policy gates before execution.

Do not request unrestricted shell access when a narrower ESSA tool contract can do the job.

## Editing Rules

- Preserve Lisa performance first.
- Preserve meaningful smile, laugh, pause, gaze, breath or reaction moments.
- Do not force B-roll.
- Do not use image-per-sentence editing.
- Visual inserts must have a semantic reason.
- If Lisa's face or performance is stronger than an insert, keep Lisa on screen.
- Do not fake success.
- Unresolved VisualRequests remain unresolved.
- Original source files must not be overwritten.

## Subtitle Rules

- Subtitles must be readable.
- Subtitles must not cover Lisa's face.
- Subtitles must respect platform safe zones.
- Emphasis must support meaning, not create noise.
- Rendering remains deterministic through ESSA-approved render tools.

## Provider And Spending Rules

- No provider spending without ESSA policy approval.
- No external paid generation without approval.
- No publishing without human approval.
- No credentials in prompts, source code or artifacts.
- No provider is mandatory; Claude is only one possible consumer of this skill.

## Artifact Rules

Every result must be represented through ESSA artifacts:

- source artifact
- transcript artifact
- semantic edit plan
- edit decision list
- subtitle artifact
- render artifact
- verification report
- approval artifact

Each artifact should include provenance: project, goal, workflow, provider, tool, source file, generated files, verification and approval state.

## First MVP Pattern

For a short Lisa talking-head or animated-avatar clip:

source -> inspect -> transcribe -> semantic edit -> edit plan -> subtitle render -> FFmpeg render -> verify -> human approval

Default choice: keep Lisa on screen unless a visual insert clearly improves meaning.
