/**
 * What a function promises to give back (admin → الـ Functions → شو بترجّع). The owner may say
 * the kind of its answer — text, a number, yes/no, a list, a thing with these fields — as they say
 * the kinds of what it is handed. Whoever uses the answer then knows its shape: a function that
 * calls this one is offered its fields by name, and a program that calls its address can count
 * on them.
 *
 * The promise is checked where nothing has happened yet: a try-out says when the answer isn't
 * what is promised, and one of the function's own tests that goes through with another shape
 * doesn't pass, which stops the publish. A real run isn't failed over it (what it did is done):
 * its line in the run log says so instead.
 *
 * Pure: no database here.
 */
import { z } from "zod";

export const GIVE_TYPES = ["any", "text", "number", "bool", "list", "thing"] as const;
export type GiveType = (typeof GIVE_TYPES)[number];
export type GiveField = { name: string; type: GiveType; /** It is always there (and never nothing). */ required?: boolean };
/** `fields`: a thing's own; for a list, what each of its things holds. */
export type Gives = { type: GiveType; fields?: GiveField[] };

export const GIVE_LIMITS = { fields: 30, /** Items of a list that are looked at. */ items: 50 } as const;

const FieldSchema = z.object({ name: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/, "A field's name is letters, digits and _"), type: z.enum(GIVE_TYPES), required: z.boolean().optional() }).strict();
export const GivesSchema: z.ZodType<Gives> = z
  .object({ type: z.enum(GIVE_TYPES), fields: z.array(FieldSchema).max(GIVE_LIMITS.fields).optional() })
  .strict()
  .superRefine((g, ctx) => {
    const names = (g.fields ?? []).map((f) => f.name);
    if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", path: ["fields"], message: "Two fields have the same name" });
    if (g.fields?.length && g.type !== "thing" && g.type !== "list") ctx.addIssue({ code: "custom", path: ["fields"], message: "Only a thing, or a list of things, has fields" });
  }) as z.ZodType<Gives>;

/** A value's kind, as a promise names them ("nothing" for none). */
export function kindOf(v: unknown): GiveType | "nothing" {
  if (v === null || v === undefined) return "nothing";
  if (typeof v === "string") return "text";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "bool";
  if (Array.isArray(v)) return "list";
  return "thing";
}
const WORD: Record<GiveType | "nothing", string> = { any: "anything", text: "text", number: "a number", bool: "yes/no", list: "a list", thing: "a thing", nothing: "nothing" };

function fieldsProblem(fields: GiveField[], thing: Record<string, unknown>, where: string): string | null {
  for (const f of fields) {
    const kind = kindOf(thing[f.name]);
    if (kind === "nothing") {
      if (f.required) return `${where}"${f.name}" is promised and isn't there`;
    } else if (f.type !== "any" && kind !== f.type) return `${where}"${f.name}" is promised to be ${WORD[f.type]} and is ${WORD[kind]}`;
  }
  return null;
}

/**
 * Why an answer isn't what the function promises, in a line; null when it is (or when nothing is
 * promised). A list's things are looked at up to a limit.
 */
export function answerProblem(gives: Gives | undefined | null, value: unknown): string | null {
  if (!gives || gives.type === "any") return null;
  const kind = kindOf(value);
  if (kind !== gives.type) return `It promises ${WORD[gives.type]} and gave back ${WORD[kind]}`;
  if (!gives.fields?.length) return null;
  if (gives.type === "thing") return fieldsProblem(gives.fields, value as Record<string, unknown>, "");
  const items = (value as unknown[]).slice(0, GIVE_LIMITS.items);
  for (let k = 0; k < items.length; k++) {
    if (kindOf(items[k]) !== "thing") return `Item ${k + 1} of the list is promised to be a thing and is ${WORD[kindOf(items[k])]}`;
    const problem = fieldsProblem(gives.fields, items[k] as Record<string, unknown>, `Item ${k + 1} of the list: `);
    if (problem) return problem;
  }
  return null;
}
