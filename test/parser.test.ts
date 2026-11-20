import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { cmdJoin, cmdPrivmsg, compose, parseLine, toEvent } from "../src/irc/parser.js";
import type { IrcMessage } from "../src/irc/types.js";

describe("parseLine", () => {
  it("parses a PRIVMSG with prefix and trailing", () => {
    const msg = parseLine(":alice!a@b PRIVMSG #seance :hello world");
    expect(msg).toEqual({
      prefix: "alice!a@b",
      command: "PRIVMSG",
      params: ["#seance"],
      trailing: "hello world",
    });
  });

  it("parses a server PING without prefix", () => {
    expect(parseLine("PING :12345")).toEqual({
      prefix: undefined,
      command: "PING",
      params: [],
      trailing: "12345",
    });
  });

  it("parses numeric replies and middle params", () => {
    const msg = parseLine(":server 353 bob = #seance :@alice +bob carol");
    expect(msg?.command).toBe("353");
    expect(msg?.params).toEqual(["bob", "=", "#seance"]);
    expect(msg?.trailing).toBe("@alice +bob carol");
  });

  it("returns null for empty or overlong lines", () => {
    expect(parseLine("")).toBeNull();
    expect(parseLine("A".repeat(513))).toBeNull();
    expect(parseLine(":onlyprefix")).toBeNull();
  });

  it("tolerates double spaces between params", () => {
    const msg = parseLine("JOIN  #seance");
    expect(msg?.command).toBe("JOIN");
    expect(msg?.params).toEqual(["#seance"]);
  });
});

describe("toEvent", () => {
  it("maps PRIVMSG, JOIN and 353 to typed events", () => {
    const priv = toEvent(parseLine(":alice!a@b PRIVMSG #seance :hi")!);
    expect(priv).toEqual({ type: "privmsg", from: "alice", target: "#seance", text: "hi" });

    const join = toEvent(parseLine(":bob!b@c JOIN #seance")!);
    expect(join).toEqual({ type: "join", nick: "bob", channel: "#seance" });

    const names = toEvent(parseLine(":s 353 me = #seance :@alice +bob")!);
    expect(names).toEqual({ type: "names", channel: "#seance", nicks: ["alice", "bob"] });
  });
});

describe("compose", () => {
  it("builds the commands the gateway sends", () => {
    expect(cmdJoin("#seance")).toBe("JOIN #seance");
    expect(cmdPrivmsg("#seance", "hello there")).toBe("PRIVMSG #seance :hello there");
  });
});

describe("round-trip property", () => {
  const token = fc.stringMatching(/^[A-Za-z0-9_#\-+@.]{1,20}$/);
  const messageArb: fc.Arbitrary<IrcMessage> = fc.record({
    prefix: fc.option(fc.stringMatching(/^[A-Za-z0-9_!@.\-]{1,30}$/), { nil: undefined }),
    command: fc.constantFrom("PRIVMSG", "NOTICE", "JOIN", "PART", "PING", "001", "353"),
    params: fc.array(token, { maxLength: 3 }),
    trailing: fc.option(fc.stringMatching(/^[A-Za-z0-9 ,.!?]{0,40}$/), { nil: undefined }),
  });

  it("parse(compose(m)) equals m (modulo uppercased command)", () => {
    fc.assert(
      fc.property(messageArb, (m) => {
        const wire = compose(m);
        const back = parseLine(wire);
        expect(back).toEqual({ ...m, command: m.command.toUpperCase() });
      }),
      { numRuns: 500 },
    );
  });

  it("a parsed line never crashes toEvent", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (s) => {
        const msg = parseLine(s);
        if (msg) expect(() => toEvent(msg)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });
});
