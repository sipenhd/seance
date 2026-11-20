// Translator, Summarizer and Greeter bots — thin wrappers over the provider
// plus the room's FAQ. They reply through the crew, never to IRC directly.

import type { LogEntry } from "../shared/log.js";
import type { BotProvider } from "./provider.js";

export class TranslatorBot {
  readonly name = "Translator";
  constructor(private provider: BotProvider) {}

  translate(text: string, target: "en" | "id"): string {
    const { text: out, partial } = this.provider.translate(text, target);
    const note = partial ? " (best effort — some words stayed as-is)" : "";
    return `“${text}” → “${out}”${note}`;
  }
}

export class SummarizerBot {
  readonly name = "Summarizer";
  constructor(private provider: BotProvider) {}

  catchMeUp(entries: LogEntry[]): string {
    const bullets = this.provider.summarize(entries, 5);
    return `While you were away:\n• ${bullets.join("\n• ")}`;
  }
}

const FAQ: Array<{ re: RegExp; answer: string }> = [
  {
    re: /what is (this|seance)|apa ini/i,
    answer:
      "Séance is IRC, back from the dead — a 1988 chat protocol with a friendly modern face. You are chatting on a real IRC channel right now.",
  },
  {
    re: /how (do i|to) (join|chat)|gimana (cara|gabung)/i,
    answer:
      "Just type in the box below and hit Send — you are already in the room. Pick a channel on the left to switch rooms.",
  },
  {
    re: /who (are you|is the crew)|siapa (kamu|kalian)/i,
    answer:
      "I'm Greeter, one of the crew. Moderator keeps the room kind, Translator handles ID ↔ EN, and Summarizer catches you up when you return.",
  },
  {
    re: /translat|terjemah/i,
    answer:
      "Ask the Translator: send /translate en <message> or /translate id <message> and it will translate for you.",
  },
  {
    re: /summar|catch me up|ringkas/i,
    answer: "Send /summary any time and the Summarizer will give you the highlights in 5 bullets or fewer.",
  },
];

export class GreeterBot {
  readonly name = "Greeter";

  welcome(nick: string): string {
    return (
      `Welcome, ${nick}! 👋 This is #seance-demo — IRC, back from the dead. ` +
      `Be kind, say hi, and type /help any time you wonder what the crew can do.`
    );
  }

  answer(question: string): string {
    for (const item of FAQ) {
      if (item.re.test(question)) return item.answer;
    }
    return (
      "Good question! I can tell you what Séance is, how to chat, who the crew are, " +
      "or how translation and summaries work. Try /help for the list."
    );
  }

  help(): string {
    return (
      "Here's what the crew can do:\n" +
      "• /translate en <text> — translate to English\n" +
      "• /translate id <text> — translate to Indonesian\n" +
      "• /summary — catch up on what you missed\n" +
      "• /help — this list\n" +
      "The Moderator watches for spam and floods, kindly."
    );
  }
}
