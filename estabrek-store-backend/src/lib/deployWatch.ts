/**
 * Deploy watch (admin → حالة السيرفر): is the code running here the last one on
 * the branch? A merge is only live for the API once the host's deployment
 * succeeds; when one fails, the old server keeps answering and nothing says so
 * (2026-11: 22 merges in a row never went live). So the server says which commit
 * it runs (the host gives it: RAILWAY_GIT_COMMIT_SHA), a job asks GitHub every
 * minute for the branch's last commit, and a commit that isn't live after
 * DEPLOY_LATE_MINUTES (10), or whose deployment GitHub marks as failed, rings
 * the admin's bell and reaches the owner's rules as "deploy.failed".
 *
 * A public repository needs no key: the branch's commit comes from git's own
 * refs listing. GITHUB_TOKEN (optional) is for a private one. The commit's words
 * and the deployment's mark come from GitHub's API when it answers; the watch
 * works without them. What it knows lives in memory: a new deployment is a new
 * process, which starts by looking again.
 */
import { prisma } from "./prisma.js";
import { DEFAULT_TEXT, emitAutomation, render } from "./automations.js";

const MIN = 60_000;
/** Where the bell and the rules' messages lead. */
export const DEPLOY_LINK = "/admin/system/server";

export type DeployState = "current" | "deploying" | "late" | "failed" | "unknown";
/** Why the state is unknown. */
export type DeployReason = "noCommit" | "noRepo" | "cantReach" | "notChecked";

type Env = Record<string, string | undefined>;

const SHA = /^[0-9a-f]{40}$/;
const short = (sha: string | null | undefined) => (sha ? sha.slice(0, 7) : "");
const firstLine = (s: string | null | undefined) => (s ?? "").split("\n")[0].trim().slice(0, 200);

/** What the host says about the code running here. */
export function liveVersion(env: Env = process.env) {
  const raw = (env.RAILWAY_GIT_COMMIT_SHA ?? env.GIT_COMMIT_SHA ?? "").trim().toLowerCase();
  const owner = env.RAILWAY_GIT_REPO_OWNER?.trim();
  const name = env.RAILWAY_GIT_REPO_NAME?.trim();
  const repo = (env.DEPLOY_REPO?.trim() || (owner && name ? `${owner}/${name}` : "")).replace(/\.git$/, "");
  const branch = (env.DEPLOY_BRANCH ?? env.RAILWAY_GIT_BRANCH ?? "").trim() || "main";
  const project = env.RAILWAY_PROJECT_NAME?.trim();
  const environment = env.RAILWAY_ENVIRONMENT_NAME?.trim();
  return {
    commit: SHA.test(raw) ? raw : null,
    message: firstLine(env.RAILWAY_GIT_COMMIT_MESSAGE) || null,
    repo: /^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(repo) ? repo : null,
    branch: /^[\w./-]{1,100}$/.test(branch) ? branch : "main",
    /** The name the host's deployments carry on GitHub ("project / environment"). */
    environment: project && environment ? `${project} / ${environment}` : null,
    deploymentId: env.RAILWAY_DEPLOYMENT_ID?.trim() || null,
  };
}

/** Why the watch can't run on this server (the env name), or null. */
export function deployWatchOff(env: Env = process.env): string | null {
  const live = liveVersion(env);
  return live.commit && live.repo ? null : "RAILWAY_GIT_COMMIT_SHA";
}

/** A commit not live after this long is late. */
export function lateMs(env: Env = process.env) {
  const n = Number(env.DEPLOY_LATE_MINUTES);
  return (Number.isFinite(n) && n > 0 ? Math.min(120, Math.max(3, n)) : 10) * MIN;
}

/* ---------------- Asking GitHub ---------------- */

type Answer = { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> };
export type DeployFetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<Answer>;
let ask: DeployFetch = (url, init) => fetch(url, init);

const get = (url: string, headers: Record<string, string>) => ask(url, { headers, signal: AbortSignal.timeout(8000) });

