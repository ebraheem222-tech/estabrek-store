/**
 * A client's copy made (platform plan, stage 6.1): after lib/press.ts planned it and
 * lib/pressCheck.ts asked each service whether it can be, the press makes it in the owner's own
 * accounts, through their ready connections (each call to that kind's one site with its key, as a
 * function's step goes: lib/fnReady.ts askThrough).
 *
 * In order: the database (Neon), the server (Railway: a project, an empty service set to build
 * the backend folder and migrate before each deploy, its address), the shop (Vercel) and the
 * admin (Cloudflare Pages), each told the others' real addresses, then the server's variables
 * (the database's address read from Neon then and there, never kept) and its first deploy.
 * Every part runs the same repository and branch as this store, so every merge reaches it.
 *
 * Each step finds what an earlier try of it made before making anything (by the id it kept, or a
 * project of that name made since the copy began), so a step that said no is tried again from
 * where it stopped, and nothing is made twice. What was made is kept as ids and addresses; the
 * copy's own secrets (made here, never shown) and its setup code are kept sealed.
 *
 * One server makes a copy at a time (the press runs in this process); a copy whose making this
 * process doesn't hold, yet says "making", stopped with the server and is tried again by hand.
 */
import { prisma } from "./prisma.js";
import { open, seal } from "./secretBox.js";
import { SiteError, sendRaw } from "./fnHttp.js";
import { askThrough, readyOfKind } from "./fnReady.js";
import { newSetupCode } from "./firstRun.js";
import { COPY_FOLDERS, PRE_DEPLOY, adminName, copyUrls, copyVariables, madeSecret, type CopyInput, type CopyUrls, type CopyVar, type PressKind } from "./press.js";
import type { ReadyCall, Asked } from "./fnKinds.js";
import type { Via } from "./pressCheck.js";

/** The steps, in the order they are made, each with the service it is made at. */
export const MAKE_STEPS = [
  ["neon.project", "neon"],
  ["railway.project", "railway"],
  ["railway.service", "railway"],
  ["railway.domain", "railway"],
  ["vercel.project", "vercel"],
  ["cloudflare.project", "cloudflare"],
  ["vercel.deploy", "vercel"],
  ["cloudflare.deploy", "cloudflare"],
  ["railway.variables", "railway"],
  ["railway.deploy", "railway"],
] as const satisfies ReadonlyArray<readonly [string, PressKind]>;
export type StepId = (typeof MAKE_STEPS)[number][0];
export type StepState = "waiting" | "doing" | "done" | "failed";
export type MakeStep = { id: StepId; kind: PressKind; state: StepState; /** Why it said no, in the service's words. */ why: string | null; at: string | null };
export type CopyState = "making" | "stopped" | "made";

/** The database every copy is made with (Neon's own names for a new project's first ones). */
export const NEON_DB = { database: "neondb", role: "neondb_owner" } as const;
/** The server's one service at Railway. */
export const RAILWAY_SERVICE = "api";

/** What each service made: ids and addresses, never a secret. */
export type Made = {
  neon?: { project?: string };
  railway?: { project?: string; environment?: string; service?: string; set?: boolean; address?: string; variables?: boolean; connected?: boolean; deploying?: boolean };
  vercel?: { project?: string; address?: string; variables?: boolean; deployment?: string };
  cloudflare?: { project?: string; address?: string; deployment?: string };
};
/** The copy's own secrets (lib/press.ts says where each one goes) and the code its owner opens its setup with. */
export type CopySecrets = { JWT_SECRET: string; WEBHOOK_TOKEN: string; CODES_ENCRYPTION_KEY: string; BACKUP_ENCRYPTION_KEY: string; REVALIDATE_SECRET: string; SETUP_CODE: string };
export const newCopySecrets = (): CopySecrets => ({ JWT_SECRET: madeSecret(), WEBHOOK_TOKEN: madeSecret(), CODES_ENCRYPTION_KEY: madeSecret(), BACKUP_ENCRYPTION_KEY: madeSecret(), REVALIDATE_SECRET: madeSecret(), SETUP_CODE: newSetupCode() });

