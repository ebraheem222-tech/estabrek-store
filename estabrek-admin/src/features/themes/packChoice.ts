/**
 * A pack as the store mixes it (PackPanel): each part from this pack, another one or turned
 * off; the colours and fonts become the store's changes to the theme. Pure (tested).
 */
import { PACK_PARTS, fontPresetOf, isKitPart, mixKit, type KitPart, type PackKit, type PackPart } from "../../studio/packs";
import type { StoreThemeInfo } from "../../studio/storeThemes";
import type { ThemeCustom } from "./customize";

/** Parts that can be turned off, and how. */
export const OFF: Partial<Record<KitPart, (k: PackKit) => PackKit>> = {
  hover: (k) => ({ ...k, hover: { button: "none", image: "none" } }),
  motion: (k) => ({ ...k, motion: { ...k.motion, enter: "none" } }),
  cursor: (k) => ({ ...k, cursor: "none" }),
  loader: (k) => ({ ...k, loader: "none" }),
};

export type PackChoice = { kit: PackKit; custom: ThemeCustom | null };
/** Where each part comes from: missing = this pack, "off" = turned off, else the id of the pack it's taken from. */
export type PackFrom = Partial<Record<PackPart, string>>;

/** A pack with its parts from where they're taken: its kit, and its colours and fonts as the store's changes (over `base`). */
export function packChoice(theme: StoreThemeInfo, from: PackFrom, base: ThemeCustom | null, themes: StoreThemeInfo[]): PackChoice | null {
  if (!theme.kit) return null;
  const byId = new Map(themes.map((t) => [t.id, t]));
  const take: Partial<Record<KitPart, PackKit | undefined>> = {};
  for (const p of PACK_PARTS) if (isKitPart(p) && from[p] && from[p] !== "off") take[p] = byId.get(from[p]!)?.kit;
  let kit = mixKit(theme.kit, take);
  for (const p of PACK_PARTS) if (isKitPart(p) && from[p] === "off" && OFF[p]) kit = OFF[p]!(kit);
  let custom: ThemeCustom | null = base ? { ...base } : null;
  const colours = from.colours ? byId.get(from.colours) : undefined;
  if (colours?.palettes) custom = { ...(custom ?? {}), palette: { ...(colours.palettes.light ? { light: colours.palettes.light } : {}), ...(colours.palettes.dark ? { dark: colours.palettes.dark } : {}) } };
  const fonts = from.fonts ? byId.get(from.fonts)?.fonts : undefined;
  const display = fontPresetOf(fonts?.display);
  const text = fontPresetOf(fonts?.text);
  if (display || text) custom = { ...(custom ?? {}), fonts: { ...(display ? { display } : {}), ...(text ? { text } : {}) } };
  return { kit, custom };
}

