// IRC wire parser + composer (RFC 1459 / RFC 2812 subset).
// Pure functions: no I/O, no imports from server/ or bots/.

import { IrcEvent, IrcMessage, nickFromPrefix } from "./types.js";

const MAX_LINE = 512;

/**
 * Parse one raw IRC line into a structured message.
 * Grammar: [:prefix ]command [params] [:trailing]
 * Returns null for empty lines or lines over the 512-byte limit.
 */
export function parseLine(line: string): IrcMessage | null {
  const trimmed = line.replace(/\r?\n$/, "");
  if (trimmed.length === 0 || trimmed.length > MAX_LINE) return null;

  let rest = trimmed;
  let prefix: string | undefined;

  if (rest.startsWith(":")) {
    const space = rest.indexOf(" ");
    if (space === -1) return null; // prefix with no command
    prefix = rest.slice(1, space);
    rest = rest.slice(space + 1).replace(/^ +/, "");
    if (rest.length === 0) return null;
  }

  const parts = rest.split(" ");
  const command = (parts[0] ?? "").toUpperCase();
  if (command.length === 0) return null;

  const params: string[] = [];
  let trailing: string | undefined;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? "";
    if (part === "") continue; // tolerate double spaces
    if (part.startsWith(":")) {
      trailing = parts.slice(i).join(" ").slice(1);
      break;
    }
    params.push(part);
  }

  return { prefix, command, params, trailing };
}

/** Turn a parsed message into a higher-level event for the gateway. */
export function toEvent(msg: IrcMessage): IrcEvent {
  const from = nickFromPrefix(msg.prefix);
  switch (msg.command) {
    case "PRIVMSG":
      return { type: "privmsg", from, target: msg.params[0] ?? "", text: msg.trailing ?? "" };
    case "NOTICE":
      return { type: "notice", from, target: msg.params[0] ?? "", text: msg.trailing ?? "" };
    case "JOIN":
      return { type: "join", nick: from, channel: msg.params[0] ?? msg.trailing ?? "" };
    case "PART":
      return { type: "part", nick: from, channel: msg.params[0] ?? "", reason: msg.trailing };
    case "PING":
      return { type: "ping", token: msg.params[0] ?? msg.trailing ?? "" };
    case "001":
      return { type: "welcome", nick: msg.params[0] ?? "", text: msg.trailing ?? "" };
    case "353": {
      const channel = msg.params[2] ?? "";
      const nicks = (msg.trailing ?? "").split(" ").filter(Boolean).map((n) => n.replace(/^[~&@%+]/, ""));
      return { type: "names", channel, nicks };
    }
    case "366":
      return { type: "endOfNames", channel: msg.params[1] ?? "" };
    default:
      return { type: "raw", message: msg };
  }
}

/** Serialize a message back to the wire. Params with spaces must be trailing. */
export function compose(msg: IrcMessage): string {
  let out = "";
  if (msg.prefix) out += `:${msg.prefix} `;
  out += msg.command;
  for (const p of msg.params) out += ` ${p}`;
  if (msg.trailing !== undefined) out += ` :${msg.trailing}`;
  return out;
}

// Convenience composers for the commands the gateway sends.
export const cmdNick = (nick: string) => compose({ command: "NICK", params: [nick] });
export const cmdUser = (user: string, real: string) =>
  compose({ command: "USER", params: [user, "0", "*"], trailing: real });
export const cmdJoin = (channel: string) => compose({ command: "JOIN", params: [channel] });
export const cmdPart = (channel: string, reason?: string) =>
  compose({ command: "PART", params: [channel], trailing: reason });
export const cmdPrivmsg = (target: string, text: string) =>
  compose({ command: "PRIVMSG", params: [target], trailing: text });
export const cmdPong = (token: string) => compose({ command: "PONG", params: [token] });
export const cmdNames = (channel: string) => compose({ command: "NAMES", params: [channel] });
