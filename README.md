# Séance — IRC, back from the dead

A friendly web IRC client for **Kiroween 2026** (category: **Resurrection**).
IRC ran the early internet; Séance brings it back with manners: every
channel is tended by a crew of AI agents — a moderator, a translator, a
summarizer, and a greeter.

- Join real IRC networks (Libera.Chat by default) from the browser.
- No desktop client, no `/server` commands to memorize.
- Warm, friendly UI. Halloween touches stay subtle.

## Run it

```bash
npm install
npm run dev
```

## Built with Kiro

This project was built with Kiro (CLI + Crew). See `.kiro/` for the specs,
steering docs, hooks, and the custom agents (orchestrator, IRC protocol
agent, moderation agent, test agent). The `/.kiro` directory is part of the
submission by design — it is the evidence of how Kiro was used.
