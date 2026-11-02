import { describe, expect, it } from "vitest";
import { PACK_STYLE_IDS, fontPresetOf, mixKit, storeKitOf, stylesOfKit, templateKitOf, withPackStyles, type PackKit } from "./packs";
import { packChoice } from "../features/themes/packChoice";
import type { StoreThemeInfo } from "./storeThemes";

// The backend's src/tests/packs.unit.spec.ts checks these styles with the site styles' own rules.

const kit = (over: Partial<PackKit> = {}): PackKit => ({
  type: { scale: 1.4, weight: 600, caps: false },
  button: { look: "solid", weight: 600 },
  box: { look: "flat" },
  hover: { button: "lift", image: "zoom" },
  focus: "ring",
  icons: "lucide",
  decor: { shape: "rounded", pattern: "dots", edge: "wave" },
  motion: { enter: "up", heading: "lines", ease: "smooth", duration: 1, stagger: 0.1 },
  cursor: "none",
  loader: "none",
  model: { finish: "matte", lights: "studio", floor: "shadow" },
  ...over,
});
const theme = (id: string, k: PackKit, extra: Partial<StoreThemeInfo> = {}): StoreThemeInfo => ({
  id, name: { ar: id, en: id, he: id }, family: "general", blurb: { ar: "", en: "", he: "" }, mode: "light", modes: ["light", "dark"], swatch: ["#fff"], hero: "split", motion: "soft", kit: k, ...extra,
});

describe("theme packs in the admin", () => {
  it("turn a kit into the editor's shared styles: headings on its scale, its buttons and a card", () => {
    const styles = stylesOfKit(kit({ type: { scale: 1.25, weight: 700, caps: true }, button: { look: "glow", weight: 700 }, box: { look: "pop" } }), { round: 0.5, pill: "4px" });
    expect(styles.map((s) => s.id)).toEqual([...PACK_STYLE_IDS]);
    const base = (id: string) => styles.find((s) => s.id === id)!.style.base as Record<string, unknown>;
    expect([base("h1").size, base("h2").size, base("h3").size, base("h4").size, base("h5").size, base("h6").size]).toEqual([44, 35, 28, 23, 18, 16]);
    expect(base("h1")).toMatchObject({ font: "heading", weight: 700, caps: "upper", sizeMin: 26 });
    expect(base("h4").caps).toBeUndefined();
    expect(base("solid")).toMatchObject({ radius: 4, glow: { color: "accent", size: 14 }, hover: { glow: { color: "accent", size: 28 } } });
    expect(base("card")).toMatchObject({ radius: 8, border: { width: 2, color: "text" }, shade: { x: 6, y: 6 } });
    // Big scales stop at 72px; round buttons stay round.
    const big = stylesOfKit(kit({ type: { scale: 1.6, weight: 500, caps: false } }), { pill: "999px" });
    expect(big[0].style.base).toMatchObject({ size: 72 });
    expect(big.find((s) => s.id === "solid")!.style.base).toMatchObject({ radius: 999 });
  });

  it("put a pack's styles in place of the same ones, keeping the store's own", () => {
    const own = { id: "promo", kind: "text" as const, style: { base: { size: 30 } } };
    const out = withPackStyles([{ id: "h1", kind: "text", style: { base: { size: 99 } } }, own], stylesOfKit(kit(), {}));
    expect(out.filter((s) => s.id === "h1")).toHaveLength(1);
    expect(out.at(-1)).toEqual(own);
  });

  it("mix parts from other packs, and read the store's kit over its theme's", () => {
    const other = kit({ cursor: "theme-neon", decor: { shape: "star", pattern: "rings", edge: "arc" } });
    const mixed = mixKit(kit(), { cursor: other, decor: other });
    expect([mixed.cursor, mixed.decor.shape, mixed.focus]).toEqual(["theme-neon", "star", "ring"]);
    expect(storeKitOf(null, kit(), null)).toEqual(kit());
    expect(storeKitOf({ storeKit: { focus: "glow", model: { finish: "gold" } } }, kit(), null)).toMatchObject({ focus: "glow", model: { finish: "gold", lights: "studio" } });
    expect(storeKitOf({ storeKit: { focus: "glow" } }, null, null)).toBeNull();
    expect(templateKitOf(kit())).toEqual({ shape: "rounded", pattern: "dots", edge: "wave", finish: "matte", lights: "studio", floor: "shadow", buttonHover: "lift", imageHover: "zoom", box: "flat" });
    expect([fontPresetOf("th-el-messiri"), fontPresetOf("Rose Hebrew")]).toEqual(["messiri", undefined]);
  });

  it("make a store's mix: parts from other packs or off, its colours and fonts as the theme's changes", () => {
    const a = theme("a", kit());
    const b = theme("b", kit({ hover: { button: "pop", image: "tilt" } }), { palettes: { light: { bg: "#ffffff" }, dark: { bg: "#000000" } }, fonts: { display: "th-lalezar", text: "th-cairo" } });
    expect(packChoice(a, {}, null, [a, b])).toEqual({ kit: kit(), custom: null });
    const c = packChoice(a, { hover: "b", cursor: "off", motion: "off", colours: "b", fonts: "b" }, { round: 1 }, [a, b])!;
    expect(c.kit.hover).toEqual({ button: "pop", image: "tilt" });
    expect([c.kit.cursor, c.kit.motion.enter]).toEqual(["none", "none"]);
    expect(c.custom).toEqual({ round: 1, palette: { light: { bg: "#ffffff" }, dark: { bg: "#000000" } }, fonts: { display: "lalezar", text: "cairo" } });
    expect(packChoice(theme("no-kit", undefined as never), {}, null, [])).toBeNull();
  });
});
