import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../api/pages.api";
import { CORNER_PART_KINDS, boxSkip, cornersShow } from "./TypePanels";

const node = (type: string, props: Record<string, unknown> = {}, base?: Record<string, unknown>): PageTreeNode => ({ id: "n", type, props, ...(base ? { style: { base } } : {}) }) as PageTreeNode;

describe("where an element's corners show", () => {
  it("the kinds whose inner parts take the corners are the shop's own list", () => {
    // The shop's pageTree/css.ts CORNER_PARTS, read as text (the admin doesn't load the shop's CSS).
    const css = readFileSync(resolve(__dirname, "../../../estabrek-storefront/src/pageTree/css.ts"), "utf8");
    const block = css.slice(css.indexOf("export const CORNER_PARTS"), css.indexOf("};", css.indexOf("export const CORNER_PARTS")));
    const kinds = [...block.matchAll(/^\s{2}([A-Za-z0-9]+): \[/gm)].map((m) => m[1]);
    expect(kinds.length).toBeGreaterThan(8);
    expect([...CORNER_PART_KINDS].sort()).toEqual(kinds.sort());
  });

  it("a block that draws cards, a picture, a button: by themselves", () => {
    for (const type of ["testimonials", "pricing", "chart", "form", "image", "video", "button", "svg", "map", "alert"]) expect(cornersShow(node(type), "base"), type).toBe(true);
  });

  it("a list of lines or plain links only when its look draws boxes", () => {
    expect(cornersShow(node("accordion", { look: "lines" }), "base")).toBe(false);
    expect(cornersShow(node("accordion", { look: "cards" }), "base")).toBe(true);
    expect(cornersShow(node("menu", {}), "base")).toBe(false);
    expect(cornersShow(node("menu", { look: "pills" }), "base")).toBe(true);
  });

  it("words, a box, an icon: once they have a background, a frame, or cut what sticks out", () => {
    expect(cornersShow(node("heading"), "base")).toBe(false);
    expect(cornersShow(node("stack"), "base")).toBe(false);
    expect(cornersShow(node("heading", {}, { bg: "accent" }), "base")).toBe(true);
    expect(cornersShow(node("stack", {}, { border: { width: 1, color: "border" } }), "base")).toBe(true);
    expect(cornersShow(node("stack", {}, { overflow: "hidden" }), "base")).toBe(true);
    // A phone follows the bigger screens' background.
    expect(cornersShow(node("text", {}, { gradient: { color: "accent", to: "bg" } }), "mobile")).toBe(true);
  });

  it("the box panel leaves out what a kind has elsewhere or can't have", () => {
    expect(boxSkip("button")).toEqual(["bg", "border", "radius"]);
    expect(boxSkip("divider")).toEqual(["radius"]);
    expect(boxSkip("testimonials")).toBeUndefined();
  });
});
