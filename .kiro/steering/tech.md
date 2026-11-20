# Tech

- Runtime: Node.js 22 (LTS), TypeScript (strict).
- Server: Express (HTTP + static) + `ws` (WebSocket to the browser).
- IRC: raw TCP via `node:net`, implementing the RFC 1459 / RFC 2812 subset
  needed for a modern client (NICK/USER/JOIN/PART/PRIVMSG/NOTICE/PING/PONG,
  WHO/NAMES/LIST, CTCP ACTION). No IRC library — the protocol layer is the
  project's own code, so the resurrection is real.
- Persistence: append-only JSON log files per channel (no native modules,
  no database server). Summaries read from these logs.
- Frontend: Vite + vanilla TypeScript, single-page app. No heavy framework;
  the UI must stay fast and readable.
- Agent bots: a small provider interface (`BotProvider`) with a local
  heuristic implementation for the demo. An LLM-backed provider can be
  plugged in later without changing the bots.
- Tests: Vitest + fast-check (property-based testing for the IRC parser and
  the rate limiter — PBT is part of the Kiro evidence story).
- Lint/format: ESLint + Prettier. A hook runs ESLint --fix on save.
- Repo rules: public GitHub only; `/.kiro` must never be gitignored; LICENSE
  (MIT) visible in the repo About.
