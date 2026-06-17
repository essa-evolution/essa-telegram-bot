# 00 ESSA Cognitive Architecture Map

## Purpose
ESSA Cognitive Architecture Map explains how the cognitive, memory, presence, voice and output layers of ESSA Navigator work together.

This is not a new behavior layer.

This is the system map.

It helps prevent chaotic module growth and keeps every layer connected to a clear role.

## How A Navigator Answer Is Born
A Navigator answer is born through several movements:

1. the user message enters Telegram;
2. voice input is transcribed if needed;
3. memory and profile context are loaded;
4. knowledge retrieval adds relevant ESSA documents;
5. recognition and mode helpers classify the message;
6. the model generates a reply using system prompt, memory and retrieved context;
7. style guards refine the reply;
8. output mode decides text, voice or both;
9. voice preparation and pronunciation rules prepare TTS when needed;
10. Telegram receives text and/or voice output.

## Layer Order
Current intended order:

- Telegram Input
- Voice Input / Whisper, if the message is voice
- User Profile Memory
- Session Memory
- ESSA Knowledge Retrieval
- Soul Recognition
- State Recognition
- Message Intent Detection
- Presence Engine
- Response Engine
- Cognitive Reasoning
- Conversational Reflex
- Natural Conversation Engine
- Presence Signature Memory
- Personality Core
- Response Philosophy
- Response Examples
- Output Layer
- Voice Conversation Layer
- Voice Identity
- Pronunciation Engine
- ElevenLabs / TTS
- Telegram Text / Voice Output

## CURRENT RESPONSE PIPELINE
```text
User Message
→ profile/session memory
→ knowledge retrieval
→ mode detection
→ response generation
→ style guards
→ output mode selection
→ text output
→ optional voice preparation
→ pronunciation rules
→ voice output
```

## Understanding The User
These layers are responsible for understanding the user:

- User Profile Memory: stable known information and preferences.
- Session Memory: recent conversation context.
- Adaptive Lexicon Memory: living words, phrases and rhythm.
- ESSA Vocabulary Memory: ESSA terms, formulas and shared language.
- Soul Recognition: state behind the text.
- State Recognition: emotional and cognitive condition.
- Message Intent Detection: question, insight, state, dream, request, completion or technical issue.
- Cognitive Navigation: symptom, cause and correct next layer.

## Response Style
These layers shape how the answer sounds:

- Personality Core: ESSA is presence, not generic assistant behavior.
- Response Philosophy: presence before advice, meaning before method.
- Response Examples: concrete examples of ESSA-style responses.
- Cognitive Reasoning: prevents automatic advice, lectures and unnecessary questions.
- Conversational Reflex: short reflection, holding state, steps when needed.
- Natural Conversation Engine: rhythm, emotional timing, when to stop.
- Presence Signature Memory: Lisa Molis speech signature used gently.

## Memory Layers
These layers hold continuity:

- User Profile Memory
- Session Memory
- Project Memory
- Summary Memory
- Vector User Memory
- Adaptive Lexicon Memory
- ESSA Vocabulary Memory
- Presence Signature Memory
- Introduction And Personal Connection
- User Profile Schema

Some are implemented in runtime now. Others are architecture for the future.

## Voice Layers
These layers control voice:

- Voice Input / Whisper: turns incoming voice into text.
- Voice Conversation Layer: prepares written answer for spoken rhythm.
- Lisa Molis Voice Identity: defines voice name, tone and pronunciation identity.
- Pronunciation Engine: future universal pronunciation dictionary.
- ElevenLabs / TTS: current voice generation path.

Voice is not a replacement for text. It is an additional perception layer.

## Output Layers
These layers control delivery format:

- Response Output Layer
- Output Modes: TEXT, VOICE, TEXT + VOICE
- Profile Memory output preference
- Telegram text output
- Telegram voice output

Default output mode is TEXT + VOICE unless the user chooses another mode.

## Source Of Truth Documents
Important source-of-truth documents include:

