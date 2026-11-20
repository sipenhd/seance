# Design — IRC revival (Séance)

## Architecture

```
Browser (Vite SPA) ──WebSocket── Gateway (Express + ws) ──TCP── Libera.Chat
                          │                    │
                          │              BotProvider (local heuristics)
                          │              Moderator / Translator /
                          │              Summarizer / Greeter
                          └──── Channel logs (JSON, append-only)
```

- **Gateway** (`src/server/`): owns one IRC connection per user session,
  relays events to the browser over WebSocket, and routes bot replies.
- **IRC client** (`src/irc/`): pure protocol layer. Parser turns raw lines
  into typed events; composer turns actions into commands. Property-based
  tests cover the parser (round-trip: parse(compose(x)) == x).
- **Bots** (`src/bots/`): event-driven. Each bot subscribes to gateway
  events and may emit a reply. Bots never touch the socket directly.
- **Logs** (`src/shared/`): every channel message is appended to a JSON
  log; the summarizer reads the log. Logs are per-channel and capped.

## Error handling
- IRC disconnect: gateway retries with backoff (1s, 2s, 5s, 15s, 60s) and
  shows a friendly "reconnecting…" state; queued outbound messages are
  kept and flushed on reconnect.
- Nick collision: gateway appends `_` and then a number until accepted.
- Bot failure: a bot that throws is disabled for that channel with a
  visible note, never crashing the gateway.

## UI
Friendly and warm (Boss's direction): soft cream/amber palette, rounded
cards, clear type. Channel list left, messages center, members right, bots
shown with a small ghost badge. Halloween accent: a candle-glow gradient
on the header, nothing scary.
