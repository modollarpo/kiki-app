import { describe, it, expect, afterEach } from "vitest";
import net from "net";
import { parseRedisUrl, parseRespReply, encodeCommand } from "../src/lib/redis";
import {
  checkRateLimitDistributed,
  resetRateLimitRedisClient,
} from "../src/lib/rate-limit-redis";

describe("redis RESP helpers", () => {
  it("parses redis and rediss URLs", () => {
    expect(parseRedisUrl("redis://localhost:6379")).toMatchObject({
      host: "localhost",
      port: 6379,
      tls: false,
    });
    expect(parseRedisUrl("rediss://user:p%40ss@cache.example:6380/2")).toMatchObject({
      host: "cache.example",
      port: 6380,
      username: "user",
      password: "p@ss",
      db: 2,
      tls: true,
    });
    expect(() => parseRedisUrl("http://localhost")).toThrow(/Unsupported Redis protocol/);
  });

  it("parses every RESP reply type and waits for incomplete frames", () => {
    expect(parseRespReply("+OK\r\nrest")).toEqual({ value: "OK", offset: 5 });
    expect(parseRespReply(":42\r\n")).toEqual({ value: 42, offset: 5 });
    expect(parseRespReply("$3\r\nfoo\r\n")).toEqual({ value: "foo", offset: 9 });
    expect(parseRespReply("$-1\r\n")).toEqual({ value: null, offset: 5 });
    expect(parseRespReply("*2\r\n$1\r\na\r\n:1\r\n")).toEqual({ value: ["a", 1], offset: 15 });
    expect(parseRespReply("*2\r\n$2\r\nab\r\n")).toBeNull(); // incomplete
  });

  it("encodes commands as RESP arrays", () => {
    expect(encodeCommand(["INCR", "k"])).toBe("*2\r\n$4\r\nINCR\r\n$1\r\nk\r\n");
  });
});

// A tiny stateful Redis stand-in supporting INCR/PEXPIRE/PTTL.
function parseCommand(buf: string): { args: string[]; rest: string } | null {
  if (!buf.startsWith("*")) return null;
  const nl = buf.indexOf("\r\n");
  if (nl === -1) return null;
  const count = parseInt(buf.slice(1, nl), 10);
  let offset = nl + 2;
  const args: string[] = [];
  for (let i = 0; i < count; i++) {
    if (buf[offset] !== "$") return null;
    const eol = buf.indexOf("\r\n", offset);
    if (eol === -1) return null;
    const len = parseInt(buf.slice(offset + 1, eol), 10);
    const start = eol + 2;
    const end = start + len;
    if (buf.length < end + 2) return null;
    args.push(buf.slice(start, end));
    offset = end + 2;
  }
  return { args, rest: buf.slice(offset) };
}

function startMockRedis(): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const store = new Map<string, number>();
    const sockets = new Set<net.Socket>();
    const server = net.createServer((sock) => {
      let buf = "";
      sockets.add(sock);
      sock.on("close", () => sockets.delete(sock));
      sock.on("data", (chunk) => {
        buf += chunk.toString();
        let cmd = parseCommand(buf);
        while (cmd) {
          buf = cmd.rest;
          const name = (cmd.args[0] || "").toUpperCase();
          const key = cmd.args[1];
          if (name === "INCR") {
            const v = (store.get(key) || 0) + 1;
            store.set(key, v);
            sock.write(`:${v}\r\n`);
          } else if (name === "PEXPIRE") {
            sock.write(":1\r\n");
          } else if (name === "PTTL") {
            sock.write(":60000\r\n");
          } else if (name === "AUTH" || name === "SELECT") {
            sock.write("+OK\r\n");
          } else {
            sock.write("-ERR unknown command\r\n");
          }
          cmd = parseCommand(buf);
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve({
        port,
        close: () =>
          new Promise((r) => {
            for (const s of sockets) s.destroy();
            server.close(() => r());
          }),
      });
    });
  });
}

describe("distributed rate limiter", () => {
  const originalUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalUrl;
    delete process.env.RATE_LIMIT_REDIS_URL;
    resetRateLimitRedisClient();
  });

  it("counts against a Redis backend and enforces the limit", async () => {
    const mock = await startMockRedis();
    process.env.REDIS_URL = `redis://127.0.0.1:${mock.port}`;
    resetRateLimitRedisClient();

    const first = await checkRateLimitDistributed("t", { maxRequests: 2, windowMs: 60_000 });
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkRateLimitDistributed("t", { maxRequests: 2, windowMs: 60_000 });
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await checkRateLimitDistributed("t", { maxRequests: 2, windowMs: 60_000 });
    expect(third.allowed).toBe(false);

    await mock.close();
  });

  it("falls back to the in-memory limiter when Redis is not configured", async () => {
    delete process.env.REDIS_URL;
    delete process.env.RATE_LIMIT_REDIS_URL;
    resetRateLimitRedisClient();

    const r = await checkRateLimitDistributed("fallback", { maxRequests: 1, windowMs: 60_000 });
    expect(r.allowed).toBe(true);
    const r2 = await checkRateLimitDistributed("fallback", { maxRequests: 1, windowMs: 60_000 });
    expect(r2.allowed).toBe(false);
  });
});
