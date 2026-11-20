/**
 * The store's own shop when it is made from its admin (إعداد المتجر → متجرك, the setup's first step):
 * a copy of the store set up by hand may have a server and an admin and no shop of its own, and its
 * owner shouldn't have to open Vercel, Railway and Cloudflare to give it one.
 *
 * Made through the owner's Vercel token, used for these calls alone and never kept (it isn't saved
 * as a ready connection: a token for the whole Vercel account shouldn't stay in a client's store).
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
import { corsOrigins, env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { open, seal } from "./secretBox.js";
import { SiteError, callSite } from "./fnHttp.js";
import { INFRA_KINDS } from "./fnKindsInfra.js";
import { madeSecret, nameProblem } from "./press.js";
import { vercelAddressFree } from "./pressCheck.js";
import { StepError, makeShopSteps, type Made } from "./pressMake.js";
import type { ReadyCall, Asked } from "./fnKinds.js";

type Vercel = NonNullable<Made["vercel"]>;
type Saved = { url: string; sealed: string; project: string | null; site: string; savedAt: string };
/** A making that didn't finish: what it made so far, so the next try goes on from there (same name, same secret). */
type Making = { site: string; began: number; sealed: string; vercel: Vercel };
type Doc = { saved: Saved | null; making: Making | null };

/** The server's own variables, as they were when it started (what a shop made here stands in for). */
const OWN = { url: env.STOREFRONT_URL, revalidate: env.STOREFRONT_REVALIDATE_URL, secret: env.STOREFRONT_REVALIDATE_SECRET };
let doc: Doc = { saved: null, making: null };
let added: string | null = null;

const docOf = (raw: unknown): Doc => {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = r.saved as Partial<Saved> | undefined;
  const m = r.making as Partial<Making> | undefined;
  return {
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
  const { data } = await readDoc();
  data.shop = next;
  await prisma.performanceSettings.upsert({ where: { id: "default" }, create: { id: "default", data: data as object }, update: { data: data as object } });
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
  await writeDoc({ ...current, making });
  try {
    await makeShopSteps({ site: input.site, repo: own.repo, branch: own.branch, api: input.api, admin: input.admin, team: input.team, secret: open(making.sealed), began: making.began, vercel: making.vercel, ask: withToken(input.token) });
  } catch (e) {
    // What was made so far is kept, so the next try finds it.
    await writeDoc({ ...current, making });
    if (e instanceof StepError) throw new ShopRefused("VERCEL_REFUSED", e.message);
    throw e;
  }
  const saved: Saved = { url: making.vercel.address ?? `https://${input.site}.vercel.app`, sealed: making.sealed, project: making.vercel.project ?? null, site: input.site, savedAt: new Date().toISOString() };
  await writeDoc({ saved, making: null });
  return { ...shopView(), project: saved.project };
}

/** For tests: back to the server's own variables, nothing kept in memory. */
export function forgetShopLinkForTests() {
  doc = { saved: null, making: null };
  apply();
}
