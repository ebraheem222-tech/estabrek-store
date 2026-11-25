// The owner's theme library (the Themes folder: React + Tailwind 4 + Framer Motion, docs/themes-library-plan.ar.md)
// made editable for the shop, once, by machine. Every file a library piece needs is copied into library-src (not
// kept in git; bundle.mjs makes the shop's files of it) with:
//   - every text a shopper sees passed through the item's own words (runtime.tsx): written in the page (<T s="…"/>),
//     the attributes people read (alt, title, placeholder, aria-label: lx("…")), and the words handed to the
//     library's own components (text="…"). The logic keeps the original words; only what's shown changes.
//   - every colour in a style or an SVG colour attribute passed through cv(), which names it as a CSS variable
//     (--lx-<hex>) the item's wrapper can set; Tailwind's colour families are variables already (build-css.mjs).
//   - every text drawn on a canvas (fillText, strokeText, and what's measured for it) through the item's words too
//     (runtime.tsx canvasText): a headline drawn in the owner's size and fitted to its canvas; a helper of the file
//     that draws for a component runs in that component's item's words (lxIn).
//   - Framer Motion taken from the shop's own copy (motion/react), and the library's animations named lx-….
// Every piece the library's folders list (registry.mjs). It also writes the list for bundle.mjs to finish into
// src/library/index.gen.ts (each piece's kind, category, name, made-up brand and height), and
// src/library/details/<id>.json (the words, colour families and colours a piece's panel offers, loaded only when
// that panel opens).
//
//   node scripts/library/convert.mjs [path to the Themes folder]
// (it uses the Themes folder's own Babel, so that folder must be there with its packages installed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { keyframesOf, readLibrary } from "./registry.mjs";

const THEMES = path.resolve(process.argv[2] || process.env.THEMES_DIR || "C:/Users/Ibrah/Desktop/estabrek/Themes");
const ITEMS = await readLibrary(THEMES);
const KEYFRAMES = keyframesOf(THEMES);
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
// The converted pieces: their own folder, outside the shop's code (bundle.mjs makes them public/library's files;
// the shop's own build never compiles them). Not kept in git: made again from the Themes folder.
const OUT = path.join(SHOP, "library-src");
// What the shop and the admin read: each piece's details (src/library/details) and the list (bundle.mjs writes it).
const LIB = path.join(SHOP, "src/library");
const req = createRequire(path.join(THEMES, "package.json"));
const parser = req("@babel/parser");
const traverse = req("@babel/traverse").default;
const generate = req("@babel/generator").default;
const t = req("@babel/types");

const outPath = (src) => {
  const rel = path.relative(THEMES, src).split(path.sep);
  // <Folder>/src/<rest> → <folder>/<rest>
  return path.join(OUT, rel[0].toLowerCase(), ...rel.slice(2)).replace(/\.jsx$/, ".tsx");
};

/**
 * The runtime's helpers under names no piece uses itself (a piece's own "cv", a canvas, once hid the colour helper
 * and broke it): the import is { cv as lx$cv, … }.
 */
const RT = { T: "Lx$T", lx: "lx$lx", useLx: "lx$useLx", cv: "lx$cv", cvs: "lx$cvs", words: "lx$w", canvasText: "lx$ct", canvasMeasure: "lx$mt", lxIn: "lx$in", spell: "lx$sp", paint: "lx$pt", glsl: "lx$gs", glNum: "lx$gn" };
/** The runtime's helpers: the strings given to them (a canvas method's name…) are never a piece's words. */
const RT_CALLS = new Set(Object.values(RT));
const CANVAS_TEXT = new Set(["fillText", "strokeText"]);
/**
 * Where a canvas or WebGL takes a colour (runtime.tsx paint, glsl, glNumbers): the page's CSS follows the owner's
 * colours (var(--lx-…)), a canvas or a shader only what it's handed, so these are handed the owner's colour.
 */
