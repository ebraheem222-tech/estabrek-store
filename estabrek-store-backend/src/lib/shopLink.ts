/**
 * The store's own shop when it is made from its admin (إعداد المتجر → متجرك, the setup's first step):
 * a copy of the store set up by hand may have a server and an admin and no shop of its own, and its
 * owner shouldn't have to open Vercel, Railway and Cloudflare to give it one.
 *
 * Made through the owner's Vercel account: by «وصّل Vercel» (a Vercel Integration the platform's owner
 * registered once: the owner signs in at Vercel and says yes, and Vercel hands this server a short-lived
 * token for it), or by a token pasted in. Either way the token is used for these calls alone and never
 * kept (it isn't saved as a ready connection: a token for a whole Vercel account shouldn't stay in a
 * client's store).
 * The press's own Vercel steps make it (lib/pressMake.ts makeShopSteps): a project from this
 * server's repository and branch, its shop folder, told this server's and this admin's addresses
 * and a new secret for refreshing its pages, then its first deploy.
 *
 * Kept in PerformanceSettings.data.shop (its secret sealed), and put in force here at once: the
 * server's STOREFRONT_URL, STOREFRONT_REVALIDATE_URL and _SECRET become the shop's (every link in
 * an email, a payment page or a push, and every page refresh, goes to it), and its address is
 * allowed to call this server. A shop made here wins over the server's own variables: it was made
 * on purpose, after them.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { corsOrigins, env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { mergePerformance } from "./performanceKey.js";
import { open, seal } from "./secretBox.js";
import { SiteError, callSite, sendRaw } from "./fnHttp.js";
import { INFRA_KINDS } from "./fnKindsInfra.js";
import { madeSecret, nameProblem } from "./press.js";
import { vercelAddressFree } from "./pressCheck.js";
import { StepError, makeShopSteps, type Made } from "./pressMake.js";
import type { ReadyCall, Asked } from "./fnKinds.js";

type Vercel = NonNullable<Made["vercel"]>;
type Saved = { url: string; sealed: string; project: string | null; site: string; savedAt: string };
/** A making that didn't finish: what it made so far, so the next try goes on from there (same name, same secret). */
type Making = { site: string; began: number; sealed: string; vercel: Vercel };
/** «وصّل Vercel» begun: Vercel sends the owner back with this code's twin; for whom, and for which name. */
type Connect = { hash: string; admin: string; site: string; at: number };
type Doc = { saved: Saved | null; making: Making | null; connect: Connect | null; /** Why the last «وصّل Vercel» didn't make the shop (Vercel's or the server's words). */ error: string | null };

/** The server's own variables, as they were when it started (what a shop made here stands in for). */
const OWN = { url: env.STOREFRONT_URL, revalidate: env.STOREFRONT_REVALIDATE_URL, secret: env.STOREFRONT_REVALIDATE_SECRET };
let doc: Doc = { saved: null, making: null, connect: null, error: null };
let added: string | null = null;

const docOf = (raw: unknown): Doc => {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = r.saved as Partial<Saved> | undefined;
  const m = r.making as Partial<Making> | undefined;
  const c = r.connect as Partial<Connect> | undefined;
  return {
    connect: c && typeof c.hash === "string" && typeof c.admin === "string" && typeof c.site === "string" && typeof c.at === "number" ? { hash: c.hash, admin: c.admin, site: c.site, at: c.at } : null,
    error: typeof r.error === "string" ? r.error.slice(0, 500) : null,
    saved: s && typeof s.url === "string" && typeof s.sealed === "string" ? { url: s.url, sealed: s.sealed, project: typeof s.project === "string" ? s.project : null, site: String(s.site ?? ""), savedAt: String(s.savedAt ?? "") } : null,
    making: m && typeof m.site === "string" && typeof m.began === "number" && typeof m.sealed === "string" ? { site: m.site, began: m.began, sealed: m.sealed, vercel: (m.vercel && typeof m.vercel === "object" ? m.vercel : {}) as Vercel } : null,
  };
};

