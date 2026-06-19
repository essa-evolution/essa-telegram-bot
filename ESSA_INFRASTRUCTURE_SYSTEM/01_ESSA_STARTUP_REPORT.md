# 01 ESSA Startup Report

## Purpose
ESSA Startup Report is an infrastructure diagnostic layer for service startup visibility.

It is not a behavioral layer.

It is not a prompt-style module.

It exists so Render Logs clearly show whether the current ESSA Navigator build started with the expected systems, modules, core documents and environment readiness.

## Startup Report Goals
On every service start, ESSA Navigator should report:

- which build is running;
- which build name is active;
- how many `CORE_DOCS` are loaded;
- which key systems are expected to be active;
- whether the system is ready;
- whether any environment warnings exist.

## Required Startup Log Shape
The startup report should appear near:

```text
Lisa Navigator inside ESSA running on port ...
```

The report should include:

```text
ESSA STARTUP REPORT
Build ID: ...
Build Name: ...
Core Docs: ...
Systems:
Identity
Knowledge
Presence
Personality
Conversation
Awakening Depth
Voice
Pronunciation
Output Modes
Memory
Status
Warnings
```

## Warning Rules
Warnings should reveal only the presence or absence of required configuration.

Never print secrets.

Never print tokens.

Never print database URLs.

Safe warning examples:

- `OPENAI_API_KEY missing`
- `TELEGRAM_TOKEN missing`
- `DATABASE_URL missing`
- `ELEVENLABS_API_KEY missing`
- `CORE_DOCS is empty`

## Status Rules
Use:

- `READY` when critical systems are present and no optional warnings exist.
- `NOT READY` when `OPENAI_API_KEY` or Telegram token is missing.
- `READY WITH VOICE WARNING` when only voice configuration is missing.
- `READY WITH MEMORY WARNING` when only database configuration is missing.
- `READY WITH VOICE AND MEMORY WARNING` when both optional voice and memory configuration are missing.

## Endpoint
The `/essa-health` endpoint should expose the same startup visibility as JSON:

- build id;
- build name;
- status;
- core docs count;
- systems;
- warnings;
- active modules.

The endpoint must be read-only and must not call external services.

## Boundaries
This module must not change:

- Telegram webhook behavior;
- OpenAI request construction;
- Memory DB logic;
- Voice generation logic;
- response guards;
- retrieval behavior.

## Final Principle
Render Logs should answer the question:

"Which ESSA Navigator is alive right now, and is it ready?"