const PAINT_PROPS = new Set(["fillStyle", "strokeStyle", "shadowColor"]);
const GL_NUMBERS = new Set(["clearColor", "uniform3f", "uniform4f", "uniform3fv", "uniform4fv"]);
/** A colour written as rgb()/rgba() (commas or spaces, an alpha or not): the owner changes it as the hex it is. */
const RGB = /rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})\s*(?:(?:,|\/)\s*[\d.]+%?\s*)?\)/g;
/** A colour in a shader (vec3(0.48, 0.23, 0.93)): the owner changes it as the hex it is, rounded. */
const VEC3 = /vec3\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*\)/g;
const GLSL = /gl_FragColor|void\s+main\s*\(|precision\s+(?:high|medium|low)p/;
const toHex = (r, g, b) => [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
/** The colours a text holds, each as 6 hex digits: #hex, rgb()/rgba(), and in a shader its vec3 colours. */
function coloursIn(text, shader) {
  const out = [];
  for (const h of text.match(HEX) ?? []) out.push(normHex(h));
  HEX.lastIndex = 0;
  for (const m of text.matchAll(RGB)) if ([m[1], m[2], m[3]].every((v) => Number(v) <= 255)) out.push(toHex(Number(m[1]), Number(m[2]), Number(m[3])));
  if (shader) for (const m of text.matchAll(VEC3)) {
    // A rainbow's phases (0.5 + 0.5 * cos(6.28 * (t + vec3(0.0, 0.33, 0.67)))): no colour of its own.
    const line = text.slice(text.lastIndexOf("\n", m.index) + 1, m.index);
    const wave = line.search(/\b(?:cos|sin)\s*\(/);
    if (wave >= 0) {
      const after = line.slice(wave);
      if ((after.match(/\(/g) ?? []).length > (after.match(/\)/g) ?? []).length) continue;
    }
    const c = [m[1], m[2], m[3]].map(Number);
    if (c.every((v) => v <= 1) && !c.every((v) => v === 0 || v === 1)) out.push(toHex(...c.map((v) => v * 255)));
  }
  return out;
}
/**
 * What a piece does to a text before it shows it, letter by letter or changed ("LIQUID".split("") into letters that
 * move one by one, a word typed out with slice, a name in capitals): the text is put in the owner's words first
 * (runtime.tsx spell), or the letters kept spelling the library's word after the owner changed it.
 */
const STR_OPS = new Set(["split", "slice", "substring", "substr", "charAt", "padEnd", "padStart", "toUpperCase", "toLowerCase", "toLocaleUpperCase", "toLocaleLowerCase", "repeat", "trim", "at", "concat", "join"]);
// Not what a piece looks up in a text to work (match, indexOf, includes, replace…): its own logic keeps the library's
// words, or the owner's words broke it (a regex playground's samples).
/** A comparison: a text read letter by letter is compared in the owner's words too (a word typed out is done when it is the word). */
const SAME = new Set(["===", "!==", "==", "!="]);
/** Names that are never a piece's text (what spell would only pass through). */
const NOT_TEXTS = new Set(["Math", "JSON", "Object", "Array", "Number", "String", "Date", "console", "window", "document", "navigator", "location", "localStorage", "sessionStorage", "crypto", "performance", "Promise", "Reflect", "Intl", "Symbol", "React", "motion", "URL", "BigInt", "Map", "Set", "undefined", "arguments"]);
/** Where a piece reads something once, when it begins (or its timers keep what they began with). */
const ONCE = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect", "useState", "useMemo", "useCallback", "useRef", "useReducer", "setInterval", "setTimeout", "requestAnimationFrame"]);
/** What a shopper types or presses, or an element on the page (e.target.value, e.key, ref.current): never the piece's words. */
const typedIn = (n) => {
  for (let m = n; t.isMemberExpression(m); m = m.object) if (t.isIdentifier(m.property) && /^(target|currentTarget|value|current|key|code|files|dataset|clipboardData|dataTransfer)$/.test(m.property.name)) return true;
  return false;
};
/** SVG elements whose texts are drawn: a text there in the editor is marked by a tspan (a span shows nothing in SVG). */
const SVG_TEXT = new Set(["text", "tspan", "textPath"]);
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
  // A CSS size ("0.5em" showed in a piece's words to change).
  if (/^-?\d*\.?\d+(px|em|rem|vh|vw|vmin|vmax|%|ms|s|deg|fr|ch)$/i.test(v)) return false;
  // An SVG path, a CSS function, a font list.
  if (/^[MmLlHhVvCcSsQqTtAaZz][\d\s.,MmLlHhVvCcSsQqTtAaZz-]*$/.test(v) || /^[a-z-]+\(.*\)$/i.test(v) || /\b(serif|sans-serif|monospace|cursive|system-ui)\b/.test(v)) return false;
  return true;
};
/** Inside a <style> or <script> of a piece: code, never words. */
const inCode = (p) => {
  const el = p.parentPath?.isJSXElement() ? p.parentPath.node.openingElement.name : null;
  return t.isJSXIdentifier(el) && (el.name === "style" || el.name === "script");
};
/** A string given to a runtime helper that is not a text: a colour's (cv), what's done to a text (spell), a canvas method's name. */
const helperArg = (call, arg) => {
  const name = call.callee.name;
  if (name === RT.cv || name === RT.cvs) return true;
  if (name === RT.spell) return call.arguments[2] === arg;
  if (name === RT.canvasText || name === RT.glNum) return call.arguments[1] === arg;
  return false;
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
    return (decls[name] ??= { words: new Set(), families: new Set(), hexes: new Set(), refs: new Set(), draws: false, fresh: false });
  };
  const words = { add: (p, w) => bucket(p).words.add(w) };
  const families = { add: (p, f) => bucket(p).families.add(f) };
  const hexes = { add: (p, h) => bucket(p).hexes.add(h) };
  let usesT = false, usesLx = false, usesCv = false, usesCanvas = false, usesIn = false, usesSpell = false, usesPaint = false, usesGl = false;
  const cvCall = (e) => { usesCv = true; return t.callExpression(t.identifier(RT.cv), [e]); };
  const lxIn = (p) => {
    // lx() inside a component reads its own item's words (useLx at the top of it); outside, the last ones.
    const fn = p.getFunctionParent();
    const comp = componentOf(fn);
    if (comp) { comp.node.__lx = true; return RT.words; }
    usesLx = true;
    return RT.lx;
  };
  /** A component's own words for what it draws on a canvas (lx$w carries them), or none outside one. */
  const canvasWords = (p) => {
    const comp = componentOf(p.getFunctionParent());
    if (comp && drawsJsx(comp)) { comp.node.__lx = true; return t.identifier(RT.words); }
    return t.nullLiteral();
  };
  /** A Capitalised function that shows something (JSX): a component, where a hook may go. */
  const drawsJsx = (fn) => {
    if (fn.node.__jsx !== undefined) return fn.node.__jsx;
    let jsx = false;
    fn.traverse({ JSXElement(q) { jsx = true; q.stop(); }, JSXFragment(q) { jsx = true; q.stop(); } });
    return (fn.node.__jsx = jsx);
  };
  const componentOf = (fn) => {
    // The outermost function: a Capitalised function or one given to a Capitalised const (a component).
    let f = fn, found = null;
    while (f) {
      const id = f.node.id?.name ?? (f.parentPath?.isVariableDeclarator() ? f.parentPath.node.id?.name : null);
      // Or a hook of the file (useTypewriter): called from a component, it can read that one's words itself.
      if (id && (/^[A-Z]/.test(id) || /^use[A-Z0-9]/.test(id))) found = f;
      f = f.parentPath ? f.parentPath.getFunctionParent() : null;
    }
    return found;
  };
  const isHook = (fn) => /^use[A-Z0-9]/.test(fn.node.id?.name ?? (fn.parentPath?.isVariableDeclarator() ? fn.parentPath.node.id?.name ?? "" : ""));
  /** A text the piece reads letter by letter or changes before showing it: in the item's words first (spell). */
  const spellOf = (q, op) => {
    const n = q.node;
    const text = t.isStringLiteral(n) ? /\p{L}/u.test(n.value)
      : t.isIdentifier(n) ? !NOT_TEXTS.has(n.name) && !RT_CALLS.has(n.name)
      : t.isMemberExpression(n) ? !t.isThisExpression(n.object) && !(t.isIdentifier(n.object) && NOT_TEXTS.has(n.object.name)) && !typedIn(n)
      // A value put into a sentence (`${pick(NAMES)} joined`, "Hi " + name()): whatever it gives.
      : (op === "tpl" || op === "cat" || op === "join") && ((t.isCallExpression(n) && !(t.isIdentifier(n.callee) && RT_CALLS.has(n.callee.name)) && !(t.isMemberExpression(n.callee) && t.isIdentifier(n.callee.object) && NOT_TEXTS.has(n.callee.object.name))) || (op === "tpl" && (t.isLogicalExpression(n) || t.isConditionalExpression(n))));
    if (!text || (t.isCallExpression(n) && t.isIdentifier(n.callee) && n.callee.name === RT.spell)) return;
    // Read once at the top of the file (before any piece is drawn): no piece's words to read it in.
    const fn = q.getFunctionParent();
    if (!fn) return;
    if (q.parentPath.isAssignmentExpression({ left: n }) || q.parentPath.isUpdateExpression()) return;
    const comp = componentOf(fn);
    let own = t.nullLiteral();
    if (comp && (drawsJsx(comp) || isHook(comp))) { comp.node.__lx = true; own = t.identifier(RT.words); }
    // Read in an effect, a timer or a first state (not while it's drawn, nor in a click: those see new words): the
    // piece starts again when its words change (LibBlock's key), or it kept the words it began with.
    for (let f = fn; f && f !== comp; f = f.parentPath?.getFunctionParent()) {
      const call = f.parentPath;
      const callee = call?.isCallExpression() ? call.node.callee : null;
      const name = t.isIdentifier(callee) ? callee.name : t.isMemberExpression(callee) && t.isIdentifier(callee.property) ? callee.property.name : "";
      if (ONCE.has(name)) { bucket(q).fresh = true; break; }
    }
    usesSpell = true;
    q.replaceWith(t.callExpression(t.identifier(RT.spell), [own, n, t.stringLiteral(op)]));
  };
  // The names a piece reads letter by letter somewhere (text.split(""), TEXT.slice(0, n)…): their length is the
  // owner's words' length too (a word typed out stopped at the library's word's length).
  const spelled = new Set();
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (t.isMemberExpression(c) && !c.computed && t.isIdentifier(c.property) && STR_OPS.has(c.property.name) && t.isIdentifier(c.object) && !NOT_TEXTS.has(c.object.name)) spelled.add(c.object.name);
    },
  });

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
    CallExpression(p) {
      const c = p.node.callee;
      // A text read letter by letter or changed before it's shown ("LIQUID".split(""), TEXT.slice(0, n)): in the
      // item's words first (runtime.tsx spell).
      if (t.isMemberExpression(c) && !c.computed && t.isIdentifier(c.property) && STR_OPS.has(c.property.name)) spellOf(p.get("callee.object"), c.property.name);
      else if (t.isMemberExpression(c) && t.isIdentifier(c.object, { name: "Array" }) && t.isIdentifier(c.property, { name: "from" }) && p.node.arguments.length && !t.isSpreadElement(p.node.arguments[0])) spellOf(p.get("arguments.0"), "from");
      // A colour handed to a canvas's gradient, a shader's source, or WebGL as numbers: the owner's.
      if (t.isMemberExpression(c) && !c.computed && t.isIdentifier(c.property) && !p.node.__lxPaint && !p.node.arguments.some((a) => t.isSpreadElement(a))) {
        const m = c.property.name, a = p.node.arguments;
        if (m === "addColorStop" && a.length === 2) {
          usesPaint = true; bucket(p).fresh = true;
          a[1] = t.callExpression(t.identifier(RT.paint), [c.object, canvasWords(p), a[1]]);
        } else if (m === "shaderSource" && a.length === 2) {
          usesGl = true; bucket(p).fresh = true;
          a[1] = t.callExpression(t.identifier(RT.glsl), [c.object, canvasWords(p), a[1]]);
        } else if (GL_NUMBERS.has(m)) {
          usesGl = true; bucket(p).fresh = true;
          p.node.__lxPaint = true;
          p.replaceWith(t.callExpression(t.identifier(RT.glNum), [c.object, t.stringLiteral(m), canvasWords(p), ...a]));
          return;
        }
      }
      // A text drawn on a canvas, or measured for it: in the item's words (runtime.tsx canvasText).
      if (!t.isMemberExpression(c) || c.computed || !t.isIdentifier(c.property) || !p.node.arguments.length) return;
      const m = c.property.name;
      if (!CANVAS_TEXT.has(m) && m !== "measureText") return;
      if (p.node.arguments.some((a) => t.isSpreadElement(a))) return;
      usesCanvas = true;
      bucket(p).draws = true;
      const own = canvasWords(p);
      if (CANVAS_TEXT.has(m)) p.replaceWith(t.callExpression(t.identifier(RT.canvasText), [c.object, t.stringLiteral(m), own, ...p.node.arguments]));
      else p.replaceWith(t.callExpression(t.identifier(RT.canvasMeasure), [c.object, own, p.node.arguments[0]]));
    },
    // The length of a text read letter by letter (a word typed out up to its length), the letters of one spread into
    // a list, or gone through one by one: the owner's words.
    MemberExpression(p) {
      const n = p.node;
      if (n.computed || !t.isIdentifier(n.property, { name: "length" }) || !t.isIdentifier(n.object) || !spelled.has(n.object.name)) return;
      if (p.parentPath.isAssignmentExpression({ left: n }) || p.parentPath.isUpdateExpression()) return;
      spellOf(p.get("object"), "length");
    },
    // Letters spread into a list or gone through one by one ([...line], for (const ch of word)): a list passes as
    // it is, a text in the owner's words.
    SpreadElement(p) {
      const a = p.node.argument;
      if (p.parentPath.isArrayExpression() && (t.isIdentifier(a) || t.isMemberExpression(a) || t.isStringLiteral(a))) spellOf(p.get("argument"), "spread");
    },
    ForOfStatement(p) {
      const r = p.node.right;
      if (t.isIdentifier(r) || t.isMemberExpression(r) || t.isStringLiteral(r)) spellOf(p.get("right"), "of");
    },
    // A component that gives back a text as it is (a highlighter with nothing to mark: `return text`): shown
    // without <T/>, so in the owner's words here.
    ReturnStatement(p) {
      const a = p.node.argument;
      if (!a || !(t.isIdentifier(a) || t.isMemberExpression(a))) return;
      const fn = p.getFunctionParent();
      const comp = fn ? componentOf(fn) : null;
      if (!comp || comp !== fn || isHook(comp) || !drawsJsx(comp)) return;
      spellOf(p.get("argument"), "ret");
    },
    // A sentence put together from the piece's words (`${name} joined the game`, "Hi " + name): each one in the
    // owner's words (the sentence as a whole is no text of the library's to look up).
    TemplateLiteral(p) {
      if (p.parentPath.isTaggedTemplateExpression() || !p.getFunctionParent()) return;
      p.get("expressions").forEach((q) => { if (t.isIdentifier(q.node) || t.isMemberExpression(q.node) || t.isCallExpression(q.node) || t.isLogicalExpression(q.node) || t.isConditionalExpression(q.node)) spellOf(q, "tpl"); });
    },
    BinaryExpression(p) {
      const { left, right, operator } = p.node;
      if (operator === "+") {
        const words = (n) => (t.isStringLiteral(n) && /\p{L}/u.test(n.value)) || t.isTemplateLiteral(n);
        if (!words(left) && !words(right)) return;
        for (const side of ["left", "right"]) {
          const n = p.node[side];
          if (t.isIdentifier(n) || t.isMemberExpression(n) || t.isCallExpression(n)) spellOf(p.get(side), "cat");
        }
        return;
      }
      if (!SAME.has(operator)) return;
      const read = (n) => t.isIdentifier(n) && spelled.has(n.name);
      if (!read(left) && !read(right)) return;
      for (const side of ["left", "right"]) {
        const n = p.node[side];
        if (t.isIdentifier(n) || t.isMemberExpression(n) || (t.isStringLiteral(n) && /\p{L}/u.test(n.value))) spellOf(p.get(side), "same");
      }
    },
    StringLiteral(p) {
      for (const h of coloursIn(p.node.value, GLSL.test(p.node.value))) hexes.add(p, h);
      for (const m of p.node.value.matchAll(/\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|decoration|divide|accent|caret|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})/g)) families.add(p, m[1]);
      if (isWords(p.node.value) && !p.parentPath.isImportDeclaration() && !p.parentPath.isExportDeclaration?.() && !(p.parentPath.isJSXExpressionContainer() && inCode(p.parentPath))) {
        const parent = p.parentPath;
        if (parent.isJSXAttribute()) {
          const attr = parent.node.name.name;
          const el = parent.parentPath.node.name;
          const custom = t.isJSXIdentifier(el) ? /^[A-Z]/.test(el.name) : true;
          if (TEXT_ATTRS.has(attr) || (custom && !NOT_WORDS.test(attr))) words.add(p, p.node.value.trim());
        } else if (parent.isObjectProperty() && parent.node.value === p.node) {
          const k = t.isIdentifier(parent.node.key) ? parent.node.key.name : t.isStringLiteral(parent.node.key) ? parent.node.key.value : "";
          if (!NOT_WORD_KEYS.test(k)) words.add(p, p.node.value.trim());
        } else if (!parent.isCallExpression() || !t.isIdentifier(parent.node.callee) || !helperArg(parent.node, p.node)) {
          words.add(p, p.node.value.trim());
        }
      }
    },
    TemplateElement(p) {
      const shader = p.parentPath.isTemplateLiteral() && p.parentPath.node.quasis.some((q) => GLSL.test(q.value.raw));
      for (const h of coloursIn(p.node.value.raw, shader)) hexes.add(p, h);
    },
    // A colour handed to a canvas (ctx.fillStyle = "#05050c", a trail of rgba(5, 5, 12, 0.35) over the whole piece):
    // the owner's. Read in its loop: the piece starts again when its colours change (fresh).
    AssignmentExpression(p) {
      const l = p.node.left;
      if (p.node.operator !== "=" || !t.isMemberExpression(l) || l.computed || !t.isIdentifier(l.property) || !PAINT_PROPS.has(l.property.name)) return;
      const r = p.node.right;
      if (t.isCallExpression(r) && t.isIdentifier(r.callee) && r.callee.name === RT.paint) return;
      usesPaint = true;
      bucket(p).fresh = true;
      p.node.right = t.callExpression(t.identifier(RT.paint), [l.object, canvasWords(p), r]);
    },
    JSXText(p) {
      if (inCode(p)) return;
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
      // A <style>'s CSS: never words (in the editor <T/> marked it with a span, which a <style> ignores: its
      // animations stopped there); its animations named as the library's CSS names them, its colours the owner's.
      if (inCode(p)) {
        if (p.parentPath.node.openingElement.name.name !== "style" || (t.isCallExpression(e) && t.isIdentifier(e.callee, { name: RT.cv }))) return;
        renameKeyframes(e);
        p.node.expression = cvCall(e);
        return;
      }
      if (t.isJSXElement(e) || t.isJSXFragment(e)) return;
      // A child shown on the page: <T s={…}/> (returns it as it is, or the owner's words for it). In an SVG text it
      // says so (svg): marked in the editor by a tspan, as a span there shows nothing.
      usesT = true;
      const at = p.parentPath.isJSXElement() ? p.parentPath.node.openingElement.name : null;
      const tag = t.isJSXIdentifier(at) ? at.name : t.isJSXMemberExpression(at) ? at.property.name : "";
      const attrs = [t.jsxAttribute(t.jsxIdentifier("s"), t.jsxExpressionContainer(e)), ...(SVG_TEXT.has(tag) ? [t.jsxAttribute(t.jsxIdentifier("svg"))] : [])];
      p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier(RT.T), attrs, true), null, [], true));
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
          v.expression = t.callExpression(t.identifier(RT.cvs), [e]);
        }
      }
    },
  });

  // A helper of the file (outside its components) that draws words on a canvas, called from a component: it runs in
  // that component's item's words (lx$in), as when it samples a word into particles on a canvas of its own.
  if (usesCanvas) {
    const helpers = new Map();
    for (const st of ast.program.body) {
      const n = t.isExportNamedDeclaration(st) ? st.declaration : st;
      if (t.isFunctionDeclaration(n) && n.id && !/^[A-Z]/.test(n.id.name)) helpers.set(n.id.name, n);
      if (t.isVariableDeclaration(n)) for (const d of n.declarations) if (t.isIdentifier(d.id) && !/^[A-Z]/.test(d.id.name) && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))) helpers.set(d.id.name, d.init);
    }
    const callsIn = (node) => {
      const out = { draws: false, calls: new Set() };
      t.traverseFast(node, (x) => {
        if (!t.isCallExpression(x) || !t.isIdentifier(x.callee)) return;
        const name = x.callee.name;
        if ((name === RT.canvasText || name === RT.canvasMeasure) && t.isNullLiteral(x.arguments[name === RT.canvasText ? 2 : 1])) out.draws = true;
        if (helpers.has(name)) out.calls.add(name);
      });
      return out;
    };
    const info = new Map([...helpers].map(([k, n]) => [k, callsIn(n)]));
    const drawing = new Set([...info].filter(([, v]) => v.draws).map(([k]) => k));
    for (let grew = true; grew; ) {
      grew = false;
      for (const [k, v] of info) if (!drawing.has(k) && [...v.calls].some((x) => drawing.has(x))) { drawing.add(k); grew = true; }
    }
    if (drawing.size) {
      traverse(ast, {
        CallExpression(p) {
          if (!t.isIdentifier(p.node.callee) || !drawing.has(p.node.callee.name) || p.node.__lxIn) return;
          if (p.scope.getBinding(p.node.callee.name)?.scope !== p.scope.getProgramParent()) return;
          const own = canvasWords(p);
          if (t.isNullLiteral(own)) return;
          p.node.__lxIn = true;
          usesIn = true;
          p.replaceWith(t.callExpression(t.identifier(RT.lxIn), [own, t.arrowFunctionExpression([], p.node)]));
        },
      });
    }
  }

  // useLx at the top of every component that shows words through lx (hooks: always first, never conditional).
  traverse(ast, {
    Function(p) {
      if (!p.node.__lx) return;
      if (!t.isBlockStatement(p.node.body)) p.node.body = t.blockStatement([t.returnStatement(p.node.body)]);
      p.node.body.body.unshift(t.variableDeclaration("const", [t.variableDeclarator(t.identifier(RT.words), t.callExpression(t.identifier(RT.useLx), []))]));
    },
  });
  let usesUseLx = false;
  traverse(ast, { Identifier(p) { if (p.node.name === RT.useLx) usesUseLx = true; } });

  const out = outPath(src);
  const runtime = path.relative(path.dirname(out), path.join(OUT, "runtime")).split(path.sep).join("/");
  const names = [usesT && "T", usesLx && "lx", usesUseLx && "useLx", usesCv && "cv", usesCv && "cvs", usesCanvas && "canvasText", usesCanvas && "canvasMeasure", usesIn && "lxIn", usesSpell && "spell", usesPaint && "paint", usesGl && "glsl", usesGl && "glNum"].filter(Boolean);
  if (names.length) ast.program.body.unshift(t.importDeclaration(names.map((n) => t.importSpecifier(t.identifier(RT[n]), t.identifier(n))), t.stringLiteral(runtime.startsWith(".") ? runtime : `./${runtime}`)));
  const body = generate(ast, { retainLines: false, jsescOption: { minimal: true } }, code).code;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `// @ts-nocheck\n/* eslint-disable */\n// Made by scripts/library/convert.mjs from the owner's Themes folder (${path.relative(THEMES, src).split(path.sep).join("/")}): do not edit.\n${body}\n`);
  const asList = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { words: [...v.words], families: [...v.families], hexes: [...v.hexes], refs: [...v.refs], draws: v.draws, fresh: v.fresh }]));
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
  const got = { words: new Set(), families: new Set(), hexes: new Set(), draws: false, fresh: false };
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
      if (d.draws) got.draws = true;
      if (d.fresh) got.fresh = true;
      for (const r of d.refs) {
        if (info.decls[r]) walk(f, r);
        else if (info.imports[r]) walk(info.imports[r].file, info.imports[r].name);
      }
    }
  };
  walk(file, item.exp);
  // The made-up brand isn't one of its words: the store's name takes its place.
  const own = [...got.words].filter((w) => !item.brand || (w !== item.brand && w !== item.brand.toUpperCase()));
  manifest.items.push({ ...item, file: file.replace(/\.tsx$/, ""), families: [...got.families], hexes: [...got.hexes], words: own, draws: got.draws, fresh: got.fresh });
}
const GEN = "// Made by scripts/library/convert.mjs: do not edit.\n";
fs.mkdirSync(OUT, { recursive: true });

