import { afterAll, beforeAll, describe, expect, test } from "vitest";
import http from "node:http";
import net from "node:net";
import dgram from "node:dgram";
import type { AddressInfo } from "node:net";
import { isPublicIp, joinOf, readStatus, whereOf } from "../lib/gameStatus.js";

// A game server's status (wave G1 of docs/sites-300-plan.ar.md), each game asked the way it answers, against small
// servers of our own on this computer (asked with allowPrivate: a site never may): FiveM's info over HTTP, Minecraft
// Java's Server List Ping over TCP, Bedrock's ping over UDP, and Steam's A2S_INFO with its challenge.

const servers: Array<{ close: () => void }> = [];
let fivem = 0;
let minecraft = 0;
let bedrock = 0;
let steam = 0;
let silent = 0;
const varint = (n: number) => {
  const out: number[] = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return Buffer.from(out);
};

beforeAll(async () => {
  const web = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/dynamic.json") return res.end(JSON.stringify({ clients: 87, sv_maxclients: 128, hostname: "^1Dew ^7City RP", mapname: "Los Santos" }));
    if (req.url === "/info.json") return res.end(JSON.stringify({ server: "FXServer-master v1.0.0.12345", vars: { sv_projectName: "Dew City" } }));
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise<void>((r) => web.listen(0, "127.0.0.1", r));
  fivem = (web.address() as AddressInfo).port;
  servers.push(web);

  const mc = net.createServer((socket) => {
    let got = Buffer.alloc(0);
    socket.on("data", (d) => {
      got = Buffer.concat([got, d]);
      // The handshake and the status request came: answer once.
      if (got.length < 4 || got[got.length - 1] !== 0x00 || got[got.length - 2] !== 0x01) return;
      const json = Buffer.from(JSON.stringify({ version: { name: "Paper 1.21.1" }, players: { online: 12, max: 100 }, description: { text: "§aPixel ", extra: [{ text: "Valley" }] } }), "utf8");
      const body = Buffer.concat([varint(0x00), varint(json.length), json]);
      socket.write(Buffer.concat([varint(body.length), body]));
    });
  });
  await new Promise<void>((r) => mc.listen(0, "127.0.0.1", r));
  minecraft = (mc.address() as AddressInfo).port;
  servers.push(mc);

  const be = dgram.createSocket("udp4");
  be.on("message", (msg, from) => {
    if (msg[0] !== 0x01) return;
    const text = Buffer.from("MCPE;Island Craft;712;1.21.30;7;40;123456789;Survival;Survival;1;19132;19133;", "utf8");
    const reply = Buffer.alloc(35 + text.length);
    reply[0] = 0x1c;
    msg.copy(reply, 1, 1, 9);
    Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex").copy(reply, 17);
    reply.writeUInt16BE(text.length, 33);
    text.copy(reply, 35);
    be.send(reply, from.port, from.address);
  });
  await new Promise<void>((r) => be.bind(0, "127.0.0.1", r));
  bedrock = be.address().port;
  servers.push(be);

  const st = dgram.createSocket("udp4");
  st.on("message", (msg, from) => {
    if (msg.readInt32LE(0) !== -1 || msg[4] !== 0x54) return;
    // No challenge in it yet: one is asked for first (as servers do since 2020).
    if (msg.length < 29) return st.send(Buffer.from([0xff, 0xff, 0xff, 0xff, 0x41, 1, 2, 3, 4]), from.port, from.address);
    const parts = [Buffer.from([0xff, 0xff, 0xff, 0xff, 0x49, 17]), Buffer.from("Rusty Isle\0Procedural Map\0rust\0Rust\0", "utf8"), Buffer.from([0x24, 0x09, 51, 200, 0])];
    st.send(Buffer.concat(parts), from.port, from.address);
  });
  await new Promise<void>((r) => st.bind(0, "127.0.0.1", r));
  steam = st.address().port;
  servers.push(st);

  const quiet = dgram.createSocket("udp4");
  await new Promise<void>((r) => quiet.bind(0, "127.0.0.1", r));
  silent = quiet.address().port;
  servers.push(quiet);
});
afterAll(() => {
  for (const s of servers) s.close();
});

