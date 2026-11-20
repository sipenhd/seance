// Gateway: Express + WebSocket relay between the browser and IRC.
// One IRC session per browser connection. Demo mode serves a scripted local
// room with zero network so the app can be tried anywhere.

import express from "express";
import http from "node:http";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";
import { IrcClient } from "../irc/client.js";
import { ChannelLog } from "../shared/log.js";
import { BotCrew } from "../bots/crew.js";
import type { IrcEvent } from "../irc/types.js";

export const DEMO_CHANNEL = "#seance-demo";

const DEMO_SCRIPT: Array<{ from: string; text: string; delayMs: number }> = [
  { from: "retro_fan", text: "i still remember my first /join in 1998. the modem sound and everything", delayMs: 4000 },
  { from: "pixelwitch", text: "wait, this is IRC?? it looks so friendly now. where are the scary green letters", delayMs: 12000 },
  { from: "retro_fan", text: "right?? the crew here keeps it kind. try asking the greeter anything", delayMs: 22000 },
  { from: "mod_fan", text: "and the moderator actually explains instead of just banning. wild concept", delayMs: 34000 },
  { from: "pixelwitch", text: "ok this is the nicest resurrection i have ever seen. 10/10 would haunt again", delayMs: 48000 },
];

export interface GatewayOptions {
  port: number;
  demo: boolean;
  ircHost?: string;
  ircPort?: number;
  clientDir: string;
  logDir: string;
}

export function createGateway(opts: GatewayOptions) {
  const app = express();
  app.use(express.static(opts.clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(opts.clientDir, "index.html"));
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const nick = `seance-${Math.random().toString(36).slice(2, 6)}`;
    const channel = DEMO_CHANNEL;
    const log = new ChannelLog(path.join(opts.logDir, "seance-demo.jsonl"));
    const members = new Set<string>([nick]);
    const timers: NodeJS.Timeout[] = [];
    let irc: IrcClient | null = null;

    const send = (obj: unknown) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    };
    const pushMessage = (from: string, text: string, bot = false) => {
      log.append({ time: new Date().toISOString(), from, text, bot });
      send({ kind: "message", from, text, bot });
    };
    const pushMembers = () => send({ kind: "members", nicks: [...members].sort() });

    const crew = new BotCrew({
      reply: (from, text) => pushMessage(from, text, true),
      log: () => log.read(),
    });

    const handleEvent = (ev: IrcEvent) => {
      switch (ev.type) {
        case "privmsg":
          if (crew.moderator.isMuted(ev.from)) break;
          members.add(ev.from);
          crew.onMessage(ev.from, ev.text);
          pushMessage(ev.from, ev.text);
          pushMembers();
          break;
        case "join":
          members.add(ev.nick);
          pushMembers();
          if (ev.nick !== nick) crew.onJoin(ev.nick);
          break;
        case "part":
          members.delete(ev.nick);
          pushMembers();
          break;
        case "names":
          for (const n of ev.nicks) members.add(n);
          pushMembers();
          break;
        case "endOfNames":
          pushMembers();
          break;
        case "welcome":
          send({ kind: "status", text: `Connected to ${channel}` });
          break;
        default:
          break;
      }
    };

    if (opts.demo) {
      members.add("Greeter");
      members.add("retro_fan");
      members.add("pixelwitch");
      pushMembers();
      pushMessage(
        "Greeter",
        "Welcome to #seance-demo! IRC, back from the dead — be kind, and the crew will look after you.",
        true,
      );
      for (const line of DEMO_SCRIPT) {
        timers.push(
          setTimeout(() => {
            members.add(line.from);
            pushMessage(line.from, line.text);
            pushMembers();
          }, line.delayMs),
        );
      }
    } else {
      irc = new IrcClient({
        host: opts.ircHost ?? "irc.libera.chat",
        port: opts.ircPort ?? 6667,
        nick,
        user: nick,
        real: "Séance User",
        channels: [channel],
      });
      irc.on("event", handleEvent);
      irc.on("disconnected", () => send({ kind: "status", text: "Reconnecting…" }));
      irc.connect();
    }

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as { kind: string; text?: string };
        if (data.kind === "send" && data.text) {
          if (crew.handleSlash(nick, data.text)) return;
          if (crew.moderator.isMuted(nick)) {
            const secs = Math.ceil(crew.moderator.muteRemainingMs(nick) / 1000);
            pushMessage("Moderator", `You're muted for ${secs}s more — take a breath, come back kind.`, true);
            return;
          }
          if (irc) {
            irc.send(channel, data.text);
          } else {
            crew.onMessage(nick, data.text);
            pushMessage(nick, data.text);
          }
        }
      } catch {
        // Ignore malformed frames.
      }
    });

    ws.on("close", () => {
      for (const t of timers) clearTimeout(t);
      irc?.quit();
    });
  });

  return {
    server,
    listen: () =>
      new Promise<void>((resolve) => {
        server.listen(opts.port, () => resolve());
      }),
  };
}