// The list, for bundle.mjs to finish (with each piece's file and styles) into src/library/index.gen.ts.
const cssKey = (file) => file.split("/").join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-");
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(manifest.items.map(({ id, kind, cat, name, brand, minH, blurb, tags, colors, file, draws, fresh }) => ({ id, kind, ...(cat ? { cat } : {}), name, brand, minH, ...(blurb ? { blurb } : {}), ...(tags ? { tags } : {}), ...(colors ? { colors } : {}), css: cssKey(file), ...(draws ? { draws: 1 } : {}), ...(fresh && !draws ? { fresh: 1 } : {}) }))));
// What a piece's panel offers: the words it shows, its colour families and its colours (6 digits); whether it draws
// words on a canvas (their size has a setting of its own).
fs.rmSync(path.join(LIB, "details"), { recursive: true, force: true });
fs.mkdirSync(path.join(LIB, "details"), { recursive: true });
for (const i of manifest.items) fs.writeFileSync(path.join(LIB, "details", `${i.id}.json`), JSON.stringify({ words: i.words, families: i.families, hexes: i.hexes, ...(i.draws ? { draws: true } : {}) }) + "\n");

// Each piece's entry: its component as the default export (bundle.mjs makes each its own file), and which file's
// classes it wears (build-css.mjs: css/<file>.css, kept to its pieces by .lx-f-<file>).
fs.rmSync(path.join(OUT, "entries"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "entries"), { recursive: true });
for (const item of manifest.items) {
  const from = `../${item.file}`;
  const piece = item.exp === "default" ? `import Piece from "${from}";` : `import { ${item.exp} as Piece } from "${from}";`;
  fs.writeFileSync(path.join(OUT, "entries", `${item.id}.tsx`), `${GEN}// @ts-nocheck\n${piece}\nexport default Piece;\n`);
}
console.log(`converted ${done.size} files, ${manifest.items.length} items`);
