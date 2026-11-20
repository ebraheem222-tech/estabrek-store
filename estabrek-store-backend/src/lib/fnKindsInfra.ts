/**
 * Where the store itself lives, as ready connections (lib/fnKinds.ts): Neon (the database),
 * Railway (the server), Vercel (the shop's pages) and Cloudflare (the admin's pages, the names).
 * Connected once with a token of the owner's, each one is READ: what projects there are, what each
 * runs, how its last deploy went. Nothing here changes anything there: every call is a GET or a
 * GraphQL query written here (a step gives only ids, which go as values, never into the query).
 *
 * What is read is picked field by field, never passed on as it came: these services answer a
 * project with its environment's values in it (Vercel's env, Cloudflare's env_vars), and those
 * never leave this file. Nor is anything asked that answers a password: no Neon connection string
 * or role password, no Railway variables, no token's own display.
 *
 * No network and no database here: a call is described as an "http" step's is, and made by
 * lib/fnReady.ts through lib/fnHttp.ts, with the connection's key named {{secret.CONNECTION_KEY}}.
 */
import type { Ask, KindDef, Look, LookItem, LookTone, ReadyAction, ReadyCall, ReadyKind } from "./fnKinds.js";

/** The connection's key inside its own calls: `{{secret.${READY_KEY}}}` of lib/fnKinds.ts (a test holds them the same). */
export const INFRA_KEY = "{{secret.CONNECTION_KEY}}";
const KEY = INFRA_KEY;
/** How much a look shows, and how many calls it may make for it. */
export const LOOK_LIMITS = { items: 25, sub: 8, facts: 6, detailed: 5, calls: 16, line: 120 } as const;

