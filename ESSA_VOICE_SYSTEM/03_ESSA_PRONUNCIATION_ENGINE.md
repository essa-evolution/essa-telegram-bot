# 03 ESSA Pronunciation Engine

## Purpose
ESSA Pronunciation Engine is the future universal pronunciation layer for all voice models used by ESSA.

It should not depend only on ElevenLabs.

It should work as a shared Voice System mechanism before text is sent to any TTS engine.

## Core Principle
Before sending text to a voice model, ESSA should check names, words and special terms against an internal pronunciation dictionary.

If a word exists in the dictionary, ESSA uses the fixed pronunciation.

The same word should keep the same pronunciation every time it appears in the voice text.

## First Dictionary Rule
Dictionary entry:

- Written forms: `Лиса Молис`, `Lisa Molis`, `Лиса`, `Lisa`
- Pronunciation: `ЛИ-са`
- Stress: first syllable only
- Meaning: this is a name
- Boundary: never pronounce it as the name of an animal

At any number of repetitions in the text, use the same pronunciation rule.

## Pronunciation Dictionary Architecture
The future pronunciation dictionary should support:

- the name Лиса;
- ESSA;
- Navigator;
- internal module names;
- user names when needed;
- special ESSA words;
- new words that can be added without changing core runtime code.

The dictionary should be data-driven rather than hardcoded forever.

## Dictionary Entry Shape
A future entry may include:

- canonical term;
- written variants;
- voice pronunciation;
- language;
- stress pattern;
- phoneme hint if supported;
- engine-specific override;
- notes and boundaries.

Example:

```json
{
  "term": "Lisa Molis",
  "variants": ["Lisa Molis", "Лиса Молис", "Lisa", "Лиса"],
  "pronunciation": "ЛИ-са",
  "stress": "first_syllable",
  "meaning": "guide name inside ESSA",
  "boundary": "never pronounce as animal name"
}
```

## Engine Compatibility
The layer should be compatible with:

- ElevenLabs;
- XTTS;
- Coqui;
- OpenAI Voice;
- future TTS models.

If a model supports a native Pronunciation Dictionary, Lexicon, Phoneme Dictionary, custom vocabulary or similar mechanism, ESSA should use it.

If a model does not support a native mechanism, ESSA should use the internal safe text-preparation layer.

## Processing Flow
1. Navigator creates the answer.
2. `prepareTextForVoice()` creates the spoken version.
3. Pronunciation Engine checks the pronunciation dictionary.
4. The corrected voice text is sent to the selected voice model.

## Current Compatibility
The current system already has a safe internal preparation step through `prepareTextForVoice()`.

It also has a lightweight pronunciation rule for Lisa Molis through voice text preparation.

This module documents how that idea should become a reusable Pronunciation Engine in the future.

## Future Storage
The pronunciation dictionary may later live in:

- a JSON file;
- a database table;
- a knowledge document;
- a TTS-provider-specific lexicon;
- a hybrid source loaded at runtime.

New entries should be addable without rewriting the main voice pipeline.

## Safety Rules
Do not distort ordinary user text.

Do not apply pronunciation rules to written Telegram text unless explicitly needed.

Apply pronunciation rules only to voice output or TTS-specific preparation.

Preserve meaning before optimizing sound.

## Final Principle
Pronunciation is part of presence.

If ESSA says a name, it should say it as the person intended.