/** A step's "no": the service's own words, said to the owner as they are. */
export class StepError extends Error {}

/* ---------------- Reading answers ---------------- */

const part = (body: unknown, key: string): unknown => (body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>)[key] : undefined);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const nodes = (v: unknown): unknown[] => list(part(v, "edges")).map((e) => part(e, "node")).filter((n) => n && typeof n === "object");
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);
const data = (body: unknown) => part(body, "data");
/** Whether a project was made since the copy began (a minute's leeway for the services' clocks): one an earlier try made. */
function since(v: unknown, began: number): boolean {
  const at = typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(at) && at >= began - 60_000;
}
const qs = (pairs: Array<[string, string | undefined]>) => {
  const kept = pairs.filter((p): p is [string, string] => !!p[1]);
  return kept.length ? `?${kept.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}` : "";
};

/* ---------------- The calls (each service's own; a copy's names and values go in what is sent, never in the words of a query) ---------------- */

const KEY = "{{secret.CONNECTION_KEY}}";
const bearer = { authorization: `Bearer ${KEY}` };
const NEON = "https://console.neon.tech/api/v2";
const RAILWAY = "https://backboard.railway.com/graphql/v2";
const VERCEL = "https://api.vercel.com";
const CLOUDFLARE = "https://api.cloudflare.com/client/v4";
const call = (method: ReadyCall["method"], url: string, body?: unknown): ReadyCall => ({ method, url, headers: bearer, ...(body === undefined ? {} : { body }) });
const rail = (query: string, variables: Record<string, unknown>): ReadyCall => call("POST", RAILWAY, { query, variables });
/** A Vercel team, by id or by its slug, as each call names it. */
export const vercelTeam = (team: string | undefined): [string, string | undefined] => (team ? [team.startsWith("team_") ? "teamId" : "slug", team] : ["teamId", undefined]);

// Written with a space between braces: "{{" or "}}" in a call is a name to fill.
export const MAKE_QUERIES = {
  workspaces: "query { apiToken { workspaces { id name } } }",
  myWorkspaces: "query { me { workspaces { id name } } }",
  projects: "query { projects(first: 50) { edges { node { id name createdAt } } } }",
  workspaceProjects: "query mine($w: String!) { workspace(workspaceId: $w) { projects(first: 50) { edges { node { id name createdAt } } } } }",
  projectCreate: "mutation make($i: ProjectCreateInput!) { projectCreate(input: $i) { id } }",
  project: "query project($id: String!) { project(id: $id) { id environments(first: 5) { edges { node { id name } } } services(first: 20) { edges { node { id name } } } } }",
  serviceCreate: "mutation make($i: ServiceCreateInput!) { serviceCreate(input: $i) { id } }",
  instance: "mutation set($s: String!, $e: String!, $i: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $s, environmentId: $e, input: $i) }",
  domains: "query domains($e: String!, $p: String!, $s: String!) { domains(environmentId: $e, projectId: $p, serviceId: $s) { serviceDomains { id domain } } }",
  domainCreate: "mutation make($i: ServiceDomainCreateInput!) { serviceDomainCreate(input: $i) { id domain } }",
  domainUpdate: "mutation name($i: ServiceDomainUpdateInput!) { serviceDomainUpdate(input: $i) }",
  variables: "mutation vars($i: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $i) }",
  connect: "mutation connect($id: String!, $i: ServiceConnectInput!) { serviceConnect(id: $id, input: $i) { id } }",
  deployments: "query deployments($input: DeploymentListInput!, $first: Int) { deployments(input: $input, first: $first) { edges { node { id status } } } }",
  deploy: "mutation deploy($s: String!, $e: String!) { serviceInstanceDeploy(serviceId: $s, environmentId: $e, latestCommit: true) }",
} as const;

