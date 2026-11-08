import { describe, expect, it } from "vitest";
import { DECOR } from "./decorLibrary";
import { decorArt, decorations, isEdge } from "./decor";
import { artIsSafe } from "./svgArt";
import { EFFECT_GROUPS, PAINT_KEYS, TEXT_EFFECTS, effectOf, effectPatch } from "./textEffects";

describe("ready decorations", () => {
  it("each one becomes a safe drawing in the theme's colour; the wide ones can be a section's edge", () => {
    const all = decorations();
    expect(all.length).toBe(DECOR.length);
    expect(all.length).toBeGreaterThanOrEqual(80);
    for (const d of all) {
      expect(artIsSafe(d.art), d.key).toBe(true);
      expect(JSON.stringify(d.art), d.key).not.toContain("currentColor");
    }
    const edges = all.filter(isEdge);
    expect(edges.length).toBeGreaterThanOrEqual(30);
    expect(edges.map((d) => d.key)).toContain("wave1");
    expect(edges.map((d) => d.key)).not.toContain("blob1");
  });

  it("the file's own look goes on a group, so the shapes look as they did", () => {
    const art = decorArt('<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M0 0L10 10"/><circle cx="5" cy="5" r="2" fill="#ff0000"/></svg>')!;
    expect(art.nodes).toEqual([{ t: "g", a: { fill: "none", stroke: "accent", "stroke-width": "2" }, c: [{ t: "path", a: { d: "M0 0L10 10" } }, { t: "circle", a: { cx: "5", cy: "5", r: "2", fill: "#ff0000" } }] }]);
    expect(decorArt("<div/>")).toBeNull();
  });
});

type Paint = {
  stroke?: { width: number; color: string };
  fill?: { color: string; to: string; via?: string };
  shadows?: Array<{ x: number; y: number; blur: number; color: string }>;
  glow?: { color: string; size: number };
  decoration?: { color: string; width: number; offset: number };
};

describe("ready word effects", () => {
  const TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"];
  const colour = (v: unknown) => TOKENS.includes(String(v)) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(v));

  it("only use what the page's words already take, within its limits", () => {
    expect(TEXT_EFFECTS).toHaveLength(100);
    expect(new Set(TEXT_EFFECTS.map((e) => e.key)).size).toBe(100);
    for (const e of TEXT_EFFECTS) expect(EFFECT_GROUPS.map(([g]) => g), e.key).toContain(e.group);
    for (const e of TEXT_EFFECTS) {
      const p = e.paint as Paint;
      for (const k of Object.keys(p)) expect(PAINT_KEYS as readonly string[], e.key).toContain(k);
      if (p.stroke) expect(p.stroke.width <= 10 && colour(p.stroke.color), e.key).toBe(true);
      if (p.fill) expect([p.fill.color, p.fill.to, p.fill.via].filter(Boolean).every(colour), e.key).toBe(true);
      if (p.shadows) expect(p.shadows.length <= 4 && p.shadows.every((s) => colour(s.color) && Math.abs(s.x) <= 100 && s.blur <= 200), e.key).toBe(true);
      if (p.glow) expect(colour(p.glow.color) && p.glow.size <= 120, e.key).toBe(true);
      if (p.decoration) expect(colour(p.decoration.color) && p.decoration.width <= 12 && p.decoration.offset >= -10, e.key).toBe(true);
    }
  });

  it("picking one replaces the words' paint; in a state it never changes their letters", () => {
    const comic = TEXT_EFFECTS.find((e) => e.key === "comic")!;
    expect(effectPatch(comic, false)).toMatchObject({ stroke: { width: 2, color: "black" }, fill: null, glow: null, decoration: null, weight: 900, caps: "upper" });
    expect(effectPatch(comic, true)).not.toHaveProperty("caps");
    const look: Record<string, unknown> = { ...TEXT_EFFECTS.find((e) => e.key === "sunset")!.paint };
    expect(effectOf((k) => look[k])).toBe("sunset");
    look.glow = { color: "accent", size: 4 };
    expect(effectOf((k) => look[k])).toBeUndefined();
  });
});
