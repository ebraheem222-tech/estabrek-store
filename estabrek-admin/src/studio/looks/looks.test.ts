import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../../api/pages.api";
import { decorArt } from "../decor";
import { KINDS, fits } from "./core";
import { LIBRARY, groupsOf, kindsFor, lookOps, looksFor, withLook, type ReadyKind } from "./index";
import { lookCss } from "./preview";
import { ROSE_COLOURS } from "../templates/colours";

// The backend's src/tests/looks.unit.spec.ts checks every look with the page's own rules.

const SAMPLE: Record<string, PageTreeNode> = {
  button: { id: "t", type: "button", props: { label: { ar: "تسوّق" }, href: "/shop", variant: "solid" } },
  heading: { id: "t", type: "heading", props: { level: 2, text: { ar: "عنوان" } } },
  image: { id: "t", type: "image", props: { src: "https://res.cloudinary.com/demo/image/upload/a.jpg" } },
};

describe("the ready looks", () => {
  it("are many, each kind about as many as the plan says, with ids that don't repeat", () => {
    const count = (k: ReadyKind) => LIBRARY.filter((r) => r.kind === k).length;
    expect(count("button")).toBeGreaterThanOrEqual(200);
    expect(count("card")).toBeGreaterThanOrEqual(150);
    expect(count("background")).toBeGreaterThanOrEqual(200);
    expect(count("frame")).toBeGreaterThanOrEqual(150);
    expect(count("type") + count("paint")).toBeGreaterThanOrEqual(120);
    expect(count("shadow")).toBeGreaterThanOrEqual(55);
    expect(count("hover")).toBeGreaterThanOrEqual(140);
    expect(count("entrance")).toBeGreaterThanOrEqual(100);
    expect(count("edge")).toBeGreaterThanOrEqual(100);
    expect(new Set(LIBRARY.map((r) => r.id)).size).toBe(LIBRARY.length);
    for (const k of Object.keys(KINDS) as ReadyKind[]) expect(groupsOf(k).length, k).toBeGreaterThan(0);
  });

  it("edges become drawings, bands wider than high", () => {
    for (const r of LIBRARY.filter((x) => x.kind === "edge")) {
      const art = decorArt(r.edge!, true);
      expect(art, r.id).not.toBeNull();
      const [, , w, h] = art!.viewBox.split(/[ ,]+/).map(Number);
      expect(w / h, r.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("replace each other: a kind's keys are cleared, the rest stays, motion keys swap", () => {
    const btn: PageTreeNode = { ...SAMPLE.button, style: { base: { bg: "accent", shade: { x: 1, y: 1, blur: 0, color: "text" }, width: "200px" } }, motion: { fx: { kind: "shine" }, enter: { kind: "up" } } };
    const solid = LIBRARY.find((r) => r.id === "btn-solid-pill")!;
    const [style, motion] = lookOps(btn, "base", solid);
    expect(style).toMatchObject({ op: "setStyle", screen: "base", style: { bg: "accent", color: "accent-contrast", radius: 999, width: "200px" } });
    expect((style as { style: Record<string, unknown> }).style.shade).toBeUndefined();
    expect(motion).toEqual({ op: "setMotion", nodeId: "t", motion: { enter: { kind: "up" } } });
    const neon = LIBRARY.find((r) => r.id === "paint-neon-store")!;
    const head = withLook({ ...SAMPLE.heading, style: { base: { color: "accent", stroke: { width: 1, color: "text" } } } }, "base", neon);
    expect(head.style!.base).toMatchObject({ color: "#ffffff", shadows: expect.any(Array) });
    expect((head.style!.base as Record<string, unknown>).stroke).toBeUndefined();
    // Coming in only changes how it comes in, on its own.
    const enter = LIBRARY.find((r) => r.kind === "entrance" && fits(r, "image"))!;
    expect(lookOps(SAMPLE.image, "mobile", enter).map((o) => o.op)).toEqual(["setMotion"]);
  });

  it("fit the right elements, and are found by group and words", () => {
    expect(kindsFor("button")).toEqual(expect.arrayContaining(["button", "type", "paint", "shadow", "hover", "entrance"]));
    expect(kindsFor("image")).toContain("frame");
    expect(kindsFor("section")).toEqual(expect.arrayContaining(["card", "background", "edge"]));
    expect(kindsFor("image")).not.toContain("button");
    // Every kind that draws a box takes a card and a background; every kind shown like a picture takes a frame.
    for (const type of ["testimonials", "pricing", "accordion", "countdown", "chart", "products", "tabs", "menu", "alert", "deck", "form"]) {
      expect(kindsFor(type), type).toEqual(expect.arrayContaining(["card", "background", "shadow", "hover", "entrance"]));
      expect(kindsFor(type), type).not.toContain("edge");
    }
    for (const type of ["svg", "model3d", "map", "beforeAfter", "hotspots", "video", "slider"]) expect(kindsFor(type), type).toContain("frame");
    // Words keep their own kinds; a line or a gap has no box to dress.
    expect(kindsFor("heading")).not.toContain("card");
    expect(kindsFor("divider")).not.toContain("card");
    expect(looksFor("heading", "entrance", null).some((r) => r.motion?.enter?.kind === "letters")).toBe(true);
    expect(looksFor("image", "entrance", null).some((r) => r.motion?.enter?.kind === "letters")).toBe(false);
    expect(looksFor("button", "button", "neon").length).toBe(12);
    expect(looksFor("button", "button", null, "غروب").length).toBeGreaterThan(2);
  });

  it("draw as a tile in the store's colours", () => {
    const css = lookCss(LIBRARY.find((r) => r.id === "bg-mesh-sunset")!.style!, ROSE_COLOURS);
    expect(String(css.backgroundImage)).toContain("radial-gradient(at 0% 0%,#f43f5e");
    const pop = lookCss(LIBRARY.find((r) => r.id === "btn-pop-yellow-sq")!.style!, ROSE_COLOURS);
    expect(pop).toMatchObject({ backgroundColor: "#fde047", boxShadow: "2px 2px 0px #111827" });
    const frame = lookCss(LIBRARY.find((r) => r.id === "frame-shape-heart")!.style!, ROSE_COLOURS);
    expect(String(frame.maskImage)).toContain("data:image/svg+xml");
    for (const r of LIBRARY) expect(() => lookCss(r.style ?? {}, ROSE_COLOURS, r.kind === "paint")).not.toThrow();
  });
});
