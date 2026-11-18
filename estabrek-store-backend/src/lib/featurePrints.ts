/**
 * Fingerprints of what a template wrote into the store (stage 4: lib/featureInstall.ts writes them,
 * lib/featureUpgrade.ts reads them). A thing whose fingerprint today is the one it was written with
 * hasn't been changed by the owner, so an upgrade may replace it; one that differs is the owner's work,
 * and is kept unless they choose the template's. Keys are put in order first (the database keeps
 * JSON with its keys in its own order), so the same thing always has the same fingerprint.
 */
import { createHash } from "node:crypto";
import { storedTree } from "./pageTree.js";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ordered = (v: unknown): unknown => (Array.isArray(v) ? v.map(ordered) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordered(v[k])])) : v);
/** The same JSON for the same thing, whatever order its keys came in. */
export const stable = (v: unknown) => JSON.stringify(ordered(v ?? null));
export const print = (v: unknown) => createHash("sha1").update(stable(v)).digest("hex").slice(0, 20);

export type TriggerLike = { kind: string; config: unknown; slug: string | null; enabled: boolean };
/** What starts a function, in order (a webhook's address is random, so it isn't part of it). */
export const triggersPrint = (list: TriggerLike[]) => print(list.map((t) => ({ kind: t.kind, config: t.config, slug: t.kind === "webhook" ? null : t.slug, enabled: t.enabled })));
/** A page's tree as the editor has it (checked again: the same tree always reads the same). */
export const pagePrint = (tree: unknown) => print(storedTree(tree) ?? tree);

export type TablePrints = { name: string; api: string; fields: Record<string, string> };
export type FnPrints = { def: string; tests: string; triggers: string };
export type Prints = { table: Record<string, TablePrints>; function: Record<string, FnPrints>; page: Record<string, string> };

export const tablePrints = (t: { name: unknown; api: unknown; fields: unknown[] }): TablePrints => ({
  name: print(t.name),
  api: print(t.api ?? null),
  fields: Object.fromEntries(t.fields.filter(isObj).map((f) => [String(f.id), print(f)])),
});
export const fnPrints = (f: { def: unknown; tests: unknown; triggers: TriggerLike[] }): FnPrints => ({ def: print(f.def), tests: print(f.tests ?? []), triggers: triggersPrint(f.triggers) });
