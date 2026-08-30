# ESSA Safe Local Execution Workspace

Phase 21P exposes the already-proven safe local runtime through the existing workspace shell.

## Scope

- Enabled routes: `#execution/MEDIA_PROBE`, `#execution/VIDEO_TRIM`, `#execution/VIDEO_RESIZE`, `#execution/AUDIO_EXTRACT`.
- Deferred routes remain blocked: `VIDEO_TRANSCODE`, `IMAGE_RESIZE`, `IMAGE_CONVERT`.
- Execution uses the Phase 21O safe local runtime and its FFmpeg/FFprobe allowlist.
- The browser route never receives a raw source path. The proof workflow uses a synthetic local fixture inside `artifacts/execution/phase21p/source`.
- Derived artifacts are served only through bounded `/api/safe-local/artifacts/:executionId/:artifactId` links.

## UX Contract

- The execute CTA is enabled only when `LocalExecutionEligibility.eligible === true`.
- Success is shown only after runtime verification passes.
- `MEDIA_PROBE` presents a read-only observation card and no rollback action.
- Derived artifact capabilities present result cards, source preservation, verification, bounded artifact links, history, and rollback.
- Rollback deletes only derived artifacts and preserves the source fixture.
- Advanced provenance is separated under an expandable debug block.

## Prohibited Actions

Phase 21P does not call external AI providers, external models, paid providers, payment flows, publish/deploy actions, ads, social dispatch, external account mutations, production DB mutations, or env/key/billing changes.

## Proof

Run:

```bash
node scripts/testSafeLocalExecutionWorkspace.js
node scripts/verifySafeLocalExecutionWorkspaceProof.js
```

The browser proof writes `artifacts/execution/phase21p/SafeLocalExecutionWorkspaceProof.json` and screenshots under `artifacts/execution/phase21p/screenshots/`.
