/**
 * `prisma migrate deploy` over a direct database connection (Railway pre-deploy).
 *
 * Neon's pooled address (…-pooler.…neon.tech) goes through PgBouncer in
 * transaction mode, where Prisma can't hold its migration lock (a session
 * advisory lock): migrate times out with P1002. Migrations use, in order:
 *   1. DIRECT_URL, when set (Neon → Connection string with pooling off);
 *   2. DATABASE_URL with "-pooler" taken off a Neon host (Neon's direct endpoint);
 *   3. DATABASE_URL as it is.
 * The app itself keeps using the pooled DATABASE_URL.
 *
 * P1002 can also mean another migrate still holds the lock (two deploys at once):
 * it tries again a few times before giving up.
 *
 * A failed migration left on record (P3009) stops every later deploy. It happens when two
 * deploys migrate at once without the lock (through the pooler): one creates the table, the
 * other fails on "already exists" and leaves its record unfinished. The script clears it once:
 *   1. the failed record is marked rolled back (`migrate resolve --rolled-back`), and the
 *      deploy is tried again: when the other run's record shows it applied, nothing is left;
 *   2. if the migration is then applied again and stops on "already exists", and all it does
 *      is create tables and indexes, what it creates is there: it's marked applied
 *      (`migrate resolve --applied`), and the deploy is tried once more.
 *
 * An old migration that can't run on a new client's empty database (it adds what an earlier migration
 * already made, so it stops on "already exists") has a safe copy in scripts/migration-fixes/<name>.sql:
 * the same changes, each only if it isn't there yet. When that migration stops on "already exists", the
 * copy is run (`db execute`), the migration is marked applied, and the deploy goes on. The migration files
 * themselves are never edited: databases that already applied them keep their checksums.
 * Anything else still stops the deploy with Prisma's own message.
 *
 *   node scripts/migrate-deploy.mjs            run the migrations
 *   node scripts/migrate-deploy.mjs --dry-run  only say which host it would use
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The direct (non-pooled) address for migrations, and why it was chosen. */
export function migrationUrl(env = process.env) {
  if (env.DIRECT_URL) return { url: env.DIRECT_URL, source: "DIRECT_URL" };
  const raw = env.DATABASE_URL;
  if (!raw) return { url: null, source: "missing" };
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { url: raw, source: "DATABASE_URL" };
  }
  const neon = /\.neon\.tech$/i.test(u.hostname);
  if (neon && /-pooler\./i.test(u.hostname)) {
    u.hostname = u.hostname.replace(/-pooler\./i, ".");
    // PgBouncer-only settings don't belong on the direct connection.
    u.searchParams.delete("pgbouncer");
    return { url: u.toString(), source: "DATABASE_URL (Neon direct endpoint)" };
  }
  return { url: raw, source: "DATABASE_URL" };
}

/** user:password@host → host, for the logs. */
export const hostOf = (url) => {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(unparsed URL)";
  }
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The migrations a P3009 names as failed ("The `<name>` migration started at … failed"). */
export function failedMigrations(out) {
  if (!/P3009/.test(out)) return [];
  return [...new Set([...out.matchAll(/The `([A-Za-z0-9_]+)` migration started at [^\n]* failed/g)].map((m) => m[1]))];
}

/** The migration a P3018 says stopped on something that already exists (Postgres 42P07 a relation, 42710 an object, 42701 a column), or null. */
export function alreadyThere(out) {
  if (!/P3018/.test(out) || !/Database error code: (42P07|42710|42701)/.test(out)) return null;
  return /Migration name: ([A-Za-z0-9_]+)/.exec(out)?.[1] ?? null;
}

/** Whether a migration's SQL only creates tables and indexes (so "already exists" means what it makes is there). */
export function createOnly(sql) {
  const statements = sql.replace(/--[^\n]*/g, "").split(";").map((x) => x.trim()).filter(Boolean);
  return statements.length > 0 && statements.every((x) => /^CREATE\s+(TABLE|(UNIQUE\s+)?INDEX)\b/i.test(x));
}