/* ---------------- One copy being made ---------------- */

type Ctx = {
  input: CopyInput;
  began: number;
  made: Made;
  secrets: CopySecrets;
  settings: Partial<Record<PressKind, Record<string, string>>>;
  /** A call that must say yes (a "no" stops the step with the service's words). */
  ask: (kind: PressKind, c: ReadyCall) => Promise<Asked>;
  /** A call whose "no" is an answer (a name looked up). */
  peek: (kind: PressKind, c: ReadyCall) => Promise<Asked>;
};

/** The copy's addresses: what each service gave, else what its name gives. */
export function addressesOf(input: Pick<CopyInput, "server" | "site">, made: Made): CopyUrls {
  const planned = copyUrls(input.server, input.site);
  return { api: made.railway?.address ?? planned.api, shop: made.vercel?.address ?? planned.shop, admin: made.cloudflare?.address ?? planned.admin };
}
/** A variable's value for this copy: written, an address, one of its secrets, or (the database) what Neon said. */
function valueOf(v: CopyVar, secrets: CopySecrets, database?: string): string {
  if (v.value !== undefined) return v.value;
  if (v.from === "shared") return secrets.REVALIDATE_SECRET;
  if (v.from === "neon") {
    if (!database) throw new StepError("Neon gave no address for the database");
    return database;
  }
  const own = (secrets as Record<string, string>)[v.name];
  if (!own) throw new StepError(`No value for ${v.name}`);
  return own;
}
const splitRepo = (repo: string) => {
  const [owner, name] = repo.split("/");
  return { owner, name };
};

