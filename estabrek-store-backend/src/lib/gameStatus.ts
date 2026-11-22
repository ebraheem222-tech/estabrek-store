/**
 * A game server's live status (wave G1 of docs/sites-300-plan.ar.md): whether it is up, how many play, its name,
 * map and version. Our server asks the game's own server (never the player's browser) once a minute and keeps the
 * answers two days (GameSample), so a site shows them at once and draws the last 24 hours.
 *
 *   FiveM      the server's own info (GET /dynamic.json, /info.json), or by its cfx.re join code (the FiveM list)
 *   Minecraft  Java Edition's Server List Ping over TCP
 *   Bedrock    an unconnected ping over UDP (RakNet)
 *   Steam      A2S_INFO over UDP (Rust, CS2, Garry's Mod, ARK, Valheim…), with its challenge
 *
 * Only public addresses are asked: a name is looked up first, and one that leads into a private, local or reserved
 * network is refused (the site must not become a way into someone's own network). Each answer has a few seconds.
 */
import net from "node:net";
import dgram from "node:dgram";
import { lookup } from "node:dns/promises";

export const GAMES = ["fivem", "minecraft", "bedrock", "steam"] as const;
export type Game = (typeof GAMES)[number];
export const isGame = (v: unknown): v is Game => typeof v === "string" && (GAMES as readonly string[]).includes(v);
const DEFAULT_PORT: Record<Game, number> = { fivem: 30120, minecraft: 25565, bedrock: 19132, steam: 27015 };
export const GAME_LIMITS = { ms: 3500, text: 120, keepHours: 48 } as const;

export type GameStatus = { online: boolean; players: number | null; max: number | null; name: string | null; map: string | null; version: string | null; ms: number | null; error?: string };
export type Where = { host: string; port: number } | { cfx: string };

const HOST = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const CFX = /^(?:(?:https?:\/\/)?(?:cfx\.re\/join\/))?([a-z0-9]{6})$/i;

/** Where a game's server is, from what its owner wrote ("play.example.com", "1.2.3.4:30120", "cfx.re/join/abc123"); null: not an address. */
export function whereOf(game: Game, raw: string): Where | null {
  const text = raw.trim();
  if (!text || text.length > 260) return null;
  if (game === "fivem") {
    const code = CFX.exec(text);
    if (code && (text.includes("cfx.re") || !text.includes("."))) return { cfx: code[1].toLowerCase() };
  }
  const six = /^\[([0-9a-f:]+)\](?::(\d{1,5}))?$/i.exec(text);
  const [host, port] = six ? [six[1], six[2]] : text.split(":").length === 2 ? text.split(":") : [text, undefined];
  const p = port === undefined ? DEFAULT_PORT[game] : Number(port);
  if (!Number.isInteger(p) || p < 1 || p > 65535) return null;
  if (!six && !net.isIPv4(host) && !HOST.test(host)) return null;
  if (six && !net.isIPv6(host)) return null;
  return { host: host.toLowerCase(), port: p };
}

/* ---------------- Only public addresses ---------------- */

const v4 = (ip: string) => ip.split(".").map(Number);
/** Whether an address is out on the internet (not private, local, link-local, shared, reserved or multicast). */
export function isPublicIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = v4(ip);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || (b === 0 && v4(ip)[2] === 0) || (b === 0 && v4(ip)[2] === 2))) return false;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && v4(ip)[2] === 100))) return false;
    if (a === 203 && b === 0 && v4(ip)[2] === 113) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
    if (mapped) return isPublicIp(mapped[1]);
    if (low === "::" || low === "::1") return false;
    const first = parseInt(low.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return false; // fc00::/7
    if ((first & 0xffc0) === 0xfe80) return false; // fe80::/10
    if ((first & 0xff00) === 0xff00) return false; // multicast
    if (low.startsWith("2001:db8") || low.startsWith("64:ff9b")) return false;
    return true;
  }
  return false;
}

/** The address to ask: the name looked up, every answer public (else refused). `allowPrivate`: the tests' own servers. */
async function addressOf(host: string, allowPrivate: boolean): Promise<string> {
  const found = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!found.length) throw new Error("The address has no IP");
  if (!allowPrivate && found.some((a) => !isPublicIp(a.address))) throw new Error("Only a public address is asked");
  return found[0].address;
}

/* ---------------- The games ---------------- */

const clip = (v: unknown) => (typeof v === "string" && v.trim() ? v.replace(/\^\d|§[0-9a-fk-or]/gi, "").trim().slice(0, GAME_LIMITS.text) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

async function getJson(url: string, ms: number, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { accept: "application/json", ...headers }, redirect: "error" });
  if (!res.ok) throw new Error(`It answered ${res.status}`);
  const body = (await res.json()) as unknown;
  if (!body || typeof body !== "object") throw new Error("Not an answer");
  return body as Record<string, unknown>;
}