/**
 * What to do after a `migrate deploy` that failed: wait for the lock, clear a failed record (once), run the
 * safe copy of a migration that has one and stopped on "already exists" (once), mark a create-only migration
 * that's already there as applied (once, and only one this run cleared), or stop.
 * `state`: { lockTries, cleared: string[], applied: string[] }; `sqlOf(name)` reads a migration's SQL (or null);
 * `fixOf(name)` reads its safe copy in scripts/migration-fixes (or null).
 */
export function nextStep(out, state, sqlOf, fixOf = () => null, maxLockTries = 4) {
  if (/P1002|advisory lock/i.test(out)) return state.lockTries + 1 < maxLockTries ? { do: "wait" } : { do: "stop" };
  const failed = failedMigrations(out);
  if (failed.length && !state.cleared.length) return { do: "rolled-back", names: failed };
  const there = alreadyThere(out);
  if (there && !state.applied.includes(there)) {
    if (fixOf(there)) return { do: "fix", names: [there] };
    const sql = state.cleared.includes(there) ? sqlOf(there) : null;
    if (sql && createOnly(sql)) return { do: "applied", names: [there] };
  }
  return { do: "stop" };
}

function prisma(args, url) {
  const local = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
  // The project's own Prisma; npx when the image doesn't carry it.
  const [bin, argv] = existsSync(local) ? [local, args] : [process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", ...args]];
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(bin, argv, { cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, shell: process.platform === "win32" });
    child.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    child.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
    child.on("error", (e) => resolve({ code: 1, out: `${out}\n${e.message}` }));
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

const sqlOf = (name) => {
  try { return readFileSync(path.join(ROOT, "prisma", "migrations", name, "migration.sql"), "utf8"); } catch { return null; }
};

/** A migration's safe copy, relative to the backend folder (forward slashes: the Windows shell and Linux both take it). */
export const fixPath = (name) => `scripts/migration-fixes/${name}.sql`;

/** The safe copy of a migration that can't run on an empty database as written (see the top), or null. */
export const fixOf = (name) => {
  if (!/^[A-Za-z0-9_]+$/.test(name)) return null;
  try { return readFileSync(path.join(ROOT, fixPath(name)), "utf8"); } catch { return null; }
};

async function main() {
  const { url, source } = migrationUrl();
  if (!url) {
    console.error("[migrate] DATABASE_URL isn't set");
    process.exit(1);
  }
  console.log(`[migrate] using ${source}: ${hostOf(url)}`);
  if (process.argv.includes("--dry-run")) return;
  const state = { lockTries: 0, cleared: [], applied: [] };
  for (;;) {
    const r = await prisma(["migrate", "deploy"], url);
    if (r.code === 0) return;
    const step = nextStep(r.out, state, sqlOf, fixOf);
    if (step.do === "fix") {
      for (const name of step.names) {
        console.warn(`[migrate] ${name} adds what an earlier migration already made: running its safe copy (${fixPath(name)}) and marking it applied`);
        const ran = await prisma(["db", "execute", "--file", fixPath(name), "--schema", "prisma/schema.prisma"], url);
        if (ran.code !== 0) process.exit(ran.code);
        const done = await prisma(["migrate", "resolve", "--applied", name], url);
        if (done.code !== 0) process.exit(done.code);
        state.applied.push(name);
      }
    } else if (step.do === "wait") {
      state.lockTries++;
      const wait = state.lockTries * 15;
      console.warn(`[migrate] the migration lock is busy (P1002); trying again in ${wait}s (${state.lockTries}/3)`);
      await new Promise((ok) => setTimeout(ok, wait * 1000));
    } else if (step.do === "rolled-back" || step.do === "applied") {
      for (const name of step.names) {
        console.warn(step.do === "applied"
          ? `[migrate] ${name} only creates tables and indexes, and they're already there: marking it applied`
          : `[migrate] ${name} is on record as failed: marking that record rolled back and trying again`);
        const done = await prisma(["migrate", "resolve", step.do === "applied" ? "--applied" : "--rolled-back", name], url);
        if (done.code !== 0) process.exit(done.code);
        state[step.do === "applied" ? "applied" : "cleared"].push(name);
      }
    } else process.exit(r.code);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
