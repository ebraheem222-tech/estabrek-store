// The owner's theme library (the Themes folder: React + Tailwind 4 + Framer Motion, docs/themes-library-plan.ar.md)
// made editable for the shop, once, by machine. Every file a library item needs is copied into src/library with:
//   - every text a shopper sees passed through the item's own words (runtime.tsx): written in the page (<T s="…"/>),
//     the attributes people read (alt, title, placeholder, aria-label: lx("…")), and the words handed to the
//     library's own components (text="…"). The logic keeps the original words; only what's shown changes.
//   - every colour in a style or an SVG colour attribute passed through cv(), which names it as a CSS variable
//     (--lx-<hex>) the item's wrapper can set; Tailwind's colour families are variables already (build-css.mjs).
//   - Framer Motion taken from the shop's own copy (motion/react), and the library's animations named lx-….
// It also writes manifest.gen.ts: each item with its kind, names, words, colour families and colours.
//
//   node scripts/library/convert.mjs [path to the Themes folder]
// (it uses the Themes folder's own Babel, so that folder must be there with its packages installed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ITEMS, KEYFRAMES } from "./items.mjs";

const THEMES = path.resolve(process.argv[2] || process.env.THEMES_DIR || "C:/Users/Ibrah/Desktop/estabrek/Themes");
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const OUT = path.join(SHOP, "src/library");
const req = createRequire(path.join(THEMES, "package.json"));
const parser = req("@babel/parser");
const traverse = req("@babel/traverse").default;
const generate = req("@babel/generator").default;
const t = req("@babel/types");

/** Where a library folder goes in the shop (Templates/src → templates). */
const folderOf = (src) => {
  const rel = path.relative(THEMES, src).split(path.sep);
  return rel[0].toLowerCase();
};
const outPath = (src) => {
  const rel = path.relative(THEMES, src).split(path.sep);
  // <Folder>/src/<rest> → <folder>/<rest>
  return path.join(OUT, rel[0].toLowerCase(), ...rel.slice(2)).replace(/\.jsx$/, ".tsx");
};

const TEXT_ATTRS = new Set(["alt", "title", "placeholder", "aria-label", "label"]);
/** Props of the library's own components that are never words. */
const NOT_WORDS = /^(className|class|id|key|href|to|src|type|variant|size|icon|as|ring|kind|mode|name|value|ref|style|role|tabIndex|htmlFor|target|rel|method|action|autoComplete|inputMode|pattern|min|max|step|viewBox|d|points|transform|fill|stroke|.*Class|.*class|.*Id|.*Color|.*color|on[A-Z].*)$/;
const COLOUR_ATTRS = new Set(["fill", "stroke", "stopColor", "floodColor", "lightingColor", "color"]);
const COLOUR_KEYS = /^(color|background|backgroundColor|backgroundImage|borderColor|border(Top|Right|Bottom|Left)(Color)?|border|fill|stroke|boxShadow|textShadow|outlineColor|caretColor|accentColor|stopColor|textDecorationColor|columnRuleColor|--.*)$/;
const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const KF = new RegExp(`\\b(${KEYFRAMES.map((k) => k.replace(/[-]/g, "\\-")).join("|")})\\b`, "g");