const STEPS: Record<StepId, (c: Ctx) => Promise<void>> = {
  async "neon.project"(c) {
    const m = (c.made.neon ??= {});
    if (m.project) return;
    const org = c.settings.neon?.org;
    // An earlier try's project, whose answer was lost: of this name, made since the copy began.
    const seen = await c.peek("neon", call("GET", `${NEON}/projects${qs([["search", c.input.label], ["limit", "50"], ["org_id", org]])}`));
    const mine = list(part(seen.body, "projects")).find((p) => part(p, "name") === c.input.label && since(part(p, "created_at"), c.began));
    let id = text(part(mine, "id"));
    if (!id) {
      const got = await c.ask("neon", call("POST", `${NEON}/projects`, { project: { name: c.input.label, region_id: c.input.region, pg_version: 17, ...(org ? { org_id: org } : {}), branch: { database_name: NEON_DB.database, role_name: NEON_DB.role } } }));
      id = text(part(part(got.body, "project"), "id"));
    }
    if (!id) throw new StepError("Neon answered without a project");
    m.project = id;
  },

  async "railway.project"(c) {
    const m = (c.made.railway ??= {});
    if (!m.project) {
      const s = c.settings.railway ?? {};
      let workspace = s.workspace || undefined;
      if (!workspace) {
        const got = await c.peek("railway", rail(s.token === "workspace" ? MAKE_QUERIES.workspaces : MAKE_QUERIES.myWorkspaces, {}));
        const ws = list(part(part(data(got.body), s.token === "workspace" ? "apiToken" : "me"), "workspaces"));
        workspace = text(part(ws[0], "id")) ?? undefined;
      }
      const seen = await c.peek("railway", workspace ? rail(MAKE_QUERIES.workspaceProjects, { w: workspace }) : rail(MAKE_QUERIES.projects, {}));
      const all = workspace ? nodes(part(part(data(seen.body), "workspace"), "projects")) : nodes(part(data(seen.body), "projects"));
      let id = text(part(all.find((p) => part(p, "name") === c.input.label && since(part(p, "createdAt"), c.began)), "id"));
      if (!id) {
        const got = await c.ask("railway", rail(MAKE_QUERIES.projectCreate, { i: { name: c.input.label, defaultEnvironmentName: "production", ...(workspace ? { workspaceId: workspace } : {}) } }));
        id = text(part(part(data(got.body), "projectCreate"), "id"));
      }
      if (!id) throw new StepError("Railway answered without a project");
      m.project = id;
    }
    if (!m.environment) {
      const got = await c.ask("railway", rail(MAKE_QUERIES.project, { id: m.project }));
      const envs = nodes(part(part(data(got.body), "project"), "environments"));
      const env = envs.find((e) => part(e, "name") === "production") ?? envs[0];
      m.environment = text(part(env, "id")) ?? undefined;
      if (!m.environment) throw new StepError("Railway's project has no environment");
    }
  },

  async "railway.service"(c) {
    const m = c.made.railway!;
    if (!m.service) {
      const got = await c.ask("railway", rail(MAKE_QUERIES.project, { id: m.project }));
      const had = nodes(part(part(data(got.body), "project"), "services")).find((s) => part(s, "name") === RAILWAY_SERVICE);
      // Empty at first (no repository yet): nothing is built before its folder, its migration and its variables are set.
      m.service = text(part(had, "id")) ?? text(part(part(data((await c.ask("railway", rail(MAKE_QUERIES.serviceCreate, { i: { projectId: m.project, environmentId: m.environment, name: RAILWAY_SERVICE } }))).body), "serviceCreate"), "id")) ?? undefined;
      if (!m.service) throw new StepError("Railway answered without a service");
    }
    if (!m.set) {
      await c.ask("railway", rail(MAKE_QUERIES.instance, { s: m.service, e: m.environment, i: { rootDirectory: COPY_FOLDERS.api, preDeployCommand: [PRE_DEPLOY] } }));
      m.set = true;
    }
  },

  async "railway.domain"(c) {
    const m = c.made.railway!;
    if (m.address) return;
    const want = `${c.input.server}.up.railway.app`;
    const ids = { e: m.environment, p: m.project, s: m.service };
    const read = async () => list(part(part(data((await c.ask("railway", rail(MAKE_QUERIES.domains, ids))).body), "domains"), "serviceDomains")).map((d) => ({ id: text(part(d, "id")), domain: text(part(d, "domain")) }));
    let had = await read();
    if (!had.some((d) => d.domain === want)) {
      // The one Railway already gave it renamed, else a new one.
      let id = had.find((d) => d.id)?.id ?? null;
      if (!id) {
        const got = await c.ask("railway", rail(MAKE_QUERIES.domainCreate, { i: { environmentId: m.environment, serviceId: m.service } }));
        id = text(part(part(data(got.body), "serviceDomainCreate"), "id"));
        if (!id) throw new StepError("Railway answered without an address");
      }
      await c.ask("railway", rail(MAKE_QUERIES.domainUpdate, { i: { domain: want, environmentId: m.environment, serviceDomainId: id, serviceId: m.service } }));
      had = await read();
    }
    // The address Railway holds now (the one asked for, unless it gave another).
    const got = had.find((d) => d.domain === want)?.domain ?? had.find((d) => d.domain)?.domain;
    if (!got) throw new StepError("Railway answered without an address");
    m.address = `https://${got}`;
  },

  async "vercel.project"(c) {
    const m = (c.made.vercel ??= {});
    const team = qs([vercelTeam(c.settings.vercel?.team)]);
    if (!m.project) {
      const seen = await c.peek("vercel", call("GET", `${VERCEL}/v9/projects/${encodeURIComponent(c.input.site)}${team}`));
      let id: string | null = null;
      if (seen.ok) {
        if (!since(part(seen.body, "createdAt"), c.began)) throw new StepError(`"${c.input.site}" is taken by a project of yours`);
        id = text(part(seen.body, "id"));
      } else if (seen.status !== 404) throw new StepError(seen.why ?? `It answered ${seen.status}`);
      else {
        const got = await c.ask("vercel", call("POST", `${VERCEL}/v11/projects${team}`, { name: c.input.site, framework: "nextjs", rootDirectory: COPY_FOLDERS.shop, gitRepository: { type: "github", repo: c.input.repo } }));
        id = text(part(got.body, "id"));
      }
      if (!id) throw new StepError("Vercel answered without a project");
      m.project = id;
    }
    if (!m.address) {
      // The address Vercel gave the project (its name's, unless that one is someone else's).
      const got = await c.peek("vercel", call("GET", `${VERCEL}/v9/projects/${encodeURIComponent(m.project)}/domains${team}`));
      const own = list(part(got.body, "domains")).map((d) => text(part(d, "name"))).find((n) => !!n && n.endsWith(".vercel.app"));
      m.address = `https://${own ?? `${c.input.site}.vercel.app`}`;
    }
  },

  async "cloudflare.project"(c) {
    const m = (c.made.cloudflare ??= {});
    if (m.project) return;
    const account = c.settings.cloudflare?.account;
    if (!account) throw new StepError("The Cloudflare connection has no Account ID");
    const name = adminName(c.input.site);
    const at = `${CLOUDFLARE}/accounts/${encodeURIComponent(account)}/pages/projects`;
    const seen = await c.peek("cloudflare", call("GET", `${at}/${encodeURIComponent(name)}`));
    let project: unknown;
    if (seen.ok) {
      project = part(seen.body, "result");
      if (!since(part(project, "created_on"), c.began)) throw new StepError(`"${name}" is taken by a project of yours`);
    } else if (seen.status !== 404) throw new StepError(seen.why ?? `It answered ${seen.status}`);
    else {
      const { owner, name: repo } = splitRepo(c.input.repo);
      const env = Object.fromEntries(copyVariables(addressesOf(c.input, c.made)).admin.map((v) => [v.name, { type: "plain_text", value: valueOf(v, c.secrets) }]));
      const got = await c.ask(
        "cloudflare",
        call("POST", at, {
          name,
          production_branch: c.input.branch,
          build_config: { build_command: "npm run build", destination_dir: "dist", root_dir: COPY_FOLDERS.admin },
          source: { type: "github", config: { owner, repo_name: repo, production_branch: c.input.branch, deployments_enabled: true, production_deployments_enabled: true, pr_comments_enabled: false, preview_deployment_setting: "none" } },
          deployment_configs: { production: { env_vars: env }, preview: { env_vars: env } },
        }),
      );
      project = part(got.body, "result");
    }
    const sub = text(part(project, "subdomain"));
    m.project = name;
    m.address = `https://${sub ?? `${name}.pages.dev`}`;
  },

  async "vercel.deploy"(c) {
    const m = c.made.vercel!;
    const team = qs([vercelTeam(c.settings.vercel?.team)]);
    if (!m.variables) {
      const vars = copyVariables(addressesOf(c.input, c.made)).shop.map((v) => ({ key: v.name, value: valueOf(v, c.secrets), type: v.value === undefined ? "sensitive" : "encrypted", target: ["production", "preview"] }));
      const join = team ? `${team}&upsert=true` : "?upsert=true";
      await c.ask("vercel", call("POST", `${VERCEL}/v10/projects/${encodeURIComponent(m.project!)}/env${join}`, vars));
      m.variables = true;
    }
    if (!m.deployment) {
      const { owner, name } = splitRepo(c.input.repo);
      const got = await c.ask("vercel", call("POST", `${VERCEL}/v13/deployments${team}`, { name: c.input.site, project: m.project, target: "production", gitSource: { type: "github", org: owner, repo: name, ref: c.input.branch } }));
      m.deployment = text(part(got.body, "id")) ?? "started";
    }
  },

  async "cloudflare.deploy"(c) {
    const m = c.made.cloudflare!;
    if (m.deployment) return;
    const account = c.settings.cloudflare?.account ?? "";
    // A project built from GitHub: its production branch built now (and with every merge after).
    const got = await c.ask("cloudflare", call("POST", `${CLOUDFLARE}/accounts/${encodeURIComponent(account)}/pages/projects/${encodeURIComponent(m.project!)}/deployments`));
    m.deployment = text(part(part(got.body, "result"), "id")) ?? "started";
  },

  async "railway.variables"(c) {
    const m = c.made.railway!;
    if (m.variables) return;
    // The database's address (its password in it) asked of Neon now, given to the server and kept nowhere.
    const got = await c.ask("neon", call("GET", `${NEON}/projects/${encodeURIComponent(c.made.neon!.project!)}/connection_uri${qs([["database_name", NEON_DB.database], ["role_name", NEON_DB.role], ["pooled", "true"]])}`));
    const database = text(part(got.body, "uri")) ?? undefined;
    const variables: Record<string, string> = Object.fromEntries(copyVariables(addressesOf(c.input, c.made)).api.map((v) => [v.name, valueOf(v, c.secrets, database)]));
    // Its owner's way in: the setup opens with this code alone, then closes for good.
    variables.SETUP_CODE = c.secrets.SETUP_CODE;
    await c.ask("railway", rail(MAKE_QUERIES.variables, { i: { projectId: m.project, environmentId: m.environment, serviceId: m.service, variables, skipDeploys: true } }));
    m.variables = true;
  },

  async "railway.deploy"(c) {
    const m = c.made.railway!;
    if (!m.connected) {
      // The repository linked last, with everything set: this is what starts its first build.
      await c.ask("railway", rail(MAKE_QUERIES.connect, { id: m.service, i: { repo: c.input.repo, branch: c.input.branch } }));
      m.connected = true;
    }
    if (!m.deploying) {
      const got = await c.peek("railway", rail(MAKE_QUERIES.deployments, { input: { serviceId: m.service, environmentId: m.environment }, first: 1 }));
      if (!nodes(part(data(got.body), "deployments")).length) await c.ask("railway", rail(MAKE_QUERIES.deploy, { s: m.service, e: m.environment }));
      m.deploying = true;
    }
  },
};