describe("What the owner writes", () => {
  test("an address, a port, or a cfx.re code; nonsense isn't one", () => {
    expect(whereOf("fivem", "cfx.re/join/AbC123")).toEqual({ cfx: "abc123" });
    expect(whereOf("fivem", "https://cfx.re/join/abc123")).toEqual({ cfx: "abc123" });
    expect(whereOf("fivem", "1.2.3.4")).toEqual({ host: "1.2.3.4", port: 30120 });
    expect(whereOf("minecraft", "Play.Example.com")).toEqual({ host: "play.example.com", port: 25565 });
    expect(whereOf("bedrock", "mc.example.com:19140")).toEqual({ host: "mc.example.com", port: 19140 });
    expect(whereOf("steam", "[2001:4860::1]:28015")).toEqual({ host: "2001:4860::1", port: 28015 });
    for (const bad of ["", "a b", "x.com:0", "x.com:70000", "http://x.com", "x.com/path"]) expect(whereOf("minecraft", bad), bad).toBeNull();
  });

  test("only public addresses: private, local, link-local, shared and reserved ones are refused", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700::1111"]) expect(isPublicIp(ip), ip).toBe(true);
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.9.9", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1", "203.0.113.5"]) expect(isPublicIp(ip), ip).toBe(false);
  });

  test("how a player joins: the game's own link, or the address to copy", () => {
    expect(joinOf("fivem", "cfx.re/join/abc123")).toEqual({ href: "https://cfx.re/join/abc123", address: "cfx.re/join/abc123" });
    expect(joinOf("fivem", "1.2.3.4:30121")).toEqual({ href: "fivem://connect/1.2.3.4:30121", address: "1.2.3.4:30121" });
    expect(joinOf("steam", "rust.example.com:28015")).toEqual({ href: "steam://connect/rust.example.com:28015", address: "rust.example.com:28015" });
    expect(joinOf("minecraft", "play.example.com")).toEqual({ href: null, address: "play.example.com" });
  });
});

describe("Asking each game", () => {
  const local = { allowPrivate: true, ms: 1500 };
  test("FiveM: players, the most, the name without its colour codes, the map", async () => {
    expect(await readStatus("fivem", `127.0.0.1:${fivem}`, local)).toMatchObject({ online: true, players: 87, max: 128, name: "Dew City", map: "Los Santos", version: "FXServer-master v1.0.0.12345" });
  });
  test("Minecraft Java: the Server List Ping", async () => {
    expect(await readStatus("minecraft", `127.0.0.1:${minecraft}`, local)).toMatchObject({ online: true, players: 12, max: 100, name: "Pixel Valley", version: "Paper 1.21.1" });
  });
  test("Minecraft Bedrock: the unconnected ping", async () => {
    expect(await readStatus("bedrock", `127.0.0.1:${bedrock}`, local)).toMatchObject({ online: true, players: 7, max: 40, name: "Island Craft", version: "1.21.30" });
  });
  test("Steam: A2S_INFO, after its challenge", async () => {
    expect(await readStatus("steam", `127.0.0.1:${steam}`, local)).toMatchObject({ online: true, players: 51, max: 200, name: "Rusty Isle", map: "Procedural Map", version: "Rust" });
  });
  test("a private address isn't asked; a server that doesn't answer is offline in time; nonsense isn't an address", async () => {
    expect(await readStatus("fivem", `127.0.0.1:${fivem}`)).toMatchObject({ online: false, error: "Only a public address is asked" });
    const t0 = Date.now();
    expect(await readStatus("steam", `127.0.0.1:${silent}`, { allowPrivate: true, ms: 400 })).toMatchObject({ online: false, error: "No answer in time" });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(await readStatus("minecraft", "not an address")).toMatchObject({ online: false, error: "Not an address" });
  });
});
