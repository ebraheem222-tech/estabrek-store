/**
 * Before a client's copy is made (lib/press.ts): each service asked, through the owner's own
 * connection to it, whether what the copy needs is there. Does Neon answer, does Railway reach the
 * repository, is Railway's address free, is the name free at Vercel and at Cloudflare Pages. Every
 * question only reads: nothing is made or changed anywhere.
 */
import { SiteError, sendRaw } from "./fnHttp.js";
import { askThrough, readyOfKind } from "./fnReady.js";
import { adminName, type CopyInput, type PressKind } from "./press.js";

export type CopyCheck = { id: string; kind: PressKind; ok: boolean; /** Why not, in the service's words or ours. */ why: string | null };
export type Via = Partial<Record<PressKind, string>>;

const part = (body: unknown, key: string): unknown => (body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>)[key] : undefined);
const RAILWAY = "https://backboard.railway.com/graphql/v2";
const KEY = "{{secret.CONNECTION_KEY}}";
const bearer = { authorization: `Bearer ${KEY}` };
// Queries of this file's own (a copy's names go in `variables`), written with a space between braces.
export const PRESS_QUERIES = {
  repo: "query repo($r: String!) { gitHubRepoAccessAvailable(fullRepoName: $r) { hasAccess isPublic } }",
  domain: "query domain($d: String!) { serviceDomainAvailable(domain: $d) { available message } }",
} as const;

const said = (got: { status: number; why: string | null }) => got.why ?? `It answered ${got.status}`;
/** Whether a name is free where a project's name is one of a kind: a 404 is the answer wanted. */
function freeName(kind: PressKind, id: string, got: { ok: boolean; status: number; why: string | null }, name: string): CopyCheck {
  if (got.status === 404) return { id, kind, ok: true, why: null };
  if (got.ok) return { id, kind, ok: false, why: `"${name}" is taken by a project of yours` };
  return { id, kind, ok: false, why: said(got) };
}

/**
 * Whether <site>.vercel.app is no one's at all (a name free in the owner's account may be another
 * account's address, and Vercel would give the shop another one): asked of the address itself, from
 * outside, as anyone may. An address no project holds answers 404 with DEPLOYMENT_NOT_FOUND.
 */
async function vercelAddressFree(site: string): Promise<CopyCheck> {
  const id = "vercel.address";
  try {
    const got = await sendRaw({ method: "GET", url: `https://${site}.vercel.app/`, headers: { accept: "text/plain,text/html", "user-agent": "store-press/1" }, ms: 6000 });
    if (got.status === 404 && /DEPLOYMENT_NOT_FOUND/.test(got.text)) return { id, kind: "vercel", ok: true, why: null };
    return { id, kind: "vercel", ok: false, why: `${site}.vercel.app is someone else's` };
  } catch (e) {
    return { id, kind: "vercel", ok: false, why: e instanceof SiteError ? e.message : `${site}.vercel.app couldn't be reached` };
  }
}

/** Each service's questions for this copy, all at once. A service with no connection picked is said so. */
export async function checkCopy(input: CopyInput, via: Via): Promise<CopyCheck[]> {
  const settingsOf = async (kind: PressKind) => (via[kind] ? ((await readyOfKind(kind)).find((c) => c.id === via[kind])?.settings ?? null) : null);
  const [neonS, railwayS, vercelS, cloudflareS] = await Promise.all([settingsOf("neon"), settingsOf("railway"), settingsOf("vercel"), settingsOf("cloudflare")]);
  const missing = (kind: PressKind): CopyCheck => ({ id: `${kind}.connection`, kind, ok: false, why: "No connection to it is picked" });
  const jobs: Array<Promise<CopyCheck> | CopyCheck> = [];

  if (!neonS) jobs.push(missing("neon"));
  else jobs.push(askThrough(via.neon!, "neon", { method: "GET", url: "https://console.neon.tech/api/v2/projects?limit=1", headers: bearer }).then((got) => ({ id: "neon.reach", kind: "neon", ok: got.ok, why: got.ok ? null : said(got) })));

  if (!railwayS) jobs.push(missing("railway"));
  // A project's token reaches its own project only: it can't make a new one.
  else if (railwayS.token === "project") jobs.push({ id: "railway.token", kind: "railway", ok: false, why: "A project's token can't make a new project: connect an account's or a workspace's token" });
  else {
    const ask = (query: string, variables: Record<string, string>) => askThrough(via.railway!, "railway", { method: "POST", url: RAILWAY, headers: bearer, body: { query, variables } });
    jobs.push(
      ask(PRESS_QUERIES.repo, { r: input.repo }).then((got): CopyCheck => {
        if (!got.ok) return { id: "railway.repo", kind: "railway", ok: false, why: said(got) };
        const access = part(part(got.body, "data"), "gitHubRepoAccessAvailable");
        return part(access, "hasAccess") === true ? { id: "railway.repo", kind: "railway", ok: true, why: null } : { id: "railway.repo", kind: "railway", ok: false, why: `Railway can't reach ${input.repo} on GitHub` };
      }),
      ask(PRESS_QUERIES.domain, { d: `${input.server}.up.railway.app` }).then((got): CopyCheck => {
        if (!got.ok) return { id: "railway.domain", kind: "railway", ok: false, why: said(got) };
        const answer = part(part(got.body, "data"), "serviceDomainAvailable");
        const message = part(answer, "message");
        return part(answer, "available") === true ? { id: "railway.domain", kind: "railway", ok: true, why: null } : { id: "railway.domain", kind: "railway", ok: false, why: (typeof message === "string" && message.trim()) || `${input.server}.up.railway.app is taken` };
      }),
    );
  }

  if (!vercelS) jobs.push(missing("vercel"));
  else {
    const team = vercelS.team ? `?${vercelS.team.startsWith("team_") ? "teamId" : "slug"}=${encodeURIComponent(vercelS.team)}` : "";
    jobs.push(askThrough(via.vercel!, "vercel", { method: "GET", url: `https://api.vercel.com/v9/projects/${encodeURIComponent(input.site)}${team}`, headers: bearer }).then((got) => freeName("vercel", "vercel.name", got, input.site)));
    jobs.push(vercelAddressFree(input.site));
  }

  if (!cloudflareS) jobs.push(missing("cloudflare"));
  // A Pages project lives in an account.
  else if (!cloudflareS.account) jobs.push({ id: "cloudflare.account", kind: "cloudflare", ok: false, why: "The Cloudflare connection has no Account ID" });
  else {
    const name = adminName(input.site);
    jobs.push(askThrough(via.cloudflare!, "cloudflare", { method: "GET", url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cloudflareS.account)}/pages/projects/${encodeURIComponent(name)}`, headers: bearer }).then((got) => freeName("cloudflare", "cloudflare.name", got, name)));
  }
  return Promise.all(jobs);
}