/** The words of a text written in JSX as React shows them (lines trimmed and joined by spaces). */
function cleanJsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) last = i;
  let str = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const first = i === 0, lastLine = i === lines.length - 1, nonEmpty = i === last;
    let trimmed = line.replace(/\t/g, " ");
    if (!first) trimmed = trimmed.replace(/^[ ]+/, "");
    if (!lastLine) trimmed = trimmed.replace(/[ ]+$/, "");
    if (trimmed) {
      if (!nonEmpty) trimmed += " ";
      str += trimmed;
    }
  }
  return str;
}
/** Text a person reads, not a class name, a colour, an address or a code word ("bag", "md"). */
const isWords = (s) => {
  if (typeof s !== "string" || s.length > 400) return false;
  const v = s.trim();
  if (!/\p{L}/u.test(v) || /^(#|\/|\.|https?:|mailto:|tel:|data:|var\()/.test(v)) return false;
  const tokens = v.split(/\s+/);
  // Class lists: lowercase tokens, some with -, :, [ or /.
  if (tokens.every((x) => /^[!a-z0-9:_\-[\]().%#/,'"=+*<>@&]+$/.test(x)) && tokens.some((x) => /[-:[/]/.test(x))) return false;
  // A single lowercase ascii word is a code word.
  if (tokens.length === 1 && /^[a-z0-9_-]+$/.test(v)) return false;
  // An SVG path, a CSS function, a font list.
  if (/^[MmLlHhVvCcSsQqTtAaZz][\d\s.,MmLlHhVvCcSsQqTtAaZz-]*$/.test(v) || /^[a-z-]+\(.*\)$/i.test(v) || /\b(serif|sans-serif|monospace|cursive|system-ui)\b/.test(v)) return false;
  return true;
};
/** Object keys whose strings are never words (class names, colours, icons, addresses). */
const NOT_WORD_KEYS = /^(className|cls|class|c|c2|color|colour|bg|grad|gradient|tint|accent|icon|href|to|url|id|key|img|src|font|style|d|path|filter|shadow|ring|tone|kind|type|variant|slug|code|hex|seed)$/;

function convertFile(src, manifest) {
  const code = fs.readFileSync(src, "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  // What each top-level part of the file shows (its words, colour families and colours) and which other parts
  // it uses: an item's panel lists only what its own section shows (manifest.gen.ts).
  const top = new Set();
  const imports = {};
  let defaultName = "default";
  for (const st of ast.program.body) {
    const n = t.isExportNamedDeclaration(st) || t.isExportDefaultDeclaration(st) ? st.declaration : st;
    if (t.isExportDefaultDeclaration(st) && n?.id) defaultName = n.id.name;
    if (t.isFunctionDeclaration(n) || t.isClassDeclaration(n)) n.id && top.add(n.id.name);
    if (t.isVariableDeclaration(n)) for (const d of n.declarations) if (t.isIdentifier(d.id)) top.add(d.id.name);
    if (t.isImportDeclaration(st) && st.source.value.startsWith(".")) {
      let dep = path.resolve(path.dirname(src), st.source.value);
      if (!/\.(jsx?|tsx?)$/.test(dep)) dep = [".jsx", ".js"].map((x) => dep + x).find((x) => fs.existsSync(x)) ?? dep;
      for (const sp of st.specifiers) if (t.isImportSpecifier(sp)) imports[sp.local.name] = { file: path.relative(OUT, outPath(dep)).split(path.sep).join("/"), name: t.isIdentifier(sp.imported) ? sp.imported.name : sp.imported.value };
    }
  }
  const decls = {};
  const topNameOf = (p) => {
    const st = p.findParent((pp) => pp.parentPath && pp.parentPath.isProgram());
    if (!st) return "#module";
    let n = st.node;
    if (t.isExportDefaultDeclaration(n)) return n.declaration?.id?.name ?? "default";
    if (t.isExportNamedDeclaration(n)) n = n.declaration;
    if (t.isFunctionDeclaration(n) || t.isClassDeclaration(n)) return n.id?.name ?? "#module";
    if (t.isVariableDeclaration(n)) return n.declarations.find((d) => t.isIdentifier(d.id))?.id.name ?? "#module";
    return "#module";
  };
  const bucket = (p) => {
    const name = topNameOf(p);
    return (decls[name] ??= { words: new Set(), families: new Set(), hexes: new Set(), refs: new Set() });
  };
  const words = { add: (p, w) => bucket(p).words.add(w) };
  const families = { add: (p, f) => bucket(p).families.add(f) };
  const hexes = { add: (p, h) => bucket(p).hexes.add(h) };
  let usesT = false, usesLx = false, usesCv = false;
  const cvCall = (e) => { usesCv = true; return t.callExpression(t.identifier("cv"), [e]); };
  const lxIn = (p) => {
    // lx() inside a component reads its own item's words (useLx at the top of it); outside, the last ones.
    const fn = p.getFunctionParent();
    const comp = componentOf(fn);
    if (comp) { comp.node.__lx = true; return "__lx"; }
    usesLx = true;
    return "lx";
  };
  const componentOf = (fn) => {
    // The outermost function: a Capitalised function or one given to a Capitalised const (a component).
    let f = fn, found = null;
    while (f) {
      const id = f.node.id?.name ?? (f.parentPath?.isVariableDeclarator() ? f.parentPath.node.id?.name : null);
      if (id && /^[A-Z]/.test(id)) found = f;
      f = f.parentPath ? f.parentPath.getFunctionParent() : null;
    }
    return found;
  };

  traverse(ast, {
    ImportDeclaration(p) {
      if (p.node.source.value === "framer-motion") p.node.source.value = "motion/react";
    },
    Identifier(p) {
      if (top.has(p.node.name) || imports[p.node.name]) if (p.isReferencedIdentifier()) bucket(p).refs.add(p.node.name);
    },
    JSXIdentifier(p) {
      if ((top.has(p.node.name) || imports[p.node.name]) && (p.parentPath.isJSXOpeningElement() || p.parentPath.isJSXMemberExpression())) bucket(p).refs.add(p.node.name);
    },
    StringLiteral(p) {
      for (const h of p.node.value.match(HEX) ?? []) hexes.add(p, normHex(h));
      for (const m of p.node.value.matchAll(/\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|decoration|divide|accent|caret|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})/g)) families.add(p, m[1]);
      if (isWords(p.node.value) && !p.parentPath.isImportDeclaration() && !p.parentPath.isExportDeclaration?.()) {
        const parent = p.parentPath;
        if (parent.isJSXAttribute()) {
          const attr = parent.node.name.name;
          const el = parent.parentPath.node.name;
          const custom = t.isJSXIdentifier(el) ? /^[A-Z]/.test(el.name) : true;
          if (TEXT_ATTRS.has(attr) || (custom && !NOT_WORDS.test(attr))) words.add(p, p.node.value.trim());
        } else if (parent.isObjectProperty() && parent.node.value === p.node) {
          const k = t.isIdentifier(parent.node.key) ? parent.node.key.name : t.isStringLiteral(parent.node.key) ? parent.node.key.value : "";
          if (!NOT_WORD_KEYS.test(k)) words.add(p, p.node.value.trim());
        } else if (!parent.isCallExpression() || !t.isIdentifier(parent.node.callee) || !["cv", "cvs"].includes(parent.node.callee.name)) {
          words.add(p, p.node.value.trim());
        }
      }
    },
    TemplateElement(p) {
      for (const h of p.node.value.raw.match(HEX) ?? []) hexes.add(p, normHex(h));
    },
    JSXText(p) {
      const s = cleanJsxText(p.node.value);
      if (!/\p{L}/u.test(s)) return;
      words.add(p, s.trim());
      usesT = true;
      // Keep the spaces around it (they're part of what React shows).
      p.replaceWith(t.jsxExpressionContainer(t.stringLiteral(s)));
    },
    JSXExpressionContainer(p) {
      const e = p.node.expression;
      if (!p.parentPath.isJSXElement() && !p.parentPath.isJSXFragment()) return;
      if (t.isJSXEmptyExpression(e) || t.isArrowFunctionExpression(e) || t.isFunctionExpression(e)) return;
      if (t.isJSXElement(e) || t.isJSXFragment(e)) return;
      // A child shown on the page: <T s={…}/> (returns it as it is, or the owner's words for it).
      usesT = true;
      p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier("T"), [t.jsxAttribute(t.jsxIdentifier("s"), t.jsxExpressionContainer(e))], true), null, [], true));
    },
    JSXAttribute(p) {
      const name = typeof p.node.name.name === "string" ? p.node.name.name : null;
      if (!name) return;
      const v = p.node.value;
      const el = p.parentPath.node.name;
      const elName = t.isJSXIdentifier(el) ? el.name : "";
      const custom = /^[A-Z]/.test(elName) || t.isJSXMemberExpression(el);
      // Words read by people, or handed to the library's own components.
      const wordy = TEXT_ATTRS.has(name) || (custom && !NOT_WORDS.test(name));
      if (wordy && v && t.isStringLiteral(v) && isWords(v.value)) {
        p.node.value = t.jsxExpressionContainer(t.callExpression(t.identifier(lxIn(p)), [t.stringLiteral(v.value)]));
        return;
      }
      if (wordy && v && t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression) && (t.isTemplateLiteral(v.expression) || t.isIdentifier(v.expression) || t.isMemberExpression(v.expression) || t.isConditionalExpression(v.expression))) {
        if (!TEXT_ATTRS.has(name)) return; // a component's prop given from a variable: its words are wrapped where they're shown
        p.node.value = t.jsxExpressionContainer(t.callExpression(t.identifier(lxIn(p)), [v.expression]));
        return;
      }
      // Colours: an SVG colour attribute, or a style's colour.
      if (COLOUR_ATTRS.has(name) && !custom && v) {
        if (t.isStringLiteral(v) && HEX.test(v.value)) { HEX.lastIndex = 0; p.node.value = t.jsxExpressionContainer(cvCall(t.stringLiteral(v.value))); }
        else if (t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression)) p.node.value = t.jsxExpressionContainer(cvCall(v.expression));
        HEX.lastIndex = 0;
        return;
      }
      if (name === "style" && v && t.isJSXExpressionContainer(v)) {
        const e = v.expression;
        if (t.isObjectExpression(e)) {
          for (const prop of e.properties) {
            if (!t.isObjectProperty(prop)) continue;
            const key = t.isIdentifier(prop.key) ? prop.key.name : t.isStringLiteral(prop.key) ? prop.key.value : null;
            if (!key) continue;
            if (COLOUR_KEYS.test(key) && !t.isNumericLiteral(prop.value)) prop.value = cvCall(prop.value);
            if (/^animation(Name)?$/.test(key)) renameKeyframes(prop.value);
          }
        } else if (!t.isJSXEmptyExpression(e)) {
          usesCv = true;
          v.expression = t.callExpression(t.identifier("cvs"), [e]);
        }
      }
    },
  });

  // useLx at the top of every component that shows words through lx (hooks: always first, never conditional).
  traverse(ast, {
    Function(p) {
      if (!p.node.__lx) return;
      if (!t.isBlockStatement(p.node.body)) p.node.body = t.blockStatement([t.returnStatement(p.node.body)]);
      p.node.body.body.unshift(t.variableDeclaration("const", [t.variableDeclarator(t.identifier("__lx"), t.callExpression(t.identifier("useLx"), []))]));
    },
  });
  let usesUseLx = false;
  traverse(ast, { Identifier(p) { if (p.node.name === "useLx") usesUseLx = true; } });

  const out = outPath(src);
  const runtime = path.relative(path.dirname(out), path.join(OUT, "runtime")).split(path.sep).join("/");
  const names = [usesT && "T", usesLx && "lx", usesUseLx && "useLx", usesCv && "cv", usesCv && "cvs"].filter(Boolean);
  if (names.length) ast.program.body.unshift(t.importDeclaration(names.map((n) => t.importSpecifier(t.identifier(n), t.identifier(n))), t.stringLiteral(runtime.startsWith(".") ? runtime : `./${runtime}`)));
  const body = generate(ast, { retainLines: false, jsescOption: { minimal: true } }, code).code;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `// @ts-nocheck\n/* eslint-disable */\n// Made by scripts/library/convert.mjs from the owner's Themes folder (${path.relative(THEMES, src).split(path.sep).join("/")}): do not edit.\n${body}\n`);
  const asList = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { words: [...v.words], families: [...v.families], hexes: [...v.hexes], refs: [...v.refs] }]));
  manifest.files[path.relative(OUT, out).split(path.sep).join("/")] = { decls: asList(decls), imports, defaultName };
  return out;
}

