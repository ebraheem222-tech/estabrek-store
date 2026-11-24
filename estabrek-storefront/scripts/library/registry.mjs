// Every piece of the owner's theme library, as its folders list them (each folder's src/registry.js, the list its
// own gallery shows): the file and export each piece lives in (read from the registry's code), and its details
// (name, height, category, description, tags, colours: read by running the registry, which loads no piece).
//   readLibrary(THEMES) → [{ id, kind, folder, file, exp, name, minH, cat?, blurb?, tags?, colors?, font?, brand }]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

/** The library's folders: where each one's registry is, the kind of piece it holds, and its pieces' id prefix. */
export const FOLDERS = [
  { dir: "Templates/src", kind: "site", prefix: "site" },
  { dir: "Heros/src/heroes", kind: "hero", prefix: "hero" },
  { dir: "Premium/src", kind: "premium", prefix: "premium" },
  { dir: "Navbars/src", kind: "navbar", prefix: "nav" },
  { dir: "Banners/src", kind: "banner", prefix: "banner" },
  { dir: "Features/src", kind: "features", prefix: "features" },
  { dir: "Cards/src", kind: "cards", prefix: "cards" },
  { dir: "Pricing/src", kind: "pricing", prefix: "pricing" },
  { dir: "Testimonials/src", kind: "testimonials", prefix: "testimonials" },
  { dir: "Team/src", kind: "team", prefix: "team" },
  { dir: "FAQ/src", kind: "faq", prefix: "faq" },
  { dir: "CTA/src", kind: "cta", prefix: "cta" },
  { dir: "Contact/src", kind: "contact", prefix: "contact" },
  { dir: "Logins/src", kind: "login", prefix: "login" },
  { dir: "Footers/src", kind: "footer", prefix: "footer" },
];

const ID = /^[a-z][a-z0-9-]{1,60}$/;

/** The library's own stylesheets: its folders' index.css (most of them the same) and the heroes' own. */
export const stylesheetsOf = (THEMES) =>
  [...new Set([...FOLDERS.map((f) => path.join(THEMES, f.dir.split("/")[0], "src/index.css")), path.join(THEMES, "Heros/src/heroes/heroes.css")])].filter((f) => fs.existsSync(f));
/** Its animations' names (renamed lx-… in the shop, which has an "aurora" and a "blink" of its own). */
export const keyframesOf = (THEMES) => [...new Set(stylesheetsOf(THEMES).flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1])))];

export async function readLibrary(THEMES) {
  const req = createRequire(path.join(THEMES, "package.json"));
  const parser = req("@babel/parser");
  const traverse = req("@babel/traverse").default;
  const t = req("@babel/types");
  const all = [];
  for (const f of FOLDERS) {
    const regFile = path.join(THEMES, f.dir, "registry.js");
    const code = fs.readFileSync(regFile, "utf8");
    const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
    const resolve = (spec) => {
      const p = path.resolve(path.dirname(regFile), spec);
      const file = /\.(jsx|js)$/.test(p) ? p : [".jsx", ".js"].map((x) => p + x).find((x) => fs.existsSync(x));
      if (!file) throw new Error(`${f.dir}: no file for ${spec}`);
      return path.relative(THEMES, file).split(path.sep).join("/");
    };
    const importOf = (fn) => {
      // () => import("./x")
      const body = fn && (t.isArrowFunctionExpression(fn) || t.isFunctionExpression(fn)) ? fn.body : null;
      return body && t.isCallExpression(body) && t.isImport(body.callee) && t.isStringLiteral(body.arguments[0]) ? body.arguments[0].value : null;
    };
    // const B = lazyFile(() => import("./faq-b"))
    const files = {};
    traverse(ast, {
      VariableDeclarator(p) {
        const init = p.node.init;
        if (t.isIdentifier(p.node.id) && t.isCallExpression(init) && t.isIdentifier(init.callee, { name: "lazyFile" })) {
          const spec = importOf(init.arguments[0]);
          if (spec) files[p.node.id.name] = resolve(spec);
        }
      },
    });
    // Where each piece lives, by its id.
    const where = {};
    traverse(ast, {
      ObjectExpression(p) {
        const prop = (k) => p.node.properties.find((x) => t.isObjectProperty(x) && (t.isIdentifier(x.key, { name: k }) || t.isStringLiteral(x.key, { value: k })));
        const id = prop("id"), comp = prop("Component");
        if (!id || !comp || !t.isStringLiteral(id.value)) return;
        const c = comp.value;
        if (t.isMemberExpression(c) && t.isIdentifier(c.object) && t.isIdentifier(c.property) && files[c.object.name]) where[id.value.value] = { file: files[c.object.name], exp: c.property.name };
        else if (t.isCallExpression(c) && t.isIdentifier(c.callee, { name: "lazy" })) {
          const spec = importOf(c.arguments[0]);
          if (spec) where[id.value.value] = { file: resolve(spec), exp: "default" };
        }
      },
      CallExpression(p) {
        // ...more(B, "faq-b.jsx", [[id, name, exportName, minH], …])
        const [mod, , list] = p.node.arguments;
        if (!t.isIdentifier(p.node.callee, { name: "more" }) || !t.isIdentifier(mod) || !t.isArrayExpression(list)) return;
        for (const row of list.elements) {
          if (!t.isArrayExpression(row)) continue;
          const [rid, , exp] = row.elements;
          if (t.isStringLiteral(rid) && t.isStringLiteral(exp)) where[rid.value] = { file: files[mod.name], exp: exp.value };
        }
      },
    });
    // The details, from the registry itself (running it loads no piece: they're all behind lazy()).
    const mod = await import(pathToFileURL(regFile).href);
    const list = mod.ITEMS ?? mod.SITES ?? mod.HEROES ?? Object.values(mod).find(Array.isArray);
    for (const it of list) {
      const w = where[it.id];
      if (!w?.file) throw new Error(`${f.dir}: ${it.id} has no file`);
      const id = `${f.prefix}-${String(it.id).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")}`;
      if (!ID.test(id)) throw new Error(`${f.dir}: ${it.id} makes a bad id ${id}`);
      all.push({
        id,
        kind: f.kind,
        folder: f.dir.split("/")[0],
        file: w.file,
        exp: w.exp,
        name: String(it.name),
        minH: Number(it.minH) || (f.kind === "site" ? 900 : f.kind === "hero" ? 720 : 560),
        ...(it.cat || it.category ? { cat: String(it.cat ?? it.category) } : {}),
        ...(it.blurb ? { blurb: String(it.blurb) } : {}),
        ...(Array.isArray(it.tags) ? { tags: it.tags.map(String) } : {}),
        ...(Array.isArray(it.colors) ? { colors: it.colors.map(String) } : {}),
        // A whole site's made-up name is the store's to replace.
        brand: f.kind === "site" ? String(it.name) : "",
      });
    }
  }
  const seen = new Set();
  for (const i of all) {
    if (seen.has(i.id)) throw new Error(`two pieces are ${i.id}`);
    seen.add(i.id);
  }
  return all;
}