async function readFivem(ip: string, port: number, ms: number): Promise<Omit<GameStatus, "ms">> {
  const base = `http://${net.isIPv6(ip) ? `[${ip}]` : ip}:${port}`;
  const [dyn, info] = await Promise.all([getJson(`${base}/dynamic.json`, ms), getJson(`${base}/info.json`, ms).catch(() => ({}) as Record<string, unknown>)]);
  const vars = (info.vars ?? {}) as Record<string, unknown>;
  return { online: true, players: num(dyn.clients), max: num(dyn.sv_maxclients), name: clip(vars.sv_projectName) ?? clip(dyn.hostname), map: clip(dyn.mapname), version: clip(info.server) };
}
async function readCfx(code: string, ms: number): Promise<Omit<GameStatus, "ms">> {
  const body = await getJson(`https://servers-frontend.fivem.net/api/servers/single/${code}`, ms, { "user-agent": "Mozilla/5.0 (compatible; StoreStatus/1.0)" });
  const d = (body.Data ?? {}) as Record<string, unknown>;
  const vars = (d.vars ?? {}) as Record<string, unknown>;
  return { online: true, players: num(d.clients), max: num(d.sv_maxclients ?? d.svMaxclients), name: clip(vars.sv_projectName) ?? clip(d.hostname), map: clip(d.mapname), version: clip(d.server) };
}

/** A Minecraft VarInt. */
const varint = (n: number) => {
  const out: number[] = [];
  let v = n >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v) b |= 0x80;
    out.push(b);
  } while (v);
  return Buffer.from(out);
};
function readVarint(buf: Buffer, at: number): [number, number] | null {
  let n = 0;
  for (let k = 0; k < 5; k++) {
    if (at + k >= buf.length) return null;
    const b = buf[at + k];
    n |= (b & 0x7f) << (7 * k);
    if (!(b & 0x80)) return [n, at + k + 1];
  }
  throw new Error("Not a Minecraft answer");
}
/** Minecraft's words ("§aHello", { text, extra: [...] }) as plain words. */
function chat(v: unknown): string | null {
  if (typeof v === "string") return clip(v);
  if (v && typeof v === "object") {
    const o = v as { text?: unknown; extra?: unknown[] };
    return clip([typeof o.text === "string" ? o.text : "", ...(Array.isArray(o.extra) ? o.extra.map((x) => chat(x) ?? "") : [])].join(""));
  }
  return null;
}
function readMinecraft(ip: string, port: number, host: string, ms: number): Promise<Omit<GameStatus, "ms">> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ip, port });
    let got = Buffer.alloc(0);
    const done = (e: Error | null, v?: Omit<GameStatus, "ms">) => {
      socket.destroy();
      clearTimeout(timer);
      if (e) reject(e);
      else resolve(v!);
    };
    const timer = setTimeout(() => done(new Error("No answer in time")), ms);
    socket.on("connect", () => {
      const name = Buffer.from(host, "utf8");
      const port16 = Buffer.alloc(2);
      port16.writeUInt16BE(port);
      const hello = Buffer.concat([varint(0x00), varint(767), varint(name.length), name, port16, varint(1)]);
      socket.write(Buffer.concat([varint(hello.length), hello, varint(1), varint(0x00)]));
    });
    socket.on("data", (chunk) => {
      got = Buffer.concat([got, chunk]);
      try {
        const len = readVarint(got, 0);
        if (!len || got.length < len[1] + len[0]) return;
        const id = readVarint(got, len[1]);
        const size = id ? readVarint(got, id[1]) : null;
        if (!id || !size || id[0] !== 0) return done(new Error("Not a Minecraft answer"));
        const json = JSON.parse(got.subarray(size[1], size[1] + size[0]).toString("utf8")) as { players?: { online?: unknown; max?: unknown }; description?: unknown; version?: { name?: unknown } };
        done(null, { online: true, players: num(json.players?.online), max: num(json.players?.max), name: chat(json.description), map: null, version: clip(json.version?.name) });
      } catch (e) {
        done(e instanceof Error ? e : new Error("Not a Minecraft answer"));
      }
    });
    socket.on("error", (e) => done(e));
  });
}

