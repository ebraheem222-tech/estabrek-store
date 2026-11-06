import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock("../api/settings.api", () => ({ getSettings: m.get, updateSettings: m.update }));
import { currentStoreThemeId, saveStoreTheme, saveThemeCustom, withOwnedTheme } from "./storeThemes";

const snapshot = { id: "store-design", name: { ar: "متجري", en: "My shop", he: "החנות שלי" }, blurb: { ar: "تصميمي", en: "My design", he: "העיצוב שלי" }, family: "fashion", mode: "light", palettes: { light: { bg: "#ffffff", surface: "#eeeeee", accent: "#224433", strong: "#113322", ink: "#111111" } }, fonts: { display: ["Inter"], text: ["Inter"] }, round: 1, pill: "8px", shadow: "soft", hero: "split", motion: "soft" };
beforeEach(() => { vi.clearAllMocks(); m.get.mockResolvedValue({ header: { storeDesign: { mode: "cms" }, storeTheme: { id: "store-design", mode: "light", snapshot } } }); m.update.mockResolvedValue({}); });
test("customizing or changing mode keeps the customer's independent base theme", async () => {
  await saveThemeCustom("store-design", { round: 0.5 });
  expect(m.update.mock.calls[0][0].header.storeTheme).toMatchObject({ id: "store-design", snapshot, custom: { round: 0.5 } });
  await saveStoreTheme({ id: "store-design", mode: "dark" });
  expect(m.update.mock.calls[1][0].header.storeTheme.snapshot).toEqual(snapshot);
});
test("a copied theme remains listed and keeps its palette when no source template is installed", () => {
  const themes = withOwnedTheme([], { storeTheme: { id: "store-design", snapshot } });
  expect(themes).toHaveLength(1);
  expect(themes[0].name.en).toBe("My shop");
  expect(themes[0].palettes?.light?.bg).toBe("#ffffff");
});

test("a copied theme stays selectable when its saved mode has no palette", () => {
  const themes = withOwnedTheme([], { storeTheme: { id: "store-design", mode: "dark", snapshot } });
  expect(themes).toHaveLength(1);
  expect(themes[0].swatch).toEqual(["#ffffff", "#eeeeee", "#224433", "#113322", "#111111"]);
  expect(themes[0].modes).toEqual(["light"]);
});

test("the current choice follows the storefront default and preserves independent theme IDs", () => {
  const defaults = { fashion: "runway-3d", electronics: "circuit", general: "mega-market" };
  expect(currentStoreThemeId({ identity: { industry: "fashion", audience: "women" } }, defaults)).toBe("rose");
  expect(currentStoreThemeId({ identity: { industry: "electronics" } }, defaults)).toBe("circuit");
  expect(currentStoreThemeId({ identity: { industry: "fashion", audience: "women" }, storeDesign: { mode: "cms" } }, defaults)).toBe("runway-3d");
  expect(currentStoreThemeId({ storeTheme: { id: "my-independent-design", snapshot } }, defaults)).toBe("my-independent-design");
});
