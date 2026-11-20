/**
 * A store with no one in it yet (a client's new copy, lib/press.ts): its admin opens on a first
 * setup, not on a sign-in. Whoever has the store's one-time setup code makes the owner's account
 * there, with a password of their own that passes through no one's hands, and is signed in.
 * Then the store's own setup (what it sells, its theme, its name) takes over.
 *
 * The code is the server's SETUP_CODE (the press makes one for each copy and hands it to the
 * owner once, inside the setup link). Without it, one is made when the server starts and written
 * to the server's log (Railway → the service → Logs), where only someone with the hosting account
 * reads it. Once anyone is in the store, the setup is closed for good: the code opens nothing.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";

/** Letters that can't be read as one another (no 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** 16 letters of 31: about 79 bits. Said in four groups: K7QH-9MXP-3TRA-WZ4E. */
export function newSetupCode(): string {
  let out = "";
  for (let i = 0; i < 16; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out.match(/.{4}/g)!.join("-");
}
/** A code as it is compared: capitals, with no dashes or spaces. */
export const plainCode = (typed: string) => typed.toUpperCase().replace(/[\s-]+/g, "");

let made: string | null = null;
/** The code that opens the setup now: the server's own, or one made for this run of it. */
export function setupCode(): string {
  const own = env.SETUP_CODE?.trim();
  if (own) return own;
  made ??= newSetupCode();
  return made;
}
/** Where the owner finds the code: in the link the press gave them, or in the server's log. */
export const codeFrom = (): "link" | "log" => (env.SETUP_CODE?.trim() ? "link" : "log");

/** Whether the store has no one in it: the first setup is open while it has none. */
export async function firstRunNeeded(): Promise<boolean> {
  return (await prisma.adminUser.count()) === 0;
}

/** Said once when the server starts with no one in the store and no code of its own: the code, for whoever reads its log. */
export async function announceFirstRun(log: (line: string) => void = console.log): Promise<void> {
  if (codeFrom() === "link" || !(await firstRunNeeded().catch(() => false))) return;
  log(`[first-run] This store has no one in it yet. Open the admin and use this one-time setup code to make the owner's account: ${setupCode()}`);
}

/** Whether what was typed is the code (compared in constant time, by its digest). */
export function codeMatches(typed: string): boolean {
  const a = createHash("sha256").update(plainCode(typed)).digest();
  const b = createHash("sha256").update(plainCode(setupCode())).digest();
  return timingSafeEqual(a, b);
}

/**
 * The owner's account made, if the store still has no one and the code is right. Two at once can't
 * both make one: the count and the making are one transaction behind a lock of their own.
 */
export async function claimFirstRun(input: { code: string; name: string; email: string; password: string }): Promise<{ id: string }> {
  if (!codeMatches(input.code)) throw new AppError(403, "SETUP_CODE_WRONG", "The setup code isn't right");
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const admin = await prisma.$transaction(async (tx) => {
    // A lock of its own for the rest of the transaction (its answer is nothing: said as text, which Prisma reads).
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724119013)::text AS locked`;
    if ((await tx.adminUser.count()) > 0) throw new AppError(409, "FIRST_RUN_DONE", "This store already has its owner: sign in");
    return tx.adminUser.create({ data: { email: input.email, name: input.name, passwordHash, role: "SUPERADMIN", status: "ACTIVE" }, select: { id: true } });
  });
  // Used: a later run of the server makes no new one, since the store isn't empty any more.
  made = null;
  return admin;
}

/** For tests: forget the code made for this run. */
export function forgetSetupCodeForTests() {
  made = null;
}