/** The kept shop put in force: the server's shop variables and the addresses allowed to call it. */
function apply() {
  const s = doc.saved;
  if (added && Array.isArray(corsOrigins)) {
    const at = corsOrigins.indexOf(added);
    if (at >= 0) corsOrigins.splice(at, 1);
    added = null;
  }
  if (!s) {
    env.STOREFRONT_URL = OWN.url;
    env.STOREFRONT_REVALIDATE_URL = OWN.revalidate;
    env.STOREFRONT_REVALIDATE_SECRET = OWN.secret;
    return;
  }
  env.STOREFRONT_URL = s.url;
  env.STOREFRONT_REVALIDATE_URL = `${s.url}/api/revalidate`;
  try {
    env.STOREFRONT_REVALIDATE_SECRET = open(s.sealed);
  } catch {
    env.STOREFRONT_REVALIDATE_SECRET = OWN.secret;
  }
  const origin = new URL(s.url).origin;
  if (Array.isArray(corsOrigins) && !corsOrigins.includes(origin)) {
    corsOrigins.push(origin);
    added = origin;
  }
}

async function readDoc(): Promise<{ data: Record<string, unknown>; doc: Doc }> {
  const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
  const data = row?.data && typeof row.data === "object" ? { ...(row.data as Record<string, unknown>) } : {};
  return { data, doc: docOf(data.shop) };
}
async function writeDoc(next: Doc) {
  // Its own part alone (lib/performanceKey.ts): the store's Cloudinary account saved meanwhile stays.
  await mergePerformance({ shop: next });
  doc = next;
  apply();
}

/** Read once when the server starts (and after a change), and put in force. */
export async function loadShopLink(): Promise<void> {
  try {
    doc = (await readDoc()).doc;
  } catch {
    // keep what we have
  }
  apply();
}

export type ShopView = {
  /** Whether «وصّل Vercel» is set up on this server (else a token is pasted). */
  connect: boolean;
  /** Why the last «وصّل Vercel» didn't make the shop. */
  error: string | null;
  /** The shop's address now: made here, else the server's own variable, else none. */
  url: string | null;
  source: "made" | "server" | "none";
  /** A making that didn't finish (its name), to go on with. */
  making: string | null;
  /** What a shop made here is built from and linked to. */
  repo: string | null;
  branch: string;
};

/** The repository this server was built from, as Railway says it (the shop is built from the same). */
export function ownRepo(): { repo: string; branch: string } | null {
  const owner = process.env.RAILWAY_GIT_REPO_OWNER?.trim();
  const name = process.env.RAILWAY_GIT_REPO_NAME?.trim();
  const branch = process.env.RAILWAY_GIT_BRANCH?.trim() || "main";
  const repo = owner && name ? `${owner}/${name}` : "";
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/.test(repo) && /^[A-Za-z0-9._/-]{1,100}$/.test(branch) ? { repo, branch } : null;
}

export function shopView(): ShopView {
  const own = ownRepo();
  return {
    connect: !!vercelConnectConfig(),
    error: doc.error,
    url: doc.saved?.url ?? OWN.url ?? null,
    source: doc.saved ? "made" : OWN.url ? "server" : "none",
    making: doc.making?.site ?? null,
    repo: own?.repo ?? null,
    branch: own?.branch ?? "main",
  };
}

const VERCEL_HOST = "api.vercel.com";
/** One call to Vercel with the owner's token, for this call alone: to that site, the token cut out of what comes back. */
function withToken(token: string) {
  const sealed = seal(token);
  const kind = INFRA_KINDS.vercel;
  return async (c: ReadyCall): Promise<Asked> => {
    try {
      const out = await callSite({ ...c, scope: {}, grant: { sites: [VERCEL_HOST], secrets: { CONNECTION_KEY: { sealed, sites: [VERCEL_HOST] } } } });
      const ok = out.ok && !kind.fails?.(out.body);
      return { ok, status: out.status, body: out.body, why: ok ? null : (kind.why(out.body) ?? null) };
    } catch (e) {
      if (e instanceof SiteError) return { ok: false, status: 0, body: null, why: e.message };
      throw e;
    }
  };
}

