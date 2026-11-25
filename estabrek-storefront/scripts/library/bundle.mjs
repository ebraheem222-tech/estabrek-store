// The library's pieces as the shop's own static files (public/library/js), made once by machine from the converted
// pieces (convert.mjs → library-src): each piece its own small file, what pieces share in shared files, all named by
// their content (a new version is a new name). The shop's build never compiles them, so a thousand pieces cost a
// page nothing until it shows one; the shop loads a piece in the browser when it's shown (src/library/loader.ts).
// React, motion and the words' runtime are the shop's own (globalThis.__lx, set by loader.ts): one copy on the page,
// one words context.
// It also writes src/library/index.gen.ts: every piece with its kind, category, name, made-up brand, height while
// it loads, its file and its styles' file (the shop's server and the admin read it).
//
//   node scripts/library/convert.mjs && node scripts/library/build-css.mjs && node scripts/library/bundle.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const THEMES = path.resolve(process.argv[2] || process.env.THEMES_DIR || "C:/Users/Ibrah/Desktop/estabrek/Themes");
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const SRC = path.join(SHOP, "library-src");
const PUB = path.join(SHOP, "public/library");
const LIB = path.join(SHOP, "src/library");
const esbuild = createRequire(path.join(THEMES, "package.json"))("esbuild");

/** What a piece takes from the shop's page instead of bundling its own. */
const GLOBALS = { react: "react", "react/jsx-runtime": "jsx", "react-dom": "reactDom", "motion/react": "motion", "framer-motion": "motion" };
const shopsOwn = {
  name: "lx-shop-globals",
  setup(b) {
    b.onResolve({ filter: /^(react|react\/jsx-runtime|react-dom|motion\/react|framer-motion)$/ }, (a) => ({ path: a.path, namespace: "lx-global" }));
    b.onResolve({ filter: /(^|\/)runtime$/ }, (a) => (a.importer.startsWith(SRC) ? { path: "runtime", namespace: "lx-global" } : undefined));
    b.onLoad({ filter: /.*/, namespace: "lx-global" }, (a) => ({ contents: `module.exports = globalThis.__lx[${JSON.stringify(GLOBALS[a.path] ?? a.path)}];`, loader: "js" }));
  },
};

fs.rmSync(path.join(PUB, "js"), { recursive: true, force: true });
const entries = fs.readdirSync(path.join(SRC, "entries")).map((f) => path.join(SRC, "entries", f));
const result = await esbuild.build({
  absWorkingDir: SHOP,
  entryPoints: entries,
  outdir: path.join(PUB, "js"),
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: "es2020",
  jsx: "automatic",
  entryNames: "[name]-[hash]",
  chunkNames: "c/[hash]",
  metafile: true,
  legalComments: "none",
  logLevel: "warning",
  nodePaths: [path.join(THEMES, "node_modules")],
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [shopsOwn],
});

const jsOf = {};
let total = 0, biggest = 0;
for (const [out, info] of Object.entries(result.metafile.outputs)) {
  total += info.bytes;
  if (!info.entryPoint) continue;
  biggest = Math.max(biggest, info.bytes);
  jsOf[path.basename(info.entryPoint, ".tsx")] = path.basename(out);
}

// The styles' version: their content, so a new build of them is fetched again.
const h = crypto.createHash("sha1");
for (const f of ["lib.css", ...fs.readdirSync(path.join(PUB, "css")).sort().map((x) => `css/${x}`)]) h.update(fs.readFileSync(path.join(PUB, f)));
const cssVersion = h.digest("hex").slice(0, 10);

const items = JSON.parse(fs.readFileSync(path.join(SRC, "index.json"), "utf8"));
for (const i of items) {
  if (!jsOf[i.id]) throw new Error(`no file for ${i.id}`);
  if (!fs.existsSync(path.join(PUB, "css", `${i.css}.css`))) throw new Error(`no styles for ${i.id} (${i.css})`);
}
const GEN = "// Made by scripts/library/bundle.mjs: do not edit.\n";
fs.writeFileSync(
  path.join(LIB, "index.gen.ts"),
  `${GEN}/* eslint-disable */\n` +
    `/** A library piece: its id, kind (site, hero, navbar…), category (a site's or a hero's), name, made-up brand (a site's name, the store's to replace), height while it loads; a site's description, tags and colours; its file (public/library/js) and its styles' file (public/library/css); whether it draws words on a canvas. */\n` +
    `export type LibItem = { id: string; kind: string; cat?: string; name: string; brand: string; minH: number; blurb?: string; tags?: string[]; colors?: string[]; js: string; css: string; draws?: 1 };\n\n` +
    `/** The styles' version (their content), so a new build of them is fetched again. */\nexport const LIB_CSS_VERSION = ${JSON.stringify(cssVersion)};\n\n` +
    `export const LIB_INDEX: readonly LibItem[] = [\n${items.map((i) => " " + JSON.stringify({ ...i, js: jsOf[i.id] }) + ",").join("\n")}\n];\n`,
);
console.log(`${items.length} pieces: ${(total / 1024 / 1024).toFixed(1)} MB of files in all, the biggest piece ${(biggest / 1024).toFixed(0)} KB (before what it shares)`);
