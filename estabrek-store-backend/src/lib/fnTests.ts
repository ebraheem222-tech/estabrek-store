/**
 * A function's own tests (F4; admin → الـ Functions → الاختبارات). A test is what the function is
 * handed and what must come of it: that it goes through (and, if said, gives back exactly this),
 * or that it stops (and, if said, with these words in its reason). Its inputs are also the saved
 * sample the owner tries the function with.
 *
 * Tests run the draft as a try-out does: nothing is written or sent, and "find" reads the tables as
 * they are. They run before every publish; one that doesn't pass stops it (the routes are in
 * modules/admin/functions.controller.ts, the run itself in modules/functions/functions.service.ts).
 * Pure: no database here.
 */
import { z } from "zod";
import { numberOf } from "./fnValues.js";

export const TEST_LIMITS = {
  /** Tests one function keeps. */
  tests: 20,
  name: 80,
  /** What a test hands the function, and the answer it expects, as JSON. */
  input: 8000,
  /** The words expected in the reason it stops with. */
  words: 200,
  /** One test's run; and all of a function's tests together. */
  ms: 5000,
  total: 30_000,
} as const;

export type FnTest = {
  id: string;
  name: string;
  /** What the function is handed, by its inputs' names. */
  input: Record<string, unknown>;
  /** Who it is run as, where the steps name {{caller.name}} or {{caller.email}} (else the member running it). */
  caller?: { name?: string; email?: string };
  expect: {
    /** It goes through; or it stops. */
    ok: boolean;
    /** Going through: what it gives back, exactly. */
    value?: unknown;
    /** Stopping: words its reason holds. */
    error?: string;
  };
};

const small = (v: unknown) => JSON.stringify(v ?? null).length <= TEST_LIMITS.input;
const TestSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]{4,16}$/, "A test's id is small letters and digits"),
    name: z.string().trim().min(1).max(TEST_LIMITS.name),
    input: z.record(z.string().min(1).max(40), z.unknown()).refine(small, "Too long"),
    caller: z.object({ name: z.string().trim().max(80).optional(), email: z.string().trim().max(200).optional() }).strict().optional(),
    expect: z.object({ ok: z.boolean(), value: z.unknown().refine(small, "Too long").optional(), error: z.string().trim().max(TEST_LIMITS.words).optional() }).strict(),
  })
  .strict();
export const TestsSchema = z
  .array(TestSchema)
  .max(TEST_LIMITS.tests)
  .refine((tests) => new Set(tests.map((t) => t.id)).size === tests.length, "Two tests have the same id");

/** A function's saved tests as they are used (anything that isn't a list of tests is none). */
export function testsOf(raw: unknown): FnTest[] {
  const parsed = TestsSchema.safeParse(raw);
  return parsed.success ? (parsed.data as FnTest[]) : [];
}

/**
 * The same answer: numbers by their worth (5 and "5"), lists in their order, things by their fields
 * whatever order they were written in, nothing and nothing; everything else letter for letter.
 */
export function alike(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === "number" || typeof b === "number") {
    const x = numberOf(a);
    const y = numberOf(b);
    return x != null && y != null && x === y;
  }
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, k) => alike(v, b[k]));
  if (typeof a === "object" && typeof b === "object") {
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    const keys = Object.keys(x);
    return keys.length === Object.keys(y).length && keys.every((k) => Object.prototype.hasOwnProperty.call(y, k) && alike(x[k], y[k]));
  }
  return false;
}

/** Why a test didn't pass: it stopped, it went through, its answer or its reason was another, or it never got its turn. */
export type TestWhy = "stopped" | "wentThrough" | "value" | "reason" | "time";

/** What a run's outcome means for a test: null when it is what the test expects, else why not. */
export function verdict(test: Pick<FnTest, "expect">, out: { ok: boolean; value: unknown; error: string | null }): TestWhy | null {
  if (test.expect.ok) {
    if (!out.ok) return "stopped";
    return test.expect.value !== undefined && !alike(test.expect.value, out.value) ? "value" : null;
  }
  if (out.ok) return "wentThrough";
  const words = test.expect.error?.trim().toLowerCase();
  return words && !(out.error ?? "").toLowerCase().includes(words) ? "reason" : null;
}
