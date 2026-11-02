// Builds the editor's icon library (public/icon-sets/*.json) from the icon packages:
// Lucide (ISC), Tabler (MIT) and Phosphor (MIT). The packages aren't the admin's own
// dependencies; install them anywhere and pass that node_modules folder:
//
//   npm install --ignore-scripts lucide-static @tabler/icons @phosphor-icons/core   (in a scratch folder)
//   node scripts/gen-icon-sets.mjs <that folder>/node_modules
//
// Each set keeps its icons as plain drawing data ([tag, settings] pairs, the same rules as
// the page's drawings: studio/svgArt.ts), with each icon's search words and group.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const from = process.argv[2];
if (!from) throw new Error("Pass the node_modules folder that holds lucide-static, @tabler/icons and @phosphor-icons/core");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icon-sets");
mkdirSync(out, { recursive: true });

// The drawing rules (studio/svgArt.ts, the shop's pageTree/svgArt.tsx and the backend's lib/svgArt.ts).
const TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
const NUM = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?(%|px)?$/i;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]*$/;
const POINTS = /^[0-9eE\s,.+-]*$/;
const TRANSFORM = /^(\s*(matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+0-9eE.,\s]*\)\s*,?)*\s*$/;
const num = (v) => v.length <= 24 && NUM.test(v.trim());
const ATTRS = {
  d: (v) => v.length <= 20000 && PATH.test(v),
  points: (v) => v.length <= 20000 && POINTS.test(v),
  cx: num, cy: num, r: num, rx: num, ry: num, x: num, y: num, x1: num, y1: num, x2: num, y2: num, width: num, height: num,
  opacity: num, "stroke-width": num, "fill-opacity": num, "stroke-opacity": num,
  fill: (v) => v === "none" || v === "currentColor",
  stroke: (v) => v === "none" || v === "currentColor",
  "stroke-linecap": (v) => ["butt", "round", "square"].includes(v),
  "stroke-linejoin": (v) => ["miter", "round", "bevel"].includes(v),
  "fill-rule": (v) => ["nonzero", "evenodd"].includes(v),
  "clip-rule": (v) => ["nonzero", "evenodd"].includes(v),
  transform: (v) => v.length <= 300 && TRANSFORM.test(v),
};
// Settings an icon repeats from its set's own (dropped, the set's group carries them).
const SAME = { fill: true, stroke: true, "stroke-width": true, "stroke-linecap": true, "stroke-linejoin": true };

let dropped = 0;
/** An icon's shapes kept as [tag, settings] (or [tag, settings, children]); null when one isn't allowed. */
function clean(nodes, base) {
  const list = [];
  for (const n of nodes) {
    const [t, a, c] = n;
    if (!TAGS.has(t)) return null;
    const keep = {};
    for (const [k, raw] of Object.entries(a ?? {})) {
      const v = String(raw);
      if (SAME[k] && base[k] === v) continue;
      if (!ATTRS[k]) {
        if (k === "key" || k === "class" || k === "data-name") continue;
        return null;
      }
      if (!ATTRS[k](v)) return null;
      keep[k] = v;
    }
    // A clear square some sets start with (so the box is the full size) draws nothing.
    if (t === "path" && keep.stroke === "none" && /^M0 0h(24|256)v(24|256)H0z$/.test(keep.d ?? "")) continue;
    if (c?.length) {
      const kids = clean(c, base);
      if (!kids) return null;
      list.push([t, keep, kids]);
    } else list.push([t, keep]);
  }
  return list.length ? list : null;
}

/** A small SVG file's shapes, as nested [tag, settings, children]. */
function parseSvg(text) {
  const root = [];
  const stack = [root];
  for (const m of text.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, rest, self] = m;
    if (tag === "svg" || tag === "title") continue;
    if (closing) {
      stack.pop();
      continue;
    }
    const a = {};
    for (const am of rest.matchAll(/([\w:-]+)="([^"]*)"/g)) a[am[1]] = am[2];
    const node = [tag, a, []];
    stack[stack.length - 1].push(node);
    if (!self) stack.push(node[2]);
  }
  const tidy = (list) => list.map(([t, a, c]) => (c.length ? [t, a, tidy(c)] : [t, a]));
  return tidy(root);
}

const words = (list) => [...new Set(list.map((w) => String(w).toLowerCase().trim()).filter(Boolean))].join(" ");

function write(key, viewBox, base, icons, licence) {
  const kept = [];
  for (const [name, tags, group, nodes] of icons) {
    const shapes = clean(nodes, base);
    if (!shapes) {
      dropped++;
      continue;
    }
    kept.push([name, tags, group, shapes]);
  }
  kept.sort((a, b) => a[0].localeCompare(b[0]));
  const body = JSON.stringify({ v: 1, licence, viewBox, base, icons: kept });
  writeFileSync(join(out, `${key}.json`), body);
  console.log(`${key}: ${kept.length} icons, ${(body.length / 1024).toFixed(0)} KB`);
  return kept.length;
}

const STROKE = { fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };
const FILLED = { fill: "currentColor", stroke: "none" };
const counts = {};

// Lucide: line icons on 24×24.
{
  const nodes = JSON.parse(readFileSync(join(from, "lucide-static", "icon-nodes.json"), "utf8"));
  const tags = JSON.parse(readFileSync(join(from, "lucide-static", "tags.json"), "utf8"));
  counts.lucide = write("lucide", "0 0 24 24", STROKE, Object.entries(nodes).map(([name, n]) => [name, words([...name.split("-"), ...(tags[name] ?? [])]), "", n]), "Lucide, ISC licence");
}

// Tabler: line icons and a filled set, both 24×24.
{
  const meta = JSON.parse(readFileSync(join(from, "@tabler", "icons", "icons.json"), "utf8"));
  const info = (name) => {
    const m = meta[name] ?? {};
    return [words([...name.split("-"), ...(m.tags ?? []), m.category ?? ""]), String(m.category ?? "").toLowerCase()];
  };
  for (const [key, file, base] of [["tabler", "tabler-nodes-outline.json", STROKE], ["tabler-filled", "tabler-nodes-filled.json", FILLED]]) {
    const nodes = JSON.parse(readFileSync(join(from, "@tabler", "icons", file), "utf8"));
    counts[key] = write(key, "0 0 24 24", base, Object.entries(nodes).map(([name, n]) => [name, ...info(name), n]), "Tabler Icons, MIT licence");
  }
}

// Phosphor: six weights, filled shapes on 256×256.
{
  const core = join(from, "@phosphor-icons", "core");
  const { icons } = await import(pathToFileURL(join(core, "dist", "index.mjs")).href);
  const meta = new Map(icons.map((i) => [i.name, i]));
  for (const weight of ["regular", "thin", "light", "bold", "fill", "duotone"]) {
    const dir = join(core, "assets", weight);
    const list = readdirSync(dir)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => {
        const name = f.slice(0, -4).replace(weight === "regular" ? /$^/ : new RegExp(`-${weight}$`), "");
        const m = meta.get(name) ?? {};
        return [name, words([...name.split("-"), ...(m.tags ?? []).filter((t) => !t.startsWith("*")), ...(m.categories ?? [])]), String(m.categories?.[0] ?? ""), parseSvg(readFileSync(join(dir, f), "utf8"))];
      });
    counts[`ph-${weight}`] = write(`ph-${weight}`, "0 0 256 256", { fill: "currentColor" }, list, "Phosphor Icons, MIT licence");
  }
}

console.log("dropped (a shape or setting outside the drawing rules):", dropped);
console.log(JSON.stringify(counts));
