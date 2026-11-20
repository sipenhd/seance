# Tasks — IRC revival (Séance)

## Wave 1 (no dependencies, parallel)
- [ ] Scaffold: `npm init`, TypeScript strict config, ESLint + Prettier.
- [ ] IRC parser: raw line → typed event; composer: action → command.
- [ ] Property-based tests for the parser (fast-check round-trip).
- [ ] Static UI shell: layout, channel list, message pane, member list.

## Wave 2 (depends on Wave 1)
- [ ] IRC client: TCP connect, NICK/USER handshake, JOIN/PART/PRIVMSG.
- [ ] Gateway: Express + WebSocket relay, one IRC session per browser user.
- [ ] Channel logs: append-only JSON, capped, per channel.

## Wave 3 (depends on Wave 2)
- [ ] Moderator bot: flood + spam-marker detection, warn/mute, action log.
- [ ] Translator bot: ID ↔ EN for a clicked message.
- [ ] Summarizer bot: ≤5-bullet "catch me up" from the log.
- [ ] Greeter bot: welcome + FAQ answers for newcomers.
- [ ] Demo mode: local room with scripted chatters, zero network.

## Wave 4 (depends on Wave 3)
- [ ] Friendly UI polish (Boss direction): warm palette, rounded cards,
      ghost badge for bots, candle-glow header accent.
- [ ] Kiro usage write-up + demo video (≤2 min) + screenshots.
- [ ] Public GitHub repo, MIT license, push with `/.kiro` at root.
- [ ] Devpost draft submission, then final submit before 5 Dec 05:00 WIB.