export class ShopRefused extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The shop made (or the making that stopped, gone on with): its name checked free, the project made
 * and told this server's and this admin's addresses, its first deploy begun, and it kept and put in
 * force. Throws ShopRefused with the service's own words when something says no; what was made
 * by then is kept for the next try.
 */
export async function makeShop(input: { token: string; team?: string; site: string; api: string; admin: string }): Promise<ShopView & { project: string | null }> {
  const problem = nameProblem(input.site);
  if (problem) throw new ShopRefused("NAME_INVALID", problem);
  const own = ownRepo();
  if (!own) throw new ShopRefused("NO_REPO", "The server doesn't know the repository it was built from");
  const current = (await readDoc()).doc;
  // The same name tried again goes on from where it stopped; another name begins afresh.
  const making: Making = current.making?.site === input.site ? current.making : { site: input.site, began: Date.now(), sealed: seal(madeSecret()), vercel: {} };
  if (!making.vercel.project) {
    const free = await vercelAddressFree(input.site);
    if (!free.ok) throw new ShopRefused("NAME_TAKEN", free.why ?? `${input.site}.vercel.app is someone else's`);
  }
  await writeDoc({ ...current, making, error: null });
  try {
    await makeShopSteps({ site: input.site, repo: own.repo, branch: own.branch, api: input.api, admin: input.admin, team: input.team, secret: open(making.sealed), began: making.began, vercel: making.vercel, ask: withToken(input.token) });
  } catch (e) {
    // What was made so far is kept, so the next try finds it.
    await writeDoc({ ...doc, making });
    if (e instanceof StepError) throw new ShopRefused("VERCEL_REFUSED", e.message);
    throw e;
  }
  const saved: Saved = { url: making.vercel.address ?? `https://${input.site}.vercel.app`, sealed: making.sealed, project: making.vercel.project ?? null, site: input.site, savedAt: new Date().toISOString() };
  await writeDoc({ ...doc, saved, making: null, connect: null, error: null });
  return { ...shopView(), project: saved.project };
}

/* ---------------- «وصّل Vercel»: the owner signs in at Vercel instead of pasting a token ---------------- */

/**
 * The Vercel Integration the platform's owner registered once (Vercel → Integrations Console): its
 * name in the install link, its id and secret for trading Vercel's code for a token, and the one
 * address Vercel sends owners back to (the platform's own server: it forwards a copy's owner on to
 * that copy's server). Read when used; none of it is ever answered back.
 */
export function vercelConnectConfig(): { slug: string; id: string; secret: string; redirect: string } | null {
  const slug = process.env.VERCEL_INTEGRATION?.trim() ?? "";
  const id = process.env.VERCEL_CLIENT_ID?.trim() ?? "";
  const secret = process.env.VERCEL_CLIENT_SECRET?.trim() ?? "";
  const redirect = process.env.VERCEL_REDIRECT_URI?.trim() ?? "";
  return /^[a-z0-9-]{1,40}$/.test(slug) && id && secret && /^https:\/\/[^\s]+$/.test(redirect) ? { slug, id, secret, redirect } : null;
}

/** What rides through Vercel and back: the server it belongs to, and a one-time code (only its hash is kept). */
export type ConnectState = { b: string; n: string };
const hashOf = (n: string) => createHash("sha256").update(n).digest("hex");
export function readConnectState(raw: unknown): ConnectState | null {
  if (typeof raw !== "string" || raw.length > 600) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<ConnectState>;
    return typeof v.b === "string" && /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(v.b) && typeof v.n === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v.n) ? { b: v.b.toLowerCase(), n: v.n } : null;
  } catch {
    return null;
  }
}
/** A «وصّل Vercel» to start: kept for half an hour, for this admin and this name. Its link at Vercel. */
export async function startVercelConnect(input: { site: string; admin: string; api: string }): Promise<string> {
  const cfg = vercelConnectConfig();
  if (!cfg) throw new ShopRefused("CONNECT_OFF", "Connecting Vercel isn't set up on this server");
  const problem = nameProblem(input.site);
  if (problem) throw new ShopRefused("NAME_INVALID", problem);
  const n = randomBytes(24).toString("base64url");
  await writeDoc({ ...(await readDoc()).doc, connect: { hash: hashOf(n), admin: input.admin, site: input.site, at: Date.now() }, error: null });
  const state = Buffer.from(JSON.stringify({ b: input.api, n } satisfies ConnectState)).toString("base64url");
  return `https://vercel.com/integrations/${encodeURIComponent(cfg.slug)}/new?state=${encodeURIComponent(state)}`;
}

