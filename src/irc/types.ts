// IRC wire types (RFC 1459 / RFC 2812 subset).

export interface IrcMessage {
  /** Optional prefix, e.g. "nick!user@host" or a server name. */
  prefix?: string;
  /** Command verb or 3-digit numeric reply, e.g. "PRIVMSG", "001". */
  command: string;
  /** Middle params (no spaces, no leading colon). */
  params: string[];
  /** Trailing param (may contain spaces), without the leading colon. */
  trailing?: string;
}

export type IrcEvent =
  | { type: "privmsg"; from: string; target: string; text: string }
  | { type: "notice"; from: string; target: string; text: string }
  | { type: "join"; nick: string; channel: string }
  | { type: "part"; nick: string; channel: string; reason?: string }
  | { type: "ping"; token: string }
  | { type: "welcome"; nick: string; text: string }
  | { type: "names"; channel: string; nicks: string[] }
  | { type: "endOfNames"; channel: string }
  | { type: "raw"; message: IrcMessage };

export function nickFromPrefix(prefix?: string): string {
  if (!prefix) return "";
  const bang = prefix.indexOf("!");
  return bang === -1 ? prefix : prefix.slice(0, bang);
}