function renameKeyframes(node) {
  if (t.isStringLiteral(node)) node.value = node.value.replace(KF, "lx-$1");
  else if (t.isTemplateLiteral(node)) for (const q of node.quasis) { q.value.raw = q.value.raw.replace(KF, "lx-$1"); q.value.cooked = q.value.raw; }
}
function normHex(h) {
  const x = h.slice(1).toLowerCase();
  return x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
}

/** The library files an item needs: its own and what it imports from the library, followed. */
function filesOf(entry) {
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    const code = fs.readFileSync(f, "utf8");
    for (const m of code.matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
      let dep = path.resolve(path.dirname(f), m[1]);
      if (!/\.(jsx?|tsx?)$/.test(dep)) dep = [".jsx", ".js"].map((x) => dep + x).find((x) => fs.existsSync(x)) ?? dep;
      if (/\.jsx?$/.test(dep) && fs.existsSync(dep)) walk(dep);
    }
  };
  walk(entry);
  return [...seen];
}

const manifest = { from: "Themes", files: {}, items: [] };
const done = new Set();
for (const item of ITEMS) {
  const entry = path.join(THEMES, item.file);
  for (const f of filesOf(entry)) {
    if (done.has(f)) continue;
    done.add(f);
    convertFile(f, manifest);
  }
  const file = path.relative(OUT, outPath(entry)).split(path.sep).join("/");
  // What the item's own export reaches: its words, colour families and colours, nothing of the file's other sections.
  const got = { words: new Set(), families: new Set(), hexes: new Set() };
  const seen = new Set();
  const walk = (f, name) => {
    const key = `${f}#${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    const info = manifest.files[f];
    if (!info) return;
    const real = name === "default" ? info.defaultName : name;
    for (const part of [real, "#module"]) {
      const d = info.decls[part];
      if (!d) continue;
      for (const k of ["words", "families", "hexes"]) for (const v of d[k]) got[k].add(v);
      for (const r of d.refs) {
        if (info.decls[r]) walk(f, r);
        else if (info.imports[r]) walk(info.imports[r].file, info.imports[r].name);
      }
    }
  };
  walk(file, item.exp);
  manifest.items.push({ ...item, file: file.replace(/\.tsx$/, ""), folder: folderOf(entry), families: [...got.families], hexes: [...got.hexes], words: [...got.words] });
}
// The list as plain data (no React, no "@/" imports): the shop reads it (meta.ts) and so does the admin's editor,
// by path, for its "من المكتبة" group and an item's panel.
fs.rmSync(path.join(OUT, "items.gen.json"), { force: true });
fs.writeFileSync(
  path.join(OUT, "manifest.gen.ts"),
  `// Made by scripts/library/convert.mjs: do not edit.\n/* eslint-disable */\n` +
    `/** A library item: its id, kind, names, made-up brand, height while it loads, and the words, colour families and colours (6 digits) it uses. */\n` +
    `export type LibItemMeta = { id: string; kind: string; name: { ar: string; en: string; he: string }; brand: string; minH: number; folder: string; families: string[]; hexes: string[]; words: string[] };\n\n` +
    `export const LIB_MANIFEST: readonly LibItemMeta[] = ${JSON.stringify(
      manifest.items.map(({ id, kind, name, brand, minH, folder, families, hexes, words }) => ({ id, kind, name, brand: brand ?? "", minH, folder, families, hexes, words })),
      null,
      1,
    )};\n`,
);

// Each item's entry: its component; and the list of them, each loaded only when shown (next/dynamic). The
// library's styles come once for all of them (LibStyles.tsx, from LibBlock).
fs.rmSync(path.join(OUT, "entries"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "entries"), { recursive: true });
const GEN = "// Made by scripts/library/convert.mjs: do not edit.\n";
for (const item of manifest.items) {
  const from = `../${item.file}`;
  const body = item.exp === "default" ? `export { default } from "${from}";\n` : `import { ${item.exp} } from "${from}";\nexport default ${item.exp};\n`;
  fs.writeFileSync(path.join(OUT, "entries", `${item.id}.tsx`), `"use client";\n${GEN}// @ts-nocheck\n${body}`);
}
fs.writeFileSync(
  path.join(OUT, "items.gen.tsx"),
  `"use client";\n${GEN}import dynamic from "next/dynamic";\nimport type { ComponentType } from "react";\n\nexport const LIB_COMPONENTS: Record<string, ComponentType> = {\n${manifest.items
    .map((i) => `  ${JSON.stringify(i.id)}: dynamic(() => import("./entries/${i.id}")),`)
    .join("\n")}\n};\n`,
);
console.log(`converted ${done.size} files, ${manifest.items.length} items`);
