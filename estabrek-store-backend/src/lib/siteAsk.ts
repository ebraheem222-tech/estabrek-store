/**
 * A copy's admin the owner put up by hand on their own Cloudflare Pages (built from this repository, nothing linked
 * to it yet: paintispassion.pages.dev, 2026-11-24) asks this store's press for the rest: its database, server and
 * shop, made in the owner's accounts (lib/pressMake.ts). The client can't do it themself: the Pages project is in
 * the owner's Cloudflare, and they have no Neon or Railway either.
 *
 * The client presses one button on that admin (its /connect page). The ask waits in نسخ الزباين until the owner says
 * yes, after matching the six letters the client reads to them (anyone can open the site; only the right one is
 * said yes to). Then a copy is made that adopts that same Pages project: its variables set to the new server and
 * shop, and built again. Only the browser that asked, holding its own key, is told the server's address and the
 * setup code once it is made, and goes on to make the owner's account with them.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma.js";
import { open } from "./secretBox.js";
import { AppError } from "../utils/httpError.js";
import { copyView, type CopySecrets, type MakeStep } from "./pressMake.js";

/** An admin that may ask: a Pages project's own address (a preview's has a part before the name, and isn't one). */
export const ASK_ADMIN = /^https:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.pages\.dev$/;
/** The asking browser's own key, made there. */
export const ASK_KEY = /^[A-Za-z0-9_-]{32,128}$/;
/** So many asks at most wait at once (each one is a line in the owner's list until said yes or no to). */
export const ASK_LIMITS = { waiting: 50 } as const;

/** The admin that asks, by the address its browser sent (Origin): its project's name, from that address. */
export function askingAdmin(origin: string | undefined | null): { admin: string; project: string } | null {
  const m = ASK_ADMIN.exec((origin ?? "").trim().toLowerCase());
  return m ? { admin: m[0], project: m[1] } : null;
}

/** Letters that can't be read as one another (lib/firstRun.ts). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Six letters in two groups (K7Q-H9M): read aloud by the client, matched by the owner. */
export function newPair(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}
const hashOf = (key: string) => createHash("sha256").update(key).digest("hex");
function sameKey(key: string, hash: string): boolean {
  const a = Buffer.from(hashOf(key), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function read(origin: string | undefined, key: unknown): { admin: string; project: string; key: string } {
  const asking = askingAdmin(origin);
  if (!asking) throw new AppError(403, "ASK_ADMIN", "Only a Cloudflare Pages site's own address may ask");
  if (typeof key !== "string" || !ASK_KEY.test(key)) throw new AppError(400, "ASK_KEY", "The asking browser's key is missing");
  return { ...asking, key };
}

export type AskState = "waiting" | "refused" | "making" | "stopped" | "made";

/**
 * The admin asks (again): one ask per admin. Asked again by the same browser, it is the same ask. Asked by another
 * browser while it waits (or after a no), it starts over with new letters, so the owner matches the newest one; once
 * the owner said yes, it is that browser's alone.
 */
export async function askFor(origin: string | undefined, key: unknown): Promise<{ pair: string; state: AskState }> {
  const a = read(origin, key);
  const had = await prisma.siteAsk.findUnique({ where: { admin: a.admin } });
  if (had && sameKey(a.key, had.keyHash) && had.state !== "refused") return { pair: had.pair, state: had.state as AskState };
  if (had?.state === "making") throw new AppError(409, "ASK_TAKEN", "This site is being made for another browser");
  if (!had && (await prisma.siteAsk.count({ where: { state: "waiting" } })) >= ASK_LIMITS.waiting) throw new AppError(429, "ASK_FULL", "Too many sites are waiting: try again later");
  const data = { pair: newPair(), keyHash: hashOf(a.key), state: "waiting" };
  const row = had ? await prisma.siteAsk.update({ where: { id: had.id }, data }) : await prisma.siteAsk.create({ data: { admin: a.admin, ...data } });
  return { pair: row.pair, state: "waiting" };
}

export type AskStatus = {
  state: AskState;
  pair: string;
  /** How the making goes (each step's name and state), once the owner said yes. */
  steps?: Array<Pick<MakeStep, "id" | "state">>;
  /** Once it is made: the server's address (…/v1) and the code its owner's account is made with. */
  api?: string;
  code?: string;
};

/** Where the ask stands, told only to the browser that asked. */
export async function askStatus(origin: string | undefined, key: unknown): Promise<AskStatus> {
  const a = read(origin, key);
  const row = await prisma.siteAsk.findUnique({ where: { admin: a.admin } });
  if (!row || !sameKey(a.key, row.keyHash)) throw new AppError(404, "ASK_NOT_FOUND", "This browser has asked nothing");
  if (row.state !== "making" || !row.copyId) return { state: row.state === "refused" ? "refused" : "waiting", pair: row.pair };
  const copy = await prisma.clientCopy.findUnique({ where: { id: row.copyId } });
  if (!copy) return { state: "stopped", pair: row.pair };
  const view = await copyView(copy);
  const out: AskStatus = { state: view.state, pair: row.pair, steps: view.steps.map((s) => ({ id: s.id, state: s.state })) };
  if (view.state === "made") {
    out.api = `${view.addresses.api}/v1`;
    try {
      out.code = (JSON.parse(open(copy.sealed)) as CopySecrets).SETUP_CODE;
    } catch {
      // Its secrets can't be opened here: the code is in its server's SETUP_CODE variable.
    }
  }
  return out;
}

export type AskView = { id: string; admin: string; project: string; pair: string; state: "waiting" | "making" | "refused"; asked: string; copy: { id: string; state: string } | null };

/** The asks, for the owner's list: the waiting first, newest first. */
export async function listAsks(): Promise<AskView[]> {
  const rows = await prisma.siteAsk.findMany({ orderBy: [{ updatedAt: "desc" }], take: 100 });
  const copies = await prisma.clientCopy.findMany({ where: { id: { in: rows.map((r) => r.copyId).filter((id): id is string => !!id) } }, select: { id: true, state: true } });
  const stateOf = new Map(copies.map((c) => [c.id, c.state]));
  const rank = (s: string) => (s === "waiting" ? 0 : s === "making" ? 1 : 2);
  return rows
    .map((r) => ({
      id: r.id,
      admin: r.admin,
      project: askingAdmin(r.admin)?.project ?? "",
      pair: r.pair,
      state: r.state as AskView["state"],
      asked: r.updatedAt.toISOString(),
      copy: r.copyId ? { id: r.copyId, state: stateOf.get(r.copyId) ?? "stopped" } : null,
    }))
    .sort((x, y) => rank(x.state) - rank(y.state));
}
