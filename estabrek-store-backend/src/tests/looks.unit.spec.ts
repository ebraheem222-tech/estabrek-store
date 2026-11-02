import { describe, test, expect, beforeAll } from "vitest";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { checkTree } from "../lib/pageTree.js";

// The page editor's ready looks (estabrek-admin src/studio/looks, phase 10): every one, put on
// an element it fits the way the editor puts it, must pass the same check a page's tree passes
// before it's saved. Edges are drawings read from SVG, which needs the browser's DOMParser:
// the admin's own jsdom gives one here.

type N = { id: string; type: string; props: Record<string, unknown>; style?: unknown; motion?: unknown; children?: N[] };
type Ready = { id: string; kind: string; edge?: string };
type Looks = {
  LIBRARY: Ready[];
  withLook: (n: N, screen: string, r: Ready) => N;
  lookOps: (n: N, screen: string, r: Ready, edgeArt?: (svg: string) => unknown) => Array<{ op: string; props?: Record<string, unknown> }>;
};
const ADMIN = path.resolve(__dirname, "../../../estabrek-admin");
let looks: Looks;
let fits: (r: Ready, type: string) => boolean;
let decorArt: (svg: string, own?: boolean) => unknown;

beforeAll(async () => {
  const { JSDOM } = createRequire(path.join(ADMIN, "package.json"))("jsdom") as { JSDOM: new () => { window: { DOMParser: unknown } } };
  (globalThis as { DOMParser?: unknown }).DOMParser = new JSDOM().window.DOMParser;
  looks = (await import(pathToFileURL(path.join(ADMIN, "src/studio/looks/index.ts")).href)) as Looks;
  fits = ((await import(pathToFileURL(path.join(ADMIN, "src/studio/looks/core.ts")).href)) as { fits: typeof fits }).fits;
  decorArt = ((await import(pathToFileURL(path.join(ADMIN, "src/studio/decor.ts")).href)) as { decorArt: typeof decorArt }).decorArt;
}, 120_000);

const SAMPLE: Record<string, N> = {
  button: { id: "t", type: "button", props: { label: { ar: "تسوّق" }, href: "/shop", variant: "solid" } },
  heading: { id: "t", type: "heading", props: { level: 2, text: { ar: "عنوان" } } },
  text: { id: "t", type: "text", props: { text: { ar: "كلام" } } },
  image: { id: "t", type: "image", props: { src: "https://res.cloudinary.com/demo/image/upload/a.jpg" } },
  video: { id: "t", type: "video", props: { src: "https://res.cloudinary.com/demo/video/upload/a.mp4", controls: true } },
  icon: { id: "t", type: "icon", props: { name: "heart" } },
  stack: { id: "t", type: "stack", props: {}, children: [] },
  grid: { id: "t", type: "grid", props: {}, children: [] },
  section: { id: "t", type: "section", props: {}, children: [] },
};
const ORDER = Object.keys(SAMPLE);
const treeWith = (n: N) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: n.type === "section" ? [n] : [{ id: "s", type: "section", props: {}, children: [n] }] } });

describe("the editor's ready looks", () => {
  test("each passes the page's check on every element it fits it's tried on", () => {
    const bad: string[] = [];
    let tried = 0;
    for (const r of looks.LIBRARY) {
      const types = ORDER.filter((t) => fits(r, t));
      if (!types.length) bad.push(`${r.id}: fits nothing`);
      // Every fitting element for most looks would be slow: the first, and a box for those that fit boxes too.
      for (const type of [...new Set([types[0], types.find((t) => t === "stack"), types.find((t) => t === "section")])].filter(Boolean) as string[]) {
        const base = structuredClone(SAMPLE[type]);
        let n: N | null = base;
        if (r.kind === "edge") {
          const op = looks.lookOps(base, "base", r, (svg) => decorArt(svg, true))[0];
          n = op?.op === "setProps" ? { ...base, props: op.props! } : null;
        } else n = looks.withLook(base, "base", r);
        if (!n) {
          bad.push(`${r.id}: nothing put on`);
          continue;
        }
        tried++;
        const res = checkTree(treeWith(n));
        if (!res.ok) bad.push(`${r.id} on ${type}: ${res.issues.slice(0, 2).map((i) => `${i.path} ${i.message}`).join("; ")}`);
      }
    }
    expect(bad.slice(0, 12)).toEqual([]);
    expect(tried).toBeGreaterThan(1200);
  }, 120_000);

  test("on a phone, a look goes on the phone's own look", () => {
    const r = looks.LIBRARY.find((x) => x.id === "btn-pop-yellow-sq")!;
    const n = looks.withLook(structuredClone(SAMPLE.button), "mobile", r);
    const res = checkTree(treeWith(n));
    expect(res.ok).toBe(true);
    expect((n.style as Record<string, unknown>).mobile).toMatchObject({ bg: "#fde047" });
    expect((n.style as Record<string, unknown>).base).toBeUndefined();
  });
});
