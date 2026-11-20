// IRC TCP client: owns one connection to an IRC server.
// Pure protocol handling lives in parser.ts; this class owns the socket,
// the handshake, PING/PONG, nick collisions and reconnect backoff.

import net from "node:net";
import { EventEmitter } from "node:events";
import {
  cmdJoin,
  cmdNick,
  cmdPong,
  cmdPrivmsg,
  cmdUser,
  parseLine,
  toEvent,
} from "./parser.js";
import type { IrcEvent } from "./types.js";

export interface IrcClientOptions {
  host: string;
  port: number;
  nick: string;
  user: string;
  real: string;
  channels: string[];
}

const BACKOFF_MS = [1000, 2000, 5000, 15000, 60000];

export class IrcClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer = "";
  private nick: string;
  private nickSuffix = 0;
  private wantChannels: string[];
  private attempt = 0;
  private closed = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private opts: IrcClientOptions) {
    super();
    this.nick = opts.nick;
    this.wantChannels = [...opts.channels];
  }

  connect(): void {
    if (this.closed) return;
    const socket = net.connect({ host: this.opts.host, port: this.opts.port });
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("connect", () => {
      this.attempt = 0;
      this.sendRaw(cmdNick(this.nick));
      this.sendRaw(cmdUser(this.opts.user, this.opts.real));
    });
    socket.on("data", (chunk: string) => this.onData(chunk));
    socket.on("close", () => this.scheduleReconnect());
    socket.on("error", () => {
      // 'close' follows; the reconnect is scheduled there.
    });
  }

  join(channel: string): void {
    if (!this.wantChannels.includes(channel)) this.wantChannels.push(channel);
    this.sendRaw(cmdJoin(channel));
  }

  send(target: string, text: string): void {
    const safe = text.slice(0, 400);
    this.sendRaw(cmdPrivmsg(target, safe));
  }

  quit(reason = "Séance out"): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      try {
        this.socket.write(`QUIT :${reason}\r\n`);
      } catch {
        // Socket already gone.
      }
      this.socket.destroy();
      this.socket = null;
    }
  }

  private sendRaw(line: string): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(`${line}\r\n`);
    }
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, idx).trimEnd();
      this.buffer = this.buffer.slice(idx + 1);
      const msg = parseLine(line);
      if (!msg) continue;
      if (msg.command === "PING") {
        this.sendRaw(cmdPong(msg.params[0] ?? msg.trailing ?? ""));
        continue;
      }
      if (msg.command === "433") {
        // Nick in use: try nick_, then nick1, nick2, ...
        this.nickSuffix += 1;
        this.nick = this.nickSuffix === 1 ? `${this.opts.nick}_` : `${this.opts.nick}${this.nickSuffix}`;
        this.sendRaw(cmdNick(this.nick));
        continue;
      }
      if (msg.command === "001") {
        this.emit("connected");
        for (const ch of this.wantChannels) this.sendRaw(cmdJoin(ch));
      }
      const ev: IrcEvent = toEvent(msg);
      this.emit("event", ev);
    }
  }

  private scheduleReconnect(): void {
    this.socket = null;
    if (this.closed) return;
    this.emit("disconnected");
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)] ?? 60000;
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
