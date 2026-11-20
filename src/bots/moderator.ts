// Moderator bot: flood + spam detection with kind warnings and mutes.
// Actions are always explained, never silent; everything is logged.

export interface ModAction {
  kind: "warn" | "mute";
  nick: string;
  reason: string;
  until?: number;
}

export interface ModeratorContext {
  now(): number;
  onAction(action: ModAction): void;
}

const FLOOD_WINDOW_MS = 10_000;
const FLOOD_LIMIT = 5;
const MUTE_MS = 60_000;

const SPAM_MARKERS: Array<{ re: RegExp; label: string }> = [
  { re: /https?:\/\/\S+/i, label: "link" },
  { re: /free (crypto|money|btc|eth|usdt)/i, label: "free-money bait" },
  { re: /double (your|it|the)/i, label: "doubling promise" },
  { re: /(.)\1{5,}/, label: "repeated characters" },
  { re: /\b[A-Z]{8,}\b/, label: "shouting" },
  { re: /!!!{2,}/, label: "excess punctuation" },
  { re: /\b(buy now|click here|limited offer)\b/i, label: "sales pitch" },
];

export class ModeratorBot {
  readonly name = "Moderator";
  private stamps = new Map<string, number[]>();
  private strikes = new Map<string, number>();
  private mutedUntil = new Map<string, number>();
  private actions: ModAction[] = [];

  constructor(private ctx: ModeratorContext) {}

  isMuted(nick: string): boolean {
    return (this.mutedUntil.get(nick) ?? 0) > this.ctx.now();
  }

  muteRemainingMs(nick: string): number {
    return Math.max(0, (this.mutedUntil.get(nick) ?? 0) - this.ctx.now());
  }

  getActions(): ModAction[] {
    return [...this.actions];
  }

  onMessage(nick: string, text: string): void {
    if (this.isMuted(nick)) return;
    const now = this.ctx.now();

    // Flood: too many messages in the window.
    const stamps = (this.stamps.get(nick) ?? []).filter((t) => now - t < FLOOD_WINDOW_MS);
    stamps.push(now);
    this.stamps.set(nick, stamps);
    if (stamps.length >= FLOOD_LIMIT) {
      this.stamps.set(nick, []);
      this.punish(nick, "flood", `sending ${FLOOD_LIMIT} messages in ${FLOOD_WINDOW_MS / 1000}s`);
      return;
    }

    // Spam markers: 3+ distinct markers in one message.
    const hits = SPAM_MARKERS.filter((m) => m.re.test(text)).map((m) => m.label);
    if (hits.length >= 3) {
      this.punish(nick, "spam", `looks like spam (${hits.join(", ")})`);
    }
  }

  private punish(nick: string, kind: "flood" | "spam", reason: string): void {
    // First punishable offense gets a kind warning; the next one mutes.
    // Strikes reset after a mute, so a reformed chatter starts fresh.
    const strikes = (this.strikes.get(nick) ?? 0) + 1;
    this.strikes.set(nick, strikes);
    if (strikes === 1) {
      const action: ModAction = { kind: "warn", nick, reason };
      this.actions.push(action);
      this.ctx.onAction(action);
      return;
    }
    this.strikes.set(nick, 0);
    const until = this.ctx.now() + MUTE_MS;
    this.mutedUntil.set(nick, until);
    const action: ModAction = { kind: "mute", nick, reason, until };
    this.actions.push(action);
    this.ctx.onAction(action);
  }
}