/** Asks once over UDP and waits for the answer `pick` accepts (a second message for a challenge). */
function udp(ip: string, port: number, first: Buffer, ms: number, pick: (msg: Buffer, send: (b: Buffer) => void) => Omit<GameStatus, "ms"> | null): Promise<Omit<GameStatus, "ms">> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(net.isIPv6(ip) ? "udp6" : "udp4");
    const done = (e: Error | null, v?: Omit<GameStatus, "ms">) => {
      clearTimeout(timer);
      socket.close();
      if (e) reject(e);
      else resolve(v!);
    };
    const timer = setTimeout(() => done(new Error("No answer in time")), ms);
    const send = (b: Buffer) => socket.send(b, port, ip);
    socket.on("message", (msg) => {
      try {
        const v = pick(msg, send);
        if (v) done(null, v);
      } catch (e) {
        done(e instanceof Error ? e : new Error("Not an answer"));
      }
    });
    socket.on("error", (e) => done(e));
    send(first);
  });
}

const RAKNET_MAGIC = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");
function readBedrock(ip: string, port: number, ms: number) {
  const ping = Buffer.alloc(33);
  ping[0] = 0x01;
  ping.writeBigInt64BE(BigInt(Date.now()), 1);
  RAKNET_MAGIC.copy(ping, 9);
  ping.writeBigInt64BE(2n, 25);
  return udp(ip, port, ping, ms, (msg) => {
    if (msg[0] !== 0x1c || msg.length < 35) return null;
    const len = msg.readUInt16BE(33);
    const parts = msg.subarray(35, 35 + len).toString("utf8").split(";");
    return { online: true, players: num(parts[4]), max: num(parts[5]), name: clip(parts[1]), map: clip(parts[7]), version: clip(parts[3]) };
  });
}

const A2S_INFO = Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff, 0x54]), Buffer.from("Source Engine Query\0", "latin1")]);
function readSteam(ip: string, port: number, ms: number) {
  return udp(ip, port, A2S_INFO, ms, (msg, send) => {
    if (msg.readInt32LE(0) !== -1) return null;
    // A challenge first: the same question with it at the end.
    if (msg[4] === 0x41 && msg.length >= 9) {
      send(Buffer.concat([A2S_INFO, msg.subarray(5, 9)]));
      return null;
    }
    if (msg[4] !== 0x49) return null;
    let at = 6;
    const str = () => {
      const end = msg.indexOf(0, at);
      const s = msg.subarray(at, end < 0 ? msg.length : end).toString("utf8");
      at = end < 0 ? msg.length : end + 1;
      return s;
    };
    const name = str();
    const map = str();
    str(); // folder
    const game = str();
    at += 2; // app id
    const players = msg[at];
    const max = msg[at + 1];
    return { online: true, players, max, name: clip(name), map: clip(map), version: clip(game) };
  });
}

/** A game server's status now: an answer, or offline with why. Never throws. */
export async function readStatus(game: Game, address: string, opts: { allowPrivate?: boolean; ms?: number } = {}): Promise<GameStatus> {
  const t0 = Date.now();
  const ms = opts.ms ?? GAME_LIMITS.ms;
  const off = (error: string): GameStatus => ({ online: false, players: null, max: null, name: null, map: null, version: null, ms: null, error });
  const where = whereOf(game, address);
  if (!where) return off("Not an address");
  try {
    let got: Omit<GameStatus, "ms">;
    if ("cfx" in where) got = await readCfx(where.cfx, ms);
    else {
      const ip = await addressOf(where.host, !!opts.allowPrivate);
      got = game === "fivem" ? await readFivem(ip, where.port, ms) : game === "minecraft" ? await readMinecraft(ip, where.port, where.host, ms) : game === "bedrock" ? await readBedrock(ip, where.port, ms) : await readSteam(ip, where.port, ms);
    }
    return { ...got, ms: Date.now() - t0 };
  } catch (e) {
    return off(e instanceof Error ? e.message.slice(0, 160) : "No answer");
  }
}

/** How a player joins: the link that opens the game on it (FiveM, Steam), else the address to copy (Minecraft). */
export function joinOf(game: Game, address: string): { href: string | null; address: string } {
  const where = whereOf(game, address);
  if (!where) return { href: null, address: address.trim() };
  if ("cfx" in where) return { href: `https://cfx.re/join/${where.cfx}`, address: `cfx.re/join/${where.cfx}` };
  const shown = where.port === DEFAULT_PORT[game] && game !== "steam" ? where.host : `${net.isIPv6(where.host) ? `[${where.host}]` : where.host}:${where.port}`;
  if (game === "fivem") return { href: `fivem://connect/${shown}`, address: shown };
  if (game === "steam") return { href: `steam://connect/${shown}`, address: shown };
  return { href: null, address: shown };
}