function apiHeaders(accept = "application/vnd.github+json") {
  const token = process.env.GITHUB_TOKEN?.trim();
  return { Accept: accept, "User-Agent": "deploy-watch", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** The branch's commit in git's refs listing ("<sha> refs/heads/<branch>"), or null. */
export function branchInRefs(text: string, branch: string): string | null {
  const name = branch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`([0-9a-f]{40}) refs/heads/${name}(?=[\\n\\0]|$)`).exec(text)?.[1] ?? null;
}

/** The last commit on the branch. Throws when GitHub can't be asked. */
export async function latestCommit(repo: string, branch: string): Promise<string> {
  let why = "";
  // No key: git's own listing (no hourly limit). With a key the repository may be private: the API.
  if (!process.env.GITHUB_TOKEN?.trim()) {
    try {
      const res = await get(`https://github.com/${repo}.git/info/refs?service=git-upload-pack`, { "User-Agent": "deploy-watch" });
      const sha = res.ok ? branchInRefs(await res.text(), branch) : null;
      if (sha) return sha;
      why = res.ok ? `no branch ${branch}` : `git ${res.status}`;
    } catch (e) {
      why = e instanceof Error ? e.message : String(e);
    }
  }
  const res = await get(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`, apiHeaders("application/vnd.github.sha"));
  const sha = res.ok ? (await res.text()).trim() : "";
  if (SHA.test(sha)) return sha;
  throw new Error(`GitHub: ${res.ok ? "no commit" : res.status}${why ? ` (${why})` : ""}`);
}

/** The commit's first line and when it reached the branch; null when the API doesn't answer. */
async function commitWords(repo: string, sha: string): Promise<{ message: string | null; at: string | null } | null> {
  const res = await get(`https://api.github.com/repos/${repo}/commits/${sha}`, apiHeaders());
  if (!res.ok) return null;
  const c = ((await res.json()) as { commit?: { message?: unknown; committer?: { date?: unknown } } } | null)?.commit;
  const at = typeof c?.committer?.date === "string" && Number.isFinite(Date.parse(c.committer.date)) ? c.committer.date : null;
  return { message: typeof c?.message === "string" ? firstLine(c.message) || null : null, at };
}

/** The host's mark on GitHub for this commit's deployment ("success", "failure", "in_progress"…), or null. */
async function deploymentMark(repo: string, sha: string, environment: string): Promise<string | null> {
  const list = await get(`https://api.github.com/repos/${repo}/deployments?sha=${sha}&environment=${encodeURIComponent(environment)}&per_page=1`, apiHeaders());
  if (!list.ok) return null;
  const id = ((await list.json()) as Array<{ id?: unknown }> | null)?.[0]?.id;
  if (typeof id !== "number") return null;
  const marks = await get(`https://api.github.com/repos/${repo}/deployments/${id}/statuses?per_page=1`, apiHeaders());
  if (!marks.ok) return null;
  const state = ((await marks.json()) as Array<{ state?: unknown }> | null)?.[0]?.state;
  return typeof state === "string" ? state : null;
}

/* ---------------- What the watch knows ---------------- */

type Latest = { sha: string; seenAt: number; /** Since when it has been on the branch (as far as known). */ since: number; message: string | null; at: string | null };

const mem = {
  startedAt: Date.now() - Math.round(process.uptime() * 1000),
  checkedAt: null as number | null,
  /** Why the last check couldn't tell, and since when no check could. */
  error: null as string | null,
  blindSince: null as number | null,
  latest: null as Latest | null,
  /** GitHub's mark for the latest commit's deployment, and when it was asked. */
  mark: null as { sha: string; state: string | null; at: number } | null,
  /** The commit the owner was already told about. */
  told: null as string | null,
};

const FAILED = new Set(["failure", "error"]);

export function deployState(now = Date.now()): { state: DeployState; reason: DeployReason | null } {
  const live = liveVersion();
  if (!live.commit) return { state: "unknown", reason: "noCommit" };
  if (!live.repo) return { state: "unknown", reason: "noRepo" };
  const latest = mem.latest;
  if (!latest) return { state: "unknown", reason: mem.error ? "cantReach" : "notChecked" };
  if (latest.sha === live.commit) return { state: "current", reason: null };
  if (mem.mark?.sha === latest.sha && mem.mark.state && FAILED.has(mem.mark.state)) return { state: "failed", reason: null };
  return { state: now - latest.since >= lateMs() ? "late" : "deploying", reason: null };
}

/** The bell (unless a rule of the owner's rings it already, or it rang for this commit) and the owner's rules. */
async function tell(state: "late" | "failed", latest: Latest, liveCommit: string, now: number) {
  const data = {
    commit: short(latest.sha),
    message: latest.message ?? "",
    minutes: Math.max(1, Math.round((now - latest.since) / MIN)),
    live: short(liveCommit),
    reason: state === "failed" ? "فشل" : "تأخّر",
    link: DEPLOY_LINK,
  };
  try {
    const [own, rang] = await Promise.all([
      prisma.automationRule.count({ where: { trigger: "deploy.failed", action: "notify", enabled: true } }),
      // An old server that restarts looks again: one bell per commit is enough.
      prisma.adminNotification.findFirst({ where: { link: DEPLOY_LINK, body: { contains: data.commit }, createdAt: { gte: new Date(now - 6 * 60 * MIN) } }, select: { id: true } }),
    ]);
    if (!own && !rang) {
      await prisma.adminNotification.create({ data: { title: state === "failed" ? "النشر فشل" : "النشر متأخّر", body: render(DEFAULT_TEXT["deploy.failed"], data), link: DEPLOY_LINK } });
    }
  } catch (e) {
    console.error("[deploy] the bell failed:", e instanceof Error ? e.message : e);
  }
  emitAutomation("deploy.failed", data, `deploy:${latest.sha}`);
}

/** One look (the job "deployWatch"): the branch's last commit against the one running here. */
export async function checkDeploy(now = Date.now()): Promise<Record<string, number>> {
  const live = liveVersion();
  if (!live.commit || !live.repo) return { checked: 0 };
  let sha: string;
  try {
    sha = await latestCommit(live.repo, live.branch);
  } catch (e) {
    mem.checkedAt = now;
    mem.error = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 200);
    mem.blindSince ??= now;
    // A short hiccup is only shown on the page; half an hour blind fails the job (which has its own alert).
    if (now - mem.blindSince >= 30 * MIN) throw new Error(mem.error);
    return { checked: 0, unreachable: 1 };
  }
  mem.checkedAt = now;
  mem.error = null;
  mem.blindSince = null;
  if (mem.latest?.sha !== sha) {
    const first = !mem.latest;
    mem.latest = { sha, seenAt: now, since: now, message: null, at: null };
    mem.mark = null;
    if (sha !== live.commit) {
      const words = await commitWords(live.repo, sha).catch(() => null);
      if (words) {
        mem.latest.message = words.message;
        mem.latest.at = words.at;
        // Seen at this server's first look: it may have been waiting long before (an old server that restarted).
        if (first && words.at) mem.latest.since = Math.min(now, Date.parse(words.at));
      }
    }
  }
  const latest = mem.latest!;
  if (latest.sha === live.commit) return { checked: 1, behind: 0 };
  // Behind: the host's own word, once the build had two minutes, asked again every two.
  const failedAlready = mem.mark?.sha === latest.sha && !!mem.mark.state && FAILED.has(mem.mark.state);
  if (live.environment && !failedAlready && now - latest.since >= 2 * MIN - 1000 && now - (mem.mark?.at ?? 0) >= 2 * MIN - 1000) {
    const state = await deploymentMark(live.repo, latest.sha, live.environment).catch(() => null);
    mem.mark = { sha: latest.sha, state, at: now };
  }
  const { state } = deployState(now);
  let told = 0;
  if ((state === "late" || state === "failed") && mem.told !== latest.sha) {
    mem.told = latest.sha;
    await tell(state, latest, live.commit, now);
    told = 1;
  }
  return { checked: 1, behind: 1, told };
}

const iso = (ms: number | null) => (ms == null ? null : new Date(ms).toISOString());

/** For the admin's page (and /health's commit). */
export function deploySnapshot(now = Date.now()) {
  const live = liveVersion();
  const latest = mem.latest;
  return {
    now,
    ...deployState(now),
    live: { commit: live.commit, message: live.message, branch: live.branch, repo: live.repo, deploymentId: live.deploymentId, startedAt: iso(mem.startedAt)! },
    latest: latest ? { commit: latest.sha, message: latest.sha === live.commit ? live.message : latest.message, at: latest.at, seenAt: iso(latest.seenAt)!, since: iso(latest.since)! } : null,
    /** GitHub's mark for the waiting commit's deployment, when known. */
    mark: latest && mem.mark?.sha === latest.sha ? mem.mark.state : null,
    lateAfterMinutes: lateMs() / MIN,
    checkedAt: iso(mem.checkedAt),
    error: mem.error,
    told: !!latest && mem.told === latest.sha,
  };
}

/** /health: the commit running here (7 letters) and since when. */
export function healthVersion() {
  return { commit: short(liveVersion().commit) || null, since: iso(mem.startedAt)! };
}

/** Tests: another answer for GitHub (null = the real one), and nothing remembered. */
export function setDeployFetchForTests(f: DeployFetch | null) {
  ask = f ?? ((url, init) => fetch(url, init));
}
export function resetDeployWatchForTests() {
  mem.checkedAt = null;
  mem.error = null;
  mem.blindSince = null;
  mem.latest = null;
  mem.mark = null;
  mem.told = null;
}