/* ---------------- Reading an answer safely ---------------- */

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, max) : null);
const part = (body: unknown, key: string): unknown => (body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>)[key] : undefined);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** A GraphQL connection's nodes: { edges: [{ node }] }. */
const nodes = (v: unknown): unknown[] => list(part(v, "edges")).map((e) => part(e, "node")).filter((n) => n && typeof n === "object");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null);
/** A time as ISO, from ISO words or milliseconds (Vercel). */
function when(v: unknown): string | undefined {
  const t = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : undefined;
}
/** An address to show as a link: https only, a site by its name ("x.vercel.app" is given https://). */
export function linkOf(v: unknown): string | undefined {
  const raw = text(v, 300);
  if (!raw) return undefined;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === "https:" && !u.username && !u.password && u.hostname.includes(".") ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
const short = (sha: unknown) => text(sha, 40)?.slice(0, 7) ?? null;
const facts = (pairs: Array<[string, string | null | undefined | false]>): Array<[string, string]> | undefined => {
  const out = pairs.filter((p): p is [string, string] => typeof p[1] === "string" && p[1] !== "").slice(0, LOOK_LIMITS.facts);
  return out.length ? out : undefined;
};
/** Something written in a step's address, made safe for it; a run's name in it ({{input.id}}) is left for the call to fill. */
const inPath = (s: string) =>
  s
    .split(/(\{\{[^{}]*\}\})/g)
    .map((piece, i) => (i % 2 ? piece : encodeURIComponent(piece)))
    .join("");
/** "?a=1&b=2" from the pairs that have a value. */
const query = (pairs: Array<[string, string | undefined]>) => {
  const kept = pairs.filter((p): p is [string, string] => !!p[1]?.trim());
  return kept.length ? `?${kept.map(([k, v]) => `${k}=${inPath(v.trim())}`).join("&")}` : "";
};
/** What a step gives, or else the connection's own setting. */
const giveOr = (give: Record<string, string>, settings: Record<string, string>, id: string, setting = id) => (give[id]?.trim() ? give[id].trim() : (settings[setting] ?? ""));
/**
 * A token as it is kept: one line of letters, digits and . _ - (with "Bearer " in front taken off,
 * as it is often copied). Null when it isn't one.
 */
function tokenOf(typed: string, min = 16): string | null {
  const t = typed.trim().replace(/^bearer\s+/i, "");
  return t.length >= min && t.length <= 300 && /^[A-Za-z0-9._-]+$/.test(t) ? t : null;
}
const ID = (max = 80) => (typed: string) => {
  const t = typed.trim();
  return t.length <= max && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(t) ? t : null;
};
/** Keep at most so many, and say how many more there were. */
function capped<T>(all: T[], max: number = LOOK_LIMITS.items): { items: T[]; more?: number } {
  return all.length > max ? { items: all.slice(0, max), more: all.length - max } : { items: all };
}
const tone = (map: Record<string, LookTone>) => (state: unknown): LookTone | undefined => (typeof state === "string" ? map[state.toUpperCase()] : undefined);

/* ---------------- Neon: the database ---------------- */

const NEON = "https://console.neon.tech/api/v2";
const neonHeaders = { authorization: `Bearer ${KEY}` };
const neonGet = (path: string): ReadyCall => ({ method: "GET", url: `${NEON}${path}`, headers: neonHeaders });
export const neonProject = (p: unknown) => ({ id: text(part(p, "id"), 80), name: text(part(p, "name"), 120), region: text(part(p, "region_id"), 60), postgres: num(part(p, "pg_version")), org: text(part(p, "org_id"), 80), created: when(part(p, "created_at")) ?? null, updated: when(part(p, "updated_at")) ?? null });
export const neonBranch = (b: unknown) => ({
  id: text(part(b, "id"), 80),
  name: text(part(b, "name"), 120),
  state: text(part(b, "current_state"), 40),
  default: part(b, "default") === true || part(b, "primary") === true,
  protected: part(b, "protected") === true,
  parent: text(part(b, "parent_id"), 80),
  created: when(part(b, "created_at")) ?? null,
  updated: when(part(b, "updated_at")) ?? null,
});
/** A compute, without its host: what it serves is the owner's to know from Neon, not a function's. */
export const neonCompute = (e: unknown) => ({
  id: text(part(e, "id"), 80),
  branch: text(part(e, "branch_id"), 80),
  type: text(part(e, "type"), 40),
  state: text(part(e, "current_state"), 40),
  min: num(part(e, "autoscaling_limit_min_cu")),
  max: num(part(e, "autoscaling_limit_max_cu")),
  suspend: num(part(e, "suspend_timeout_seconds")),
  lastActive: when(part(e, "last_active")) ?? null,
  region: text(part(e, "region_id"), 60),
  disabled: part(e, "disabled") === true,
});
const neonBranchTone = tone({ READY: "good", INIT: "busy", ARCHIVED: "idle" });
const neonComputeTone = tone({ ACTIVE: "good", IDLE: "idle", INIT: "busy" });
const NEON_PROJECT_ID = ID(60);
const NEON_ORG = (typed: string) => (/^org-[a-z0-9-]{3,80}$/.test(typed.trim()) ? typed.trim() : null);

async function neonLook(ask: Ask, s: Record<string, string>): Promise<Look> {
  let who: string | null = null;
  const projects: unknown[] = [];
  const got = await ask(neonGet(`/projects${query([["limit", "40"], ["org_id", s.org]])}`));
  if (got.ok) projects.push(...list(part(got.body, "projects")));
  if (!s.org) {
    // A personal key: its organisations by name, and (none of its own) the organisations' projects.
    const orgs = await ask(neonGet("/users/me/organizations"));
    const all = orgs.ok ? list(part(orgs.body, "organizations")) : [];
    who = all.map((o) => text(part(o, "name"), 60)).filter(Boolean).slice(0, 3).join(", ") || null;
    if (!projects.length)
      for (const o of all.slice(0, 3)) {
        const id = text(part(o, "id"), 80);
        const more = id ? await ask(neonGet(`/projects${query([["limit", "40"], ["org_id", id]])}`)) : null;
        if (more?.ok) projects.push(...list(part(more.body, "projects")));
      }
  }
  const read = projects.map(neonProject).filter((p) => p.id && p.name);
  // The usual project first.
  read.sort((a, b) => (a.id === s.project ? -1 : b.id === s.project ? 1 : 0));
  const items: LookItem[] = [];
  for (const [i, p] of read.slice(0, LOOK_LIMITS.items).entries()) {
    const item: LookItem = { name: p.name!, id: p.id!, when: p.updated ?? undefined, link: `https://console.neon.tech/app/projects/${encodeURIComponent(p.id!)}`, facts: facts([["region", p.region], ["postgres", p.postgres !== null ? String(p.postgres) : null]]) };
    if (i < LOOK_LIMITS.detailed) {
      const [branches, computes] = await Promise.all([ask(neonGet(`/projects/${encodeURIComponent(p.id!)}/branches`)), ask(neonGet(`/projects/${encodeURIComponent(p.id!)}/endpoints`))]);
      const cs = computes.ok ? list(part(computes.body, "endpoints")).map(neonCompute) : [];
      const bs = branches.ok ? list(part(branches.body, "branches")).map(neonBranch).filter((b) => b.id && b.name) : [];
      bs.sort((a, b) => Number(b.default) - Number(a.default));
      item.items = bs.slice(0, LOOK_LIMITS.sub).map((b) => {
        const c = cs.find((x) => x.branch === b.id);
        const size = c && c.min !== null && c.max !== null ? (c.min === c.max ? `${c.min} CU` : `${c.min}–${c.max} CU`) : null;
        return {
          name: b.name!,
          id: b.id!,
          // A branch is "ready" for as long as it is there: its compute says whether it is awake.
          state: c?.state ?? b.state ?? undefined,
          tone: c ? (c.disabled ? "bad" : neonComputeTone(c.state)) : neonBranchTone(b.state),
          when: c?.lastActive ?? b.updated ?? undefined,
          facts: facts([["default", b.default ? "yes" : null], ["protected", b.protected ? "yes" : null], ["compute", size]]),
        };
      });
    }
    items.push(item);
  }
  return { who, groups: [{ id: "projects", ...capped(items), ...(read.length > LOOK_LIMITS.items ? { more: read.length - LOOK_LIMITS.items } : {}) }] };
}

const neon: KindDef = {
  kind: "neon" as ReadyKind,
  label: "Neon",
  host: "console.neon.tech",
  key: (typed) => tokenOf(typed, 20),
  keyLooks: "A Neon API key is one line (napi_…), from Account settings → API keys",
  settings: [
    { id: "org", max: 90, tidy: NEON_ORG, what: "The organization", looks: "An organization's id looks like org-…" },
    { id: "project", max: 60, tidy: NEON_PROJECT_ID, what: "The usual project", looks: "A project's id is letters, digits and - (like cool-sky-12345678)" },
  ],
  actions: [
    {
      id: "projects",
      fields: [],
      call: (s) => neonGet(`/projects${query([["limit", "100"], ["org_id", s.org]])}`),
      answer: (body) => {
        const projects = list(part(body, "projects")).map(neonProject).filter((p) => p.id);
        return { projects, count: projects.length };
      },
    },
    {
      id: "branches",
      fields: [{ id: "project", what: "The project", required: true, or: "project" }],
      call: (s, give) => neonGet(`/projects/${inPath(giveOr(give, s, "project"))}/branches`),
      answer: (body) => {
        const branches = list(part(body, "branches")).map(neonBranch).filter((b) => b.id);
        return { branches, count: branches.length };
      },
    },
    {
      id: "computes",
      fields: [{ id: "project", what: "The project", required: true, or: "project" }],
      call: (s, give) => neonGet(`/projects/${inPath(giveOr(give, s, "project"))}/endpoints`),
      answer: (body) => {
        const computes = list(part(body, "endpoints")).map(neonCompute).filter((c) => c.id);
        return { computes, count: computes.length };
      },
    },
  ],
  test: {
    sends: false,
    call: (s) => neonGet(`/projects${query([["limit", "5"], ["org_id", s.org]])}`),
    said: (body) => list(part(body, "projects")).map((p) => text(part(p, "name"), 60)).filter(Boolean).slice(0, 3).join(", ") || null,
  },
  why: (body) => text(part(body, "message")),
  look: neonLook,
};

/* ---------------- Railway: the server ---------------- */

const RAILWAY = "https://backboard.railway.com/graphql/v2";
/** Who the token belongs to: an account, a workspace (team), or one project's environment. */
export const RAILWAY_TOKENS = ["account", "workspace", "project"] as const;
const railHeaders = (s: Record<string, string>): Record<string, string> => (s.token === "project" ? { "project-access-token": KEY } : { authorization: `Bearer ${KEY}` });
/** A GraphQL query of this file's own, with its values beside it (a step's ids go in `variables`, never in the words). */
const gql = (s: Record<string, string>, q: string, variables?: Record<string, unknown>): ReadyCall => ({ method: "POST", url: RAILWAY, headers: railHeaders(s), body: variables ? { query: q, variables } : { query: q } });
// Written with a space between braces: "{{" or "}}" in a call is a run's name to fill.
const R_DEPLOY = "latestDeployment { id status createdAt staticUrl }";
const R_INSTANCES = `serviceInstances(first: 20) { edges { node { serviceId serviceName region ${R_DEPLOY} } } }`;
const R_ENVS = `environments(first: 5) { edges { node { id name isEphemeral ${R_INSTANCES} } } }`;
const R_LIST = "edges { node { id name updatedAt } }";
export const RAILWAY_QUERIES = {
  me: "query { me { name email } }",
  workspaces: "query { apiToken { workspaces { id name } } }",
  token: "query { projectToken { projectId environmentId project { id name } environment { id name } } }",
  account: `query { me { name email workspaces { id name projects(first: 50) { ${R_LIST} } } } projects(first: 50) { ${R_LIST} } }`,
  workspace: `query workspace($w: String!) { workspace(workspaceId: $w) { id name projects(first: 50) { ${R_LIST} } } }`,
  project: `query project($id: String!) { project(id: $id) { id name updatedAt ${R_ENVS} } }`,
  tokenProject: `query { projectToken { projectId environmentId project { id name updatedAt } environment { id name isEphemeral ${R_INSTANCES} } } }`,
  deployments: "query deployments($input: DeploymentListInput!, $first: Int) { deployments(input: $input, first: $first) { edges { node { id status createdAt staticUrl serviceId environmentId } } } }",
} as const;
export const railwayTone = tone({ SUCCESS: "good", FAILED: "bad", CRASHED: "bad", BUILDING: "busy", DEPLOYING: "busy", INITIALIZING: "busy", QUEUED: "busy", WAITING: "busy", NEEDS_APPROVAL: "busy", REMOVING: "busy", SLEEPING: "idle", REMOVED: "idle", SKIPPED: "idle" });
const data = (body: unknown) => part(body, "data");
const railwayDeploy = (d: unknown) => (d && typeof d === "object" ? { id: text(part(d, "id"), 80), status: text(part(d, "status"), 30), created: when(part(d, "createdAt")) ?? null, url: linkOf(part(d, "staticUrl")) ?? null } : null);
/** A project's services in each of its environments, with how each one's last deploy went. */
export function railwayServices(env: unknown) {
  const envName = text(part(env, "name"), 80);
  return nodes(part(env, "serviceInstances")).map((i) => ({ id: text(part(i, "serviceId"), 80), name: text(part(i, "serviceName"), 120), environment: envName, region: text(part(i, "region"), 60), deploy: railwayDeploy(part(i, "latestDeployment")) }));
}
const railwayProjectRow = (p: unknown, workspace?: string | null) => ({ id: text(part(p, "id"), 80), name: text(part(p, "name"), 120), updated: when(part(p, "updatedAt")) ?? null, ...(workspace ? { workspace } : {}) });
/** The projects an answer holds, whichever query it answers (an account's, a workspace's, a project token's), once each. */
export function railwayProjects(body: unknown) {
  const d = data(body);
  const out = new Map<string, ReturnType<typeof railwayProjectRow>>();
  const add = (p: ReturnType<typeof railwayProjectRow>) => {
    if (p.id && !out.has(p.id)) out.set(p.id, p);
  };
  for (const w of list(part(part(d, "me"), "workspaces"))) for (const p of nodes(part(w, "projects"))) add(railwayProjectRow(p, text(part(w, "name"), 80)));
  const ws = part(d, "workspace");
  for (const p of nodes(part(ws, "projects"))) add(railwayProjectRow(p, text(part(ws, "name"), 80)));
  for (const p of nodes(part(d, "projects"))) add(railwayProjectRow(p));
  const tp = part(part(d, "projectToken"), "project");
  if (tp) add(railwayProjectRow(tp));
  return [...out.values()];
}
const serviceItem = (svc: ReturnType<typeof railwayServices>[number], manyEnvs: boolean): LookItem => ({
  name: svc.name ?? svc.id ?? "?",
  id: svc.id ?? undefined,
  state: svc.deploy?.status ?? undefined,
  tone: railwayTone(svc.deploy?.status),
  when: svc.deploy?.created ?? undefined,
  link: svc.deploy?.url ?? undefined,
  facts: facts([["environment", manyEnvs ? svc.environment : null], ["region", svc.region]]),
});

async function railwayLook(ask: Ask, s: Record<string, string>): Promise<Look> {
  const projectLink = (id: string) => `https://railway.com/project/${encodeURIComponent(id)}`;
  if (s.token === "project") {
    const got = await ask(gql(s, RAILWAY_QUERIES.tokenProject));
    const t = part(data(got.body), "projectToken");
    const p = part(t, "project");
    const env = part(t, "environment");
    if (!got.ok || !p) return { who: null, groups: [] };
    const id = text(part(p, "id"), 80) ?? "";
    const services = railwayServices(env).map((svc) => serviceItem(svc, false));
    return { who: [text(part(p, "name"), 80), text(part(env, "name"), 80)].filter(Boolean).join(" · ") || null, groups: [{ id: "projects", items: [{ name: text(part(p, "name"), 120) ?? id, id, when: when(part(p, "updatedAt")), link: projectLink(id), facts: facts([["environment", text(part(env, "name"), 80)]]), items: services.slice(0, LOOK_LIMITS.sub) }] }] };
  }
  let who: string | null = null;
  let projects: ReturnType<typeof railwayProjects> = [];
  if (s.token === "workspace") {
    const ws = s.workspace ? [{ id: s.workspace, name: null as string | null }] : [];
    if (!ws.length) {
      const got = await ask(gql(s, RAILWAY_QUERIES.workspaces));
      for (const w of list(part(part(data(got.body), "apiToken"), "workspaces")).slice(0, 3)) {
        const id = text(part(w, "id"), 80);
        if (id) ws.push({ id, name: text(part(w, "name"), 80) });
      }
    }
    for (const w of ws.slice(0, 3)) {
      const got = await ask(gql(s, RAILWAY_QUERIES.workspace, { w: w.id }));
      if (got.ok) projects.push(...railwayProjects(got.body));
      w.name ??= text(part(part(data(got.body), "workspace"), "name"), 80);
    }
    who = ws.map((w) => w.name).filter(Boolean).join(", ") || null;
  } else {
    const got = await ask(gql(s, RAILWAY_QUERIES.account));
    const me = part(data(got.body), "me");
    who = text(part(me, "name"), 80) ?? text(part(me, "email"), 120);
    if (got.ok) projects = railwayProjects(got.body);
  }
  projects.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  const items: LookItem[] = [];
  for (const [i, p] of projects.slice(0, LOOK_LIMITS.items).entries()) {
    const item: LookItem = { name: p.name ?? p.id!, id: p.id!, when: p.updated ?? undefined, link: projectLink(p.id!), facts: facts([["workspace", "workspace" in p ? p.workspace : null]]) };
    if (i < LOOK_LIMITS.detailed) {
      const got = await ask(gql(s, RAILWAY_QUERIES.project, { id: p.id }));
      // Its own environments first, then the short-lived ones (a pull request's).
      const envs = nodes(part(part(data(got.body), "project"), "environments")).sort((a, b) => Number(part(a, "isEphemeral") === true) - Number(part(b, "isEphemeral") === true));
      const many = envs.length > 1;
      item.items = envs.flatMap((env) => railwayServices(env).map((svc) => serviceItem(svc, many))).slice(0, LOOK_LIMITS.sub);
    }
    items.push(item);
  }
  return { who, groups: [{ id: "projects", items, ...(projects.length > LOOK_LIMITS.items ? { more: projects.length - LOOK_LIMITS.items } : {}) }] };
}

/** A deployments query's values: only the ids a step gave (an empty one would ask for none). */
const railwayDeploymentsBody = (body: unknown) => {
  const b = body as { variables?: { input?: Record<string, unknown> } };
  const input = Object.fromEntries(Object.entries(b.variables?.input ?? {}).filter(([, v]) => v !== "" && v !== null && v !== undefined).map(([k, v]) => [k, typeof v === "string" ? v : String(v)]));
  return { ...b, variables: { ...b.variables, input } };
};

const railway: KindDef = {
  kind: "railway" as ReadyKind,
  label: "Railway",
  host: "backboard.railway.com",
  key: (typed) => tokenOf(typed, 16),
  keyLooks: "A Railway token is one line, from Account Settings → Tokens (or a project's Settings → Tokens)",
  settings: [
    { id: "token", max: 12, choices: RAILWAY_TOKENS, what: "Whose token it is", looks: "The token is an account's, a workspace's or a project's" },
    { id: "workspace", max: 80, tidy: ID(80), shownWhen: ["token", "workspace"], what: "The workspace", looks: "A workspace's id is letters, digits and -" },
  ],
  actions: [
    {
      id: "projects",
      fields: [{ id: "workspace", what: "The workspace", or: "workspace" }],
      call: (s, give) => {
        const w = giveOr(give, s, "workspace");
        if (w) return gql(s, RAILWAY_QUERIES.workspace, { w });
        return gql(s, s.token === "project" ? RAILWAY_QUERIES.token : RAILWAY_QUERIES.account);
      },
      answer: (body) => {
        const projects = railwayProjects(body);
        return { projects, count: projects.length };
      },
    },
    {
      id: "status",
      fields: [{ id: "project", what: "The project", required: true }],
      call: (s, give) => gql(s, RAILWAY_QUERIES.project, { id: (give.project ?? "").trim() }),
      answer: (body) => {
        const p = part(data(body), "project");
        const services = nodes(part(p, "environments")).flatMap(railwayServices);
        return { project: { id: text(part(p, "id"), 80), name: text(part(p, "name"), 120) }, services, count: services.length, failing: services.filter((x) => railwayTone(x.deploy?.status) === "bad").length };
      },
    },
    {
      id: "deployments",
      fields: [
        { id: "project", what: "The project" },
        { id: "service", what: "The service" },
        { id: "environment", what: "The environment" },
      ],
      call: (s, give) => ({
        ...gql(s, RAILWAY_QUERIES.deployments, { input: { projectId: (give.project ?? "").trim(), serviceId: (give.service ?? "").trim(), environmentId: (give.environment ?? "").trim() }, first: 10 }),
        finish: railwayDeploymentsBody,
      }),
      answer: (body) => {
        const deployments = nodes(part(data(body), "deployments")).map((d) => ({ ...railwayDeploy(d)!, service: text(part(d, "serviceId"), 80), environment: text(part(d, "environmentId"), 80) }));
        return { deployments, count: deployments.length };
      },
    },
  ],
  test: {
    sends: false,
    call: (s) => gql(s, s.token === "project" ? RAILWAY_QUERIES.token : s.token === "workspace" ? RAILWAY_QUERIES.workspaces : RAILWAY_QUERIES.me),
    said: (body) => {
      const d = data(body);
      const me = part(d, "me");
      if (me) return text(part(me, "name"), 80) ?? text(part(me, "email"), 120);
      const t = part(d, "projectToken");
      if (t) return [text(part(part(t, "project"), "name"), 80), text(part(part(t, "environment"), "name"), 80)].filter(Boolean).join(" · ") || null;
      return list(part(part(d, "apiToken"), "workspaces")).map((w) => text(part(w, "name"), 60)).filter(Boolean).slice(0, 3).join(", ") || null;
    },
  },
  // GraphQL says no inside a "yes": { errors: [{ message }] }, with no data, or data that is null.
  why: (body) => text(part(list(part(body, "errors"))[0], "message")) ?? text(part(body, "message")),
  fails: (body) => list(part(body, "errors")).length > 0 && !Object.values((data(body) as Record<string, unknown> | null) ?? {}).some((v) => v !== null && v !== undefined),
  look: railwayLook,
};

/* ---------------- Vercel: the shop's pages ---------------- */

const VERCEL = "https://api.vercel.com";
const vercelHeaders = { authorization: `Bearer ${KEY}` };
/** A team by its id (team_…) or its name in addresses (its slug). */
const vercelTeam = (s: Record<string, string>): Array<[string, string | undefined]> => (s.team ? [[s.team.startsWith("team_") ? "teamId" : "slug", s.team]] : []);
const vercelGet = (path: string, s: Record<string, string>, pairs: Array<[string, string | undefined]> = []): ReadyCall => ({ method: "GET", url: `${VERCEL}${path}${query([...pairs, ...vercelTeam(s)])}`, headers: vercelHeaders });
export const vercelTone = tone({ READY: "good", ERROR: "bad", BLOCKED: "bad", BUILDING: "busy", INITIALIZING: "busy", QUEUED: "busy", CANCELED: "idle", DELETED: "idle" });
/** A deploy: where it is, how it went, and the commit it came from. */
export function vercelDeploy(d: unknown) {
  const meta = part(d, "meta");
  const from = (k: string) => part(meta, `github${k}`) ?? part(meta, `gitlab${k}`) ?? part(meta, `bitbucket${k}`);
  return {
    id: text(part(d, "uid"), 80) ?? text(part(d, "id"), 80),
    project: text(part(d, "name"), 120),
    projectId: text(part(d, "projectId"), 80),
    url: linkOf(part(d, "url")) ?? null,
    state: text(part(d, "state"), 30) ?? text(part(d, "readyState"), 30),
    target: text(part(d, "target"), 30) ?? "preview",
    created: when(part(d, "created") ?? part(d, "createdAt")) ?? null,
    branch: text(from("CommitRef"), 120),
    commit: short(from("CommitSha")),
    message: text(from("CommitMessage"), LOOK_LIMITS.line),
    error: text(part(d, "errorMessage"), 200),
  };
}
/** A project as a list shows it: its name, what it is made with, and how its newest deploy went. Never its env. */
export const vercelProject = (p: unknown) => {
  const latest = list(part(p, "latestDeployments"))[0];
  return { id: text(part(p, "id"), 80), name: text(part(p, "name"), 120), framework: text(part(p, "framework"), 40), updated: when(part(p, "updatedAt")) ?? null, latest: latest ? vercelDeploy(latest) : null };
};
const deployItem = (d: ReturnType<typeof vercelDeploy>): LookItem => ({
  name: d.message ?? d.url?.replace(/^https:\/\//, "").replace(/\/$/, "") ?? d.id ?? "?",
  id: d.id ?? undefined,
  state: d.state ?? undefined,
  tone: vercelTone(d.state),
  when: d.created ?? undefined,
  link: d.url ?? undefined,
  facts: facts([["target", d.target], ["branch", d.branch], ["commit", d.commit]]),
});

async function vercelLook(ask: Ask, s: Record<string, string>): Promise<Look> {
  const [user, deploys] = await Promise.all([ask(vercelGet("/v2/user", {})), ask(vercelGet("/v7/deployments", s, [["limit", "60"]]))]);
  const name = text(part(part(user.body, "user"), "username"), 60);
  const who = [name ? `@${name}` : null, s.team ?? null].filter(Boolean).join(" · ") || null;
  const byProject = new Map<string, ReturnType<typeof vercelDeploy>[]>();
  for (const d of (deploys.ok ? list(part(deploys.body, "deployments")) : []).map(vercelDeploy)) {
    const key = d.projectId ?? d.project ?? "?";
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(d);
  }
  const items: LookItem[] = [...byProject.entries()].map(([id, ds]) => {
    // The project as its live site stands: its newest production deploy that went well, else its newest of all.
    const live = ds.find((d) => d.target === "production" && d.state === "READY") ?? ds.find((d) => d.target === "production") ?? ds[0];
    return { name: ds[0].project ?? id, id, state: live.state ?? undefined, tone: vercelTone(live.state), when: ds[0].created ?? undefined, link: live.url ?? undefined, facts: facts([["branch", live.branch]]), items: ds.slice(0, 4).map(deployItem) };
  });
  return { who, groups: [{ id: "projects", ...capped(items) }] };
}

const vercel: KindDef = {
  kind: "vercel" as ReadyKind,
  label: "Vercel",
  host: "api.vercel.com",
  key: (typed) => tokenOf(typed, 16),
  keyLooks: "A Vercel token is one line, from Account Settings → Tokens",
  settings: [{ id: "team", max: 80, tidy: ID(80), what: "The team", looks: "A team is its id (team_…) or the name in its address" }],
  actions: [
    {
      id: "projects",
      fields: [],
      // A project comes with a lot (its env among it): ten fit well under what an answer may be.
      call: (s) => vercelGet("/v10/projects", s, [["limit", "10"]]),
      answer: (body) => {
        const projects = list(part(body, "projects")).map(vercelProject).filter((p) => p.id);
        return { projects, count: projects.length };
      },
    },
    {
      id: "deployments",
      fields: [
        { id: "project", what: "The project" },
        { id: "target", what: "Where to" },
      ],
      call: (s, give) => vercelGet("/v7/deployments", s, [["limit", "20"], ["projectId", give.project], ["target", give.target]]),
      answer: (body) => {
        const deployments = list(part(body, "deployments")).map(vercelDeploy).filter((d) => d.id);
        return { deployments, count: deployments.length, failing: deployments.filter((d) => vercelTone(d.state) === "bad").length };
      },
    },
  ],
  test: {
    sends: false,
    call: () => vercelGet("/v2/user", {}),
    said: (body) => {
      const name = text(part(part(body, "user"), "username"), 60);
      return name ? `@${name}` : null;
    },
  },
  why: (body) => text(part(part(body, "error"), "message")) ?? text(part(body, "message")),
  look: vercelLook,
};

/* ---------------- Cloudflare: Pages, Workers and the names ---------------- */

const CF = "https://api.cloudflare.com/client/v4";
const cfHeaders = { authorization: `Bearer ${KEY}` };
const cfGet = (path: string): ReadyCall => ({ method: "GET", url: `${CF}${path}`, headers: cfHeaders });
const CF_ACCOUNT = (typed: string) => (/^[a-f0-9]{32}$/i.test(typed.trim()) ? typed.trim().toLowerCase() : null);
export const pagesTone = tone({ SUCCESS: "good", FAILURE: "bad", ACTIVE: "busy", IDLE: "busy", CANCELED: "idle", SKIPPED: "idle" });
export const zoneTone = tone({ ACTIVE: "good", PENDING: "busy", INITIALIZING: "busy", MOVED: "bad", DEACTIVATED: "bad", DELETED: "bad", READ_ONLY: "idle" });
/** A Pages deploy: its stage and how it went, and the commit. Never its env_vars. */
export function pagesDeploy(d: unknown) {
  const stage = part(d, "latest_stage");
  const meta = part(part(d, "deployment_trigger"), "metadata");
  return {
    id: text(part(d, "id"), 80),
    url: linkOf(part(d, "url")) ?? null,
    environment: text(part(d, "environment"), 30),
    stage: text(part(stage, "name"), 30),
    status: text(part(stage, "status"), 30),
    created: when(part(d, "created_on")) ?? null,
    branch: text(part(meta, "branch"), 120),
    commit: short(part(meta, "commit_hash")),
    message: text(part(meta, "commit_message"), LOOK_LIMITS.line),
  };
}
/** A Pages project: its name, its addresses, and its newest deploy. Never its deployment_configs. */
export const pagesProject = (p: unknown) => {
  const latest = part(p, "latest_deployment");
  return {
    name: text(part(p, "name"), 120),
    subdomain: text(part(p, "subdomain"), 200),
    domains: list(part(p, "domains")).map((d) => text(d, 200)).filter((d): d is string => !!d).slice(0, 10),
    branch: text(part(p, "production_branch"), 120) ?? text(part(part(part(p, "source"), "config"), "production_branch"), 120),
    created: when(part(p, "created_on")) ?? null,
    latest: latest && typeof latest === "object" ? pagesDeploy(latest) : null,
  };
};
export const cfZone = (z: unknown) => ({ id: text(part(z, "id"), 80), name: text(part(z, "name"), 200), status: text(part(z, "status"), 30), paused: part(z, "paused") === true, plan: text(part(part(z, "plan"), "name"), 60) });
export const cfWorker = (w: unknown) => ({ name: text(part(w, "id"), 120), created: when(part(w, "created_on")) ?? null, modified: when(part(w, "modified_on")) ?? null });
const accountOr = (give: Record<string, string>, s: Record<string, string>) => giveOr(give, s, "account");

async function cloudflareLook(ask: Ask, s: Record<string, string>): Promise<Look> {
  const got = await ask(cfGet("/accounts?per_page=5"));
  let accounts = (got.ok ? list(part(got.body, "result")) : []).map((a) => ({ id: text(part(a, "id"), 40), name: text(part(a, "name"), 80) })).filter((a) => a.id);
  if (s.account) accounts = [accounts.find((a) => a.id === s.account) ?? { id: s.account, name: null }];
  const pages: LookItem[] = [];
  const workers: LookItem[] = [];
  for (const a of accounts.slice(0, 2)) {
    const [p, w] = await Promise.all([ask(cfGet(`/accounts/${encodeURIComponent(a.id!)}/pages/projects?per_page=25`)), ask(cfGet(`/accounts/${encodeURIComponent(a.id!)}/workers/scripts`))]);
    for (const pr of (p.ok ? list(part(p.body, "result")) : []).map(pagesProject)) {
      if (!pr.name) continue;
      const d = pr.latest;
      pages.push({
        name: pr.name,
        state: d?.status ?? undefined,
        tone: pagesTone(d?.status),
        when: d?.created ?? undefined,
        link: linkOf(pr.subdomain) ?? d?.url ?? undefined,
        facts: facts([["environment", d?.environment], ["branch", d?.branch ?? pr.branch], ["commit", d?.commit], ["domains", pr.domains.filter((x) => x !== pr.subdomain).join(", ")]]),
        ...(d?.message ? { items: [{ name: d.message, id: d.id ?? undefined, state: d.status ?? undefined, tone: pagesTone(d.status), when: d.created ?? undefined, link: d.url ?? undefined }] } : {}),
      });
    }
    for (const sc of (w.ok ? list(part(w.body, "result")) : []).map(cfWorker)) if (sc.name) workers.push({ name: sc.name, when: sc.modified ?? sc.created ?? undefined });
  }
  const z = await ask(cfGet("/zones?per_page=50"));
  const zones: LookItem[] = (z.ok ? list(part(z.body, "result")) : []).map(cfZone).filter((x) => x.name).map((x) => ({ name: x.name!, id: x.id ?? undefined, state: x.paused ? "paused" : (x.status ?? undefined), tone: x.paused ? "idle" : zoneTone(x.status), link: linkOf(x.name), facts: facts([["plan", x.plan]]) }));
  const groups = [
    { id: "pages", ...capped(pages) },
    { id: "workers", ...capped(workers) },
    { id: "zones", ...capped(zones) },
  ].filter((g) => g.items.length);
  return { who: accounts.map((a) => a.name).filter(Boolean).join(", ") || null, groups };
}

const cloudflare: KindDef = {
  kind: "cloudflare" as ReadyKind,
  label: "Cloudflare",
  host: "api.cloudflare.com",
  key: (typed) => tokenOf(typed, 30),
  keyLooks: "A Cloudflare API token is one line, from My Profile → API Tokens",
  settings: [{ id: "account", max: 40, tidy: CF_ACCOUNT, what: "The account", looks: "An account's id is 32 letters and digits (from the account's home page)" }],
  actions: [
    {
      id: "pages",
      fields: [{ id: "account", what: "The account", required: true, or: "account" }],
      call: (s, give) => cfGet(`/accounts/${inPath(accountOr(give, s))}/pages/projects?per_page=25`),
      answer: (body) => {
        const projects = list(part(body, "result")).map(pagesProject).filter((p) => p.name);
        return { projects, count: projects.length, failing: projects.filter((p) => pagesTone(p.latest?.status) === "bad").length };
      },
    },
    {
      id: "deployments",
      fields: [
        { id: "account", what: "The account", required: true, or: "account" },
        { id: "project", what: "The project", required: true },
      ],
      call: (s, give) => cfGet(`/accounts/${inPath(accountOr(give, s))}/pages/projects/${inPath((give.project ?? "").trim())}/deployments?per_page=10`),
      answer: (body) => {
        const deployments = list(part(body, "result")).map(pagesDeploy).filter((d) => d.id);
        return { deployments, count: deployments.length };
      },
    },
    {
      id: "workers",
      fields: [{ id: "account", what: "The account", required: true, or: "account" }],
      call: (s, give) => cfGet(`/accounts/${inPath(accountOr(give, s))}/workers/scripts`),
      answer: (body) => {
        const workers = list(part(body, "result")).map(cfWorker).filter((w) => w.name);
        return { workers, count: workers.length };
      },
    },
    {
      id: "zones",
      fields: [],
      call: () => cfGet("/zones?per_page=50"),
      answer: (body) => {
        const zones = list(part(body, "result")).map(cfZone).filter((z) => z.name);
        return { zones, count: zones.length };
      },
    },
  ],
  test: {
    sends: false,
    call: () => cfGet("/accounts?per_page=5"),
    said: (body) => list(part(body, "result")).map((a) => text(part(a, "name"), 60)).filter(Boolean).slice(0, 3).join(", ") || null,
  },
  why: (body) => text(part(list(part(body, "errors"))[0], "message")) ?? text(part(body, "message")),
  fails: (body) => part(body, "success") === false,
  look: cloudflareLook,
};

export const INFRA_KINDS: Record<"neon" | "railway" | "vercel" | "cloudflare", KindDef> = { neon, railway, vercel, cloudflare };
/** Every call these kinds can make, for a test to read (each is a GET, or a query of this file's own). */
export const INFRA_ACTIONS: Array<[string, ReadyAction]> = Object.values(INFRA_KINDS).flatMap((k) => k.actions.map((a): [string, ReadyAction] => [k.kind, a]));
