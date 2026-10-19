// ============================================================
// Minimal RESP (Redis) client
// Dependency-free TCP/TLS client supporting the handful of
// commands needed for distributed rate limiting (INCR / PEXPIRE
// / PTTL). Not a general-purpose Redis client.
// ============================================================

import net from "net";
import tls from "tls";

export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls: boolean;
}

export function parseRedisUrl(rawUrl: string): RedisConnectionOptions {
  const url = new URL(rawUrl);
  const isTls = url.protocol === "rediss:";
  if (url.protocol !== "redis:" && !isTls) {
    throw new Error(`Unsupported Redis protocol: ${url.protocol}`);
  }
  const rawDb = url.pathname && url.pathname.length > 1 ? parseInt(url.pathname.slice(1), 10) : undefined;
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number.isFinite(rawDb) ? rawDb : undefined,
    tls: isTls,
  };
}

export function encodeCommand(args: string[]): string {
  let out = `*${args.length}\r\n`;
  for (const arg of args) {
    out += `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`;
  }
  return out;
}

// Parse a single RESP reply from the front of `buffer`.
// Returns the value and the number of bytes consumed, or null when the
// reply is not yet complete.
export function parseRespReply(buffer: string): { value: unknown; offset: number } | null {
  const crlf = buffer.indexOf("\r\n");
  if (crlf === -1) return null;
  const type = buffer[0];
  const line = buffer.slice(1, crlf);

  if (type === "+") return { value: line, offset: crlf + 2 };
  if (type === "-") return { value: new Error(line), offset: crlf + 2 };
  if (type === ":") return { value: parseInt(line, 10), offset: crlf + 2 };

  if (type === "$") {
    const len = parseInt(line, 10);
    if (len === -1) return { value: null, offset: crlf + 2 };
    const start = crlf + 2;
    const end = start + len;
    if (buffer.length < end + 2) return null;
    return { value: buffer.slice(start, end), offset: end + 2 };
  }

  if (type === "*") {
    const count = parseInt(line, 10);
    if (count === -1) return { value: null, offset: crlf + 2 };
    const items: unknown[] = [];
    let offset = crlf + 2;
    for (let i = 0; i < count; i++) {
      const parsed = parseRespReply(buffer.slice(offset));
      if (!parsed) return null;
      if (parsed.value instanceof Error) return { value: parsed.value, offset: offset + parsed.offset };
      items.push(parsed.value);
      offset += parsed.offset;
    }
    return { value: items, offset };
  }

  return { value: new Error(`Unknown RESP type: ${type}`), offset: crlf + 2 };
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export class RedisClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private connecting: Promise<void> | null = null;
  private buffer = "";
  private pending: Pending[] = [];
  private ready = false;

  constructor(private opts: RedisConnectionOptions) {}

  private send(args: string[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Redis socket is not connected"));
        return;
      }
      this.pending.push({ resolve, reject });
      this.socket.write(encodeCommand(args));
    });
  }

  connect(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        const handshake = async () => {
          if (this.opts.password) {
            const auth = this.opts.username
              ? ["AUTH", this.opts.username, this.opts.password]
              : ["AUTH", this.opts.password];
            await this.send(auth);
          }
          if (this.opts.db) await this.send(["SELECT", String(this.opts.db)]);
          this.ready = true;
          resolve();
        };
        handshake().catch((err) => {
          this.teardown();
          reject(err);
        });
      };

      const onError = (err: unknown) => {
        this.teardown();
        reject(err);
      };

      const socket = this.opts.tls
        ? tls.connect({ host: this.opts.host, port: this.opts.port, servername: this.opts.host }, onConnect)
        : net.connect({ host: this.opts.host, port: this.opts.port }, onConnect);

      socket.setTimeout(5000, () => {
        socket.destroy();
      });
      socket.on("data", (chunk) => this.onData(chunk));
      socket.on("error", onError);
      socket.on("close", () => this.teardown(new Error("Redis connection closed")));
      this.socket = socket;
    });

    return this.connecting;
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString("utf8");
    while (this.pending.length > 0) {
      const parsed = parseRespReply(this.buffer);
      if (!parsed) break;
      this.buffer = this.buffer.slice(parsed.offset);
      const pending = this.pending.shift();
      if (!pending) break;
      if (parsed.value instanceof Error) pending.reject(parsed.value);
      else pending.resolve(parsed.value);
    }
  }

  async command(args: string[]): Promise<unknown> {
    await this.connect();
    return this.send(args);
  }

  close(): void {
    this.socket?.destroy();
    this.teardown();
  }

  private teardown(error?: Error): void {
    this.socket = null;
    this.ready = false;
    this.connecting = null;
    const pending = this.pending;
    this.pending = [];
    if (error) for (const p of pending) p.reject(error);
  }
}