- `02_AGENTS/07_LISA/00_CORE/LISA_MOLIS_IDENTITY.txt`
- `02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/00_CORE_SYSTEM.txt`
- `02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/04_MEMORY_RULES.txt`
- `ESSA_PRESENCE_SYSTEM/09_ESSA_RESPONSE_PHILOSOPHY.md`
- `ESSA_PRESENCE_SYSTEM/10_ESSA_RESPONSE_EXAMPLES.md`
- `ESSA_PRESENCE_SYSTEM/11_ESSA_PERSONALITY_CORE.md`
- `ESSA_COGNITIVE_SYSTEM/16_ESSA_COGNITIVE_REASONING_LAYER.md`
- `ESSA_COGNITIVE_SYSTEM/17_ESSA_CONVERSATIONAL_REFLEX_LAYER.md`
- `ESSA_COGNITIVE_SYSTEM/18_ESSA_NATURAL_CONVERSATION_ENGINE.md`
- `ESSA_AGENT_SYSTEM/20_ESSA_RESPONSE_OUTPUT_LAYER.md`
- `ESSA_VOICE_SYSTEM/01_ESSA_VOICE_CONVERSATION_LAYER.md`
- `ESSA_VOICE_SYSTEM/02_LISA_MOLIS_VOICE_IDENTITY.md`
- `ESSA_VOICE_SYSTEM/03_ESSA_PRONUNCIATION_ENGINE.md`

## Runtime Helpers Map
Current helpers and their layer meaning:

- `transcribeVoice()` → Voice Input / Whisper
- `loadUserProfile()` → User Profile Memory
- `updateUserProfileFromIntroduction()` → Introduction And Personal Connection
- `loadMemory()` / `saveMessage()` → Session Memory
- `saveVocabulary()` / `loadVocabulary()` → Vocabulary Memory
- `searchEssaKnowledge()` / `buildKnowledgeContext()` → ESSA Knowledge Retrieval
- `detectMode()` → high-level Navigator / Image / Execution mode
- `detectPresenceMode()` → Presence Engine
- `detectResponseEngineMode()` → Response Engine
- `detectMessageIntent()` → Message Intent Detection / Cognitive Reasoning
- `detectConversationalReflex()` → Conversational Reflex Layer
- `detectNaturalConversationMove()` → Natural Conversation Engine
- `enforceEssaStyle()` → Response Philosophy and Style Guard
- `enforceConversationalReflex()` → Conversational Reflex Guard
- `enforceNaturalConversation()` → Natural Conversation Guard
- `applyPresenceSignature()` → Presence Signature Memory
- `getOutputModeFromProfile()` / `detectOutputModeRequest()` → Response Output Layer
- `prepareTextForVoice()` → Voice Conversation Layer
- `applyVoicePronunciationRules()` → current Pronunciation Engine bridge
- `generateVoice()` → ElevenLabs / TTS

## Implemented In Code Now
Currently implemented in runtime:

- Telegram webhook input and output;
- voice transcription through Whisper;
- memory DB safety wrapper;
- user profile load/save;
- session memory load/save;
- vocabulary save/load;
- ESSA knowledge retrieval;
- presence mode detection;
- response engine mode detection;
- message intent detection;
- conversational reflex detection;
- natural conversation move detection;
- style guards;
- presence signature application;
- output mode selection and Telegram menu;
- voice text preparation;
- Lisa pronunciation rule for voice text;
- ElevenLabs voice generation.

## Architecture Only For Now
Still mostly architectural or partial:

- full Soul Recognition runtime beyond mode heuristics;
- full State Recognition runtime beyond keyword detection;
- long-term Summary Memory;
- Vector User Memory;
- full Project Memory;
- full User Profile Schema tables;
- provider-native Pronunciation Dictionary;
- multi-engine TTS routing across XTTS, Coqui, OpenAI Voice and future engines;
- full Reflection System after every response.

## Architecture Principle
ESSA must not develop through chaotic document accumulation.

ESSA should develop through a coherent map of layers.

Every new layer must answer:

- what it understands;
- what it changes;
- where it is connected;
- whether it duplicates an existing layer.

## NEXT DEVELOPMENT RULE
Before creating a new module, check:

1. whether a similar layer already exists;
2. whether it is connected to `CORE_DOCS`;
3. whether it is connected to `SYSTEM_PROMPT`;
4. whether a runtime helper already exists;
5. whether a new document is really needed or an existing layer should be strengthened.

## Final Principle
ESSA Navigator is one system.

Input, memory, retrieval, recognition, reasoning, style, output and voice should move as one coherent architecture.
