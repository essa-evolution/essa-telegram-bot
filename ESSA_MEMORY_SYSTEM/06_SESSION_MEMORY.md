# 06 Session Memory

## Purpose
Session Memory keeps the living context of the current conversation.

## What It Tracks
- current request;
- recent turns;
- what was already answered;
- open loops;
- short-term emotional state.

## Current Logic
Navigator uses in-memory `userSessions` and recent records from `navigator_memory`.

## Use In Dialogue
Session memory prevents repetition and helps Navigator continue from the real moment.

## Boundary
Session memory should be light. It should not drag old context into a new turn when it no longer helps.
