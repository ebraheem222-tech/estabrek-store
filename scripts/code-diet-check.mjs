#!/usr/bin/env node
/*
 * Keeps the code from growing back (2026-11-25, after about 45,000 unused or copied lines were taken out):
 *
 *  1. a file nothing uses: each app's source files are followed from its entry points (pages, layouts, routes and
 *     the proxy in the shop; main.tsx in the admin; server.ts, app.ts, jobs.ts and package.json's scripts in the
 *     backend; every app's scripts/, config files and tests). A file none of them reaches fails the check;
 *  2. a file kept twice: a shop and an admin file that are the same (spaces and comments aside). The admin imports
 *     the shop's file instead (see estabrek-admin/src/features/settings/cmsSettingsCatalog.ts).
 *
 * Known exceptions are listed in ALLOWED below, each with its reason.
 *
 *   node scripts/code-diet-check.mjs          (from the repo's root; exits 1 when it finds something)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ALLOWED = [
  // The library's piece details: loaded by their path (src/library/loader.ts), never imported.
  /^estabrek-storefront\/src\/library\/details\//,
  // The backend's test settings: vitest reads it by name.
  /^estabrek-store-backend\/src\/vitest\.config\.ts$/,
  // The same in both apps but tied to a file that differs (the admin's galleryThemeSpecs.ts).
  /^estabrek-(storefront|admin)\/src\/cms\/themes\/templates\/galleryExtra\.ts$/,
];

const APPS = {
  "estabrek-storefront": {
    entries: /^src\/(app\/(.*\/)?(page|layout|loading|error|not-found|route|head|template|default|global-error|opengraph-image|sitemap|robots|manifest)\.(tsx?|jsx?)|proxy\.ts|instrumentation\.ts)$/,
    alias: { "@/": "src/" },
  },
  "estabrek-admin": { entries: /^src\/main\.tsx$/, alias: { "@/": "src/" } },
  "estabrek-store-backend": { entries: /^src\/(server|app|jobs)\.ts$|^src\/scripts\//, alias: {} },
};
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json"];
const IMPORT = /(?:import\s+(?:[\w*{}\s,]+?\s+from\s+)?|export\s+(?:[\w*{}\s,]+?\s+from\s+)|import\(\s*(?:\/\*[\s\S]*?\*\/\s*)*|require\(\s*|@import\s+(?:url\()?)["']([^"']+)["']/g;
const TEST = /(^|\/)tests?\/|\.(spec|test)\./;

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
const read = (f) => readFileSync(f, "utf8");
const allowed = (f) => ALLOWED.some((rx) => rx.test(f));
const problems = [];

function resolveIn(files, app, from, spec) {
  let base = null;
  for (const [a, to] of Object.entries(APPS[app].alias)) if (spec.startsWith(a)) base = to + spec.slice(a.length);
  if (base === null) {
    if (!spec.startsWith(".")) return null; // a package, or another app (followed there)
    base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  }
  const tries = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => `${base}/index${e}`)];
  if (/\.(m?js|jsx)$/.test(base)) {
    const stem = base.replace(/\.(m?js|jsx)$/, "");
    tries.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.mts`);
  }
  return tries.find((t) => files.has(t)) ?? null;
}

for (const [app, cfg] of Object.entries(APPS)) {
  const pre = `${app}/`;
  const own = tracked.filter((f) => f.startsWith(pre)).map((f) => f.slice(pre.length));
  const files = new Set(own.filter((f) => f.startsWith("src/") && /\.(tsx?|jsx?|mjs|cjs|css|json)$/.test(f)));
  const tests = own.filter((f) => TEST.test(f) && /\.(tsx?|jsx?|mjs)$/.test(f));
  const tools = own.filter((f) => (/^scripts\//.test(f) || /^[^/]+\.config\.(m?[jt]s|cjs)$/.test(f)) && /\.(m?[jt]sx?|cjs)$/.test(f));
  // package.json's scripts that run a source file (tsx src/x.ts, node dist/x.js → src/x.ts)
  const fromScripts = [];
  try {
    const pkg = JSON.parse(read(`${pre}package.json`));
    for (const cmd of Object.values(pkg.scripts ?? {})) {
      for (const m of String(cmd).matchAll(/(?:^|\s)((?:src|dist)\/[\w./-]+\.(?:ts|js|mjs))/g)) {
        const src = m[1].replace(/^dist\//, "src/").replace(/\.m?js$/, ".ts");
        if (files.has(src)) fromScripts.push(src);
      }
    }
  } catch { /* no package.json */ }
  const graph = new Map();
  for (const f of [...files, ...tests, ...tools]) {
    let text = "";
    try { text = read(pre + f); } catch { continue; }
    const out = [];
    for (const m of text.matchAll(IMPORT)) { const r = resolveIn(files, app, f, m[1]); if (r) out.push(r); }
    for (const m of text.matchAll(/new URL\(\s*["']([^"']+)["']/g)) { const r = resolveIn(files, app, f, m[1]); if (r) out.push(r); }
    graph.set(f, out);
  }
  const seen = new Set();
  const todo = [...[...files].filter((f) => cfg.entries.test(f)), ...fromScripts, ...tests, ...tools];
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    todo.push(...(graph.get(f) ?? []));
  }
  for (const f of files) {
    const full = pre + f;
    if (seen.has(f) || f.endsWith(".d.ts") || TEST.test(f) || allowed(full)) continue;
    problems.push(`nothing uses ${full}`);
  }
}

// Kept twice: the same file in the shop and in the admin.
const norm = (t) => t.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").replace(/\s+/g, "");
const byText = new Map();
for (const f of tracked) {
  if (!/^estabrek-(storefront|admin)\/src\/.*\.(tsx?|jsx?|css|mjs)$/.test(f) || TEST.test(f) || allowed(f)) continue;
  const text = read(f);
  if (text.split("\n").length < 15) continue;
  const key = norm(text);
  const list = byText.get(key) ?? [];
  list.push(f);
  byText.set(key, list);
}
for (const list of byText.values()) {
  const apps = new Set(list.map((f) => f.split("/")[0]));
  if (apps.size > 1) problems.push(`kept twice: ${list.join(" = ")}`);
}

if (problems.length) {
  console.error(`code-diet-check: ${problems.length} found\n  ${problems.join("\n  ")}`);
  console.error("Delete what nothing uses; have the admin import the shop's file instead of a copy (or list a real exception in ALLOWED).");
  process.exit(1);
}
console.log("code-diet-check: no unused files, nothing kept twice");
