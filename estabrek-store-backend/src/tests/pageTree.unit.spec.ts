import { describe, test, expect } from "vitest";
import { NODE_PROPS, TREE_LIMITS, checkTree, legacySectionIds, storedTree, syncWithSections, treeFromSections } from "../lib/pageTree.js";
import { PREVIEW_TTL_MS, previewPageId, previewToken } from "../lib/previewToken.js";

// Pages as a tree of elements (src/lib/pageTree.ts); no database needed.
const page = (children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", children } });
const section = (id: string, children: unknown[] = [], extra: Record<string, unknown> = {}) => ({ id, type: "section", children, ...extra });
const issuesOf = (input: unknown) => {
  const r = checkTree(input);
  return r.ok ? [] : r.issues;
};

describe("checking a page tree", () => {
  test("dimension and movement settings preserve partial responsive overrides", () => {
    const style = {
      base: { constraints: { minWidth: 80, maxWidth: 600, minHeight: 40, maxHeight: 800, aspectRatio: 2 }, movement: "vertical" },
      tablet: { constraints: { maxWidth: 400 }, movement: "horizontal" },
      mobile: { constraints: {}, movement: "free" },
    };
    const result = checkTree(page([section("s", [], { style })]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root.children![0].style).toEqual(style);
    expect(issuesOf(page([section("s", [], { style: { base: { movement: "both" } } })]))).toEqual([]);
    expect(issuesOf(page([section("s", [], { style: { base: { constraints: { minWidth: 400, maxWidth: 200 } } } })])).length).toBeGreaterThan(0);
  });

  test("analytic dimensions retain six decimals and inherited constraints cannot become infeasible",()=>{
    const valid=page([section("s",[],{style:{base:{width:"259.123455px",height:"124.181898px",constraints:{maxWidth:400}},mobile:{constraints:{minWidth:300}}}})]);
    expect(issuesOf(valid)).toEqual([]);
    expect(issuesOf(page([section("s",[],{style:{base:{constraints:{maxWidth:200}},mobile:{constraints:{minWidth:300}}}})])).some(issue=>issue.path.endsWith("mobile.constraints"))).toBe(true);
    expect(issuesOf(page([section("s",[],{style:{base:{width:"1.1234567px"}}})])).length).toBeGreaterThan(0);
  });

  test("dimension settings reject unsafe fields without a database", () => {
    const input = (base: unknown) => page([section("s", [], { style: { base } })]);
    for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight"]) {
      for (const bad of [7.99, 10000, NaN, Infinity, "100", null]) {
        expect(issuesOf(input({ constraints: { [key]: bad } })).length, `${key}:${bad}`).toBeGreaterThan(0);
      }
    }
    for (const bad of [0, .009, 100.01, NaN, Infinity, "2", null]) {
      expect(issuesOf(input({ constraints: { aspectRatio: bad } })).length, String(bad)).toBeGreaterThan(0);
    }
    expect(issuesOf(input({ constraints: { minWidth: 8, maxWidth: 9999, aspectRatio: .01 } }))).toEqual([]);
    expect(issuesOf(input({ constraints: { aspectRatio: 100 } }))).toEqual([]);
    expect(issuesOf(input({ movement: "diagonal" })).length).toBeGreaterThan(0);
  });

  test("a page with sections, a grid and content comes back clean", () => {
    const r = checkTree(
      page([
        section("hero", [
          { id: "h1", type: "heading", props: { text: { ar: "  أهلاً  ", en: "Hello", he: "" }, level: 1 }, style: { base: { size: 48, textAlign: "center" }, mobile: { size: 32 } } },
          {
            id: "cols",
            type: "grid",
            style: { base: { columns: 3, gap: 24 } },
            children: [
              { id: "pic", type: "image", props: { src: "https://res.cloudinary.com/x/a.jpg", alt: { ar: "صورة" } }, style: { base: { col: "1 / 3", radius: 16 } } },
              { id: "go", type: "button", props: { label: { ar: "تسوّق" }, href: "/shop" } },
            ],
          },
        ], { props: { contained: true }, name: "  Opening " }),
        { id: "old", type: "legacy", props: { sectionId: "cm123" } },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const hero = r.tree.root.children![0];
    expect(hero.name).toBe("Opening");
    expect(hero.children![0].props).toEqual({ text: { ar: "أهلاً", en: "Hello" }, level: 1 });
    // Defaults are filled: a button is solid unless it says otherwise.
    expect(hero.children![1].children![1].props).toMatchObject({ variant: "solid" });
    expect(legacySectionIds(r.tree)).toEqual(["cm123"]);
  });

  test("elements go where they belong", () => {
    const where = (input: unknown) => issuesOf(input).map((i) => `${i.path}: ${i.message}`);
    expect(where(page([{ id: "t", type: "text", props: { text: { ar: "x" } } }]))[0]).toMatch(/root\.children\[0\]\.type: “text” goes inside a section/);
    expect(where(page([section("s", [{ id: "l", type: "legacy", props: { sectionId: "a" } }])]))[0]).toMatch(/goes straight on the page/);
    expect(where(page([section("s", [{ id: "t", type: "text", props: { text: {} }, children: [{ id: "u", type: "text" }] }])]))[0]).toMatch(/can't hold other elements/);
    expect(where({ version: 1, root: { id: "s", type: "section" } })[0]).toMatch(/starts with a page/);
    expect(where(page([section("s", [{ id: "x", type: "hologram" }])]))[0]).toMatch(/Unknown element “hologram”/);
  });

  test("columns hold 1–4 cells, each cell holds any content, and columns nest once", () => {
    const cell = (id: string, children: unknown[] = [], style?: unknown) => ({ id, type: "cell", children, ...(style ? { style } : {}) });
    const cols = (id: string, cells: unknown[], extra: Record<string, unknown> = {}) => ({ id, type: "columns", children: cells, ...extra });
    const r = checkTree(
      page([
        section("s", [
          cols("c", [
            cell("a", [{ id: "t", type: "text", props: { text: { ar: "نص" } } }, { id: "b", type: "button", props: { label: { ar: "زر" }, href: "/shop" } }], { base: { shape: "arch", bg: "accent-soft", pad: [24, 24, 24, 24], justify: "center" } }),
            cell("v", [{ id: "vid", type: "video", props: { src: "/clips/a.mp4", autoplay: true } }, cols("inner", [cell("i1"), cell("i2")])]),
          ], { props: { phone: "reverse" }, style: { base: { widths: [1, 2], gap: 24 }, tablet: { widths: [1, 1] } } }),
        ]),
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.tree.root.children![0].children![0];
    expect(c.props).toEqual({ phone: "reverse" });
    expect(c.style).toEqual({ base: { widths: [1, 2], gap: 24 }, tablet: { widths: [1, 1] } });
    expect(c.children!.map((x) => x.children!.length)).toEqual([2, 2]);

    const where = (input: unknown) => issuesOf(input).map((i) => `${i.path}: ${i.message}`);
    // Only cells straight inside columns, and cells only there.
    expect(where(page([section("s", [cols("c", [{ id: "t", type: "text", props: { text: { ar: "x" } } }])])]))[0]).toMatch(/goes inside a cell of the columns/);
    expect(where(page([section("s", [cell("x")])]))[0]).toMatch(/A cell goes inside columns/);
    expect(where(page([section("s", [cols("c", [])])]))[0]).toMatch(/Columns hold 1–4 cells/);
    expect(where(page([section("s", [cols("c", ["a", "b", "c", "d", "e"].map((x) => cell(x)))])]))[0]).toMatch(/Columns hold 1–4 cells/);
    // A cell takes no section, old section or scene.
    expect(where(page([section("s", [cols("c", [cell("a", [section("in")])])])]))[0]).toMatch(/goes straight on the page/);
    // Columns › cell › columns is fine; a third level is not.
    const third = cols("c1", [cell("a", [cols("c2", [cell("b", [cols("c3", [cell("x")])])])])]);
    expect(where(page([section("s", [third])]))[0]).toMatch(/Columns go at most 2 deep/);
    // Widths are 1–12 parts, at most 4; shapes are from the list.
    const look = (base: unknown) => page([section("s", [cols("c", [cell("a")], { style: { base } })])]);
    expect(issuesOf(look({ widths: [4, 8] }))).toEqual([]);
    expect(issuesOf(look({ widths: [0, 2] })).length).toBe(1);
    expect(issuesOf(look({ widths: [1, 1, 1, 1, 1] })).length).toBe(1);
    expect(issuesOf(look({ widths: [1.5, 2] })).length).toBe(1);
    expect(issuesOf(look({ shape: "octopus" })).length).toBe(1);
    expect(issuesOf(page([section("s", [cols("c", [cell("a")], { props: { phone: "sideways" } })])])).length).toBe(1);
  });

  test("a slider holds up to 12 pictures and clips, in a cell or a section, with safe addresses only", () => {
    const slide = (src: string, extra: Record<string, unknown> = {}) => ({ src, ...extra });
    const slider = (props: Record<string, unknown>) => ({ id: "sl", type: "slider", props });
    const inCell = (props: Record<string, unknown>) => page([section("s", [{ id: "c", type: "columns", children: [{ id: "a", type: "cell", children: [slider(props)] }] }])]);
    const r = checkTree(
      inCell({
        slides: [
          slide("/editorial/a.webp", { caption: { ar: "  موسم  ", en: "", he: "עונה" }, alt: { ar: "صورة" }, href: "/shop" }),
          slide("https://res.cloudinary.com/x/clip.mp4", { kind: "video" }),
        ],
        autoplay: 5,
        aspect: "4 / 5",
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.tree.root.children![0].children![0].children![0].children![0];
    // Words trimmed, empty languages dropped; a slide is a picture unless it says otherwise; arrows, dots and looping are on.
    expect(s.props).toEqual({
      slides: [
        { src: "/editorial/a.webp", kind: "image", caption: { ar: "موسم", he: "עונה" }, alt: { ar: "صورة" }, href: "/shop" },
        { src: "https://res.cloudinary.com/x/clip.mp4", kind: "video" },
      ],
      autoplay: 5,
      loop: true,
      arrows: true,
      dots: true,
      aspect: "4 / 5",
    });
    // Straight in a section too, and an empty one is fine (the editor adds its slides).
    expect(issuesOf(page([section("s", [slider({})])]))).toEqual([]);
    expect(checkTree(page([section("s", [slider({ autoplay: undefined, loop: false })])])).ok).toBe(true);

    const where = (input: unknown) => issuesOf(input).map((i) => `${i.path}: ${i.message}`);
    expect(where(inCell({ slides: Array.from({ length: 13 }, (_, i) => slide(`/p/${i}.webp`)) }))[0]).toMatch(/props\.slides/);
    for (const bad of ["javascript:alert(1)", "http://insecure.com/a.jpg", "//evil.com/a.mp4", "/a\"onerror=x"]) expect(where(inCell({ slides: [slide(bad)] }))[0], bad).toMatch(/props\.slides\[0\]\.src: Not a safe file address/);
    expect(where(inCell({ slides: [slide("/a.webp", { href: "javascript:alert(1)" })] }))[0]).toMatch(/slides\[0\]\.href: Not a safe link/);
    expect(where(inCell({ slides: [slide("/a.webp", { kind: "gif" })] }))[0]).toMatch(/slides\[0\]\.kind/);
    // Turning by itself: 2–30 whole seconds, or not at all; the frame's shape like 16 / 9.
    for (const autoplay of [1, 31, 2.5, "5"]) expect(issuesOf(inCell({ autoplay })).length, String(autoplay)).toBe(1);
    for (const aspect of ["0 / 9", "16:9", "16 / 9; x", "100 / 1"]) expect(issuesOf(inCell({ aspect })).length, aspect).toBe(1);
    // A leaf: nothing goes inside it.
    expect(where(page([section("s", [{ ...slider({}), children: [{ id: "t", type: "text", props: { text: { ar: "x" } } }] }])]))[0]).toMatch(/can't hold other elements/);
  });

  test("any element can be turned, moved, covered, shadowed, placed over its container and set to move", () => {
    const vid = (style: unknown, motion?: unknown) => page([section("s", [{ id: "v", type: "video", props: { src: "/clips/a.mp4" }, style, ...(motion ? { motion } : {}) }])]);
    const look = {
      base: {
        rotateX: 28, rotateY: -12, rotateZ: 3, perspective: 1400, scale: 0.92, moveX: -20, moveY: 40, origin: "top",
        overlay: { color: "#000000", to: "accent", angle: 180, opacity: 0.5, blend: "multiply" },
        shade: { x: 0, y: 24, blur: 60, color: "#00000040", follow: true },
        glow: { color: "accent", size: 30 },
        layer: { x: 50, y: 100, anchor: "bottom" }, z: 3, opacity: 0.5,
      },
      mobile: { layer: false, rotateX: 0 },
    };
    const motion = {
      enter: { kind: "up", duration: 0.8, delay: 0.1, ease: "strong", distance: 40, stagger: 0.08 },
      scroll: { kind: "keys", from: { rx: 25, scale: 0.9, y: 60 }, to: { rx: 0, scale: 1, y: 0 }, start: 90, end: 30 },
      loop: { kind: "float", duration: 4, amount: 1.5 },
      hover: { kind: "tilt", amount: 1 },
      fx: { kind: "shine", speed: 1.2, color: "white" },
      phone: "lite",
    };
    const r = checkTree(vid(look, motion));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = r.tree.root.children![0].children![0];
    expect(v.style).toEqual(look);
    expect(v.motion).toEqual(motion);
    // Out of range or unknown is refused, with where it is.
    const bad = (base: unknown) => issuesOf(vid({ base })).map((i) => i.path);
    expect(bad({ rotateX: 400 })).toEqual(["root.children[0].children[0].style.base.rotateX"]);
    expect(bad({ overlay: { color: "red", opacity: 0.5 } })[0]).toBe("root.children[0].children[0].style.base.overlay.color");
    expect(bad({ overlay: { color: "#000", opacity: 2 } }).length).toBe(1);
    expect(bad({ layer: { x: 140, y: 0 } }).length).toBe(1);
    expect(bad({ layer: true }).length).toBe(1);
    expect(bad({ shade: { x: 0, y: 0, blur: 900, color: "#000" } }).length).toBe(1);
    const moves = (m: unknown) => issuesOf(vid({}, m)).map((i) => i.path);
    expect(moves({ enter: { kind: "explode" } })).toEqual(["root.children[0].children[0].motion.enter.kind"]);
    expect(moves({ loop: { kind: "float", duration: 99 } }).length).toBe(1);
    expect(moves({ scroll: { kind: "keys", to: { rx: 999 } } }).length).toBe(1);
    // The mouse: a short play, a light or a ripple in a colour, springs.
    for (const kind of ["bounce", "shake", "jello", "heartbeat", "flip", "pop", "spring", "jelly"]) expect(moves({ hover: { kind, amount: 1.5 } }), kind).toEqual([]);
    expect(moves({ hover: { kind: "spotlight", color: "accent-soft", amount: 2 } })).toEqual([]);
    expect(moves({ hover: { kind: "ripple", color: "red" } })).toEqual(["root.children[0].children[0].motion.hover.color"]);
    expect(moves({ hover: { kind: "explode" } }).length).toBe(1);
    // Words: letters, lines, scramble, typed, a number counting up; lit up with the scroll; a typing loop; a pinned section.
    for (const kind of ["letters", "lines", "scramble", "typewriter", "count"]) expect(moves({ enter: { kind, duration: 1.2 } }), kind).toEqual([]);
    expect(moves({ scroll: { kind: "words", start: 85, end: 45 }, loop: { kind: "type", duration: 3 } })).toEqual([]);
    expect(moves({ scroll: { kind: "pin", length: 150 } })).toEqual([]);
    expect(moves({ scroll: { kind: "pin", length: 900 } }).length).toBe(1);
    // The old sections and scenes don't take motion.
    expect(issuesOf(page([{ id: "old", type: "legacy", props: { sectionId: "a" }, motion: { enter: { kind: "fade" } } }]))[0].message).toMatch(/moves with its own settings/);
    // Empty motion is left out.
    const plain = checkTree(vid({}, {}));
    expect(plain.ok && plain.tree.root.children![0].children![0].motion).toBeUndefined();
  });

  test("words get a family, fluid size, caps, lines and paint; any element gets a look for the mouse, focus and press", () => {
    const head = (style: unknown) => page([section("s", [{ id: "h", type: "heading", props: { text: { ar: "عنوان" } }, style }])]);
    const look = {
      base: {
        family: "reem-kufi", italic: true, size: 64, sizeMin: 32, caps: "upper", lines: 2, balance: "balance", textColumns: 2, wordSpacing: 4,
        decoration: { line: "underline", style: "wavy", color: "accent", width: 2, offset: 6 },
        stroke: { width: 1.5, color: "#000000" },
        fill: { color: "accent", to: "#ffd1e3", via: "white", angle: 90 },
        shadows: [{ x: 0, y: 2, blur: 0, color: "#00000033" }, { x: 4, y: 4, blur: 12, color: "accent" }],
        gradient: { color: "bg", to: "accent-soft", angle: 45, radial: true },
        backdrop: { blur: 12, saturate: 1.4 },
        filters: { gray: 1, bright: 1.1, hue: -20 },
        transition: { duration: 0.4, ease: "back", delay: 0.05 },
        hover: { color: "accent", scale: 1.05, moveY: -4, shadow: "lg", filters: { gray: 0 }, decoration: { line: "underline" } },
        focused: { border: { width: 2, color: "accent" }, glow: { color: "accent", size: 12 } },
        pressed: { scale: 0.97, opacity: 0.9 },
      },
      mobile: { size: 40, hover: { color: "text" } },
    };
    const r = checkTree(head(look));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].style).toEqual(look);
    const bad = (base: unknown) => issuesOf(head({ base })).map((i) => i.path.replace("root.children[0].children[0].style.base.", ""));
    expect(bad({ family: "Cairo; color:red" })).toEqual(["family"]);
    expect(bad({ caps: "shout" })).toEqual(["caps"]);
    expect(bad({ lines: 0 })).toEqual(["lines"]);
    expect(bad({ shadows: Array(5).fill({ x: 0, y: 0, blur: 0, color: "#000" }) })).toEqual(["shadows"]);
    expect(bad({ fill: { color: "accent" } })).toEqual(["fill.to"]);
    expect(bad({ filters: { blur: 99 } })).toEqual(["filters.blur"]);
    expect(bad({ transition: { duration: 9 } })).toEqual(["transition.duration"]);
    // A state changes the look, never the size or place: those keys are dropped, bad values refused.
    expect(bad({ hover: { scale: 9 } })).toEqual(["hover.scale"]);
    const sized = checkTree(head({ base: { hover: { size: 90, pad: [1, 1, 1, 1], color: "accent" } } }));
    expect(sized.ok && sized.tree.root.children![0].children![0].style).toEqual({ base: { hover: { color: "accent" } } });
    // States don't nest.
    const nested = checkTree(head({ base: { hover: { hover: { color: "accent" } } } }));
    expect(nested.ok && nested.tree.root.children![0].children![0].style).toEqual({ base: { hover: {} } });
  });

  test("a heading, text or button can say its words carry formatting", () => {
    const r = checkTree(page([section("s", [
      { id: "h", type: "heading", props: { text: { ar: "[b]عرض[/b] اليوم" }, rich: true } },
      { id: "t", type: "text", props: { text: { ar: "x" }, rich: false } },
      { id: "b", type: "button", props: { label: { ar: "[color=accent]تسوّق[/color]" }, href: "/shop", rich: true } },
    ])]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tree.root.children![0].children!.map((n) => n.props.rich)).toEqual([true, false, true]);
    expect(issuesOf(page([section("s", [{ id: "h", type: "heading", props: { text: { ar: "x" }, rich: "yes" } }])])).length).toBe(1);
  });

  test("a drawing is kept as checked data: shapes and safe values only", () => {
    const blob = { viewBox: "0 0 200 200", morph: "M10 10 C 50 0 150 0 190 10 Z", nodes: [
      { t: "defs", a: {}, c: [{ t: "linearGradient", a: { id: "g1", x1: "0", y1: "0", x2: "1", y2: "1" }, c: [{ t: "stop", a: { offset: "0%", "stop-color": "accent" } }, { t: "stop", a: { offset: "100%", "stop-color": "#ffd1e3" } }] }] },
      { t: "path", a: { d: "M10 100 C 40 10 160 10 190 100 S 160 190 100 190 Z", fill: "url(#g1)", stroke: "currentColor", "stroke-width": "4", "stroke-linecap": "round" } },
      { t: "g", a: { transform: "translate(10, 20) rotate(15)", opacity: "0.6" }, c: [{ t: "circle", a: { cx: "50", cy: "50", r: "12", fill: "white" } }] },
    ] };
    const draw = (art: unknown, extra: Record<string, unknown> = {}) => page([section("s", [{ id: "d", type: "svg", props: { art, ...extra } }])]);
    const r = checkTree(draw(blob, { shape: "blob", knobs: { points: 7, wobble: 0.4, seed: 3 }, label: { ar: "فقاعة" } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props).toMatchObject({ art: blob, shape: "blob", knobs: { points: 7 } });
    // Anything that could run, link out or load from elsewhere is refused.
    const bad = (nodes: unknown[], viewBox = "0 0 10 10") => issuesOf(draw({ viewBox, nodes })).map((i) => i.message)[0];
    expect(bad([{ t: "script", a: {} }])).toMatch(/Not a shape a drawing may hold: script/);
    expect(bad([{ t: "foreignObject", a: {} }])).toMatch(/foreignObject/);
    expect(bad([{ t: "image", a: {} }])).toMatch(/image/);
    expect(bad([{ t: "path", a: { d: "M0 0", onload: "alert(1)" } }])).toMatch(/Not a setting a shape may have: onload/);
    expect(bad([{ t: "path", a: { d: "M0 0", href: "https://x.test/a.svg" } }])).toMatch(/href/);
    expect(bad([{ t: "path", a: { d: "M0 0", fill: "url(https://x.test/a)" } }])).toMatch(/Not a safe value for fill/);
    expect(bad([{ t: "path", a: { d: "M0 0 <script>" } }])).toMatch(/Not a safe value for d/);
    expect(bad([{ t: "g", a: { transform: "translate(1,1) expression(alert)" } }])).toMatch(/transform/);
    expect(bad([{ t: "path", a: { d: "M0 0", fill: "red" } }])).toMatch(/fill/);
    expect(bad([{ t: "path", a: { d: "M0 0" } }], "javascript:1")).toMatch(/view box/);
    expect(bad([])).toMatch(/at least one shape/);
    let deep: any = { t: "path", a: { d: "M0 0" } };
    for (let i = 0; i < 12; i++) deep = { t: "g", a: {}, c: [deep] };
    expect(bad([deep])).toMatch(/nested more than/);
    expect(bad(Array.from({ length: 700 }, () => ({ t: "circle", a: { r: "1" } })))).toMatch(/More than 600 shapes/);
  });

  test("any element's speed settings are kept, checked the same on every kind", () => {
    const perf = { tier: "light", fps: 30, offscreen: "pause", rest: "keep", phone: "light", strong: true };
    const tree = (type: string, props: Record<string, unknown>) => page([section("s", [{ id: "x", type, props: { ...props, perf } }])]);
    for (const [type, props] of [["image", { src: "/a.webp" }], ["model3d", { model: "sneaker" }], ["heading", { text: { ar: "x" } }]] as const) {
      const r = checkTree(tree(type, props));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.tree.root.children![0].children![0].props.perf).toEqual(perf);
    }
    const bad = (p: unknown) => issuesOf(page([section("s", [{ id: "x", type: "image", props: { src: "/a.webp", perf: p } }])])).map((i) => i.path).join(" ");
    expect(bad({ fps: 144 })).toMatch(/props\.perf\.fps/);
    expect(bad({ tier: "turbo" })).toMatch(/props\.perf\.tier/);
    // An empty one is dropped.
    const r = checkTree(page([section("s", [{ id: "x", type: "image", props: { src: "/a.webp", perf: {} } }])]));
    expect(r.ok && r.tree.root.children![0].children![0].props.perf).toBeFalsy();
  });

  test("a page can turn the shop's automatic lightening off", () => {
    const r = checkTree({ version: 1, root: { id: "page", type: "page", props: { perfAuto: false }, children: [] } });
    expect(r.ok && r.tree.root.props.perfAuto).toBe(false);
    expect(issuesOf({ version: 1, root: { id: "page", type: "page", props: { perfAuto: "no" }, children: [] } }).map((i) => i.path).join(" ")).toMatch(/perfAuto/);
  });

  test("a shape by equations in a screen's look: corners, edges, a typed equation, a whole shape", () => {
    const form = { corners: { tl: { kind: "squircle", size: 40, k: 5 }, br: { kind: "bezier", size: 30, c: [0, 0.5, 0.5, 0] } }, edges: { bottom: { kind: "wave", depth: 14, count: 6, flow: 4 }, top: { kind: "fn", depth: 20, fn: "0.5 + 0.5*sin(x*PI*4)" } } };
    const r = checkTree(page([section("s", [{ id: "x", type: "image", props: { src: "/a.webp" }, style: { base: { form }, mobile: { form: { whole: { kind: "polygon", n: 6, inner: 0.6 } } } } }])]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].style?.base?.form).toEqual(form);
    const bad = (f: unknown) => issuesOf(page([section("s", [{ id: "x", type: "image", props: { src: "/a.webp" }, style: { base: { form: f } } }])])).map((i) => i.path).join(" ");
    expect(bad({ edges: { top: { kind: "fn", fn: "alert(1)" } } })).toMatch(/form\.edges\.top\.fn/);
    expect(bad({ edges: { top: { kind: "fn", fn: "x.constructor" } } })).toMatch(/form\.edges\.top\.fn/);
    expect(bad({ corners: { tl: { kind: "round", size: 9999 } } })).toMatch(/form\.corners\.tl\.size/);
    expect(bad({ whole: { kind: "polar" } })).toMatch(/form\.whole/);
  });

  test("an element's own CSS: kept when it stays on the element, refused when it reaches outside", () => {
    const tree = (code: unknown) => page([section("s", [{ id: "btn", type: "button", props: { label: { en: "Go" }, href: "/shop", code } }])]);
    const good = { tw: "rounded-xl hover:scale-105", css: "color: red;", out: ".pt-btn{border-radius:12px;color:red}.pt-btn:hover{scale:1.05}@media (min-width:768px){.pt-btn{padding:20px}}" };
    const r = checkTree(tree(good));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props.code).toEqual(good);
    const bad = (out: string) => issuesOf(tree({ out })).map((i) => `${i.path} ${i.message}`).join(" ");
    expect(bad("body{display:none}")).toMatch(/props\.code\.out .*outside the element/);
    expect(bad(".pt-btn{color:red}} body{display:none}{")).toMatch(/props\.code\.out/);
    expect(bad(".pt-btn{background:url(https://tracker.example/x.png)}")).toMatch(/url/);
    expect(bad("@import url(/x.css);.pt-btn{}")).toMatch(/not allowed/);
    expect(bad(".pt-btn{content:\"</style><script>\"}")).toMatch(/not allowed/);
    expect(bad(".pt-other{color:red}")).toMatch(/outside the element/);
  });

  test("physics: an element's own, a world on what holds others, its bodies' settings, and keyframes falling", () => {
    const world = { on: "view", start: "drop", gx: 0, gy: 1, walls: "open", bounce: 0.5, drag: true, pointer: "push", wind: 0.3, click: "burst", again: 8 };
    const body = { shape: "circle", bounce: 0.8, mass: 2, hang: "rope" };
    const physics = { kind: "drop", amount: 1.4, bounce: 0.5 };
    const keys = { on: "view", duration: 3, parts: { self: [{ at: 0, y: -300 }, { at: 40, y: 0, ease: "fall" }, { at: 100, y: 0 }] } };
    const r = checkTree(page([{ ...section("s", [{ id: "x", type: "heading", props: { text: { ar: "x" }, body }, motion: { physics, keys } }]), props: { world } }]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.tree.root.children![0].props.world).toEqual(world);
      expect(r.tree.root.children![0].children![0].props.body).toEqual(body);
      expect(r.tree.root.children![0].children![0].motion?.physics).toEqual(physics);
    }
    const bad = (t: unknown) => issuesOf(t).map((i) => i.path).join(" ");
    expect(bad(page([{ ...section("s", []), props: { world: { gy: 9 } } }]))).toMatch(/props\.world\.gy/);
    expect(bad(page([section("s", [{ id: "x", type: "heading", props: { text: { ar: "x" }, world: {} } }])]))).toMatch(/props\.world/);
    expect(bad(page([section("s", [{ id: "x", type: "heading", props: { text: { ar: "x" }, body: { hang: "chain" } } }])]))).toMatch(/props\.body\.hang/);
    expect(bad(page([section("s", [{ id: "x", type: "heading", props: { text: { ar: "x" } }, motion: { physics: { kind: "fly" } } }])]))).toMatch(/motion\.physics\.kind/);
  });

  test("a heading's or text's words along a curve", () => {
    const tree = (curve: unknown, type = "heading") => page([section("s", [{ id: "h", type, props: { text: { ar: "تخفيضات" }, curve } }])]);
    const r = checkTree(tree({ kind: "arc", bend: -40, size: 90, space: 6 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props.curve).toEqual({ kind: "arc", bend: -40, size: 90, space: 6 });
    expect(checkTree(tree({ kind: "circle" }, "text")).ok).toBe(true);
    expect(issuesOf(tree({ kind: "spiral" })).length).toBeGreaterThan(0);
    expect(issuesOf(tree({ kind: "arc", bend: 300 })).length).toBeGreaterThan(0);
  });

  test("a 3D model's parts, views and labelled points", () => {
    const tree = (extra: Record<string, unknown>) => page([section("s", [{ id: "m", type: "model3d", props: { model: "sneaker", ...extra } }])]);
    const good = {
      parts: { "part-0": { color: "#ff3366", rough: 0.3, metal: 0.8 }, Sole: { hide: true, glow: "#00ffcc" } },
      views: [{ id: "front", az: 0, el: 10, dist: 6 }, { id: "side", az: 90, el: 0, dist: 5 }],
      viewOn: "scroll",
      spots: [{ id: "s1", at: [0.2, 0.5, -0.1], label: { ar: "جلد طبيعي" }, href: "/shop" }],
    };
    const r = checkTree(tree(good));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props).toMatchObject(good);
    const bad = (extra: Record<string, unknown>) => issuesOf(tree(extra)).length;
    expect(bad({ parts: { "<script>": { color: "#fff" } } })).toBeGreaterThan(0);
    expect(bad({ parts: { a: { color: "red" } } })).toBeGreaterThan(0);
    expect(bad({ views: [{ id: "x", az: 400, el: 0, dist: 5 }] })).toBeGreaterThan(0);
    expect(bad({ spots: [{ id: "s", at: [0, 0, 99] }] })).toBeGreaterThan(0);
    expect(bad({ viewOn: "hover" })).toBeGreaterThan(0);
  });

  test("a picture's sparkling stars: where, their drawing, colour, size, speed and when", () => {
    const tree = (sparkle: unknown) => page([section("s", [{ id: "p", type: "image", props: { src: "/a.webp", sparkle } }])]);
    const good = { points: [{ x: 0.25, y: 0.4, s: 1.3 }, { x: 0.8, y: 0.1 }], shape: "glint", color: "#ffd700", size: 18, speed: 1.6, when: "hover", glow: true };
    const r = checkTree(tree(good));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props.sparkle).toEqual(good);
    expect(checkTree(tree({ points: [{ x: 0.5, y: 0.5 }], color: "accent" })).ok).toBe(true);
    const bad = (sparkle: unknown) => issuesOf(tree(sparkle)).length;
    expect(bad({ points: [{ x: 1.5, y: 0 }] })).toBeGreaterThan(0);
    expect(bad({ points: [] })).toBeGreaterThan(0);
    expect(bad({ points: Array.from({ length: 81 }, () => ({ x: 0.1, y: 0.1 })) })).toBeGreaterThan(0);
    expect(bad({ points: [{ x: 0.5, y: 0.5 }], color: "url(x)" })).toBeGreaterThan(0);
    expect(bad({ points: [{ x: 0.5, y: 0.5 }], shape: "rocket" })).toBeGreaterThan(0);
  });

  test("a drawing's shapes turn into others: which shape, its target path, when and on what curve", () => {
    const art = { viewBox: "0 0 100 100", nodes: [{ t: "path", a: { d: "M10 10 H90 V90 H10 Z" } }] };
    const tree = (morph: unknown) => page([section("s", [{ id: "d", type: "svg", props: { art, morph } }])]);
    const good = { on: "hover", duration: 0.6, ease: "spring(1,170,12)", stagger: 0.05, pairs: [{ part: "0", to: "M50 10 L90 90 L10 90 Z" }] };
    const r = checkTree(tree(good));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props.morph).toEqual(good);
    for (const ease of ["power2.out", "cubic-bezier(0.2,0.8,0.2,1)", "none"]) expect(checkTree(tree({ ...good, ease })).ok).toBe(true);
    const bad = (morph: unknown) => issuesOf(tree(morph)).map((i) => i.message).join(" ");
    expect(bad({ ...good, ease: "cubic-bezier(2,0,0,1)" })).toMatch(/motion curve/);
    expect(bad({ ...good, ease: "url(x)" })).toMatch(/motion curve/);
    expect(bad({ ...good, pairs: [{ part: "0", to: "M0 0 <script>" }] })).toMatch(/isn't a path/);
    expect(bad({ ...good, pairs: [{ part: "../x", to: "M0 0" }] })).not.toBe("");
    expect(bad({ ...good, on: "always" })).not.toBe("");
    expect(bad({ ...good, pairs: [] })).not.toBe("");
  });

  test("a section's edges, a pattern over the background, and the shapes that cut an element", () => {
    const wave = { viewBox: "0 0 1440 120", nodes: [{ t: "path", a: { d: "M0 60C480 0 960 120 1440 60V120H0Z", fill: "currentColor" } }] };
    const tree = (props: unknown, style?: unknown) => page([{ id: "s", type: "section", props, ...(style ? { style } : {}), children: [{ id: "c", type: "text", props: { text: { ar: "x" } }, style: { base: { shape: "heart" } } }] }]);
    const r = checkTree(tree({ edges: { top: { art: wave, height: 80, phone: 40, color: "bg", flip: true }, bottom: { art: wave, height: 60, color: "#ffffff", front: true } } }, { base: { pattern: { kind: "dots", color: "accent", size: 24, opacity: 0.3 } } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].props.edges.top).toMatchObject({ height: 80, phone: 40, color: "bg", flip: true });
    expect(issuesOf(tree({ edges: { top: { art: { viewBox: "0 0 1 1", nodes: [{ t: "image", a: {} }] }, height: 80, color: "bg" } } })).length).toBeGreaterThan(0);
    expect(issuesOf(tree({ edges: { top: { art: wave, height: 900, color: "bg" } } })).length).toBeGreaterThan(0);
    expect(issuesOf(tree({}, { base: { pattern: { kind: "plaid", color: "accent", size: 24 } } })).length).toBeGreaterThan(0);
    expect(issuesOf(tree({}, { base: { shape: "octopus" } })).length).toBeGreaterThan(0);
  });

  test("Lottie and Rive animations, particles behind a section, a smoothly scrolling page", () => {
    const one = (n: unknown, sec: Record<string, unknown> = {}) => ({ version: 1, root: { id: "page", type: "page", props: { smooth: true }, children: [{ id: "s", type: "section", props: sec, children: [n] }] } });
    const ok = (n: unknown, sec?: Record<string, unknown>) => checkTree(one(n, sec)).ok;
    expect(ok({ id: "l", type: "lottie", props: { src: "https://lottie.host/abc/anim.lottie", play: "scroll", loop: true, speed: 1.5, label: { ar: "قلب" } } })).toBe(true);
    expect(ok({ id: "l", type: "lottie", props: { src: "/lottie/pulse.json?v=2", play: "view" } })).toBe(true);
    expect(ok({ id: "l", type: "lottie", props: {} })).toBe(true); // no file yet
    expect(ok({ id: "r", type: "rive", props: { src: "https://cdn.rive.app/animations/vehicles.riv", stateMachine: "bumpy", artboard: "Truck", play: "hover" } })).toBe(true);
    expect(issuesOf(one({ id: "l", type: "lottie", props: { src: "https://x.test/a.gif" } }))[0].message).toMatch(/\.json or \.lottie/);
    expect(issuesOf(one({ id: "r", type: "rive", props: { src: "javascript:alert(1).riv" } })).length).toBeGreaterThan(0);
    expect(issuesOf(one({ id: "l", type: "lottie", props: { play: "scroll", speed: 9 } })).length).toBe(1);
    expect(ok({ id: "t", type: "text", props: { text: { ar: "x" } } }, { particles: { kind: "snow", color: "white", amount: 1.5, speed: 0.5 } })).toBe(true);
    expect(issuesOf(one({ id: "t", type: "text", props: { text: { ar: "x" } } }, { particles: { kind: "rain" } })).length).toBe(1);
    expect(issuesOf({ version: 1, root: { id: "page", type: "page", props: { smooth: "yes" }, children: [] } }).length).toBe(1);
  });

  test("a 3D model: a built-in one or the store's own .glb, its look, light, camera, motion and how shoppers move it", () => {
    const one = (props: unknown) => page([section("s", [{ id: "m", type: "model3d", props }])]);
    const full = {
      model: "sneaker", finish: "glass", colours: { body: "accent", glow: "#22d3ee" }, knobs: { laces: 1.2, sole: 0.8 },
      turn: { x: 10, y: -30, z: 0 }, size: 1.4, lift: -0.3, anim: { type: "float", speed: 1.5, amount: 1, trigger: "hover" },
      camera: { fov: 34, distance: 6, height: 0.5 }, lights: { preset: "neon", ambient: 0.4, key: 2, env: 1, rim: 60, colours: ["accent", "#a855f7"] },
      floor: "shadow", bg: "#101014", drag: true, zoom: false, auto: 0.6, tilt: true, label: { ar: "حذاء" },
    };
    const r = checkTree(one(full));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props).toEqual(full);
    expect(checkTree(one({ file: { url: "https://res.cloudinary.com/x/raw/upload/m/chair.glb", name: "Chair", clip: "*" }, href: "/shop", floor: "disc" })).ok).toBe(true);
    expect(checkTree(one({})).ok).toBe(true);
    expect(issuesOf(one({ file: { url: "https://x.test/a.obj" } }))[0].message).toMatch(/\.glb/);
    expect(issuesOf(one({ model: "Robot!" })).length).toBe(1);
    expect(issuesOf(one({ turn: { x: 0, y: 400, z: 0 } })).length).toBe(1);
    expect(issuesOf(one({ lights: { preset: "disco" } })).length).toBe(1);
    expect(issuesOf(one({ anim: { type: "spin", speed: 9 } })).length).toBe(1);
  });

  test("content blocks: questions, testimonials, plans, a team, logos, a notice and running words", () => {
    const ok = (type: string, props: unknown) => checkTree(page([section("s", [{ id: "x", type, props }])])).ok;
    const bad = (type: string, props: unknown) => issuesOf(page([section("s", [{ id: "x", type, props }])])).length > 0;
    const w = (ar: string) => ({ ar });
    expect(ok("accordion", { items: [{ q: w("سؤال؟"), a: w("جواب."), open: true }], single: true, look: "plus" })).toBe(true);
    expect(bad("accordion", { items: Array.from({ length: 31 }, () => ({ q: w("q"), a: w("a") })) })).toBe(true);
    expect(ok("testimonials", { items: [{ quote: w("حلو"), name: w("سارة"), role: w("زبونة"), photo: "https://res.cloudinary.com/x/a.jpg", stars: 5 }], layout: "row", columns: 3 })).toBe(true);
    expect(bad("testimonials", { items: [{ quote: w("x"), name: w("y"), stars: 6 }] })).toBe(true);
    expect(ok("pricing", { items: [{ name: w("أساسي"), price: w("₪49"), period: w("بالشهر"), features: w("واحد\nاتنين"), featured: true, badge: w("الأشهر"), cta: w("اشتركي"), href: "/shop" }] })).toBe(true);
    expect(bad("pricing", { items: Array.from({ length: 7 }, () => ({ name: w("x"), price: w("1") })) })).toBe(true);
    expect(ok("team", { items: [{ name: w("ليلى"), role: w("مصممة"), photo: "/img/a.jpg", href: "https://x.test" }], columns: 4 })).toBe(true);
    expect(ok("logos", { items: [{ src: "https://res.cloudinary.com/x/l.png", alt: w("براند"), href: "/brands/x" }], gray: true, moving: true })).toBe(true);
    expect(bad("logos", { items: [{ src: "javascript:alert(1)" }] })).toBe(true);
    expect(ok("alert", { text: w("شحن مجاني"), title: w("خبر"), kind: "promo", close: true })).toBe(true);
    expect(bad("alert", { text: w("x"), kind: "explode" })).toBe(true);
    expect(ok("marquee", { items: [w("خصم ٢٠٪"), w("شحن مجاني")], speed: 30, reverse: true, pause: true, separator: "✦" })).toBe(true);
    expect(bad("marquee", { items: [] })).toBe(true);
    expect(bad("marquee", { items: [w("x")], speed: 1 })).toBe(true);
  });

  test("interactive elements: tabs, a countdown, before and after, hotspots, a map, and a popup holding content on the page", () => {
    const ok = (type: string, props: unknown) => checkTree(page([section("s", [{ id: "x", type, props }])])).ok;
    const bad = (type: string, props: unknown) => issuesOf(page([section("s", [{ id: "x", type, props }])])).length > 0;
    const w = (ar: string) => ({ ar });
    expect(ok("tabs", { items: [{ label: w("المواد"), text: w("قطن"), image: "/a.jpg" }], look: "underline" })).toBe(true);
    expect(bad("tabs", { items: [] })).toBe(true);
    expect(ok("countdown", { until: "2026-12-31T23:59", done: w("بلّش العرض"), look: "boxes" })).toBe(true);
    expect(ok("countdown", { until: "2026-12-31T23:59:00+02:00" })).toBe(true);
    const customTimer = NODE_PROPS.countdown.parse({ until: "2099-12-31T23:59", minuteLabel: w("دقائق"), secondLabel: w("ثواني") }) as Record<string, unknown>;
    expect(customTimer.minuteLabel).toEqual(w("دقائق"));
    expect(customTimer.secondLabel).toEqual(w("ثواني"));
    expect(bad("countdown", { until: "2099-12-31T23:59", minuteLabel: w("x".repeat(41)) })).toBe(true);
    expect(bad("countdown", { until: "next friday" })).toBe(true);
    expect(ok("beforeAfter", { before: "https://res.cloudinary.com/x/a.jpg", after: "https://res.cloudinary.com/x/b.jpg", beforeLabel: w("قبل"), start: 40 })).toBe(true);
    expect(bad("beforeAfter", { before: "/a.jpg" })).toBe(true);
    expect(ok("hotspots", { src: "/look.jpg", items: [{ x: 30, y: 60, title: w("الشال"), text: w("حرير"), href: "/p/scarf" }] })).toBe(true);
    expect(bad("hotspots", { src: "/look.jpg", items: [{ x: 130, y: 0, title: w("x") }] })).toBe(true);
    expect(ok("map", { query: "رام الله، فلسطين", zoom: 14 })).toBe(true);
    expect(bad("map", { query: "x", zoom: 30 })).toBe(true);
    // A popup sits on the page and holds content like a section; never inside one.
    const pop = { id: "pop", type: "popup", props: { trigger: "load", delay: 3, often: "visit", size: "m", place: "center" }, children: [{ id: "t", type: "text", props: { text: w("خصم ١٠٪") } }] };
    expect(checkTree(page([pop])).ok).toBe(true);
    expect(checkTree(page([{ ...pop, props: { trigger: "click", anchor: "offer" } }])).ok).toBe(true);
    expect(issuesOf(page([section("s", [pop])]))[0].message).toMatch(/straight on the page/);
    expect(issuesOf(page([{ ...pop, props: { trigger: "hover" } }])).length).toBe(1);
  });

  test("store pieces: a search box, a menu of links, and the looks of product and category cards", () => {
    const ok = (type: string, props: unknown) => checkTree(page([section("s", [{ id: "x", type, props }])])).ok;
    const bad = (type: string, props: unknown) => issuesOf(page([section("s", [{ id: "x", type, props }])])).length > 0;
    const w = (ar: string) => ({ ar });
    expect(ok("search", { placeholder: w("دوّري"), button: w("بحث"), look: "pill" })).toBe(true);
    expect(bad("search", { look: "neon" })).toBe(true);
    expect(ok("menu", { items: [{ label: w("الكل"), href: "/shop" }, { label: w("تواصل"), href: "/contact" }], layout: "row", look: "underline", phone: "fold" })).toBe(true);
    expect(bad("menu", { items: [] })).toBe(true);
    expect(bad("menu", { items: [{ label: w("x"), href: "javascript:alert(1)" }] })).toBe(true);
    expect(ok("products", { source: "new", card: "lift", columns: 3 })).toBe(true);
    expect(bad("products", { source: "new", card: "glow" })).toBe(true);
    expect(ok("categories", { look: "circle", columns: 6 })).toBe(true);
    expect(bad("categories", { look: "hexagon" })).toBe(true);
  });

  test("an icon is one of the few by name, or one from the library with its checked drawing and its own size", () => {
    const art = { viewBox: "0 0 24 24", nodes: [{ t: "g", a: { fill: "none", stroke: "currentColor", "stroke-width": "1.5" }, c: [{ t: "path", a: { d: "M3 12h18" } }] }] };
    const icon = (props: unknown, style?: unknown) => page([section("s", [{ id: "i", type: "icon", props, ...(style ? { style } : {}) }])]);
    expect(checkTree(icon({ name: "heart" })).ok).toBe(true);
    const r = checkTree(icon({ name: "ph-duotone:shopping-bag", art, styleId: "badge" }, { base: { iconSize: 48 }, mobile: { iconSize: 32 } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tree.root.children![0].children![0].props).toMatchObject({ name: "ph-duotone:shopping-bag", art, styleId: "badge" });
    expect(issuesOf(icon({ name: "lucide:heart" }))[0].message).toMatch(/carries its drawing/);
    expect(issuesOf(icon({ name: "fontawesome:heart", art })).length).toBeGreaterThan(0);
    expect(issuesOf(icon({ name: "tabler:x", art: { viewBox: "0 0 24 24", nodes: [{ t: "script", a: {} }] } }))[0].message).toMatch(/Not a shape/);
    expect(issuesOf(icon({ name: "heart" }, { base: { iconSize: 900 } })).length).toBeGreaterThan(0);
  });

  test("a product's 360° view goes in a cell like anything else, a product or not yet", () => {
    const spin = (props: unknown) => page([section("s", [{ id: "c", type: "columns", children: [{ id: "a", type: "cell", children: [{ id: "p", type: "product360", props }] }] }])]);
    const r = checkTree(spin({ productId: "coat", itemId: "berry", auto: false, label: { ar: "الفستان بيلف" } }));
    expect(r.ok && r.tree.root.children![0].children![0].children![0].children![0].props).toEqual({ productId: "coat", itemId: "berry", auto: false, label: { ar: "الفستان بيلف" } });
    expect(checkTree(spin({})).ok).toBe(true);
    expect(issuesOf(spin({ productId: "a b" })).length).toBe(1);
  });

  test("ids are unique and plain", () => {
    expect(issuesOf(page([section("a"), section("a")]))[0].message).toMatch(/used twice/);
    expect(issuesOf(page([section("a b")]))[0].path).toBe("root.children[0].id");
  });

  test("only safe links and file addresses", () => {
    const button = (h: string) => page([section("s", [{ id: "b", type: "button", props: { label: { ar: "x" }, href: h } }])]);
    for (const ok of ["/shop", "/p/rose-dress?c=1", "#faq", "https://wa.me/97059", "mailto:a@b.co", "tel:+970599123456"]) expect(issuesOf(button(ok)), ok).toEqual([]);
    for (const bad of ["javascript:alert(1)", "//evil.com", "data:text/html,hi", "/a\"onmouseover=x", "shop"]) expect(issuesOf(button(bad)).length, bad).toBeGreaterThan(0);
    const image = (s: string) => page([section("s", [{ id: "i", type: "image", props: { src: s } }])]);
    expect(issuesOf(image("http://insecure.com/a.jpg")).length).toBeGreaterThan(0);
    expect(issuesOf(image("/editorial/a.webp"))).toEqual([]);
  });

  test("styles take theme colours, hex and sane numbers only", () => {
    const styled = (base: unknown) => page([section("s", [], { style: { base } })]);
    expect(issuesOf(styled({ bg: "accent", color: "#fff", pad: [8, 16, 8, 16], width: "50%", col: "span 2", weight: 600 }))).toEqual([]);
    expect(issuesOf(styled({ bg: "red; background:url(x)" }))[0].path).toBe("root.children[0].style.base.bg");
    expect(issuesOf(styled({ width: "calc(100% - 1px)" })).length).toBe(1);
    expect(issuesOf(styled({ columns: 40 })).length).toBe(1);
    expect(issuesOf(styled({ weight: 450 })).length).toBe(1);
  });

  test("too big, too deep or too many is refused", () => {
    let deep: any = { id: "t", type: "text", props: { text: { ar: "x" } } };
    for (let i = 0; i < TREE_LIMITS.depth + 2; i++) deep = { id: `g${i}`, type: "stack", children: [deep] };
    expect(issuesOf(page([section("s", [deep])]))[0].message).toMatch(/Nested more than/);
    const many = Array.from({ length: 250 }, (_, i) => section(`s${i}`, Array.from({ length: 9 }, (_, j) => ({ id: `t${i}-${j}`, type: "divider" }))));
    expect(issuesOf(page(many)).some((i) => /More than 2000 elements/.test(i.message))).toBe(true);
    expect(issuesOf(page([section("s", [{ id: "t", type: "text", props: { text: { ar: "x".repeat(600_000) } } }])]))[0].message).toMatch(/Too big/);
    expect(issuesOf("nope")[0].message).toMatch(/Expected an object/);
  });

  test("a broken saved tree reads as none", () => {
    expect(storedTree(null)).toBeNull();
    expect(storedTree({ version: 1, root: { id: "x", type: "text" } })).toBeNull();
    expect(storedTree(page([]))?.root.children).toEqual([]);
  });
});

describe("old sections in the tree", () => {
  const sections = [
    { id: "c3", order: 2 },
    { id: "c1", order: 0 },
    { id: "c2", order: 1 },
  ];

  test("converting keeps every section, in order, as an untouched old section", () => {
    const tree = treeFromSections(sections);
    expect(checkTree(tree).ok).toBe(true);
    expect(tree.root.children!.map((n) => [n.type, n.props.sectionId])).toEqual([["legacy", "c1"], ["legacy", "c2"], ["legacy", "c3"]]);
  });

  test("the old editor's changes follow: added, deleted, moved", () => {
    const tree = treeFromSections(sections);
    expect(syncWithSections(tree, sections).changed).toBe(false);
    const moved = syncWithSections(tree, [{ id: "c1", order: 2 }, { id: "c2", order: 0 }, { id: "c3", order: 1 }, { id: "c4", order: 3 }]);
    expect(moved.changed).toBe(true);
    expect(legacySectionIds(moved.tree)).toEqual(["c2", "c3", "c1", "c4"]);
    expect(legacySectionIds(syncWithSections(moved.tree, [{ id: "c3", order: 0 }]).tree)).toEqual(["c3"]);
  });

  test("once the page has new elements, their order stays the editor's", () => {
    const tree = { version: 1 as const, root: { id: "page", type: "page" as const, props: {}, children: [{ id: "new", type: "section" as const, props: {}, children: [] }, ...treeFromSections(sections).root.children!] } };
    const after = syncWithSections(tree, [{ id: "c3", order: 0 }, { id: "c1", order: 1 }, { id: "c2", order: 2 }]);
    expect(after.changed).toBe(false);
    expect(after.tree.root.children!.map((n) => n.id)).toEqual(["new", "s-c1", "s-c2", "s-c3"]);
  });
});

describe("the editor's preview ticket", () => {
  process.env.JWT_SECRET ||= "test-secret-at-least-16";
  test("opens its own page only, and only for half an hour", () => {
    const now = Date.UTC(2026, 9, 22, 12);
    const { token, expiresAt } = previewToken("page_1", now);
    expect(expiresAt).toBe(new Date(now + PREVIEW_TTL_MS).toISOString());
    expect(previewPageId(token, now + 60_000)).toBe("page_1");
    expect(previewPageId(token, now + PREVIEW_TTL_MS + 1)).toBeNull();
    // Changing the page or the time breaks the signature.
    const [, exp, sig] = token.split(".");
    expect(previewPageId(`page_2.${exp}.${sig}`, now)).toBeNull();
    expect(previewPageId(`page_1.${Number(exp) + 9_000_000}.${sig}`, now)).toBeNull();
    for (const bad of [null, "", "x", "a.b.c", "page_1.123.sig", 42]) expect(previewPageId(bad, now)).toBeNull();
  });
});
