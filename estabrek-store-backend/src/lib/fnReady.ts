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
import { SiteError, callSite, sendRaw, type CallOut } from "./fnHttp.js";
import { open, seal } from "./secretBox.js";
import type { Scope } from "./fnValues.js";
import { secretsIn } from "./fnSites.js";
import { READY_KEY, READY_LIMITS, kindOf, missingIn, type Ask, type Asked, type KindDef, type Look, type ReadyCall } from "./fnKinds.js";
import { LOOK_LIMITS } from "./fnKindsInfra.js";

type Kept = { id: string; kind: string; name: string; sealed: string; settings: Record<string, string> };
let cache: { at: number; byId: Map<string, Kept> } | null = null;
/** The tokens a kind's key was traded for (Google), by connection, until shortly before they run out. Only in this server's memory. */
const tokens = new Map<string, { sealed: string; token: string; until: number }>();
/** After a change: the next use reads them again (and trades its key afresh). */
export function forgetReady() {
  cache = null;
  tokens.clear();
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

/**
 * What a call carries as the connection's key: the key itself, or (a kind that trades it) a token
 * for it, asked for once and kept until a minute before it runs out. A dry call asks for none.
 */
async function keyFor(c: Kept, kind: KindDef, dry: boolean): Promise<string> {
  // A kind that sends its key in another form (Basic: in base64): made so here, and sealed again for the call.
  if (kind.useKey) {
    let key: string;
    try {
      key = open(c.sealed);
    } catch {
      throw new SiteError(`The key of "${c.name}" can't be read (was the server's key changed?)`);
    }
    return seal(kind.useKey(key, c.settings));
  }
  if (!kind.token || dry) return c.sealed;
  const now = Date.now();
  const had = tokens.get(c.id);
  if (had && had.sealed === c.sealed && had.until > now) return seal(had.token);
  let ask: { url: string; type: string; body: string };
  try {
    ask = kind.token.ask(open(c.sealed), now);
  } catch {
    throw new SiteError(`The key of "${c.name}" can't be read (was the server's key changed?)`);
  }
  const got = await sendRaw({ method: "POST", url: ask.url, headers: { "content-type": ask.type, accept: "application/json", "user-agent": "store-functions/1" }, body: ask.body });
  let body: unknown = null;
  try {
    body = JSON.parse(got.text);
  } catch {
    body = null;
  }
  const t = got.status >= 200 && got.status < 300 ? kind.token.read(body) : null;
  if (!t) {
    const why = kind.token.why(body);
    throw new SiteError(`${kind.label} refused the key${why ? `: ${why}` : ` (${got.status})`}`);
  }
  tokens.set(c.id, { sealed: c.sealed, token: t.token, until: now + Math.max(0, t.seconds - 60) * 1000 });
  return seal(t.token);
}

/** The call made with the connection's own site and key (or the token for it), and nothing else of the owner's. */
async function through(c: Kept, kind: KindDef, call: ReadyCall, scope: Scope, dry: boolean, ms?: number): Promise<CallOut> {
  // The kind's one site, or (a generic API) the connection's own: its key goes there and nowhere else.
  const host = kind.hostOf ? kind.hostOf(c.settings) : kind.host;
  if (!host) throw new SiteError(`"${c.name}" has no address`);
  const sealed = await keyFor(c, kind, dry);
  return callSite({ ...call, scope, dry, ms, grant: { sites: [host], secrets: { [READY_KEY]: { sealed, sites: [host] } } } });
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
  const ok = out.ok && !kind.fails?.(out.body);
  return { line, dry: false, status: out.status, ok, body: ok && action.answer ? action.answer(out.body) : out.body, why: ok ? null : kind.why(out.body) };
}

/**
 * One call of the server's own through a connection (the press checking a copy's names: lib/pressCheck.ts),
 * to the kind's one site with its key, as a step's would go. Never throws for a "no": it is the answer.
 */
export async function askThrough(id: string, kindWanted: string, call: ReadyCall): Promise<Asked & { name: string; settings: Record<string, string> }> {
  const c = (await kept()).get(id);
  const kind = c ? kindOf(c.kind) : null;
  if (!c || !kind || c.kind !== kindWanted) throw new SiteError("This connection isn't there any more");
  try {
    const out = await through(c, kind, call, {}, false);
    const ok = out.ok && !kind.fails?.(out.body);
    return { ok, status: out.status, body: out.body, why: ok ? null : (kind.why(out.body) ?? null), name: c.name, settings: c.settings };
  } catch (e) {
    if (!(e instanceof SiteError)) throw e;
    return { ok: false, status: 0, body: null, why: e.message, name: c.name, settings: c.settings };
  }
}
/** The connections of a kind, by name (never a key). */
export async function readyOfKind(kind: string): Promise<Array<{ id: string; name: string; settings: Record<string, string> }>> {
  return [...(await kept()).values()].filter((c) => c.kind === kind).map((c) => ({ id: c.id, name: c.name, settings: c.settings }));
}

export type ReadyLook = { ok: boolean; status: number; why: string | null; who: string | null; groups: Look["groups"]; /** Calls that said no (a token that may read some things and not others). */ missed: number };

/**
 * What is there, read through the connection (a hosting service's projects and their last deploys:
 * lib/fnKindsInfra.ts). Every call goes as a step's would, with the connection's key and to its
 * site alone; a "no" is its answer, and when everything said no, the first one says why.
 */
export async function lookReady(id: string): Promise<ReadyLook> {
  const c = (await kept()).get(id);
  const kind = c ? kindOf(c.kind) : null;
  if (!c || !kind) throw new SiteError("This connection isn't there any more");
  if (!kind.look) throw new SiteError(`"${c.name}" has nothing to show`);
  const went = { calls: 0, missed: 0, any: false, first: null as { status: number; why: string | null } | null };
  const no = (status: number, why: string | null) => {
    went.missed++;
    went.first ??= { status, why };
    return { ok: false, status, body: null, why };
  };
  const ask: Ask = async (call) => {
    if (++went.calls > LOOK_LIMITS.calls) return { ok: false, status: 0, body: null, why: "Too many calls for one look" };
    try {
      const out = await through(c, kind, call, {}, false);
      const ok = out.ok && !kind.fails?.(out.body);
      if (!ok) return { ...no(out.status, kind.why(out.body) ?? null), body: out.body };
      went.any = true;
      return { ok, status: out.status, body: out.body, why: null };
    } catch (e) {
      if (!(e instanceof SiteError)) throw e;
      return no(0, e.message);
    }
  };
  const look = await kind.look(ask, c.settings);
  if (!went.any) return { ok: false, status: went.first?.status ?? 0, why: went.first?.why ?? null, who: null, groups: [], missed: went.missed };
  return { ok: true, status: 200, why: null, who: look.who, groups: look.groups, missed: went.missed };
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
    const call = kind.test.call(c.settings, line.slice(0, READY_LIMITS.test));
    // Nothing more to ask: the key traded for a token is the answer.
    if (!call) {
      await keyFor(c, kind, false);
      return { ok: true, status: 200, said: kind.test.said(null, c.settings), why: null, sends: kind.test.sends };
    }
    const out = await through(c, kind, call, {}, false);
    const ok = out.ok && !kind.fails?.(out.body);
    return { ok, status: out.status, said: ok ? kind.test.said(out.body, c.settings) : null, why: ok ? null : kind.why(out.body), sends: kind.test.sends };
  } catch (e) {
    if (e instanceof SiteError) return { ok: false, status: 0, said: null, why: e.message, sends: kind.test.sends };
    throw e;
  }
}
