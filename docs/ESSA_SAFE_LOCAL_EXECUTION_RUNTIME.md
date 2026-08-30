# ESSA Safe Local Execution Runtime

Phase 21N introduces ESSA's first real execution path, scoped only to safe local execution for `VIDEO_TRIM`.

It does not enable external providers, paid providers, external AI models, provider activation, payments, publishing, deployment, ads, external account mutation, production database mutation, or env/key/billing changes.

## Architecture Audit

Reused components:

- Capability Fabric remains the source of capability identity, risk, cost and availability.
- Execution Preview still prepares input requirements, local/provider classification, expected artifacts, verification and rollback.
- ExecutionIntentDraft and `preflightExecutionIntentDraft(...)` remain the canonical preflight source.
- Phase 21M input resolution, validation, re-preflight, approval discovery, token verification and material-change checks are reused.
- ExecutionGateway is called as a canonical pre-gate and remains non-executing.
- Agent Tool Layer provides the existing `media.local.mock` media contract as the local media tool boundary.
- Product Knowledge explains only the proven narrow capability.
- Creator-First supplies the behavior rule: ESSA performs allowed system work instead of asking the user to operate FFmpeg manually.

Duplicate systems avoided: no `ExecutionEngineV2`, no second gateway, no new capability registry, no new approval system, no provider router and no broad artifact system.

## Safe Local Execution

`SAFE_LOCAL_EXECUTION` is eligible only when all required conditions pass:

- capability is locally executable
- required inputs are valid
- existing preflight has no meaningful blocker other than prior phase hard-stop markers
- required approvals are satisfied or not required
- approval tokens are valid if applicable
- no external provider, payment, publish, deploy, external mutation or production DB mutation is required
- source asset is preserved
- output destination is inside the allowed artifact boundary
- deterministic local verification is available
- rollback/recovery behavior is defined

`READY_FOR_FUTURE_EXECUTION` from Phase 21M is not execution authority. Phase 21N adds a separate local runtime gate.

## LocalExecutionEligibility

`LocalExecutionEligibility` records intent id/version, capability, eligibility, execution class, input/preflight/approval/token readiness, local capability availability, external/payment/publish/deploy/mutation requirements, source preservation, output boundary, verification, rollback, blockers and warnings.

If any condition fails, execution is blocked before tool invocation.

## LocalExecutionRequest

`LocalExecutionRequest` records execution request id, intent id/version, capability, input draft, preflight ref, approval token refs, execution plan, source asset refs, requested outputs, execution boundary and requested time.

No hidden inputs are allowed.

## Execution Plan

The first plan is `VIDEO_TRIM` only:

- local tool: `media.local.ffmpeg.video_trim`
- existing Agent Tool Layer boundary: `media.local.mock`
- source: synthetic local video fixture
- operation: trim
- parameters: start seconds and end seconds
- output: derived artifact under `artifacts/execution/phase21n/derived`
- verification: ffprobe duration, stream, non-empty output and source fingerprint
- rollback: delete derived artifact only
- source mutation: false

## Runtime Gate

`authorizeLocalExecution(...)` verifies:

- intent/version consistency
- safe local capability eligibility
- inputs and re-preflight
- approvals/tokens where applicable
- local-only class
- strict tool allowlist
- source/output boundary
- rollback/recovery
- verification availability
- existing ExecutionGateway pre-gate result

It returns `AUTHORIZED_LOCAL_EXECUTION` or `BLOCKED`.

## Tool Allowlist

Phase 21N allowlist:

- `VIDEO_TRIM`
- FFmpeg/ffprobe only
- one operation: `trim`
- structured argument array only
- shell disabled
- no command chaining
- no arbitrary executable
- no unsafe flags

No other FFmpeg operation is enabled.

## Source Immutability

The canonical model is:

`SOURCE ASSET -> LOCAL OPERATION -> DERIVED ARTIFACT`

The source is fingerprinted before execution and after verification. Success requires `SOURCE_UNCHANGED`.

## Derived Artifacts And Lineage

`DerivedExecutionArtifact` records artifact id, execution id, capability, source refs, lineage, artifact type, local path ref, tool ref, parameters fingerprint, verification state, rollback state and artifact fingerprint.

Lineage is:

`sourceAssetId -> executionId -> derivedArtifactId`

No orphan output is trusted.

## Execution Record And States

`ExecutionRecord` records execution id/request, intent id/version, capability, execution class, status, timestamps, tool invocation ref, source assets, output artifacts, verification, rollback and audit ref.

Supported states:

