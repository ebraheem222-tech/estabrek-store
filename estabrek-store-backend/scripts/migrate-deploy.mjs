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
 *   node scripts/migrate-deploy.mjs            run the migrations
 *   node scripts/migrate-deploy.mjs --dry-run  only say which host it would use
 */
import { spawn } from "node:child_process";
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

function runOnce(url) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const bin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(bin, ["migrate", "deploy"], { cwd: root, env: { ...process.env, DATABASE_URL: url }, shell: process.platform === "win32" });
    child.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    child.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

async function main() {
  const { url, source } = migrationUrl();
  if (!url) {
    console.error("[migrate] DATABASE_URL isn't set");
    process.exit(1);
  }
  console.log(`[migrate] using ${source}: ${hostOf(url)}`);
  if (process.argv.includes("--dry-run")) return;
  const tries = 4;
  for (let i = 1; i <= tries; i++) {
    const r = await runOnce(url);
    if (r.code === 0) return;
    const lock = /P1002|advisory lock/i.test(r.out);
    if (!lock || i === tries) process.exit(r.code);
    const wait = i * 15;
    console.warn(`[migrate] the migration lock is busy (P1002); trying again in ${wait}s (${i}/${tries - 1})`);
    await new Promise((ok) => setTimeout(ok, wait * 1000));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
