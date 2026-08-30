# ESSA Telegram Bot

## Environment variables

Required for the bot and ESA_OS knowledge retrieval layer:

- `ESA_OS_KNOWLEDGE_ROOT`
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `OPENAI_EMBEDDING_MODEL`
- `ESSA_KNOWLEDGE_MATCH_COUNT`

## Core identity source of truth

- `02_AGENTS/07_LISA/00_CORE/LISA_MOLIS_IDENTITY.txt` is the priority Core Identity document for questions about Lisa Molis and authorship of ESSA Evolution, ESSA OS, ESSA Navigator, LISA Agent, Living Cards, and related ecosystem projects.
- The document is registered in `src/knowledge/coreDocs.js` and is included in priority identity retrieval for authorship and identity questions.