- `PENDING`
- `AUTHORIZED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `VERIFICATION_FAILED`
- `ROLLED_BACK`
- `BLOCKED`
- `CANCELLED`
- `ALREADY_EXECUTED`
- `REUSE_EXISTING_RESULT`

ESSA does not report `SUCCEEDED` before verification passes.

## Command Safety

The runtime uses direct process invocation with an argument array. It does not construct arbitrary shell strings.

For FFmpeg, arguments are built from validated structured parameters:

- trusted executable name from allowlist
- validated source path
- validated start/end/duration
- controlled output path
- controlled overwrite behavior for generated artifacts
- no untrusted flags
- no shell fragments

## Output Collision And Temp Policy

Default collision behavior is `GENERATE_UNIQUE_NAME`, for example:

`source.mp4 -> source_trim_0001.mp4`

Temporary roots are defined under `artifacts/execution/phase21n/tmp`. The current trim proof does not need uncontrolled temp files.

## Verification

Verification is mandatory. FFmpeg exit code is not enough.

For `VIDEO_TRIM`, verification checks:

- output exists
- output readable/non-empty
- duration approximately matches requested trim
- video stream exists
- source still exists
- source fingerprint unchanged

`ExecutionVerificationResult` records checks, failures, warnings, source integrity, artifact integrity, expected vs observed duration and timestamp.

## Failure And Verification Failure

If tool invocation fails, status is `FAILED`; no trusted artifact is returned.

If the tool exits successfully but verification fails, status is `VERIFICATION_FAILED`; the artifact is not trusted as final output.

## Rollback

Phase 21N rollback means deleting only the derived artifact created by this execution. It never rewrites the source.

Rollback is allowed only when:

- artifact belongs to the execution
- artifact path is inside the allowed artifact boundary
- source is not targeted
- there are no external effects

Foreign artifact rollback is blocked.

## Idempotency And Fingerprints

Execution fingerprint includes:

- intent id
- intent version
- capability
- source fingerprint
- normalized operation parameters
- tool class
- requested output semantics

Submitting the same material execution request twice returns `REUSE_EXISTING_RESULT` rather than creating uncontrolled duplicates.

## 21M Integration

Phase 21N reuses:

- `ExecutionInputDraft`
- validation and normalization
- approval request/decision model
- scoped token verification
- material-change logic

For `VIDEO_TRIM`, no material approval is invented when inputs are valid and preflight has no external/payment/publish/deploy/high-impact gate.

## Capability Fabric And Product Knowledge

`VIDEO_TRIM` now truthfully carries `safeLocalExecutionAvailable: true` metadata. This applies only to safe local trimming.

Product Knowledge says ESSA can locally trim video by creating a new verified derived artifact while preserving the source. It does not claim full video editing, publishing, provider execution, payment, ads, deployment or external accounts are available.

## Creator-First

When a safe local execution is fully ready and allowed, ESSA performs the system work. It should not tell the user to open FFmpeg and run a command.

Normal result text is human-readable:

`Готово. Я локально обрезала видео, исходник не изменён, новый файл создан и проверен.`

Technical provenance stays in debug/advanced data.

## Security Boundaries

The runtime blocks:

- source equals output
- path traversal
- output outside artifact boundary
- arbitrary shell fragments
- arbitrary executable selection
- unsafe flags
- rollback of foreign artifacts
- external/provider/model/network dependency

Allowed roots:

- fixture sources: `artifacts/execution/phase21n/fixtures`
- derived artifacts: `artifacts/execution/phase21n/derived`
- temporary files: `artifacts/execution/phase21n/tmp`

## E2E Proof

The proof script creates a synthetic 8-second local video, trims 2s to 5s, verifies a ~3-second output with ffprobe, proves the source fingerprint is unchanged, records a derived artifact and writes:

`artifacts/execution/phase21n/SafeLocalExecutionE2EProof.json`

The proof records zero external provider calls, zero external model calls, zero paid provider calls, zero payments, zero publishing, zero deployment, zero ads, zero external account mutation, zero production DB mutation and zero env/key/billing changes.

## Future Expansion Boundaries

Future phases must explicitly add new safe local operations one by one with the same standards: capability truth, 21M input/approval integration, runtime gate, allowlist, bounded output, verification, rollback, idempotency and audit.

External provider execution, publishing, payments, deployment, ads and production data mutation remain separate future execution classes and are not enabled by Phase 21N.

Rollback path: remove `src/capabilities/safeLocalExecution.js`, its export, the `VIDEO_TRIM` safe-local metadata/Product Knowledge node, `scripts/testSafeLocalExecutionRuntime.js`, `artifacts/execution/phase21n`, and this document.

## Phase 21O Safe Local Capability Expansion

Phase 21O generalizes the runtime from a `VIDEO_TRIM` proof into a capability-driven safe local execution layer. The canonical flow remains unchanged:

`INTENT -> INPUTS -> PREFLIGHT -> APPROVAL STATE -> LOCAL EXECUTION ELIGIBILITY -> EXECUTION GATE -> ALLOWLISTED LOCAL TOOL -> DERIVED ARTIFACT / OBSERVATION -> VERIFICATION -> AUDIT -> RESULT`

There is still one runtime gate and one local execution path. No external providers, external AI models, payments, publish, deploy, ads, external account mutation, production DB mutation, or env/key/billing changes are enabled.

### Local Tool Audit

Reused local utilities:

- `src/media/mediaExecutionReadiness.js` for FFmpeg/FFprobe resolution.
- Existing `media.local.mock` Agent Tool Layer boundary.
- Existing ExecutionGateway as a non-executing pre-gate.
- Existing Capability Fabric, Execution Preview, ExecutionIntentDraft, Preflight and Phase 21M input/approval layer.
- Existing hashing, path boundary, rollback, proof artifact and local process patterns from Phase 21N.

New dependencies added: none.

Image tooling audit: no repo-local safe image processor or dependency such as Sharp/ImageMagick is currently present, so `IMAGE_RESIZE` and `IMAGE_CONVERT` remain deferred.

### SafeLocalCapabilityProfile

Runtime execution details now live in `SafeLocalCapabilityProfile`, not in broad Capability Fabric identity:

- `capabilityId`
- `executionMode`
- `toolAdapterId`
- `allowedOperations`
- `requiredInputs`
- `outputBehavior`
- `sourceMutationAllowed:false`
- `verificationProfileId`
- `rollbackProfile`
- `securityProfile`
- `availability`

Capability Fabric still owns capability identity, risk, cost, local/provider truth and availability. The profile only adds runtime execution policy.

### Tool Adapter Contract

The local adapter contract is:

- `supports(capabilityId)`
- `validateOperation(executionPlan)`
- `buildInvocation(executionPlan)`
- `execute(executionPlan)`
- `verify({ executionPlan, sourceFingerprintBefore })`
- `rollback(result, boundary)`

Phase 21O implements `FFMPEG_LOCAL` with FFmpeg/FFprobe only. It does not expose arbitrary FFmpeg command execution or user-supplied flags.

### Enabled Profiles

| Capability | Local | Executable | Mode | Tool | Verification | Rollback | External dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MEDIA_PROBE` | yes | yes | `LOCAL_READ_ONLY` | local FFprobe adapter | structured observation + source unchanged | N/A | none |
| `VIDEO_TRIM` | yes | yes | `LOCAL_DERIVED_ARTIFACT` | local FFmpeg/FFprobe adapter | duration + stream + source unchanged | delete derived artifact only | none |
| `VIDEO_RESIZE` | yes | yes | `LOCAL_DERIVED_ARTIFACT` | local FFmpeg/FFprobe adapter | dimensions + stream + source unchanged | delete derived artifact only | none |
| `AUDIO_EXTRACT` | yes | yes | `LOCAL_DERIVED_ARTIFACT` | local FFmpeg/FFprobe adapter | audio stream + source unchanged | delete derived artifact only | none |
| `VIDEO_TRANSCODE` | local possible | no | deferred | none | not proven | not available | none |
| `IMAGE_RESIZE` | unknown | no | deferred | none | not proven | not available | image processor missing |
| `IMAGE_CONVERT` | unknown | no | deferred | none | not proven | not available | image processor missing |

