/**
 * Ready connections kept and used (F5; the kinds are in lib/fnKinds.ts, the step is "ready" in
 * lib/fnDef.ts, the page is admin → الاتصالات والأسرار).
 *
 * A connection is a kind (Telegram, Slack), a name of the owner's, its key kept encrypted
 * (lib/secretBox.ts; never answered back) and a few settings. Using one is a call to the kind's
 * own site through lib/fnHttp.ts with a grant: that site and that key, for that one call. So the
 * key can't be named by an "http" step, the kind's site isn't opened to other steps, and every
 * rule of a call holds (https, by name, nothing inside the network, bounded, the key cut out of
 * the answer).
 */
import { prisma } from "./prisma.js";
import { SiteError, callSite, type CallOut } from "./fnHttp.js";
import type { Scope } from "./fnValues.js";
import { secretsIn } from "./fnSites.js";
import { READY_KEY, READY_LIMITS, kindOf, missingIn, type KindDef, type ReadyCall } from "./fnKinds.js";

type Kept = { id: string; kind: string; name: string; sealed: string; settings: Record<string, string> };
let cache: { at: number; byId: Map<string, Kept> } | null = null;
/** After a change: the next use reads them again. */
export function forgetReady() {
  cache = null;
}
const settingsIn = (raw: unknown): Record<string, string> =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string> : {};
async function kept(now = Date.now()): Promise<Map<string, Kept>> {
  if (!cache || now - cache.at > 10_000) {
    const rows = await prisma.fnConnection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, kind: true, name: true, sealed: true, settings: true } });
    cache = { at: now, byId: new Map(rows.map((r) => [r.id, { id: r.id, kind: r.kind, name: r.name, sealed: r.sealed, settings: settingsIn(r.settings) }])) };
  }
  return cache.byId;
}

/** The connections as a builder offers them: which, of what kind, and which settings they hold (never a key, nor a setting's value). */
export async function readyNames(): Promise<Array<{ id: string; name: string; kind: string; set: string[] }>> {
  return [...(await kept()).values()].map((c) => ({ id: c.id, name: c.name, kind: c.kind, set: Object.keys(c.settings) }));
}

/** The call made with the connection's own site and key, and nothing else of the owner's. */
function through(c: Kept, kind: KindDef, call: ReadyCall, scope: Scope, dry: boolean, ms?: number): Promise<CallOut> {
  return callSite({ ...call, scope, dry, ms, grant: { sites: [kind.host], secrets: { [READY_KEY]: { sealed: c.sealed, sites: [kind.host] } } } });
}

export type ReadyOut = { /** Which connection, as a run's line says it: Telegram "Store alerts". */ line: string; dry: boolean; status: number; ok: boolean; body: unknown; /** Why the service said no, in its own words. */ why: string | null };

/**
 * A step's use of a connection (or, dry, only its check). `give` is the step as the owner wrote
 * it, names and all: the run's values are put in as the call leaves, and are never read for names
 * themselves. Throws `SiteError` when the connection is gone or the step lacks something.
 */
export async function useReady(input: { id: string; what: string; give: Record<string, unknown>; scope: Scope; dry?: boolean; ms?: number }): Promise<ReadyOut> {
  const c = (await kept()).get(input.id);
  if (!c) throw new SiteError("This connection isn't there any more");
  const kind = kindOf(c.kind);
  const action = kind?.actions.find((a) => a.id === input.what);
  if (!kind || !action) throw new SiteError(`"${c.name}" can't do this`);
  // The key is the connection's, put in by its kind alone: nothing a step holds may name a secret.
  if (secretsIn(input.give).length) throw new SiteError("A secret is only named in a step that calls a site");
  const give: Record<string, string> = {};
  for (const f of action.fields) if (typeof input.give[f.id] === "string") give[f.id] = input.give[f.id] as string;
  const missing = missingIn(action, give, (s) => !!c.settings[s]);
  if (missing.length) throw new SiteError(missing[0]);
  const line = `${kind.label} "${c.name}"`;
  const out = await through(c, kind, action.call(c.settings, give), input.scope, !!input.dry, input.ms);
  if (out.dry) return { line, dry: true, status: 0, ok: true, body: null, why: null };
  void prisma.fnConnection.updateMany({ where: { id: c.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { line, dry: false, status: out.status, ok: out.ok, body: out.body, why: out.ok ? null : kind.why(out.body) };
}

/**
 * The connection's key tried for real: a question that changes nothing where the service has one
 * (Telegram), a line posted where it doesn't (Slack). Never throws for a "no": it is the answer.
 */
export async function tryReady(id: string, line: string): Promise<{ ok: boolean; status: number; /** What the service said about itself: "@my_bot". */ said: string | null; why: string | null; sends: boolean }> {
  const c = (await kept()).get(id);
  const kind = c ? kindOf(c.kind) : null;
  if (!c || !kind) throw new SiteError("This connection isn't there any more");
  try {
    const out = await through(c, kind, kind.test.call(c.settings, line.slice(0, READY_LIMITS.test)), {}, false);
    return { ok: out.ok, status: out.status, said: out.ok ? kind.test.said(out.body) : null, why: out.ok ? null : kind.why(out.body), sends: kind.test.sends };
  } catch (e) {
    if (e instanceof SiteError) return { ok: false, status: 0, said: null, why: e.message, sends: kind.test.sends };
    throw e;
  }
}
