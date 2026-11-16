/**
 * A call that isn't run twice (modules/functions/fn.routes.ts). A caller that may send the same
 * request again — a program that retries after a timeout, a page whose button is pressed twice —
 * names the request with an `Idempotency-Key` header. The first call with a key runs the function
 * and its answer is kept; the same key again, from the same caller at the same address, is
 * answered with that answer and nothing runs. A key is remembered for a day.
 *
 * - The same key with something else asked is refused: a key names one request.
 * - While the first call is still running, the second is told so (and should try again).
 * - A first call that never came back (the server stopped mid-run) leaves the key held: nobody
 *   knows how far it got, so the run log is where to look before asking again under a new key.
 */
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export const CALL_KEY = {
  /** A key: letters, digits and a few signs. */
  pattern: /^[A-Za-z0-9_.:\-]{1,100}$/,
  /** How long a key is remembered. */
  keepMs: 24 * 3_600_000,
  /** The biggest answer kept to give again, in letters of JSON. */
  answer: 256_000,
} as const;

/** What was asked, as a short print of it: the same things asked print the same, whatever order they were written in. */
export function askedPrint(input: unknown): string {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sorted((v as Record<string, unknown>)[k])])) : v;
  return createHash("sha256").update(JSON.stringify(sorted(input ?? null))).digest("hex").slice(0, 32);
}

export type Held =
  | { state: "new"; id: string }
  /** Answered before: give that answer again. */
  | { state: "done"; status: number; answer: unknown; runId: string | null }
  /** The first call hasn't answered yet (`stuck`: for so long that it never will). */
  | { state: "running"; stuck: boolean }
  /** This key named another request. */
  | { state: "other" };

/** A call's key taken (the call may run), or what became of the call that took it first. */
export async function holdKey(triggerId: string, who: string, key: string, asked: string, now = Date.now()): Promise<Held> {
  try {
    const made = await prisma.fnCallKey.create({ data: { triggerId, who: who.slice(0, 200), key, asked }, select: { id: true } });
    return { state: "new", id: made.id };
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  const first = await prisma.fnCallKey.findUnique({ where: { triggerId_who_key: { triggerId, who: who.slice(0, 200), key } } });
  // Forgotten between the two looks (its day was over): the call takes the key afresh.
  if (!first) return holdKey(triggerId, who, key, asked, now);
  if (first.asked !== asked) return { state: "other" };
  if (first.state !== "done") return { state: "running", stuck: now - first.createdAt.getTime() > 2 * 60_000 };
  return { state: "done", status: first.status ?? 200, answer: first.answer, runId: first.runId };
}

/** The call answered: what it was answered is kept under its key. An answer too big to keep is said to be so when asked again. */
export async function keepAnswer(id: string, status: number, answer: unknown, runId: string | null): Promise<void> {
  const fits = JSON.stringify(answer ?? null).length <= CALL_KEY.answer;
  await prisma.fnCallKey
    .update({ where: { id }, data: { state: "done", status: fits ? status : 409, answer: (fits ? answer : { ok: false, error: "ANSWER_NOT_KEPT", message: "This request was answered before, and its answer was too big to keep" }) as Prisma.InputJsonValue, runId } })
    .catch(() => undefined);
}

/** The call never ran (the address was gone, the function switched off): its key is free again. */
export async function dropKey(id: string): Promise<void> {
  await prisma.fnCallKey.delete({ where: { id } }).catch(() => undefined);
}

/** Keys past their day go (the job "runsClean"). */
export async function cleanCallKeys(now = Date.now()): Promise<{ removed: number }> {
  return { removed: (await prisma.fnCallKey.deleteMany({ where: { createdAt: { lt: new Date(now - CALL_KEY.keepMs) } } })).count };
}
