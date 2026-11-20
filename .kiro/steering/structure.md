# Structure

```
seance/
├── AGENTS.md                 # always-included steering (open standard)
├── .kiro/
│   ├── steering/             # product.md, tech.md, structure.md, ...
│   ├── specs/irc-revival/    # requirements.md, design.md, tasks.md
│   ├── hooks/                # lint-on-save.json
│   ├── agents/               # orchestrator + sub-agents (Kiro Crew)
│   └── settings/mcp.json
├── src/
│   ├── server/               # Express + WebSocket gateway
│   ├── irc/                  # IRC protocol client (TCP, parser, commands)
│   ├── bots/                 # moderator, translator, summarizer, greeter
│   └── shared/               # types, message log
├── public/                   # Vite frontend (chat UI)
├── test/                     # unit + property-based tests
├── package.json
└── README.md
```

- Naming: files kebab-case, types PascalCase, functions camelCase.
- The IRC protocol layer (`src/irc/`) must not import anything from
  `src/server/` or `src/bots/` — it is a pure protocol client.
- Bots never talk to IRC directly; they receive events from the gateway and
  reply through it. That keeps moderation auditable.
- Every user-facing string the bots send must be friendly and plain.
