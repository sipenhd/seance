// Local heuristic provider for the bot crew.
// No external API: translation is a phrase + word dictionary (ID <-> EN),
// summaries are extractive (pick representative messages). An LLM-backed
// provider can implement the same interface later without touching the bots.

import type { LogEntry } from "../shared/log.js";

export interface BotProvider {
  translate(text: string, target: "en" | "id"): { text: string; partial: boolean };
  summarize(entries: LogEntry[], maxBullets: number): string[];
}

const PHRASES: Array<[string, string]> = [
  ["halo", "hello"],
  ["apa kabar", "how are you"],
  ["selamat pagi", "good morning"],
  ["selamat malam", "good night"],
  ["terima kasih", "thank you"],
  ["sama-sama", "you're welcome"],
  ["selamat datang", "welcome"],
  ["apa ini", "what is this"],
  ["bagaimana caranya", "how do i do this"],
  ["saya baru di sini", "i'm new here"],
  ["sampai jumpa", "see you later"],
  ["maaf", "sorry"],
  ["tolong", "please"],
  ["iya", "yes"],
  ["tidak", "no"],
  ["bagus", "nice"],
  ["keren", "cool"],
  ["ini irc", "this is irc"],
  ["kapan", "when"],
  ["di mana", "where"],
];

export class LocalProvider implements BotProvider {
  translate(text: string, target: "en" | "id"): { text: string; partial: boolean } {
    const lower = text.toLowerCase().trim();
    let out = lower;
    let partial = false;
    // Longest phrases first so "apa kabar" wins over "apa".
    const sorted = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
    for (const [id, en] of sorted) {
      const from = target === "en" ? id : en;
      const to = target === "en" ? en : id;
      if (out.includes(from)) out = out.split(from).join(to);
    }
    // Word-level fallback for anything left untranslated.
    const words = out.split(/\s+/);
    const dict = new Map<string, string>(
      PHRASES.flatMap(([id, en]) => {
        const from = target === "en" ? id : en;
        const to = target === "en" ? en : id;
        return from.split(" ").length === 1 ? [[from, to]] : [];
      }),
    );
    const translated = words.map((w) => {
      const clean = w.replace(/[^a-z']/g, "");
      const hit = dict.get(clean);
      if (!hit) {
        if (/[a-z]/.test(w)) partial = true;
        return w;
      }
      return w.replace(clean, hit);
    });
    return { text: translated.join(" "), partial };
  }

  summarize(entries: LogEntry[], maxBullets = 5): string[] {
    const human = entries.filter((e) => !e.bot && e.text.trim().length > 0);
    if (human.length === 0) return ["Nothing much happened — the room was quiet."];
    // Representative messages: longest distinct ones, in time order.
    const seen = new Set<string>();
    const picked: LogEntry[] = [];
    const byLength = [...human].sort((a, b) => b.text.length - a.text.length);
    for (const e of byLength) {
      const key = e.text.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(e);
      if (picked.length >= maxBullets) break;
    }
    picked.sort((a, b) => a.time.localeCompare(b.time));
    return picked.map((e) => `${e.from}: ${e.text.slice(0, 140)}`);
  }
}