/* ---------------- Kept, run, tried again ---------------- */

/** The copies this process is making now. */
const making = new Set<string>();
export const isMaking = (id: string) => making.has(id);

const asJson = (v: unknown) => JSON.parse(JSON.stringify(v));
const freshSteps = (): MakeStep[] => MAKE_STEPS.map(([id, kind]) => ({ id, kind, state: "waiting", why: null, at: null }));
type Row = NonNullable<Awaited<ReturnType<typeof prisma.clientCopy.findUnique>>>;

/** A new copy kept, and its making begun (not waited for). */
export async function startCopy(input: CopyInput, via: Via, by: string | null) {
  const row = await prisma.clientCopy.create({
    data: { label: input.label, server: input.server, site: input.site, repo: input.repo, branch: input.branch, region: input.region, via: asJson(via), steps: asJson(freshSteps()), made: {}, sealed: seal(JSON.stringify(newCopySecrets())), byEmail: by },
  });
  making.add(row.id);
  void makeCopy(row.id);
  return row;
}

/** A copy that stopped, made again from the step that said no. False when it is made, or being made. */
export async function tryCopyAgain(id: string): Promise<boolean> {
  if (making.has(id)) return false;
  const row = await prisma.clientCopy.findUnique({ where: { id } });
  if (!row || row.state === "made") return false;
  // Taken only as it was read: a second press of the button finds it taken.
  const took = await prisma.clientCopy.updateMany({ where: { id, updatedAt: row.updatedAt }, data: { state: "making" } });
  if (!took.count || making.has(id)) return false;
  making.add(id);
  void makeCopy(id);
  return true;
}

