# ESSA Canonical Repository Checkpoint

Phase: 21Q-CP
Status: checkpoint curation in progress

## Purpose

This checkpoint creates the first intentional local Git baseline after the
Phase 21Q repository recovery.

The recovered Git history predates a large body of current ESSA work. This
checkpoint therefore records the evolved working tree as the canonical local
state for future phases. It does not claim that the current code existed in
the recovered historical HEAD.

## Recovered Base

- Repository root: `C:\Users\Lisa\Downloads\essa-telegram-bot-main\essa-telegram-bot-main`
- Branch: `main`
- Recovered base HEAD: `f25ff0492945ed3934a9dfa777c6acae5f79f61d`
- Recovery class: `C_ORIGINAL_REPOSITORY_FOUND_ELSEWHERE`
- Origin metadata: `https://github.com/essa-evolution/essa-telegram-bot.git`
- Remote policy for this phase: read-only metadata only; no push, fetch, pull, or remote mutation.

## Current ESSA Evolution

The canonical state includes the current ESSA codebase across Navigator,
Capability Fabric, Intelligence Fabric, Product Knowledge, Product Discovery,
Product Education, execution preview and preflight, input and approval tokens,
safe local execution, execution workspace, autonomous workflow orchestration,
Agent Tool Layer, ExecutionGateway, production-agent contracts, content
intelligence, content variant experimentation, technology intelligence,
Creator-First System Principle, Lisa Character Core, and production profile
integration.

## Curation Policy

The checkpoint uses explicit curated staging only. The following were included:

- Maintained source under `src/`.
- Workspace application source under `workspace/`.
- Maintained architecture and canonical knowledge documents.
- Maintained regression, verification, readiness, and proof scripts.
- Test fixtures that are required by the maintained scripts.
- Small machine-readable proof and audit metadata where it documents verified behavior.
- Repository recovery and checkpoint documentation.
- Project configuration, package metadata, Supabase migrations, and ESSA skill metadata.

The following were excluded:

- `.env` and secret-like local files.
- `node_modules/` and dependency caches.
- The large recovery ZIP snapshot.
- Generated screenshots, video, audio, frame captures, transcripts, subtitles, and local media outputs.
- Browser profiles, Playwright reports, coverage, logs, and temporary runtime scratch files.

## Artifact Policy

Small JSON and Markdown proof metadata may be tracked when it is useful for
future auditability. Large generated binaries are kept locally and reproducible
from scripts rather than committed.

The recovery source snapshot remains local recovery evidence and is
intentionally not committed:

`artifacts/repository/phase21q-git/snapshots/essa_source_snapshot_20260830_043417.zip`

## Secret Policy

`.gitignore` protects `.env`, `.env.*`, private key formats, dependency caches,
media outputs, browser profiles, logs, and generated binary artifacts.

No secret values were printed during this checkpoint. Staged content must pass a
credential-pattern scan before commit.

## Deletion Review

Git reports many deletions relative to the recovered historical HEAD. These are
treated as intentional architectural replacement of older root-level ESSA
system documents by the current canonical core documents, `docs/ESSA_*.md`,
Navigator files, Lisa Character Core files, and current source-backed system
contracts.

No destructive Git operation was used to accept those deletions.

## Test Status

The mandatory Phase 21Q-CP regression suite passed before staging. The broader
maintained `scripts/test*.js` suite was also run locally and passed.

## Commit And Tag

The checkpoint commit is created locally only with message:

`ESSA canonical checkpoint after Phase 21Q`

The local annotated tag is:

`essa-phase-21q-checkpoint`

The tag is local only and must not be pushed in this phase.

## Remaining Technical Debt

- The restored historical remote should be reviewed before any future push.
- Generated artifact policy can be refined further as the repository matures.
- Large media evidence remains local-only and should stay reproducible from scripts.
- Future phases should stage deliberately and avoid broad Git operations.

## Safe Baseline

After this checkpoint, Phase 21R can start from the local tagged baseline
`essa-phase-21q-checkpoint` if the post-commit validation remains clean except
for explicitly ignored local runtime files.
