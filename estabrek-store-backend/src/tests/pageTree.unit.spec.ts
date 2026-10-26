import { describe, test, expect } from "vitest";
import { TREE_LIMITS, checkTree, legacySectionIds, storedTree, syncWithSections, treeFromSections } from "../lib/pageTree.js";
import { PREVIEW_TTL_MS, previewPageId, previewToken } from "../lib/previewToken.js";

// Pages as a tree of elements (src/lib/pageTree.ts); no database needed.
const page = (children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", children } });
const section = (id: string, children: unknown[] = [], extra: Record<string, unknown> = {}) => ({ id, type: "section", children, ...extra });
const issuesOf = (input: unknown) => {
  const r = checkTree(input);
  return r.ok ? [] : r.issues;
};

describe("checking a page tree", () => {
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
    expect(where(page([section("s", [{ id: "x", type: "marquee" }])]))[0]).toMatch(/Unknown element “marquee”/);
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
    expect(issuesOf(look({ shape: "star" })).length).toBe(1);
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
    // The old sections and scenes don't take motion.
    expect(issuesOf(page([{ id: "old", type: "legacy", props: { sectionId: "a" }, motion: { enter: { kind: "fade" } } }]))[0].message).toMatch(/moves with its own settings/);
    // Empty motion is left out.
    const plain = checkTree(vid({}, {}));
    expect(plain.ok && plain.tree.root.children![0].children![0].motion).toBeUndefined();
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