/** Every step not yet done, in order, each kept as it goes; the first "no" stops the copy there. */
export async function makeCopy(id: string): Promise<void> {
  making.add(id);
  try {
    const row = await prisma.clientCopy.findUnique({ where: { id } });
    if (!row) return;
    const steps = stepsOf(row);
    const made = (row.made ?? {}) as Made;
    const via = (row.via ?? {}) as Via;
    let secrets: CopySecrets;
    try {
      secrets = JSON.parse(open(row.sealed)) as CopySecrets;
    } catch {
      await prisma.clientCopy.update({ where: { id }, data: { state: "stopped", steps: asJson(steps.map((s) => (s.state === "done" ? s : { ...s, state: "waiting" }))) } });
      return;
    }
    const settings: Ctx["settings"] = {};
    for (const [, kind] of MAKE_STEPS) if (via[kind] && !settings[kind]) settings[kind] = (await readyOfKind(kind)).find((c) => c.id === via[kind])?.settings ?? {};
    const through = async (kind: PressKind, c: ReadyCall): Promise<Asked> => {
      const connection = via[kind];
      if (!connection) throw new StepError("No connection to it is picked");
      try {
        return await askThrough(connection, kind, c);
      } catch (e) {
        if (e instanceof SiteError) throw new StepError(e.message);
        throw e;
      }
    };
    const ctx: Ctx = {
      input: { label: row.label, server: row.server, site: row.site, repo: row.repo, branch: row.branch, region: row.region },
      began: row.createdAt.getTime(),
      made,
      secrets,
      settings,
      peek: through,
      ask: async (kind, c) => {
        const got = await through(kind, c);
        if (!got.ok) throw new StepError(got.why ?? `It answered ${got.status}`);
        return got;
      },
    };
    const keep = (state: CopyState) => prisma.clientCopy.update({ where: { id }, data: { state, steps: asJson(steps), made: asJson(made) } });
    for (const step of steps) {
      if (step.state === "done") continue;
      step.state = "doing";
      step.why = null;
      step.at = new Date().toISOString();
      await keep("making");
      try {
        await STEPS[step.id](ctx);
        step.state = "done";
        step.at = new Date().toISOString();
      } catch (e) {
        step.state = "failed";
        step.why = e instanceof StepError ? e.message.slice(0, 500) : "Something went wrong here";
        step.at = new Date().toISOString();
        if (!(e instanceof StepError)) console.error("[press] a step broke:", step.id, e);
        await keep("stopped");
        return;
      }
    }
    await keep("made");
  } catch (e) {
    console.error("[press] making a copy broke:", e);
    await prisma.clientCopy.update({ where: { id }, data: { state: "stopped" } }).catch(() => undefined);
  } finally {
    making.delete(id);
  }
}

