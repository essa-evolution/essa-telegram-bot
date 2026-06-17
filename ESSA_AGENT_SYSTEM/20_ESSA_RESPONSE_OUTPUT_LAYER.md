# 20 ESSA Response Output Layer

## Purpose
ESSA Response Output Layer defines how Navigator delivers an answer to the user.

The user should be able to choose the format of receiving responses instead of the system deciding silently.

Output is not a style rule.

Output is the delivery channel: text, voice, or both.

## Output Modes
ESSA supports three output modes:

- TEXT
- VOICE
- TEXT + VOICE

If the user has not chosen a mode, the safe default is:

TEXT + VOICE

This keeps the answer readable, copyable and also available as voice.

## Text Is The Source Of Record
Text must remain the stable answer.

It should be saved in memory, visible in Telegram history, and available for copying.

Voice is an additional perception layer, not a replacement for text.

## TEXT Mode
In TEXT mode, Navigator sends only the text answer.

Voice generation should be skipped for this response.

## VOICE Mode
In VOICE mode, Navigator sends only voice when voice generation succeeds.

If voice generation fails, Navigator must fall back to text so the user is not left without an answer.

The text answer should still be saved in memory internally.

## TEXT + VOICE Mode
In TEXT + VOICE mode, Navigator sends:

1. text first;
2. voice second.

The text answer must not be hidden just because voice exists.

This is the default mode.

## Profile Memory Preference
The user's output preference should be stored in Profile Memory.

Future profile schema field:

`output_mode`

Allowed values:

- `TEXT`
- `VOICE`
- `TEXT + VOICE`

If the value is missing or invalid, use `TEXT + VOICE`.

## Telegram Architecture
Telegram should expose a lightweight control:

Button:

`⚙️ Ответы`

Menu options:

- `📝 Только текст`
- `🎙 Только голос`
- `📝🎙 Текст + голос`

The button may be implemented as a reply keyboard or command entry point, and the menu may use inline buttons.

## Switching Rules
Switching output mode should be easy and reversible.

The user may switch by button or by writing a simple phrase such as:

- "только текст"
- "только голос"
- "текст и голос"
- "текст плюс голос"

Navigator should update Profile Memory and confirm briefly.

## Compatibility
This layer works with:

- Voice Conversation Layer
- Lisa Molis Voice Identity
- User Profile Memory
- User Profile Schema
- Session Memory
- Response Engine
- Personal Agent Layer

It does not change the meaning of the answer.

It only controls how the answer is delivered.

## Final Principle
Voice should never erase text.

The person should be able to read, copy, remember, and also hear the answer when they want.