export const CONNECT_MINUTES = 30;
/**
 * The owner back from Vercel: the code traded for a token (Vercel's own short-lived one), the shop made
 * with it, and where the owner goes next (the setup, saying how it went). The code is single-use and
 * the state's one-time code must be this server's own, begun in the last half hour.
 */
export async function finishVercelConnect(input: { code: string; teamId?: string; state: ConnectState; api: string }): Promise<{ to: string } | null> {
  const current = (await readDoc()).doc;
  const c = current.connect;
  const a = Buffer.from(hashOf(input.state.n));
  if (!c || a.length !== c.hash.length || !timingSafeEqual(a, Buffer.from(c.hash)) || Date.now() - c.at > CONNECT_MINUTES * 60_000) return null;
  // Used once, whatever comes of it.
  doc = current;
  const fail = async (why: string) => {
    await writeDoc({ ...doc, connect: null, error: why.slice(0, 500) });
    return { to: `${c.admin}/setup?shop=failed` };
  };
  const cfg = vercelConnectConfig();
  if (!cfg) return fail("Connecting Vercel isn't set up on this server");
  let token: string | null = null;
  let team: string | undefined = input.teamId;
  try {
    const body = new URLSearchParams({ client_id: cfg.id, client_secret: cfg.secret, code: input.code, redirect_uri: cfg.redirect }).toString();
    const got = await sendRaw({ method: "POST", url: "https://api.vercel.com/v2/oauth/access_token", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": "store-press/1" }, body });
    let answer: Record<string, unknown> = {};
    try {
      answer = JSON.parse(got.text) as Record<string, unknown>;
    } catch {
      answer = {};
    }
    if (got.status >= 200 && got.status < 300 && typeof answer.access_token === "string") {
      token = answer.access_token;
      team ??= typeof answer.team_id === "string" ? answer.team_id : undefined;
    } else {
      const why = (answer.error_description ?? (answer.error as { message?: unknown } | undefined)?.message ?? answer.error) as unknown;
      return fail(typeof why === "string" && why ? `Vercel didn't give a token: ${why}` : `Vercel didn't give a token (${got.status})`);
    }
  } catch (e) {
    return fail(e instanceof SiteError ? e.message : "Vercel couldn't be reached");
  }
  try {
    await makeShop({ token, team, site: c.site, api: input.api, admin: c.admin });
  } catch (e) {
    if (e instanceof ShopRefused) return fail(e.message);
    throw e;
  }
  return { to: `${c.admin}/setup?shop=made` };
}

/**
 * Whether the platform's server may send an owner on to another server's own «وصّل Vercel» (Vercel sends
 * everyone back to one address): an https server on Railway, or one the platform's owner named.
 */
export function forwardAllowed(origin: string): boolean {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.pathname && u.pathname !== "/") || u.search) return false;
  const host = u.hostname.toLowerCase();
  const named = (process.env.VERCEL_FORWARD_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  return host.endsWith(".up.railway.app") || named.some((h) => (h.startsWith("*.") ? host.endsWith(h.slice(1)) : host === h));
}

/** This server's own public address: Railway's name for it, else the address the call came to. */
export function ownAddressOf(req: { get(name: string): string | undefined }): string | null {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || req.get("host")?.trim() || "";
  return /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(domain) ? `https://${domain.toLowerCase()}` : null;
}

/** For tests: back to the server's own variables, nothing kept in memory. */
export function forgetShopLinkForTests() {
  doc = { saved: null, making: null, connect: null, error: null };
  apply();
}
