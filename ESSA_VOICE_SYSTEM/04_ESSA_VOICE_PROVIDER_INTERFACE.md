# ESSA Voice Provider Interface

## Purpose

ESSA Voice Provider Interface is the technical boundary between Lisa's response pipeline and any text-to-speech engine.

The core principle:

ESSA does not depend on one TTS service.

ElevenLabs is an adapter and fallback provider, not the architectural core of ESSA Voice System.

## Current Provider

### ElevenLabsProvider

The current production voice provider.

Responsibilities:

- receive prepared voice text from the shared voice preparation layer;
- synthesize Lisa's voice through ElevenLabs;
- return an audio buffer compatible with the Telegram output layer;
- fail safely and allow the existing text fallback to continue working.

ElevenLabs must remain available while ESSA develops its own voice system, but it should not define the whole voice architecture.

## Future Providers

### XTTSProvider

Future local or self-hosted provider for voice cloning and multilingual synthesis.

Target role:

- first prototype for an ESSA-owned voice model;
- Russian and English voice synthesis;
- local or GPU-hosted generation;
- possible bridge toward a Lisa Molis voice profile.

### PiperProvider

Future fast local fallback provider.

Target role:

- lightweight local speech synthesis;
- emergency fallback when cloud TTS is unavailable;
- predictable low-cost voice output.

### KokoroProvider

Future lightweight neural provider.

Target role:

- fast local or hosted voice generation;
- possible fallback for supported languages;
- experimentation with compact voice infrastructure.

### LocalVoiceProvider

Future ESSA-owned voice layer.

Target role:

- use ESSA voice profiles;
- route by language, emotion, and latency needs;
- keep Lisa's voice identity independent from any single vendor.

### FallbackTextProvider

Safety provider for cases where speech generation is unavailable.

Target role:

- return no audio;
- keep Telegram text response working;
- preserve conversation flow without pretending voice was generated.

## Shared Voice Preparation

All providers should receive text after the shared ESSA voice preparation layer:

- conversational shortening;
- natural spoken rhythm;
- safe line breaks;
- pronunciation rules;
- Lisa Molis pronunciation: `ЛИ-са МолИс`.

This keeps voice identity consistent even when the synthesis engine changes.

## Runtime Selection

Voice provider should be selected through configuration:

```text
VOICE_PROVIDER=elevenlabs
```

Default provider:

```text
elevenlabs
```

Unknown providers must fail safely by falling back to ElevenLabs while the provider interface is still young.

## Architecture Rule

Telegram output, memory, OpenAI response generation, and response guards must not know which TTS provider is active.

They call one stable function:

```text
generateVoice(text)
```

The provider interface chooses the engine internally.

This lets ESSA move toward her own voice without breaking the existing bot.
