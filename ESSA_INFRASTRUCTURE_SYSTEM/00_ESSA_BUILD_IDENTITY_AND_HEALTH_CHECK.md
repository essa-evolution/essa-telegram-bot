# 00 ESSA Build Identity And Health Check

## Purpose
This infrastructure module defines how ESSA Navigator reports its running build identity, active architecture modules and startup health markers.

The goal is operational visibility in Render Logs after git push and deploy.

## Problem
After deployment it must be clear:

- which code version is actually running;
- whether Render reached the latest commit;
- which important modules are expected to be active;
- whether summaries, routing and core knowledge documents are loaded;
- whether the running service is the current ESSA Navigator build.

## Build Identity
Every deployable build should expose:

- `ESSA_BUILD_ID`;
- `ESSA_BUILD_NAME`;
- `ESSA_ACTIVE_MODULES`.

The build id should be stable for the deploy and easy to search in Render Logs.

## Startup Log
On server startup, ESSA Navigator should log:

```text
====================================
ESSA BUILD ID: ...
ESSA BUILD NAME: ...
ESSA ACTIVE MODULES:
 - ...
====================================
```

This should appear near the normal server startup log:

```text
Lisa Navigator inside ESSA running on port ...
```

## Summary Health
The service should log whether critical runtime summaries exist:

- Lisa Navigator Identity;
- Response Output Layer;
- Pronunciation Engine;
- ESSA Foundation;
- Lisa Personality Expression;
- Lisa Recognizable Voice;
- ESSA Awakening Depth.

The check is a visibility marker. It must not change response behavior.

## Core Docs Health
The service should log:

- total `CORE_DOCS` count;
- whether critical architecture document paths are present.

Required paths:

- `ESSA_KNOWLEDGE_SYSTEM/00_ESSA_FOUNDATION.md`;
- `ESSA_PRESENCE_SYSTEM/12_ESSA_LISA_PERSONALITY_EXPRESSION.md`;
- `ESSA_PRESENCE_SYSTEM/13_LISA_RECOGNIZABLE_VOICE.md`;
- `ESSA_COGNITIVE_SYSTEM/19_ESSA_RESPONSE_IDENTITY_STYLE.md`;
- `ESSA_COGNITIVE_SYSTEM/20_ESSA_AWAKENING_DEPTH_SYSTEM.md`;
- `ESSA_VOICE_SYSTEM/03_ESSA_PRONUNCIATION_ENGINE.md`.

## Optional Endpoint
The service may expose a safe read-only endpoint:

```text
GET /essa-health
```

It should return build id, build name, active modules, core docs count and status.

This endpoint must not touch Telegram webhook logic, OpenAI calls, Memory DB, Voice, response guards or user data.

## Boundaries
This module is observability only.

It must not change:

- Telegram webhook behavior;
- OpenAI request construction;
- Memory DB reads or writes;
- Voice generation;
- response guards;
- retrieval behavior.

## Final Principle
Render Logs should make it immediately obvious which ESSA Navigator build is alive.
