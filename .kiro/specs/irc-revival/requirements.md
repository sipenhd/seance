# Requirements — IRC revival (Séance)

## User stories

1. As a visitor, I can open Séance in the browser and join an IRC channel
   without installing anything or typing IRC commands, so that IRC feels
   welcoming for the first time.
2. As a chatter, I see messages arrive live and can send messages, join and
   leave channels, and see who is in the room.
3. As a chatter, the Moderator agent warns me (privately and kindly) when my
   message looks like spam or abuse, and mutes repeat floods, so the room
   stays friendly without a human mod on duty.
4. As an Indonesian speaker in an English channel, I can read a translation
   of any message in one click, so I can follow the conversation.
5. As a returning chatter, I can ask "catch me up" and get a short summary
   of what happened while I was away.
6. As a newcomer, the Greeter welcomes me and answers basic questions about
   the room.
7. As a judge, I can see exactly how Kiro was used: specs, steering, hooks,
   and the Crew agents in `.kiro/`, plus a write-up in the submission.

## Acceptance criteria

- Connects to Libera.Chat over TCP and joins `#seance-demo` (or a
  user-chosen channel) from the web UI.
- Demo mode works with zero network: a local room with scripted chatters so
  the app can be tried offline.
- Moderator flags a 5-message flood within 10 seconds and a message with 3+
  spam markers; actions are logged and visible.
- Translator returns an ID/EN translation for a sample message.
- Summarizer produces a ≤5-bullet summary from a stored log of ≥20 messages.
- All four bots are reachable from the UI and identify themselves as bots.
- `npm test` passes, including property-based tests for the IRC parser.
- Repo is public on GitHub, MIT licensed, with `/.kiro` at the root.
