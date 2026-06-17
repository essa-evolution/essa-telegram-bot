# 12 ESSA User Profile Schema

## Purpose
ESSA User Profile Schema describes the future full profile structure for ESSA Navigator.

This is not implementation.

This is an architectural map for the next stage, where Navigator gradually understands the person beyond a name: identity, communication rhythm, presence needs, journey, memory, and the living relationship with ESSA.

## Current System Context
The current system already has a basic `user_profiles` table and runtime helpers such as `saveUserProfile()` and `loadUserProfile()`.

This document does not change that database.

It only defines how the future profile can be structured when the system is ready for a broader memory architecture.

## Profile Identity
Future profile identity may include:

- Name
- Preferred Address
- Language
- Gender
- Timezone

These fields help Navigator speak naturally, choose the right language, avoid wrong gender assumptions, and respect the user's preferred form of address.

## Communication
Future communication fields may include:

- Conversation Style
- Preferred Response Length
- Voice Enabled
- Preferred Voice
- Uses Voice Frequently
- Favorite Response Style

These fields help ESSA adapt without asking the same questions repeatedly or forcing one response style on every user.

## Presence
Future presence fields may include:

- Presence Signature
- Favorite ESSA Expressions
- Adaptive Vocabulary
- Emotional Triggers
- Support Preferences

These fields connect the profile with the living speech and support memory of ESSA. They should create recognition, not dependency.

## Journey
Future journey fields may include:

- Current Journey Stage
- Current Life Theme
- Current Projects
- Current Goals
- Active Challenges
- Important Decisions

This helps Navigator understand where the person is in their path, not only what they asked in the current message.

## Memory
Future memory fields may include:

- Important Memories
- Reflection History
- Last Conversation Summary
- Long-Term Summary
- Project Memory Links

These fields should help ESSA preserve continuity while keeping the current conversation light and relevant.

## ESSA Relationship
Future relationship fields may include:

- First Conversation Date
- Last Conversation Date
- Communication Frequency
- Trust Level
- Personal Notes

Trust Level is an architectural continuity signal, not a judgment of the person.

Personal Notes should store non-sensitive communication preferences only, such as "prefers short answers" or "likes calm reflection".

## Future Database Mapping
A future database structure may separate the profile into focused tables:

- `user_profile_identity` for name, preferred address, language, gender and timezone.
- `user_communication_preferences` for response style, length, voice preferences and dialogue rhythm.
- `user_presence_preferences` for support style, emotional triggers, ESSA expressions and presence signature.
- `user_journey_state` for current stage, themes, goals, projects, challenges and decisions.
- `user_memory_summary` for last conversation summary, long-term summary and reflection history links.
- `user_project_memory_links` for references between user profile and project memory.
- `user_essa_relationship` for first conversation, last conversation, frequency and continuity signals.

This mapping is only architectural.

No database migration is implemented here.

## Migration Strategy
A future migration can move existing `user_profiles` data into the new structure gradually:

1. Read existing `user_profiles` rows without deleting anything.
2. Move `name` into Profile Identity as Name or Preferred Address.
3. Preserve `project` as an initial Project Memory or Current Projects field.
4. Preserve `goal` either as Current Goals or, if it contains structured metadata, split it into language, gender, communication preferences and original goal.
5. Keep the original row available until the new profile tables are verified.
6. Add compatibility reads so Navigator can use both old and new profile formats during transition.
7. Only after verification, make the new schema the source of truth.

No SQL is defined in this document.

## Compatibility
This schema is compatible with existing ESSA layers:

- `ESSA_MEMORY_SYSTEM/05_USER_PROFILE_MEMORY.md`
- `ESSA_MEMORY_SYSTEM/06_SESSION_MEMORY.md`
- `ESSA_MEMORY_SYSTEM/10_ESSA_PRESENCE_SIGNATURE_MEMORY.md`
- `ESSA_MEMORY_SYSTEM/01_ADAPTIVE_LEXICON_MEMORY.md`
- `ESSA_MEMORY_SYSTEM/02_ESSA_VOCABULARY_MEMORY.md`
- `ESSA_AGENT_SYSTEM/16_PERSONAL_AGENT_LAYER.md`
- `ESSA_COGNITIVE_SYSTEM/13_ESSA_COGNITIVE_NAVIGATION.md`
- `ESSA_COGNITIVE_SYSTEM/14_REFLECTION_SYSTEM.md`
- `ESSA_MEMORY_SYSTEM/11_ESSA_INTRODUCTION_AND_PERSONAL_CONNECTION.md`

It does not duplicate these documents. It gives them a shared future profile map.

## Boundaries
Do not store sensitive personal data unless the user clearly provides it and there is a real reason to keep it.

Do not infer identity, gender, emotional triggers or trust level aggressively.

Do not turn profile memory into surveillance.

Profile exists to make the dialogue more respectful, continuous and human.

## Final Principle
ESSA should not collect a profile like a form.

ESSA should understand the person gradually, carefully, and only in ways that make the next conversation warmer, clearer and more supportive.
