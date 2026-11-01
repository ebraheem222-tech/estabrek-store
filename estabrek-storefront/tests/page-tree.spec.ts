import { test, expect, type APIRequestContext } from "@playwright/test";
import { declarations, sliderAspect, treeCss, treeFamilies } from "../src/pageTree/css";
import { TREE_FONTS, editorFonts, fontStack, googleFontsHref } from "../src/pageTree/fonts";
import { TREE_TRANSFORM, asTree, motionOf, pickText, siteStylesOf, sliderSeconds, sliderSlides, styleClass } from "../src/pageTree/tree";
import { artHasLines, safeArt } from "../src/pageTree/svgArt";
import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasRich, parseRich, richNodes } from "../src/pageTree/rich";
import { countUpText, scrambleChars } from "../src/pageTree/textMotion";
import { PARTICLE_KINDS, particleOptions, particlesOf } from "../src/pageTree/particles";
import { model3dMoves, model3dOf } from "../src/pageTree/model3d";

// The new CMS's page tree (src/pageTree): a converted page draws exactly as before,
// and a page of new elements draws on the server in three languages.
const API = "http://127.0.0.1:4100";
const setTree = async (request: APIRequestContext, on: boolean) => {
  await request.post(`${API}/__test/page-tree`, { data: { on } });
  await request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
};
/** The page's server HTML, from <main> to its end (no scripts run). */
const mainHtml = async (request: APIRequestContext, path: string) => {
  const html = await (await request.get(path)).text();
  const start = html.indexOf("<main");
  const end = html.lastIndexOf("</main>");
  expect(start, `${path} has a <main>`).toBeGreaterThan(-1);
  // Next's dev-mode "client rendering" notes carry a stack trace and timestamps that change per request.
  return html
    .slice(start, end + 7)
    .replace(/<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"[^>]*><\/template>/g, "<template/>")
    .replace(/\?v=\d+/g, "");
};

test.describe("styles become safe CSS", () => {
  test("sides follow the text direction; bad values are dropped", () => {
    expect(declarations({ pad: [8, 16, 24, 32], margin: [0, 0, 12, 0], bg: "accent", color: "#fff", col: "1 / 3", weight: 600, textAlign: "end" }, "section")).toEqual([
      "padding-block:8px 24px",
      "padding-inline:32px 16px",
      "margin-block:0px 12px",
      "margin-inline:0px 0px",
      "grid-column:1 / 3",
      "background:var(--accent)",
      "color:#fff",
      "font-weight:600",
      "text-align:end",
    ]);
    expect(declarations({ bg: "red;background:url(x)", width: "calc(1px)", size: 999, weight: 450, col: "1/3;x" } as any, "text")).toEqual([]);
  });

  test("grids get fewer columns on smaller screens by themselves", () => {
    const css = treeCss({
      version: 1,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "g", type: "grid", props: {}, style: { base: { columns: 4 } }, children: [{ id: "c", type: "text", props: {}, style: { base: { col: "span 2" } } }] }] }] },
    });
    expect(css).toContain(".pt-g{grid-template-columns:repeat(4,minmax(0,1fr))}");
    expect(css).toMatch(/@media \(max-width:1023\.98px\)\{[^@]*\.pt-g\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
    expect(css).toMatch(/@media \(max-width:639\.98px\)\{[^@]*\.pt-g\{grid-template-columns:minmax\(0,1fr\)\}\.pt-c\{grid-column:auto\}/);
    // Only old sections: nothing to add.
    expect(treeCss({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "l", type: "legacy", props: { sectionId: "x" } }] } })).toBe("");
  });

  test("columns: shares become tracks, shapes clip, and smaller screens get their own layout", () => {
    const cell = (id: string) => ({ id, type: "cell", props: {}, children: [] });
    const tree = (cols: Record<string, unknown>) => ({ version: 1 as const, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "c", type: "columns", props: {}, children: [cell("a"), cell("b"), cell("x")], ...cols }] }] } });
    expect(declarations({ widths: [1, 2], shape: "arch" }, "columns")).toEqual(["grid-template-columns:minmax(0,1fr) minmax(0,2fr)", "border-radius:999px 999px 0 0", "overflow:hidden"]);
    expect(declarations({ shape: "circle" }, "cell")).toEqual(["border-radius:50%", "aspect-ratio:1/1", "overflow:hidden"]);
    expect(declarations({ widths: [0, 2], shape: "octopus" } as any, "columns")).toEqual([]);

    // Three equal cells: two on a tablet with the last one across, one under the other on a phone.
    const css = treeCss(tree({}));
    expect(css).toContain(".pt-c{grid-template-columns:repeat(3,minmax(0,1fr))}");
    expect(css).toMatch(/@media \(max-width:1023\.98px\)\{[^@]*\.pt-c\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}[^@]*\.pt-c>\.pt-cell:last-child\{grid-column:1 \/ -1\}/);
    expect(css).toMatch(/@media \(max-width:639\.98px\)\{[^@]*\.pt-c\{grid-template-columns:minmax\(0,1fr\)\}[^@]*\.pt-c>\.pt-cell:last-child\{grid-column:auto\}/);
    // The last first on a phone, or side by side as on a computer.
    expect(treeCss(tree({ props: { phone: "reverse" } }))).toMatch(/639\.98px\)\{[^@]*\.pt-c\{display:flex;flex-direction:column-reverse\}/);
    expect(treeCss(tree({ props: { phone: "keep" }, style: { base: { widths: [1, 2, 1] } } }))).toMatch(/639\.98px\)\{[^@]*\.pt-c\{grid-template-columns:minmax\(0,1fr\) minmax\(0,2fr\) minmax\(0,1fr\)\}/);
    // A screen's own shares win over the automatic ones.
    const own = treeCss(tree({ style: { base: { widths: [1, 1, 1] }, tablet: { widths: [2, 1, 1] }, mobile: { widths: [1, 1] } } }));
    expect(own).toMatch(/1023\.98px\)\{[^@]*\.pt-c\{grid-template-columns:minmax\(0,2fr\) minmax\(0,1fr\) minmax\(0,1fr\)\}/);
    expect(own).not.toContain(".pt-c{grid-template-columns:repeat(2,minmax(0,1fr))}");
    expect(own).not.toContain(".pt-c{display:flex");
  });

  test("a slider: safe slides only, at most 12, and its frame from its settings", () => {
    const slides = sliderSlides({ slides: [{ src: "/a.webp", caption: { ar: "أ" } }, { src: "javascript:alert(1)" }, "junk", { src: "https://x.test/c.mp4", kind: "video", href: "javascript:x" }, { src: "//evil.com/a.jpg" }] });
    expect(slides).toEqual([{ src: "/a.webp", kind: "image", caption: { ar: "أ" } }, { src: "https://x.test/c.mp4", kind: "video" }]);
    expect(sliderSlides({ slides: Array.from({ length: 20 }, (_, i) => ({ src: `/p/${i}.webp` })) })).toHaveLength(12);
    expect(sliderSlides({})).toEqual([]);
    expect([sliderSeconds(5), sliderSeconds(1), sliderSeconds(2.5), sliderSeconds("5")]).toEqual([5, 0, 0, 0]);
    expect([sliderAspect("4 / 3"), sliderAspect("0 / 3"), sliderAspect("4/3;x"), sliderAspect(43)]).toEqual(["4/3", undefined, undefined, undefined]);
    const css = treeCss({
      version: 1,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "sl", type: "slider", props: { aspect: "4 / 5", slides: [] }, style: { mobile: { aspect: "1 / 1" } } }] }] },
    });
    expect(css).toContain(".pt-sl{aspect-ratio:4/5}");
    expect(css).toMatch(/639\.98px\)\{[^@]*\.pt-sl\{aspect-ratio:1\/1\}/);
    // A slider in a cell takes the cell's whole width.
    expect(css).toMatch(/\.pt-cell>:where\([^)]*\.pt-slider[^)]*\)\{align-self:stretch\}/);
  });

  test("turns, moves, colour layers, shadows and free places become safe CSS", () => {
    expect(declarations({ rotateX: 20, rotateZ: -5, perspective: 900, scale: 1.1, moveX: 10, origin: "top" }, "video")).toEqual(["--pt-rx:20deg", "--pt-rz:-5deg", "--pt-p:900px", "--pt-s:1.1", "--pt-x:10px", "transform-origin:50% 0%"]);
    expect(declarations({ overlay: { color: "#000000", to: "accent", angle: 180, opacity: 0.45, blend: "multiply" } }, "video")).toEqual(["--pt-ov:linear-gradient(180deg,#000000,var(--accent))", "--pt-ovo:0.45", "--pt-ovb:multiply"]);
    expect(declarations({ shadow: "md", shade: { x: 0, y: 12, blur: 30, color: "#00000066" }, glow: { color: "accent", size: 20 } }, "cell")).toEqual(["box-shadow:0 8px 24px rgba(0,0,0,.10),0px 12px 30px #00000066,0 0 20px var(--accent)"]);
    expect(declarations({ shade: { x: 2, y: 8, blur: 16, color: "black", follow: true }, glow: { color: "white", size: 12 } }, "heading")).toEqual(["filter:drop-shadow(2px 8px 16px #000)", "text-shadow:0 0 12px #fff"]);
    expect(declarations({ layer: { x: 50, y: 100, anchor: "bottom" }, z: 3 }, "text")).toEqual(["position:absolute", "inset-inline-start:50%", "top:100%", "margin:0", "--pt-ax:calc(var(--pt-flip,1) * -50%)", "--pt-ay:-100%", "z-index:3"]);
    expect(declarations({ layer: false }, "text")).toEqual(["position:relative", "inset:auto", "--pt-ax:0%", "--pt-ay:0%"]);
    expect(declarations({ rotateX: 999, perspective: 50, overlay: { color: "red;x", opacity: 0.5 }, shade: { x: 0, y: 0, blur: 9999, color: "#000" }, layer: { x: 200, y: 0 }, z: 1.5 } as any, "text")).toEqual([]);

    const tree = {
      version: 1 as const,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, motion: { enter: { kind: "up", stagger: 0.1 } }, children: [
        { id: "v", type: "video", props: { src: "/a.mp4" }, style: { base: { overlay: { color: "#000", opacity: 0.4 } } }, motion: { fx: { kind: "shine", color: "white", speed: 2 } } },
        { id: "t", type: "text", props: {}, style: { base: { overlay: { color: "accent", opacity: 0.2 } } } },
        { id: "n", type: "text", props: {} },
      ] }] },
    };
    const css = treeCss(tree);
    // The moving ones (and what a stagger brings in) get the transform, at rest before their own values.
    expect(css).toContain(`.pt-s,.pt-v,.pt-t,.pt-n{--pt-ax:0%;`);
    expect(css).toContain(`transform:${TREE_TRANSFORM}}`);
    // A clip's colour layer goes over it; a text's under its words.
    expect(css).toContain(".pt-v::after{content:\"\";position:absolute;inset:0;");
    expect(css).toContain(".pt-t::before{content:\"\";position:absolute;inset:0;");
    expect(css).toMatch(/\.pt-t::before\{[^}]*z-index:-1\}/);
    expect(css).toContain(".pt-v,.pt-t{position:relative;isolation:isolate}");
    expect(css).toContain(".pt-v>.pt-fx{--pt-fxc:#fff;--pt-fxs:1.50s}");
    // Unknown motion is dropped before it reaches the page.
    expect(motionOf({ id: "x", type: "text", props: {}, motion: { enter: { kind: "explode" }, loop: { kind: "float", duration: 99 }, hover: { kind: "tilt", amount: 2 } } })).toEqual({ loop: { kind: "float" }, hover: { kind: "tilt", amount: 2 } });
    expect(motionOf({ id: "x", type: "cell", props: {}, motion: { hover: { kind: "spotlight", color: "accent", amount: 9 } } })).toEqual({ hover: { kind: "spotlight", color: "accent" } });
    expect(TREE_TRANSFORM).toContain("var(--pt-hrz,0deg)");
    expect(motionOf({ id: "x", type: "text", props: {}, motion: "nope" })).toBeNull();
  });

  test("words: a family from the library, fluid size, caps, lines, a line under them, an outline, gradient paint, shadows", () => {
    expect(declarations({ family: "reem-kufi", italic: true, size: 64, sizeMin: 32, caps: "upper", wordSpacing: 4 }, "heading")).toEqual([
      "font-family:\"th-reem-kufi\",system-ui,sans-serif",
      "font-style:italic",
      "font-size:clamp(32px,18.74px + 3.536vw,64px)",
      "word-spacing:4px",
      "text-transform:uppercase",
    ]);
    // A family the shop doesn't have falls back to the kind of font; a smaller phone size than none is a plain size.
    expect(declarations({ family: "nope", font: "serif", size: 20, sizeMin: 30 }, "text")).toEqual(["font-family:\"Noto Naskh Arabic\",\"Frank Ruhl Libre\",Georgia,\"Times New Roman\",serif", "font-size:20px"]);
    expect(declarations({ decoration: { line: "underline", style: "wavy", color: "accent", width: 2, offset: 6 }, stroke: { width: 1.5, color: "#000000" } }, "text")).toEqual([
      "text-decoration:underline wavy var(--accent) 2px",
      "text-underline-offset:6px",
      "-webkit-text-stroke:1.5px #000000",
      "paint-order:stroke fill",
    ]);
    expect(declarations({ fill: { color: "accent", via: "white", to: "#ffd1e3", angle: 90 } }, "heading")).toEqual([
      "background-image:linear-gradient(90deg,var(--accent),#fff,#ffd1e3)",
      "-webkit-background-clip:text",
      "background-clip:text",
      "-webkit-text-fill-color:transparent",
    ]);
    expect(declarations({ lines: 2, balance: "balance", textColumns: 2 }, "text")).toEqual(["display:-webkit-box", "-webkit-box-orient:vertical", "-webkit-line-clamp:2", "line-clamp:2", "overflow:hidden", "text-wrap:balance", "columns:2", "column-gap:32px"]);
    // Only words are cut to lines or set in columns.
    expect(declarations({ lines: 2, textColumns: 2 }, "button")).toEqual([]);
    expect(declarations({ shadows: [{ x: 0, y: 2, blur: 0, color: "#00000033" }], glow: { color: "white", size: 12 } }, "heading")).toEqual(["text-shadow:0px 2px 0px #00000033,0 0 12px #fff"]);
    expect(declarations({ family: "x;color:red", caps: "shout", decoration: { line: "zigzag" }, stroke: { width: 99, color: "#000" }, fill: { color: "accent" }, shadows: [{ x: 0, y: 0, blur: 0, color: "red" }] } as any, "text")).toEqual([]);
  });

  test("patterns over the background in a theme colour, over its gradient; shapes that cut with a mask", () => {
    const d = (s: unknown) => declarations(s as any, "cell").join(";");
    expect(d({ pattern: { kind: "dots", color: "accent", size: 20, opacity: 0.25 } })).toBe(
      "background-image:radial-gradient(color-mix(in srgb,var(--accent) 25%,transparent) 2.4px,transparent 3px);background-size:20px 20px;background-position:0 0",
    );
    // Over a gradient, each layer with its own size and place.
    expect(d({ gradient: { color: "#ffffff", to: "#000000" }, pattern: { kind: "polka", color: "#ff0000", size: 30 } })).toContain(
      "background-image:radial-gradient(#ff0000 3.6px,transparent 4.2px),radial-gradient(#ff0000 3.6px,transparent 4.2px),linear-gradient(180deg,#ffffff,#000000);background-size:30px 30px,30px 30px,auto;background-position:0 0,15px 15px,0 0",
    );
    for (const kind of ["grid", "lines", "columns", "diagonal", "stripes", "checks", "hatch", "zigzag", "rings", "triangles"]) expect(d({ pattern: { kind, color: "text", size: 24 } }), kind).toContain("background-image:");
    expect(d({ pattern: { kind: "plaid", color: "text", size: 24 } })).toBe("");
    expect(d({ pattern: { kind: "dots", color: "red", size: 24 } })).toBe("");
    // A mask: the outline stretched to the box; the old shapes as they were.
    const heart = d({ shape: "heart" });
    expect(heart).toMatch(/^-webkit-mask:url\("data:image\/svg\+xml,%3Csvg[^"]*"\) center\/100% 100% no-repeat;mask:url\(/);
    expect(decodeURIComponent(heart.match(/svg\+xml,([^"]*)/)![1])).toContain("preserveAspectRatio='none'><path d='M50 92C20 70");
    expect(d({ shape: "pill" })).toBe("border-radius:999px;overflow:hidden");
    expect(d({ shape: "octopus" })).toBe("");
  });

  test("boxes: gradients, frosted glass and picture filters", () => {
    expect(declarations({ bg: "surface", gradient: { color: "bg", to: "accent-soft", radial: true }, backdrop: { blur: 12, saturate: 1.4 } }, "cell")).toEqual([
      "background:var(--surface)",
      "background-image:radial-gradient(circle at 50% 50%,var(--bg),var(--accent-soft))",
      "-webkit-backdrop-filter:blur(12px) saturate(1.4)",
      "backdrop-filter:blur(12px) saturate(1.4)",
    ]);
    expect(declarations({ gradient: { color: "accent", to: "#000", angle: 45 } }, "section")).toEqual(["background-image:linear-gradient(45deg,var(--accent),#000)"]);
    expect(declarations({ filters: { gray: 1, bright: 1.1, hue: -20 }, shade: { x: 0, y: 8, blur: 16, color: "black", follow: true } }, "image")).toEqual(["filter:brightness(1.1) grayscale(1) hue-rotate(-20deg) drop-shadow(0px 8px 16px #000)"]);
    expect(declarations({ filters: { blur: 99, gray: 2 }, backdrop: { blur: 99 }, gradient: { color: "accent", to: "url(x)" } } as any, "image")).toEqual([]);
  });

  test("states: the mouse over it (devices with a mouse), the keyboard's focus, a press, and how fast it changes", () => {
    const page = (style: unknown) => ({ version: 1 as const, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "b", type: "button", props: {}, style }] }] } });
    const css = treeCss(page({
      base: { bg: "accent", hover: { color: "accent", scale: 1.05, size: 90 }, focused: { glow: { color: "accent", size: 12 } }, pressed: { scale: 0.97 } },
      mobile: { hover: { color: "text" }, transition: { duration: 0.15 } },
    }) as any);
    expect(css).toContain("@media (hover:hover){:is(.pt-b):hover{color:var(--accent);--pt-s:1.05}}");
    expect(css).toContain(":is(.pt-b):is(:focus-visible,:has(:focus-visible)){box-shadow:0 0 12px var(--accent)}");
    expect(css).toContain(":is(.pt-b):active{--pt-s:0.97}");
    // Only what the states change glides, at the usual pace unless a screen has its own.
    expect(css).toContain(".pt-b{background:var(--accent);transition-property:color,-webkit-text-fill-color,--pt-s,box-shadow,text-shadow;transition-duration:0.3s;transition-timing-function:cubic-bezier(.2,.7,.2,1)}");
    expect(css).toMatch(/639\.98px\)\{[^@]*\.pt-b\{transition-duration:0\.15s;transition-timing-function:cubic-bezier\(\.2,\.7,\.2,1\)\}@media \(hover:hover\)\{:is\(\.pt-b\):hover\{color:var\(--text\)\}\}/);
    // A state that turns or moves: the element has its transform, and the turn's values are typed so they glide.
    expect(css).toContain("@property --pt-s{syntax:\"<number>\";inherits:false;initial-value:1}");
    expect(css).toMatch(/\.pt-b\{--pt-ax:0%[^}]*transform:/);
    // A state never changes the size.
    expect(css).not.toContain("font-size:90px");
    // Nothing turns: no typed values.
    expect(treeCss(page({ base: { hover: { color: "accent" } } }) as any)).not.toContain("@property");
  });

  test("a page's library fonts get their faces; a part of an old section gets states too", () => {
    const css = treeCss({
      version: 1,
      root: {
        id: "page", type: "page",
        props: { looks: { "s:abc/title": { kind: "text", style: { base: { family: "cairo", hover: { color: "accent" } } } } } },
        children: [{ id: "s", type: "section", props: {}, children: [{ id: "h", type: "heading", props: {}, style: { base: { family: "amiri" }, mobile: { family: "nope" } } }] }],
      },
    } as any);
    expect(css).toContain("@font-face{font-family:\"th-amiri\";src:url(\"/fonts/themes/amiri-arabic-400.woff2\")");
    expect(css).toContain("@font-face{font-family:\"th-cairo\"");
    expect(css).not.toContain("th-nope");
    expect(css).toMatch(/@media \(hover:hover\)\{:is\(\[data-cms-section="abc"\]\[data-cms-section\] \[data-edit-box="title"\]/);
    // Headings take the store theme's display font when there is one.
    expect(css).toContain(":root{--pt-font-heading:var(--st-font-display,\"Rose Arabic\",\"Rose Hebrew\",Georgia,serif);--pt-flip:1}");
  });

  test("the font library: Google's families by their own name, one stylesheet for a page's; the shop's own copy wins", () => {
    const of = (s: string) => TREE_FONTS.filter((f) => f.scripts.includes(s as "arabic")).length;
    expect(TREE_FONTS.length).toBeGreaterThan(200);
    expect([of("arabic"), of("hebrew")].every((n) => n >= 50)).toBe(true);
    // The shop's own copy of Cairo wins over Google's; a library family goes by its name.
    expect(fontStack("cairo")).toBe('"th-cairo",system-ui,sans-serif');
    expect(fontStack("noto-kufi-arabic")).toBe('"Noto Kufi Arabic",system-ui,sans-serif');
    expect(fontStack("jetbrains-mono")).toBe('"JetBrains Mono",ui-monospace,monospace');
    expect(fontStack("nope")).toBeUndefined();
    const tree = {
      version: 1,
      root: {
        id: "page", type: "page", props: { looks: { "s:abc/title": { kind: "text", style: { tablet: { family: "great-vibes" } } } } },
        children: [{ id: "s", type: "section", props: {}, children: [{ id: "h", type: "heading", props: {}, style: { base: { family: "heebo" }, mobile: { family: "playfair-display" } } }] }],
      },
    } as any;
    const site = [{ id: "h1", style: { base: { family: "noto-kufi-arabic" } } }] as any;
    expect([...treeFamilies(tree, site)].sort()).toEqual(["great-vibes", "heebo", "noto-kufi-arabic", "playfair-display"]);
    // Heebo is the shop's own; the rest come in one ask, each with the weights it has.
    expect(googleFontsHref(treeFamilies(tree, site))).toBe(
      "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Noto+Kufi+Arabic:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap",
    );
    expect(googleFontsHref(["heebo", "nope"])).toBeNull();
    const css = treeCss(tree, site);
    expect(css).toContain('@font-face{font-family:"th-heebo"');
    expect(css).toContain('font-family:"Playfair Display",Georgia,serif');
    expect(css).not.toContain("googleapis");
    // The editor gets every family: the shop's own with their files, the library's with their ask.
    const listed = editorFonts();
    expect(listed.find((f) => f.slug === "heebo")).toMatchObject({ source: "theme", faces: expect.any(Array) });
    expect(listed.find((f) => f.slug === "rubik-glitch")).toMatchObject({ source: "google", kind: "display", scripts: ["hebrew", "latin"], q: "Rubik+Glitch" });
  });

  test("shared styles: every heading of a level, the body text and each button kind take theirs; named ones by class; an element's own look wins", () => {
    const site = siteStylesOf([
      { id: "h2", kind: "text", style: { base: { size: 44, hover: { color: "accent" } }, mobile: { size: 30 } } },
      { id: "body", kind: "text", style: { base: { lineHeight: 1.9 } } },
      { id: "solid", kind: "button", style: { base: { radius: 6, pressed: { scale: 0.96 } } } },
      { id: "card", kind: "box", name: "Card", style: { base: { bg: "surface", radius: 24 } } },
      // Dropped: a bad id, an unknown kind, the same id twice.
      { id: "Bad!", kind: "box", style: {} },
      { id: "x", kind: "shape", style: {} },
      { id: "card", kind: "box", style: { base: { bg: "accent" } } },
    ]);
    expect(site.map((s) => s.id)).toEqual(["h2", "body", "solid", "card"]);
    const css = treeCss({
      version: 1,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: { styleId: "card" }, children: [{ id: "h", type: "heading", props: { level: 2 }, style: { base: { size: 60 } } }] }] },
    } as any, site);
    const at = (s: string) => css.indexOf(s);
    expect(css).toContain(":where(h2).pt-heading{font-size:44px;transition-property:color,-webkit-text-fill-color;");
    expect(css).toContain(".pt-text{line-height:1.9}");
    expect(css).toContain(".pt-btn-solid{border-radius:6px;transition-property:--pt-s");
    expect(css).toContain(".ps-card{background:var(--surface);border-radius:24px}");
    expect(css).toContain("@media (hover:hover){:is(:where(h2).pt-heading):hover{color:var(--accent)}}");
    expect(css).toMatch(/@media \(max-width:639\.98px\)\{:where\(h2\)\.pt-heading\{font-size:30px\}\}/);
    // After the base CSS (so they win over it), before the elements' own looks (so those win over them).
    expect(at(":where(h2).pt-heading{font-size:44px;")).toBeGreaterThan(at(".pt-heading{margin:0"));
    expect(at(":where(h2).pt-heading{font-size:44px;")).toBeLessThan(at(".pt-h{font-size:60px}"));
    // A pressed button turns: the button kind gets the transform.
    expect(css).toMatch(/[,}]\.pt-btn-solid[,{][^}]*--pt-ax:0%/);
    expect(styleClass("card")).toBe("ps-card");
    expect(styleClass("Card; x")).toBe("");
  });

  test("a drawing is checked again: what isn't allowed drops out", () => {
    const art = safeArt({ viewBox: "0 0 10 10", morph: "M0 0 L 1 1 <x>", nodes: [
      { t: "script", a: {} },
      { t: "g", a: { transform: "rotate(5)", onload: "x" }, c: [{ t: "circle", a: { r: "4", fill: "url(javascript:x)", stroke: "accent", href: "https://x.test" } }, { t: "foreignObject", a: {} }] },
    ] });
    expect(art).toEqual({ viewBox: "0 0 10 10", nodes: [{ t: "g", a: { transform: "rotate(5)" }, c: [{ t: "circle", a: { r: "4", stroke: "accent" } }] }] });
    expect(artHasLines(art!)).toBe(true);
    expect(safeArt({ viewBox: "0 0 10 10", nodes: [{ t: "script", a: {} }] })).toBeNull();
    expect(safeArt({ viewBox: "javascript:alert(1)", nodes: [{ t: "path", a: { d: "M0 0" } }] })).toBeNull();
  });

  test("a 3D model: a model the shop knows or a .glb (the file wins); its knobs, turns, light and motion checked", () => {
    expect(model3dOf({ model: "robot-x" })).toBeNull();
    expect(model3dOf({ file: { url: "javascript:alert(1).glb" } })).toBeNull();
    const s = model3dOf({ model: "sneaker", knobs: { nope: 2 }, turn: { x: 0, y: 90, z: 400 }, size: 9, lights: { preset: "neon", rim: 10 }, anim: { type: "float", trigger: "hover" }, href: "/shop", drag: true })!;
    expect(s.model).toBe("sneaker");
    expect(s.knobs).toEqual({});
    expect(s.turn.map((r) => +r.toFixed(3))).toEqual([0, 1.571, 0]);
    expect([s.size, s.floor, s.finish, s.lights.rim, s.lights.ambient, s.lights.colours[0]]).toEqual([1, "shadow", "metal", 10, 0.3, "accent"]);
    // A link makes it a link: shoppers don't turn it by hand then.
    expect(s.drag).toBe(false);
    expect(model3dMoves(s)).toBe(true);
    const f = model3dOf({ model: "sneaker", file: { url: "https://res.cloudinary.com/x/raw/upload/m/a.glb", clip: "*" } })!;
    expect(f.file).toEqual({ url: "https://res.cloudinary.com/x/raw/upload/m/a.glb", clip: "*" });
    expect(model3dMoves(model3dOf({ model: "mug" })!)).toBe(false);
  });

  test("particles: known kinds and numbers in range only; each kind's options in the section's colour", () => {
    expect(particlesOf({ kind: "snow", color: "accent", amount: 9, speed: 2 })).toEqual({ kind: "snow", amount: 1, speed: 2, color: "accent" });
    expect(particlesOf({ kind: "rain" })).toBeNull();
    for (const kind of PARTICLE_KINDS) {
      const o = particleOptions({ kind, amount: 2, speed: 1 }, "rgb(1, 2, 3)") as any;
      expect(o.fullScreen.enable, kind).toBe(false);
      expect(o.pauseOnOutsideViewport, kind).toBe(true);
      expect(JSON.stringify(o.particles.color), kind).toContain("rgb(1, 2, 3)");
    }
    expect((particleOptions({ kind: "snow", amount: 2 }, "red") as any).particles.number.value).toBe(160);
  });

  test("a number counting up keeps its words, digits, separators and decimals", () => {
    const a = countUpText("+1,200 زبونة سعيدة")!;
    expect([a.before, a.target, a.after, a.format(600), a.format(1200)]).toEqual(["+", 1200, " زبونة سعيدة", "600", "1,200"]);
    const b = countUpText("٣٥٠٠ طلب")!;
    expect([b.target, b.format(1200), b.format(3500)]).toEqual([3500, "١٢٠٠", "٣٥٠٠"]);
    const c = countUpText("Rated 4.8 of 5")!;
    expect([c.before, c.target, c.format(2.45), c.after]).toEqual(["Rated ", 4.8, "2.5", " of 5"]);
    expect(countUpText("99% happy.")!.after).toBe("% happy.");
    expect(countUpText("no number")).toBeNull();
    expect(scrambleChars("عرض")).toMatch(/^[\u0600-\u06FF]+$/);
    expect(scrambleChars("מבצע")).toMatch(/^[\u0590-\u05FF]+$/);
    expect(scrambleChars("Sale")).toBe("upperAndLowerCase");
  });

  test("words fall back to the store's main language; a broken tree reads as none", () => {
    expect(pickText({ ar: "مرحبا", en: "Hi" }, "he", "ar")).toBe("مرحبا");
    expect(pickText({ en: "Hi" }, "he", "ar")).toBe("Hi");
    expect(asTree({ version: 1, root: { id: "x", type: "section" } })).toBeNull();
  });
});

