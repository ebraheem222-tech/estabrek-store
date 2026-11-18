// الإعدادات → التطبيق (header.app): the shop as an app (estabrek-storefront src/lib/pwa.ts reads the same shape).
// Pure, so it can be tested apart from the card.

export const PROMPTS = ["banner", "button", "off"] as const;
export type Prompt = (typeof PROMPTS)[number];
export type StoreApp = { enabled: boolean; shortName: string; name: string; themeColor: string | null; backgroundColor: string | null; iconUrl: string | null; prompt: Prompt };
export const APP_DEFAULTS: StoreApp = { enabled: false, shortName: "", name: "", themeColor: null, backgroundColor: null, iconUrl: null, prompt: "banner" };
/** The rose design's own colours, the shop's when nothing else is set. */
export const ROSE = { theme: "#a43b64", background: "#fff9fb" } as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const color = (v: unknown) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : null);
const picture = (v: unknown) => (typeof v === "string" && /^(\/(?!\/)|https:\/\/)[^\s<>"']+$/.test(v.trim()) ? v.trim() : null);
const words = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The app's settings as saved, every value checked (as the shop checks them). */
export function storeAppOf(header: unknown): StoreApp {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const a = h.app && typeof h.app === "object" ? (h.app as Record<string, unknown>) : {};
  return {
    enabled: a.enabled === true,
    shortName: words(a.shortName, 24),
    name: words(a.name, 60),
    themeColor: color(a.themeColor),
    backgroundColor: color(a.backgroundColor),
    iconUrl: picture(a.iconUrl),
    prompt: (PROMPTS as readonly unknown[]).includes(a.prompt) ? (a.prompt as Prompt) : APP_DEFAULTS.prompt,
  };
}

/** The colours the app will be drawn in, as the shop picks them (its theme's colours aren't known here: the rose design's stand in). */
export const previewColours = (app: StoreApp, siteThemeColor?: string | null) => ({ theme: app.themeColor ?? color(siteThemeColor) ?? ROSE.theme, background: app.backgroundColor ?? ROSE.background });

/** The picture the icon is made of (the app's, the logo, the favicon), or null: the store's first letter. */
export const previewPicture = (app: StoreApp, site: { logoUrl?: string | null; faviconUrl?: string | null }) => app.iconUrl ?? picture(site.logoUrl) ?? picture(site.faviconUrl);

/** The letter an icon without a picture shows, as the shop draws it: the store's English name's first, else its site name's, else "S". */
export function previewLetter(header: unknown, siteName?: string | null): string {
  const id = ((header && typeof header === "object" ? header : {}) as { identity?: { name?: Record<string, string>; shortName?: Record<string, string> } }).identity;
  const latin = [id?.name?.en, id?.shortName?.en, siteName].map((s) => String(s ?? "").trim()).find((s) => /^[A-Za-z0-9]/.test(s));
  return (latin ?? "S").charAt(0).toUpperCase();
}

/** Light or dark words on a colour. */
export function inkOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1f1a1d" : "#ffffff";
}

/** What is saved: only what is set (the shop fills the rest from the store). */
export function savedApp(app: StoreApp): Record<string, unknown> {
  return {
    enabled: app.enabled,
    prompt: app.prompt,
    ...(app.shortName.trim() ? { shortName: app.shortName.trim().slice(0, 24) } : {}),
    ...(app.name.trim() ? { name: app.name.trim().slice(0, 60) } : {}),
    ...(app.themeColor ? { themeColor: app.themeColor } : {}),
    ...(app.backgroundColor ? { backgroundColor: app.backgroundColor } : {}),
    ...(app.iconUrl ? { iconUrl: app.iconUrl } : {}),
  };
}