/** The steps as kept, with any the list of steps gained since (a copy begun before them waits for them). */
function stepsOf(row: Pick<Row, "steps">): MakeStep[] {
  const kept = new Map(list(row.steps).map((s) => [part(s, "id"), s as MakeStep]));
  return MAKE_STEPS.map(([id, kind]) => {
    const s = kept.get(id);
    return s ? { id, kind, state: s.state, why: s.why ?? null, at: s.at ?? null } : { id, kind, state: "waiting", why: null, at: null };
  });
}

/** Where each made part is seen at its service. */
function linksOf(made: Made, settings: { vercelTeam?: string; account?: string }) {
  const out: Partial<Record<PressKind, string>> = {};
  if (made.neon?.project) out.neon = `https://console.neon.tech/app/projects/${encodeURIComponent(made.neon.project)}`;
  if (made.railway?.project) out.railway = `https://railway.com/project/${encodeURIComponent(made.railway.project)}`;
  if (made.vercel?.project && settings.vercelTeam && !settings.vercelTeam.startsWith("team_")) out.vercel = `https://vercel.com/${encodeURIComponent(settings.vercelTeam)}/${encodeURIComponent(made.vercel.project)}`;
  if (made.cloudflare?.project && settings.account) out.cloudflare = `https://dash.cloudflare.com/${encodeURIComponent(settings.account)}/pages/view/${encodeURIComponent(made.cloudflare.project)}`;
  return out;
}