### Read-Only Results

`MEDIA_PROBE` returns `MediaProbeResult` as an observation:

- duration
- container
- video/audio presence
- dimensions
- frame rate
- file size
- provenance

It does not create a meaningless derived file and rollback is `NOT_APPLICABLE`.

### Derived Artifact Results

`VIDEO_TRIM`, `VIDEO_RESIZE` and `AUDIO_EXTRACT` create new artifacts only inside the approved artifact root. Source files are fingerprinted before and after execution. Success requires verification, not merely process exit code `0`.

Lineage records:

- capability
- operation
- output profile
- normalized parameters
- tool adapter
- verification
- source and artifact fingerprints

### Canonical Output Profiles

Implemented output profiles:

- `VIDEO_MP4_STANDARD`
- `VIDEO_RESIZE_320x180`
- `AUDIO_WAV_STANDARD`

Unsupported or unknown profiles are blocked by policy.

### Security And Bounds

The generalized runtime blocks:

- unsupported capability
- unsupported operation
- tool/capability mismatch
- raw flag injection
- shell syntax
- arbitrary executable selection
- invalid file type
- invalid range
- resource limits such as oversized dimensions
- source/output collision
- output outside boundary
- path traversal
- foreign artifact rollback

No generic `RUN_COMMAND`, `RUN_SHELL`, `EXECUTE_BINARY`, or "run any FFmpeg command" capability exists.

### Proof Matrix

Phase 21O writes:

`artifacts/execution/phase21o/SafeLocalCapabilityMatrixProof.json`

The proof includes each enabled capability, execution mode, availability before/after, adapter, fixture, result, verification, source preservation, rollback and zero external-effect counters.

Rollback path for Phase 21O: remove the 21O additions in `src/capabilities/safeLocalExecution.js`, the 21O capability metadata/Product Knowledge nodes, `scripts/testSafeLocalCapabilityExpansion.js`, `artifacts/execution/phase21o`, and this section. Phase 21N can remain independently understandable through the earlier proof section.