test.describe("formatted words", () => {
  const html = (t: string) =>
    renderToStaticMarkup(createElement(Fragment, null, ...richNodes(t, (h) => (h.startsWith("/") && !h.startsWith("//") ? `/en${h}` : /^https:\/\//.test(h) ? h : null))));

  test("tags become elements, nested too; colours and links are checked", () => {
    expect(html("[b]عرض[/b] اليوم")).toBe("<strong>عرض</strong> اليوم");
    expect(html("[i][u]x[/u][/i] [mark]y[/mark]")).toBe('<em><u>x</u></em> <mark class="pt-mark">y</mark>');
    expect(html("[color=accent]a[/color][color=#ff0000]b[/color]")).toBe('<span style="color:var(--accent)">a</span><span style="color:#ff0000">b</span>');
    expect(html("[color=red]a[/color]")).toBe("<span>a</span>");
    expect(html("[link=/shop]تسوّق[/link]")).toBe('<a class="pt-inline-link" href="/en/shop">تسوّق</a>');
    expect(html("[link=javascript:alert(1)]x[/link]")).toBe("<span>x</span>");
    // Words are words: never HTML.
    expect(html("[b]<script>x</script>[/b]")).toBe("<strong>&lt;script&gt;x&lt;/script&gt;</strong>");
  });

  test("what doesn't pair up stays as written", () => {
    expect(html("[b]open")).toBe("[b]open");
    expect(html("a[/b]")).toBe("a[/b]");
    expect(html("[x]y[/x]")).toBe("[x]y[/x]");
    expect(html("[b]a[i]b[/b]c[/i]")).toBe("[b]a<em>b[/b]c</em>");
    expect(parseRich("plain")).toEqual(["plain"]);
    expect(hasRich("plain [b] text")).toBe(false);
    expect(hasRich("[mark]x[/mark]")).toBe(true);
  });
});

test.describe.serial("a converted page", () => {
  test.afterAll(async ({ request }) => setTree(request, false));

  for (const path of ["/", "/contact", "/native-templates"]) {
    test(`${path} draws exactly as before`, async ({ request }) => {
      await setTree(request, false);
      const before = await mainHtml(request, path);
      await setTree(request, true);
      const after = await mainHtml(request, path);
      expect(after).toBe(before);
      expect(after).not.toContain("data-page-tree");
    });
  }
});

test.describe.serial("a page of new elements", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/__test/languages`, { data: { enabled: ["ar", "en", "he"], default: "ar" } });
    await request.post("/api/revalidate", { data: { tags: ["cms:pages", "cms:bootstrap", "settings"] } });
  });
  test.afterAll(async ({ request }) => {
    await request.post(`${API}/__test/languages`, { data: {} });
    await request.post("/api/revalidate", { data: { tags: ["cms:bootstrap", "settings"] } });
  });

  test("draws on the server in each language, with the old section in its place", async ({ page }) => {
    for (const [path, title, wide, shop, dir] of [
      ["/tree-demo", "عنوان من الشجرة", "خلية عريضة", "/shop", "rtl"],
      ["/en/tree-demo", "A title from the tree", "A wide cell", "/en/shop", "ltr"],
      ["/he/tree-demo", "כותרת מהעץ", "תא רחב", "/he/shop", "rtl"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator('[data-tree-node="title"]')).toHaveText(title);
      await expect(page.locator('[data-tree-node="wide"]')).toHaveText(wide);
      // A language with no words of its own shows the main language's.
      await expect(page.locator('[data-tree-node="only-ar"]')).toHaveText("نص بالعربي بس");
      await expect(page.locator('[data-tree-node="go"]')).toHaveAttribute("href", shop);
      // The old section sits between the two new ones.
      const order = await page.evaluate(() => {
        const at = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top;
        return [at('[data-tree-node="intro"]'), at('[data-cms-section="demo-faq"], #demo-faq, [data-section-id="demo-faq"]') || 0, at('[data-tree-node="shop"]')];
      }).catch(() => null);
      if (order) expect(order[0]).toBeLessThan(order[2]);
      await expect(page.getByText("أسئلة القسم القديم")).toBeVisible();
    }
  });

  test("links are checked, the grid follows the screen, products come from the store", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    await expect(page.locator('[data-tree-node="bad"]')).toHaveAttribute("href", "#");
    await expect(page.locator('[data-tree-node="away"]')).toHaveAttribute("target", "_blank");
    const cols = () => page.locator('[data-tree-node="cols"]').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(await cols()).toBe(3);
    const wideSpan = await page.locator('[data-tree-node="wide"]').evaluate((el) => getComputedStyle(el).gridColumnEnd);
    expect(wideSpan).toBe("3");
    await expect(page.locator('[data-tree-node="picks"]')).toContainText("قطع مختارة");
    await expect(page.locator('[data-tree-node="picks"] a[href*="rose-dress"]').first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await cols()).toBe(1);
    const titleSize = await page.locator('[data-tree-node="title"]').evaluate((el) => getComputedStyle(el).fontSize);
    expect(titleSize).toBe("30px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("a tilted clip straightens with the scroll; a title sits over it; layers, shadows and loops show", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const node = (id: string) => page.locator(`[data-tree-node="${id}"]`);
    const rect = (id: string) => node(id).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const cssVar = (id: string, name: string) => node(id).evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
    // The clip sits in a frame with its colour layer over it.
    await expect(node("tilt-clip")).toHaveClass(/pt-frame/);
    expect(await node("tilt-clip").locator("video").count()).toBe(1);
    const layer = await node("tilt-clip").evaluate((el) => { const s = getComputedStyle(el, "::after"); return [s.opacity, s.mixBlendMode, s.backgroundImage.startsWith("linear-gradient")].join(" "); });
    expect(layer).toBe("0.45 multiply true");
    // Far below: tilted and smaller. At 35 % of the screen: flat.
    const stageTop = await node("tilt-stage").evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => scrollTo(0, y - innerHeight + 2), stageTop);
    await expect.poll(async () => parseFloat(await cssVar("tilt-stage", "--pt-mrx")), { timeout: 15_000 }).toBeGreaterThan(20);
    expect(parseFloat(await cssVar("tilt-stage", "--pt-ms"))).toBeLessThan(0.95);
    await page.evaluate((y) => scrollTo(0, y - innerHeight * 0.2), stageTop);
    await expect.poll(async () => parseFloat(await cssVar("tilt-stage", "--pt-mrx")), { timeout: 10_000 }).toBeLessThan(1);
    // The title came in and sits in the middle of the clip, glowing.
    await expect.poll(async () => Number(await node("tilt-title").evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
    const [t, c] = [await rect("tilt-title"), await rect("tilt-clip")];
    expect(await node("tilt-title").evaluate((el) => getComputedStyle(el).position)).toBe("absolute");
    expect(Math.abs(t.x + t.w / 2 - (c.x + c.w / 2))).toBeLessThan(3);
    expect(Math.abs(t.y + t.h / 2 - (c.y + c.h / 2))).toBeLessThan(3);
    expect(await node("tilt-title").evaluate((el) => getComputedStyle(el).textShadow)).toContain("24px");
    // The badge: tilted, half seen, its own shadow, and it floats.
    const badge = await node("tilt-badge").evaluate((el) => { const s = getComputedStyle(el); return { t: s.transform, o: s.opacity, b: s.boxShadow }; });
    expect(badge.t).not.toBe("none");
    expect(badge.o).toBe("0.5");
    expect(badge.b).toContain("12px 30px");
    const ly1 = await cssVar("tilt-badge", "--pt-ly");
    await page.waitForTimeout(500);
    expect(await cssVar("tilt-badge", "--pt-ly")).not.toBe(ly1);
    // The picture: framed, a shine running inside, a zoom on hover.
    await expect(node("tilt-pic")).toHaveClass(/pt-hv-zoom/);
    expect(await node("tilt-pic").locator(".pt-fx-shine").count()).toBe(1);
    // On a phone the title goes back under the clip.
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await node("tilt-title").evaluate((el) => getComputedStyle(el).position)).toBe("relative");
    const [pt, pc] = [await rect("tilt-title"), await rect("tilt-clip")];
    expect(pt.y).toBeGreaterThanOrEqual(pc.y + pc.h - 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("drawings: shapes from data, ids of their own, a morph and a line that draws itself", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const blob = page.locator('[data-tree-node="art-blob"]');
    await expect(blob).toHaveAttribute("role", "img");
    await expect(blob).toHaveAttribute("aria-label", "فقاعة");
    expect(await blob.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(220);
    // A theme colour goes through the CSS variable.
    expect(await blob.locator("path").evaluate((el) => (el as SVGPathElement).style.fill)).toBe("var(--accent-soft)");
    // The line's gradient carries the element's id, and the line points at it.
    const line = page.locator('[data-tree-node="art-line"]');
    await expect(line).toHaveAttribute("aria-hidden", "true");
    expect(await line.locator("linearGradient").getAttribute("id")).toBe("art-line-g");
    expect(await line.locator("path").getAttribute("stroke")).toBe("url(#art-line-g)");
    // What isn't allowed never reaches the page.
    const bad = page.locator('[data-tree-node="art-bad"]');
    expect(await bad.locator("script").count()).toBe(0);
    expect(await bad.locator("circle").evaluate((el) => [el.getAttribute("onclick"), el.getAttribute("href"), getComputedStyle(el).fill].join("|"))).toBe("||rgb(255, 255, 255)");
    // The blob morphs; the line draws itself once it's seen.
    await blob.scrollIntoViewIfNeeded();
    // Drawn in: its line draws, then its fill comes back to full.
    await expect.poll(() => blob.locator("path").evaluate((el) => Number(getComputedStyle(el).fillOpacity)), { timeout: 8000 }).toBe(1);
    const d0 = await blob.locator("path").getAttribute("d");
    await expect.poll(() => blob.locator("path").getAttribute("d"), { timeout: 8000 }).not.toBe(d0);
    await line.scrollIntoViewIfNeeded();
    await expect.poll(() => line.locator("path").evaluate((el) => (el as SVGPathElement).style.strokeDasharray), { timeout: 8000 }).not.toBe("");
  });

  test("a section's edges: a wave along its top and an angle at its bottom, stretched, coloured, flipped and sized per screen", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const sec = page.locator('[data-tree-node="edged"]');
    await expect(sec).toHaveClass(/pt-has-edges/);
    const top = sec.locator(":scope > .pt-edge-top");
    const bottom = sec.locator(":scope > .pt-edge-bottom");
    expect(await top.evaluate((el) => [Math.round(el.getBoundingClientRect().height), getComputedStyle(el).color, getComputedStyle(el).zIndex, el.querySelector("svg")!.getAttribute("preserveAspectRatio")].join("|"))).toBe("60|rgb(255, 0, 0)|-1|none");
    expect(await bottom.evaluate((el) => [el.className.includes("pt-edge-flip"), getComputedStyle(el).zIndex].join("|"))).toBe("true|2");
    // What isn't allowed in the drawing never reaches the page; under the section's own content.
    expect(await top.locator("script").count()).toBe(0);
    expect(await sec.locator(".pt-edge path").count()).toBe(2);
    // A pattern over its background, and a picture cut to a heart.
    expect(await sec.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("radial-gradient");
    expect(await page.locator('[data-tree-node="heart-pic"]').evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toContain("data:image/svg+xml");
    await page.setViewportSize({ width: 390, height: 800 });
    await expect.poll(() => top.evaluate((el) => Math.round(el.getBoundingClientRect().height))).toBe(30);
  });

  test("the mouse: a short play once, a light that follows it, a ripple where it's pressed, a jelly spring", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const v = (id: string, prop: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop);
    await page.locator('[data-tree-node="hv-bounce"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.documentElement.classList.contains("pt-pending"));
    // A bounce: up and back down.
    const box = (await page.locator('[data-tree-node="hv-bounce"]').boundingBox())!;
    await page.mouse.move(box.x - 40, box.y - 40);
    await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 4 });
    await expect.poll(() => v("hv-bounce", "--pt-hy").then((y) => parseFloat(y)), { timeout: 3000 }).toBeLessThan(-2);
    await expect.poll(() => v("hv-bounce", "--pt-hy"), { timeout: 3000 }).toBe("0px");
    // A light that follows the mouse, in its colour.
    const spot = page.locator('[data-tree-node="hv-spot"]');
    await expect(spot).toHaveClass(/pt-hv-spot/);
    expect(await v("hv-spot", "--pt-spc")).toBe("#ff0000");
    expect(await v("hv-spot", "--pt-spr")).toBe("330px");
    const sb = (await spot.boundingBox())!;
    await page.mouse.move(sb.x + 30, sb.y + 20, { steps: 3 });
    await page.mouse.move(sb.x + 60, sb.y + 25, { steps: 3 });
    await expect.poll(() => v("hv-spot", "--pt-sx")).toBe("60px");
    await expect.poll(() => spot.locator(".pt-spot").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    // A ripple where it's pressed, gone once it has spread.
    const btn = page.locator('[data-tree-node="hv-ripple"]');
    const bb = (await btn.boundingBox())!;
    await page.mouse.move(bb.x + 10, bb.y + 10);
    await page.mouse.down();
    await expect(btn.locator(".pt-rpl")).toHaveCount(1);
    await page.mouse.up();
    await expect(btn.locator(".pt-rpl")).toHaveCount(0, { timeout: 3000 });
    // A jelly spring: it grows past its size and settles.
    await page.locator('[data-tree-node="hv-jelly"]').scrollIntoViewIfNeeded();
    const jb = (await page.locator('[data-tree-node="hv-jelly"]').boundingBox())!;
    await page.mouse.move(jb.x - 40, jb.y - 40);
    await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2, { steps: 4 });
    await expect.poll(() => v("hv-jelly", "--pt-hs").then(Number), { timeout: 3000 }).toBeGreaterThan(1.05);
  });

  test("words that move: Arabic word by word and English letter by letter, a number counting up, a scramble, words lit with the scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, pieces, count] of [["/tree-demo", 2, "+1,200 زبونة سعيدة"], ["/en/tree-demo", 10, "+1,200 happy customers"]] as const) {
      await page.goto(path);
      const letters = page.locator('[data-tree-node="wm-letters"]');
      await letters.scrollIntoViewIfNeeded();
      // Arabic stays joined: its words move, never its letters; English moves letter by letter.
      // The pieces that move are the innermost ones: Arabic words, English letters.
      await expect.poll(() => letters.evaluate((el) => [...el.querySelectorAll("div")].filter((d) => !d.querySelector("div")).length)).toBe(pieces);
      const counter = page.locator('[data-tree-node="wm-count"]');
      await counter.scrollIntoViewIfNeeded();
      await expect.poll(() => counter.innerText(), { timeout: 4000 }).toBe(count);
    }
    // Scrambled letters fall into place (the shop now remembers English).
    await page.goto("/en/tree-demo");
    const sc = page.locator('[data-tree-node="wm-scramble"]');
    await sc.scrollIntoViewIfNeeded();
    await expect.poll(() => sc.innerText(), { timeout: 4000 }).toBe("Special offer");
    // With the scroll: low on the screen its words are dim, higher up they light.
    const w = page.locator('[data-tree-node="wm-scroll"]');
    await w.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight + 10));
    await expect.poll(() => w.evaluate((el) => Number(getComputedStyle(el.querySelector("div") ?? el).opacity)), { timeout: 4000 }).toBeLessThan(0.6);
    await w.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY + 20));
    await expect.poll(() => w.evaluate((el) => Number(getComputedStyle([...el.querySelectorAll("div")].at(-1) ?? el).opacity)), { timeout: 4000 }).toBeGreaterThan(0.9);
  });

  test("animated media: Lottie plays and follows the scroll, Rive loads its player from the shop, snow falls behind a section, the page scrolls smoothly", async ({ page }) => {
    const wasm: string[] = [];
    page.on("request", (r) => /\.wasm(\?|$)/.test(r.url()) && wasm.push(new URL(r.url()).host + new URL(r.url()).pathname));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/media-demo");
    // A Lottie drawing on its canvas (some of its pixels painted), its words for screen readers.
    const auto = page.locator('[data-tree-node="lt-auto"]');
    await expect(auto).toHaveAttribute("aria-label", "نبض");
    const painted = (id: string) => page.locator(`[data-tree-node="${id}"] canvas`).evaluate((c: HTMLCanvasElement) => c.width > 0 && c.height > 0);
    await expect.poll(() => painted("lt-auto"), { timeout: 10000 }).toBe(true);
    // Snow behind the section: a canvas inside the particles' layer, under the content.
    const dots = page.locator('[data-tree-node="snowy"] > .pt-particles');
    await expect(dots.locator("canvas")).toHaveCount(1, { timeout: 10000 });
    expect(await dots.evaluate((el) => [getComputedStyle(el).zIndex, getComputedStyle(el).color].join("|"))).toBe("-1|rgb(255, 0, 0)");
    // Smooth scrolling is on (Lenis marks the page).
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(true);
    // The scroll's Lottie shows another frame as the page moves on.
    const frame = () => page.locator('[data-tree-node="lt-scroll"] canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
    const at = (y: number) => page.evaluate((top) => window.scrollTo(0, top), y);
    const top = await page.locator('[data-tree-node="lt-scroll"]').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await at(top - 800);
    await expect.poll(() => page.locator('[data-tree-node="lt-scroll"] canvas').evaluate((c: HTMLCanvasElement) => c.width > 0), { timeout: 10000 }).toBe(true);
    await page.waitForTimeout(500);
    const early = await frame();
    await at(top - 200);
    await expect.poll(frame, { timeout: 5000 }).not.toBe(early);
    // The players' WebAssembly comes from the shop itself, never a public CDN.
    await expect.poll(() => wasm.some((u) => u.endsWith("/vendor/dotlottie-player.wasm")), { timeout: 10000 }).toBe(true);
    await expect.poll(() => wasm.some((u) => /\/vendor\/rive(_fallback)?\.wasm$/.test(u)), { timeout: 10000 }).toBe(true);
    expect(wasm.filter((u) => !u.startsWith("127.0.0.1:3000/vendor/"))).toEqual([]);
  });

  test("3D models: their canvas only near the screen, the store's own file fetched, a link over one, an unknown model not drawn", async ({ page }) => {
    const files: string[] = [];
    page.on("request", (r) => /\.glb(\?|$)/.test(r.url()) && files.push(r.url()));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/media-demo");
    const code = page.locator('[data-tree-node="m3d-code"]');
    await code.scrollIntoViewIfNeeded();
    await expect(code.locator(".pt-model3d-stage")).toHaveAttribute("aria-label", "حذاء");
    await expect(code.locator("canvas")).toHaveCount(1, { timeout: 15000 });
    expect(await code.locator("canvas").evaluate((c: HTMLCanvasElement) => [c.width > 0, Boolean(c.getContext("webgl2") || c.getContext("webgl"))].join("|"))).toBe("true|true");
    const file = page.locator('[data-tree-node="m3d-file"]');
    await expect(file.locator("canvas")).toHaveCount(1, { timeout: 15000 });
    await expect.poll(() => files.some((u) => u.endsWith("/uploads/models/stage-box.glb")), { timeout: 15000 }).toBe(true);
    expect(await file.locator("a.pt-model3d-link").getAttribute("href")).toBe("/shop");
    expect(await page.locator('[data-tree-node="m3d-none"]').count()).toBe(0);
    // Far down the page its canvas goes (a page holds only a few at once), and comes back near it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(code.locator("canvas")).toHaveCount(0, { timeout: 10000 });
    await code.scrollIntoViewIfNeeded();
    await expect(code.locator("canvas")).toHaveCount(1, { timeout: 15000 });
  });

  test("3D models: at most six canvases at once; one waiting gets its turn when another leaves", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/models-demo");
    const all = page.locator('[data-tree-node^="many-"] canvas');
    await expect(all).toHaveCount(6, { timeout: 20000 });
    await page.waitForTimeout(800);
    expect(await all.count()).toBe(6);
    // Far down the page they all give their canvas back.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(all).toHaveCount(0, { timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(all).toHaveCount(6, { timeout: 20000 });
  });

  test("content blocks: questions (one open at a time, an FAQ for search engines), testimonials, plans, a team, logos, a notice that closes, running words", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/blocks-demo");
    // Questions: the first open; opening the second closes it; the page's FAQ for search engines.
    const faq = page.locator('[data-tree-node="faq"]');
    await expect(faq.locator("details")).toHaveCount(2);
    expect(await faq.locator("details").first().getAttribute("open")).toBe("");
    await faq.locator("summary").nth(1).click();
    await expect(faq.locator("details").nth(1)).toHaveAttribute("open", "");
    await expect(faq.locator("details").first()).not.toHaveAttribute("open", "");
    const ld = JSON.parse((await faq.locator('script[type="application/ld+json"]').textContent())!);
    expect([ld["@type"], ld.mainEntity.length, ld.mainEntity[0].name, ld.mainEntity[0].acceptedAnswer.text]).toEqual(["FAQPage", 2, "كم بياخد التوصيل؟", "يومين."]);
    // Testimonials: their stars said in words.
    await expect(page.locator('[data-tree-node="says"] .pt-stars')).toHaveAttribute("aria-label", "4 من 5");
    expect(await page.locator('[data-tree-node="says"] blockquote').innerText()).toBe("حلو كتير");
    // Plans: one per line, the featured one stands out, a button only with words and a link.
    const plans = page.locator('[data-tree-node="plans"] .pt-plan');
    await expect(plans).toHaveCount(2);
    await expect(plans.first().locator("li")).toHaveCount(2);
    expect(await plans.first().locator("a.pt-btn").getAttribute("href")).toBe("/shop");
    await expect(plans.nth(1)).toHaveClass(/pt-plan-featured/);
    expect(await plans.nth(1).locator(".pt-plan-badge").innerText()).toBe("الأشهر");
    await expect(plans.nth(1).locator("a")).toHaveCount(0);
    // A team member: photo, name, role.
    expect(await page.locator('[data-tree-node="crew"] .pt-member-name').innerText()).toBe("ليلى");
    // Logos moving along a line: twice (the second hidden from screen readers); an unsafe one left out.
    const brands = page.locator('[data-tree-node="brands"]');
    await expect(brands).toHaveClass(/pt-logos-gray/);
    await expect(brands.locator(".pt-mq-item")).toHaveCount(4);
    await expect(brands.locator('.pt-mq-item[aria-hidden="true"]')).toHaveCount(2);
    // The notice closes.
    const note = page.locator('[data-tree-node="note"]');
    await expect(note).toHaveAttribute("role", "status");
    await note.locator(".pt-alert-close").click();
    await expect(note).toBeHidden();
    // Running words: moving, twice over.
    const run = page.locator('[data-tree-node="run"]');
    await expect(run.locator(".pt-mq-item")).toHaveCount(4);
    expect(await run.locator(".pt-mq-track").evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).animationDuration].join("|"))).toBe("pt-mq|20s");
  });

  test("interactive elements: tabs by keyboard, countdowns, before and after, hotspots, a map, popups on arrival and from a link", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/interactive-demo");
    // A popup on arrival (once this visit): closed with its button, not back after a reload.
    const welcome = page.locator('[data-tree-node="pop-load"] dialog');
    await expect(welcome).toHaveAttribute("open", "", { timeout: 5000 });
    await expect(welcome).toHaveAttribute("aria-label", "ترحيب");
    await welcome.locator(".pt-popup-close").click();
    await expect(welcome).not.toHaveAttribute("open", "");
    // Tabs: the first open; the arrow keys move (the page reads right to left).
    const tabs = page.locator('[data-tree-node="tb"] [role="tab"]');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await tabs.first().focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[data-tree-node="tb"] [role="tabpanel"]:not([hidden]) img')).toHaveCount(1);
    await page.keyboard.press("End");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    // Countdowns: one counting (days in the thousands), one over showing its words.
    await expect.poll(() => page.locator('[data-tree-node="cd-future"] .pt-count-n').first().innerText()).not.toBe("--");
    expect(Number(await page.locator('[data-tree-node="cd-future"] .pt-count-n').first().innerText())).toBeGreaterThan(20000);
    await expect(page.locator('[data-tree-node="cd-future"] .pt-count-l').first()).toHaveText("يوم");
    await expect(page.locator('[data-tree-node="cd-past"] .pt-count-done')).toHaveText("بلّش العرض");
    // Before and after: the handle from 30%, moved with the keyboard.
    const range = page.locator('[data-tree-node="ba"] input[type="range"]');
    await expect(range).toHaveAttribute("aria-label", "حرّكي للمقارنة");
    expect(await range.inputValue()).toBe("30");
    await range.focus();
    await page.keyboard.press("ArrowUp");
    expect(await page.locator('[data-tree-node="ba"] .pt-ba').evaluate((el) => (el as HTMLElement).style.getPropertyValue("--pt-ba"))).toBe("31%");
    // Hotspots: a point opens its card (one at a time).
    const spots = page.locator('[data-tree-node="hot"] details');
    await expect(spots).toHaveCount(2);
    await spots.first().locator("summary").click();
    await expect(spots.first()).toHaveAttribute("open", "");
    expect(await spots.first().locator("a").getAttribute("href")).toBe("/shop");
    await spots.nth(1).locator("summary").click();
    await expect(spots.first()).not.toHaveAttribute("open", "");
    // A map of the place, loaded only when reached.
    const map = page.locator('[data-tree-node="mp"] iframe');
    expect(await map.getAttribute("src")).toBe("https://maps.google.com/maps?q=Nazareth&z=12&hl=ar&output=embed");
    expect([await map.getAttribute("loading"), await map.getAttribute("title")]).toEqual(["lazy", "محلّنا"]);
    // A popup opened by a link to its name, in the corner (the page stays usable).
    await page.locator('[data-tree-node="open-offer"]').click();
    const offer = page.locator('[data-tree-node="pop-offer"] dialog');
    await expect(offer).toHaveAttribute("open", "");
    expect(await offer.evaluate((d) => getComputedStyle(d).position)).toBe("fixed");
    // Once a visit: not again after a reload.
    await page.reload();
    await page.waitForTimeout(1200);
    await expect(page.locator('[data-tree-node="pop-load"] dialog')).not.toHaveAttribute("open", "");
  });

  test("store pieces: a search box sending to the search page, a menu folding on a phone, category cards in circles", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/blocks-demo");
    // The search box: the shop's search page, the words asked for as `q`.
    const find = page.locator('[data-tree-node="find"]');
    await expect(find).toHaveAttribute("role", "search");
    await expect(find).toHaveClass(/pt-search-underline/);
    expect(await find.getAttribute("action")).toBe("/search");
    await find.locator('input[name="q"]').fill("شال");
    await Promise.all([page.waitForURL(/\/search\?q=/), find.locator("button").click()]);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get("q")!)).toBe("شال");
    // The menu: its safe links in a row; an unsafe one left out.
    await page.goto("/blocks-demo");
    const nav = page.locator('[data-tree-node="nav"]');
    await expect(nav).toHaveAttribute("aria-label", "القائمة");
    await expect(nav.locator(":scope > .pt-menu-list a")).toHaveCount(2);
    await expect(nav.locator(":scope > .pt-menu-list")).toBeVisible();
    await expect(nav.locator(".pt-menu-fold")).toBeHidden();
    // Category cards in circles, five in a row.
    const cats = page.locator('[data-tree-node="cats"] .pt-tiles');
    await expect(cats).toHaveClass(/pt-tiles-circle/);
    expect(await cats.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(5);
    // On a phone the menu folds under a button.
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(nav.locator(":scope > .pt-menu-list")).toBeHidden();
    await nav.locator(".pt-menu-fold > summary").click();
    await expect(nav.locator(".pt-menu-fold .pt-menu-list a").first()).toBeVisible();
  });

  test("with reduced motion: no particles and no smooth scrolling; animations stay still", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/media-demo");
    await expect.poll(() => page.locator('[data-tree-node="lt-auto"] canvas').evaluate((c: HTMLCanvasElement) => c.width > 0), { timeout: 10000 }).toBe(true);
    await page.waitForTimeout(800);
    expect(await page.locator(".pt-particles canvas").count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
    await ctx.close();
  });

  test("a library font: the page asks Google once for the families it uses; the shop's own copy stays its own", async ({ page }) => {
    await page.goto("/tree-demo");
    const links = page.locator("link[data-page-tree-fonts]");
    await expect(links).toHaveCount(1);
    const href = (await links.getAttribute("href"))!;
    expect(href).toContain("family=Noto+Kufi+Arabic:wght@100..900");
    expect(href).not.toContain("Heebo");
    expect(await page.locator('[data-tree-node="lib-font"]').evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"Noto Kufi Arabic"/);
    expect(await page.locator('[data-tree-node="own-font"]').evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?th-heebo/);
  });

  test("an icon from the library: its own drawing at its own size per screen, in the words' colour; the built-in ones as before", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const icon = page.locator('[data-tree-node="lib-icon"]');
    await expect(icon).toHaveAttribute("aria-label", "shopping cart");
    const svg = icon.locator("svg");
    expect(await svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(await svg.evaluate((el) => [Math.round(el.getBoundingClientRect().width), getComputedStyle(el.querySelector("g")!).stroke].join("|"))).toBe("48|rgb(18, 52, 86)");
    expect(await icon.locator("script").count()).toBe(0);
    expect(await icon.locator("circle, path").count()).toBe(2);
    await expect(page.locator('[data-tree-node="heart"] svg path')).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 800 });
    await expect.poll(() => svg.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(32);
  });

  test("a product's 360° view in the page: its colour's own view, turning, in each language", async ({ page }) => {
    await page.request.post("/api/revalidate", { data: { tags: ["catalog", "catalog:products"] } });
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, label] of [["/tree-demo", "الفستان بيلف"], ["/en/tree-demo", "The dress turning"]] as const) {
      await page.goto(path);
      const view = page.getByTestId("spin-spin-berry");
      await expect(view).toHaveAttribute("aria-label", label);
      await expect(view).toHaveAttribute("data-ready", "1", { timeout: 15_000 });
      expect(await view.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("c=berry");
      expect(Math.round(await page.locator('[data-tree-node="spin-berry"]').evaluate((el) => el.getBoundingClientRect().width))).toBe(240);
    }
    const view = page.getByTestId("spin-spin-berry");
    await view.scrollIntoViewIfNeeded();
    const f0 = await view.getAttribute("data-frame");
    await expect.poll(() => view.getAttribute("data-frame"), { timeout: 5000 }).not.toBe(f0);
  });

  test("with reduced motion nothing moves and everything shows", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("http://127.0.0.1:3000/tree-demo");
    const title = page.locator('[data-tree-node="tilt-title"]');
    await title.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    expect(await title.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(await page.locator('[data-tree-node="tilt-stage"]').evaluate((el) => el.style.getPropertyValue("--pt-mrx"))).toBe("");
    expect(await page.evaluate(() => document.documentElement.classList.contains("pt-pending"))).toBe(false);
    await ctx.close();
  });

  test("columns: a third and two thirds, each cell its own container, and they stack on a phone", async ({ page }) => {
    const box = (id: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height };
    });
    type Box = { x: number; y: number; w: number; h: number };
    const inside = (a: Box, b: Box) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
    const tracks = (id: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);

    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, first, see] of [["/tree-demo", "خلية أولى", "/shop"], ["/en/tree-demo", "First cell", "/en/shop"], ["/he/tree-demo", "תא ראשון", "/he/shop"]] as const) {
      await page.goto(path);
      await expect(page.locator('[data-tree-node="cell-a-title"]')).toHaveText(first);
      await expect(page.locator('[data-tree-node="cell-a-go"]')).toHaveAttribute("href", see);
    }
    await page.goto("/tree-demo");
    const [a, b, two] = [await box("cell-a"), await box("cell-b"), await box("two")];
    // Side by side, a third and two thirds (the first cell on the right in Arabic).
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(a.x).toBeGreaterThan(b.x);
    expect(a.w / b.w).toBeGreaterThan(0.45);
    expect(a.w / b.w).toBeLessThan(0.55);
    // Each cell holds its own things, in its own shape, aligned its own way.
    expect(inside(await box("cell-a-go"), a)).toBe(true);
    expect(inside(await box("three"), b)).toBe(true);
    expect(inside(a, two) && inside(b, two)).toBe(true);
    const look = await page.locator('[data-tree-node="cell-a"]').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, overflow: cs.overflow, justify: cs.justifyContent, align: cs.alignItems };
    });
    expect(look).toEqual({ radius: "24px", overflow: "hidden", justify: "center", align: "center" });
    expect(await page.locator('[data-tree-node="cell-b"]').evaluate((el) => getComputedStyle(el).borderTopRightRadius)).toBe("999px");
    const go = await box("cell-a-go");
    expect(Math.abs(go.x + go.w / 2 - (a.x + a.w / 2))).toBeLessThan(2);
    expect(await tracks("three")).toBe(3);

    // Tablet: two cells stay side by side; three inside become two, the odd one across.
    await page.setViewportSize({ width: 820, height: 1180 });
    expect(await tracks("two")).toBe(2);
    const [n1, n3, three] = [await box("n1"), await box("n3"), await box("three")];
    expect(await tracks("three")).toBe(2);
    expect(n3.y).toBeGreaterThan(n1.y);
    expect(Math.abs(n3.w - three.w)).toBeLessThan(2);

    // Phone: one under the other, the last first ("reverse"), and nothing sticks out.
    await page.setViewportSize({ width: 390, height: 844 });
    const [pa, pb] = [await box("cell-a"), await box("cell-b")];
    expect(pb.y + pb.h).toBeLessThanOrEqual(pa.y + 1);
    expect(Math.abs(pa.w - pb.w)).toBeLessThan(2);
    expect(await tracks("three")).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("a slider in a cell: drawn on the server, turned with the arrows, the dots or a swipe, in three languages", async ({ page, request, browser }) => {
    const g = '[data-tree-node="gallery"]';
    const box = (sel: string, p = page) => p.locator(sel).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    /** The slide that fills the frame (by where it sits) and the dot that says so. */
    const shown = (p = page) => p.locator(`${g} .pt-slides`).evaluate((row) => {
      const t = row.getBoundingClientRect();
      return Array.from(row.children).findIndex((s) => Math.abs(s.getBoundingClientRect().left - t.left) < 2);
    });
    const dot = (p = page) => p.locator(`${g} .pt-slider-dot`).evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-current") === "true"));

    // On the server: a row of slides that snaps (it swipes with no scripts), the bad address left out, no buttons yet.
    const html = await (await request.get("/tree-demo")).text();
    const drawn = html.slice(html.indexOf('data-tree-node="gallery"'), html.indexOf('data-tree-node="slide-note"'));
    expect(drawn.match(/class="pt-slide"/g)).toHaveLength(3);
    expect(drawn).not.toContain("javascript:");
    expect(drawn).not.toContain("pt-slider-arrow");
    expect(drawn).toMatch(/<video[^>]*playsinline/i);
    expect(html).toContain("scroll-snap-type:x mandatory");
    expect(html).toContain(".pt-gallery{aspect-ratio:4/3}");

    // Nothing turns by itself while we look; the clip waits with its own buttons.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, first, shop, next] of [
      ["/tree-demo", "حجابات الموسم", "/shop", "الشريحة التالية"],
      ["/en/tree-demo", "This season's hijabs", "/en/shop", "Next slide"],
      ["/he/tree-demo", "חיג'אבים של העונה", "/he/shop", "השקופית הבאה"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator(`${g} .pt-slide`)).toHaveCount(3);
      await expect(page.locator(`${g} .pt-slide-caption`).first()).toHaveText(first);
      // A language with no words of its own shows the main language's.
      await expect(page.locator(`${g} .pt-slide-caption`).nth(2)).toHaveText("بالعربي بس");
      await expect(page.locator(`${g} .pt-slide-link`).first()).toHaveAttribute("href", shop);
      await expect(page.locator(`${g} .pt-slider-dot`)).toHaveCount(3);
      await expect(page.locator(`${g} .pt-slider-next`)).toHaveAttribute("aria-label", next);
    }

    // It fills its cell (inside the cell's padding) although the cell centres its things, in a 4:3 frame.
    const [cell, slider, note] = [await box('[data-tree-node="slide-cell"]'), await box(g), await box('[data-tree-node="slide-note"]')];
    expect(Math.abs(cell.w - 32 - slider.w)).toBeLessThan(2);
    expect(Math.abs(slider.w / slider.h - 4 / 3)).toBeLessThan(0.02);
    expect(note.y).toBeGreaterThanOrEqual(slider.y + slider.h);
    expect(await page.locator(`${g} .pt-slider-pause`).count()).toBe(0);

    // Arabic: the next slide is on the left; arrows, dots, and round again from the end.
    await page.goto("/tree-demo");
    await page.locator(g).scrollIntoViewIfNeeded();
    await expect(page.locator(`${g} .pt-slider-dot`)).toHaveCount(3);
    expect((await box(`${g} .pt-slider-next`)).x).toBeLessThan((await box(`${g} .pt-slider-prev`)).x);
    await page.locator(`${g} .pt-slider-next`).click();
    await expect.poll(() => shown()).toBe(1);
    expect(await dot()).toBe(1);
    const clip = await page.locator(`${g} video`).evaluate((v: HTMLVideoElement) => ({ paused: v.paused, controls: v.controls, muted: v.muted }));
    expect(clip).toEqual({ paused: true, controls: true, muted: true });
    await page.locator(`${g} .pt-slider-dot`).nth(2).click();
    await expect.poll(() => shown()).toBe(2);
    await page.locator(`${g} .pt-slider-next`).click();
    await expect.poll(() => shown()).toBe(0);
    await page.locator(`${g} .pt-slider-prev`).click();
    await expect.poll(() => shown()).toBe(2);
    expect(await dot()).toBe(2);
    // A sideways scroll (a trackpad's swipe) snaps to the next slide: in Arabic that's leftwards.
    await page.locator(`${g} .pt-slider-dot`).first().click();
    await expect.poll(() => shown()).toBe(0);
    const row = await box(`${g} .pt-slides`);
    await page.mouse.move(row.x + row.w / 2, row.y + row.h / 3);
    await page.mouse.wheel(-row.w * 0.6, 0);
    await expect.poll(() => shown()).toBe(1);
    await expect.poll(() => dot()).toBe(1);

    // A phone, by touch, in Hebrew: a finger moving right brings the next slide, and nothing sticks out.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce", baseURL: "http://127.0.0.1:3000" });
    const p = await phone.newPage();
    await p.goto("/he/tree-demo");
    await p.locator(g).scrollIntoViewIfNeeded();
    await expect(p.locator(`${g} .pt-slider-dot`)).toHaveCount(3);
    expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const [pc, ps, prow, pslide] = [await box('[data-tree-node="slide-cell"]', p), await box(g, p), await box(`${g} .pt-slides`, p), await box(`${g} .pt-slide`, p)];
    expect(ps.w).toBeLessThanOrEqual(390);
    expect(Math.abs(pc.w - 32 - ps.w)).toBeLessThan(2);
    expect(Math.abs(pslide.w - prow.w)).toBeLessThan(1);
    const cdp = await phone.newCDPSession(p);
    const [y, x0, x1] = [prow.y + prow.h / 3, prow.x + prow.w * 0.2, prow.x + prow.w * 0.8];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => shown(p)).toBe(1);
    await expect.poll(() => dot(p)).toBe(1);
    expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await phone.close();
  });

  test("a slider turns by itself and plays its clip, and holds under the pointer or the pause button", async ({ page }) => {
    const g = '[data-tree-node="gallery"]';
    const dot = () => page.locator(`${g} .pt-slider-dot`).evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-current") === "true"));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tree-demo");
    await page.locator(g).scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await expect(page.locator(`${g} .pt-slider-pause`)).toHaveAttribute("aria-label", "Pause");
    expect(await dot()).toBe(0);
    // Every 3 seconds; the clip on the second slide plays, muted, and only while it shows.
    await expect.poll(dot, { timeout: 8_000 }).toBe(1);
    await expect.poll(() => page.locator(`${g} video`).evaluate((v: HTMLVideoElement) => !v.paused && v.muted && !v.controls), { timeout: 8_000 }).toBe(true);
    // A pointer over it holds it.
    const r = await page.locator(g).boundingBox();
    await page.mouse.move(r!.x + r!.width / 2, r!.y + r!.height / 3);
    await page.waitForTimeout(4_000);
    expect(await dot()).toBe(1);
    // The pause button stops it, the clip too, also once the pointer has gone.
    await page.locator(`${g} .pt-slider-pause`).click();
    await expect(page.locator(`${g} .pt-slider-pause`)).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(2, 2);
    await page.waitForTimeout(4_000);
    expect(await dot()).toBe(1);
    expect(await page.locator(`${g} video`).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });
});
