import { describe, expect, it } from "vitest";
import { ModeratorBot } from "../src/bots/moderator.js";
import { GreeterBot, SummarizerBot, TranslatorBot } from "../src/bots/crew-bots.js";
import { LocalProvider } from "../src/bots/provider.js";
import { BotCrew } from "../src/bots/crew.js";
import type { LogEntry } from "../src/shared/log.js";

function makeMod() {
  let now = 1_000_000;
  const actions: Array<{ kind: string; nick: string }> = [];
  const mod = new ModeratorBot({
    now: () => now,
    onAction: (a) => actions.push({ kind: a.kind, nick: a.nick }),
  });
  return { mod, actions, advance: (ms: number) => (now += ms) };
}

describe("ModeratorBot", () => {
  it("warns on a 5-message flood, then mutes on repeat", () => {
    const { mod, actions, advance } = makeMod();
    for (let i = 0; i < 5; i++) mod.onMessage("spammer", `msg ${i}`);
    expect(actions).toEqual([{ kind: "warn", nick: "spammer" }]);
    expect(mod.isMuted("spammer")).toBe(false);
    advance(61_000);
    for (let i = 0; i < 5; i++) mod.onMessage("spammer", `again ${i}`);
    expect(actions[1]).toEqual({ kind: "mute", nick: "spammer" });
    expect(mod.isMuted("spammer")).toBe(true);
    expect(mod.muteRemainingMs("spammer")).toBeGreaterThan(0);
    advance(61_000);
    expect(mod.isMuted("spammer")).toBe(false);
  });

  it("warns on a message with 3+ spam markers", () => {
    const { mod, actions } = makeMod();
    mod.onMessage("sales", "FREE CRYPTO!!! click here https://example.xyz double your money!!!");
    expect(actions).toEqual([{ kind: "warn", nick: "sales" }]);
  });

  it("lets normal chat through", () => {
    const { mod, actions } = makeMod();
    mod.onMessage("alice", "hello everyone, how is your day going?");
    mod.onMessage("alice", "i was just reading about irc history, fascinating stuff");
    expect(actions).toEqual([]);
  });
});

describe("TranslatorBot", () => {
  const t = new TranslatorBot(new LocalProvider());
  it("translates common Indonesian phrases to English", () => {
    const out = t.translate("halo, apa kabar?", "en");
    expect(out.toLowerCase()).toContain("hello");
    expect(out.toLowerCase()).toContain("how are you");
  });
  it("translates English to Indonesian", () => {
    const out = t.translate("good morning", "id");
    expect(out.toLowerCase()).toContain("selamat pagi");
  });
});

describe("SummarizerBot", () => {
  it("returns at most 5 bullets from a long log", () => {
    const entries: LogEntry[] = Array.from({ length: 25 }, (_, i) => ({
      time: new Date(1_000_000 + i * 1000).toISOString(),
      from: `user${i % 5}`,
      text: `message number ${i} with some content to talk about`,
    }));
    const s = new SummarizerBot(new LocalProvider());
    const out = s.catchMeUp(entries);
    const bullets = out.split("\n").filter((l) => l.startsWith("•")).length;
    expect(bullets).toBeLessThanOrEqual(5);
    expect(out).toContain("user");
  });
});

describe("GreeterBot", () => {
  const g = new GreeterBot();
  it("explains what Séance is", () => {
    expect(g.answer("what is this")).toMatch(/IRC/i);
  });
  it("lists the crew commands in help", () => {
    expect(g.help()).toContain("/translate");
    expect(g.help()).toContain("/summary");
  });
});

describe("BotCrew", () => {
  it("routes /summary and /translate without forwarding", () => {
    const replies: Array<{ from: string; text: string }> = [];
    const crew = new BotCrew({
      reply: (from, text) => replies.push({ from, text }),
      log: () => [
        { time: new Date().toISOString(), from: "alice", text: "hello all" },
        { time: new Date().toISOString(), from: "bob", text: "welcome back" },
      ],
    });
    expect(crew.handleSlash("me", "/summary")).toBe(true);
    expect(replies[0]?.from).toBe("Summarizer");
    expect(crew.handleSlash("me", "/translate en halo")).toBe(true);
    expect(replies[1]?.from).toBe("Translator");
    expect(crew.handleSlash("me", "just chatting")).toBe(false);
  });
});
