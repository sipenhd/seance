// Append-only JSON-lines log per channel. Kept capped in memory and on disk
// so the summarizer always has recent history without unbounded growth.

import fs from "node:fs";
import path from "node:path";

export interface LogEntry {
  time: string;
  from: string;
  text: string;
  bot?: boolean;
}

export class ChannelLog {
  private entries: LogEntry[] = [];

  constructor(
    private file: string,
    private cap = 500,
  ) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      try {
        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
        this.entries = lines.slice(-cap).map((l) => JSON.parse(l) as LogEntry);
      } catch {
        this.entries = [];
      }
    }
  }

  append(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.cap) {
      this.entries.splice(0, this.entries.length - this.cap);
      fs.writeFileSync(this.file, this.entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
    } else {
      fs.appendFileSync(this.file, JSON.stringify(entry) + "\n");
    }
  }

  read(): LogEntry[] {
    return [...this.entries];
  }
}