export type CopyView = {
  id: string;
  label: string;
  server: string;
  site: string;
  repo: string;
  branch: string;
  region: string;
  /** "stopped" also when it says making and no one is: the server stopped while making it. */
  state: CopyState;
  steps: MakeStep[];
  addresses: CopyUrls;
  links: Partial<Record<PressKind, string>>;
  by: string | null;
  began: string;
  updated: string;
  /** The link its owner opens their setup with: once it is made, and only on its own page. */
  welcome: string | null;
};

/** A copy as the page shows it. `withCode`: its own page (the owner's alone), where the setup link is given. */
export async function copyView(row: Row, withCode = false): Promise<CopyView> {
  const now = making.has(row.id);
  const state: CopyState = row.state === "making" && !now ? "stopped" : (row.state as CopyState);
  const steps = stepsOf(row).map((s) => (s.state === "doing" && !now ? { ...s, state: "failed" as const, why: s.why ?? "The server stopped while doing it" } : s));
  const made = (row.made ?? {}) as Made;
  const via = (row.via ?? {}) as Via;
  const [vercelS, cloudflareS] = await Promise.all([via.vercel ? readyOfKind("vercel").then((l) => l.find((c) => c.id === via.vercel)?.settings) : undefined, via.cloudflare ? readyOfKind("cloudflare").then((l) => l.find((c) => c.id === via.cloudflare)?.settings) : undefined]);
  const addresses = addressesOf(row, made);
  let welcome: string | null = null;
  if (withCode && state === "made") {
    try {
      welcome = `${addresses.admin}/welcome?code=${encodeURIComponent((JSON.parse(open(row.sealed)) as CopySecrets).SETUP_CODE)}`;
    } catch {
      welcome = null;
    }
  }
  return {
    id: row.id,
    label: row.label,
    server: row.server,
    site: row.site,
    repo: row.repo,
    branch: row.branch,
    region: row.region,
    state,
    steps,
    addresses,
    links: linksOf(made, { vercelTeam: vercelS?.team, account: cloudflareS?.account }),
    by: row.byEmail,
    began: row.createdAt.toISOString(),
    updated: row.updatedAt.toISOString(),
    welcome,
  };
}

export type Alive = { api: { ok: boolean; status: number }; shop: { ok: boolean; status: number }; admin: { ok: boolean; status: number }; /** Whether its owner has yet to make their account (null: the server didn't say). */ waiting: boolean | null };

/** Whether a made copy answers yet (its first builds take minutes): its server, shop and admin, each asked once from outside. */
export async function aliveOf(addresses: CopyUrls): Promise<Alive> {
  const hit = async (url: string) => {
    try {
      const got = await sendRaw({ method: "GET", url, headers: { accept: "text/html,application/json", "user-agent": "store-press/1" }, ms: 6000 });
      return { ok: got.status >= 200 && got.status < 400, status: got.status, text: got.text };
    } catch {
      return { ok: false, status: 0, text: "" };
    }
  };
  const [api, shop, admin, first] = await Promise.all([hit(`${addresses.api}/health`), hit(`${addresses.shop}/`), hit(`${addresses.admin}/`), hit(`${addresses.api}/v1/auth/first-run`)]);
  let waiting: boolean | null = null;
  try {
    const needed = part(JSON.parse(first.text), "needed");
    waiting = first.ok && typeof needed === "boolean" ? needed : null;
  } catch {
    waiting = null;
  }
  return { api: { ok: api.ok, status: api.status }, shop: { ok: shop.ok, status: shop.status }, admin: { ok: admin.ok, status: admin.status }, waiting };
}
