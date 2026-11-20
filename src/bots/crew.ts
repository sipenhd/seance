// BotCrew: the four agents that live in a channel. The gateway owns the
// socket; the crew only sees events and replies through the given sink.

import type { LogEntry } from "../shared/log.js";
import { ModeratorBot, type ModAction } from "./moderator.js";
import { GreeterBot, SummarizerBot, TranslatorBot } from "./crew-bots.js";
import { LocalProvider, type BotProvider } from "./provider.js";

export interface CrewSink {
  reply(from: string, text: string): void;
  log(): LogEntry[];
}

export class BotCrew {
  readonly moderator: ModeratorBot;
  private translator: TranslatorBot;
  private summarizer: SummarizerBot;
  private greeter: GreeterBot;

  constructor(
    private sink: CrewSink,
    provider: BotProvider = new LocalProvider(),
  ) {
    this.moderator = new ModeratorBot({
      now: () => Date.now(),
      onAction: (a) => this.announceAction(a),
    });
    this.translator = new TranslatorBot(provider);
    this.summarizer = new SummarizerBot(provider);
    this.greeter = new GreeterBot();
  }

  onMessage(from: string, text: string): void {
    this.moderator.onMessage(from, text);
  }

  onJoin(nick: string): void {
    this.sink.reply(this.greeter.name, this.greeter.welcome(nick));
  }

  /** Returns true when the text was a crew command (handled, don't forward). */
  handleSlash(from: string, text: string): boolean {
    if (!text.startsWith("/")) return false;
    const [cmd, ...rest] = text.slice(1).split(" ");
    const arg = rest.join(" ");
    switch ((cmd ?? "").toLowerCase()) {
      case "translate": {
        const [lang, ...words] = rest;
        const target = lang === "id" ? "id" : "en";
        const body = words.join(" ");
        if (!body) {
          this.sink.reply(this.translator.name, "Usage: /translate en <text> or /translate id <text>");
        } else {
          this.sink.reply(this.translator.name, this.translator.translate(body, target));
        }
        return true;
      }
      case "summary":
        this.sink.reply(this.summarizer.name, this.summarizer.catchMeUp(this.sink.log()));
        return true;
      case "help":
        this.sink.reply(this.greeter.name, this.greeter.help());
        return true;
      default:
        this.sink.reply(this.greeter.name, this.greeter.answer(arg || text));
        return true;
    }
  }

  private announceAction(a: ModAction): void {
    if (a.kind === "warn") {
      this.sink.reply(
        this.moderator.name,
        `Hey ${a.nick}, friendly heads-up: ${a.reason}. One more and I'll mute you for a minute — nothing personal, the room just stays nicer this way.`,
      );
    } else {
      this.sink.reply(
        this.moderator.name,
        `${a.nick} is muted for 60 seconds (${a.reason}). Take a breath, come back kind.`,
      );
    }
  }
}
