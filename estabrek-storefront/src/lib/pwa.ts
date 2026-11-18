/**
 * The shop as an app (stage 5, step 1; admin → الإعدادات → التطبيق, header.app): once the owner switches it on,
 * a shopper can put the shop on their phone's home screen; it opens without the browser's bar, in the store's
 * colours and icon, and still opens with no internet (the pages they saw, else a page saying so).
 *
 * Here, pure: the settings as the shop reads them, the manifest (app/manifest.webmanifest), and the colours and
 * picture the icons are drawn with (app/api/app-icon). The worker itself is public/sw.js; the shopper's side
 * (registering it, offering to install) is components/AppShell.tsx.
 */
import { LANGS, langConfigOf, type Lang } from "./i18n";
import { identityOf, markOf, nameOf } from "./storeIdentity";

export const PROMPTS = ["off", "button", "banner"] as const;
export type Prompt = (typeof PROMPTS)[number];
export type AppSettings = {
  enabled: boolean;
  /** The app's name under its icon (else the store's short name) and in full (else the store's name), main language. */
  shortName: string;
  name: string;
  /** The bar's colour and the opening screen's (else the store's theme). */
  themeColor: string | null;
  backgroundColor: string | null;
  /** A square picture for the icon (else the store's logo, its favicon, or its first letter). */
  iconUrl: string | null;
  /** How the shop offers to install it: not at all, a small button, or a banner. */
  prompt: Prompt;
};
export const APP_DEFAULTS: AppSettings = { enabled: false, shortName: "", name: "", themeColor: null, backgroundColor: null, iconUrl: null, prompt: "banner" };

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const color = (v: unknown) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : null);
/** A picture's address: the shop's own (/…) or https. */
const picture = (v: unknown) => (typeof v === "string" && /^(\/(?!\/)|https:\/\/)[^\s<>"']+$/.test(v.trim()) ? v.trim() : null);
const words = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The app's settings as the owner saved them (header.app), every value checked. */
export function appOf(header: unknown): AppSettings {
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

type Site = { siteName?: string | null; header?: unknown; logoUrl?: string | null; faviconUrl?: string | null; themeColor?: string | null; currencyCode?: string | null };

/** The rose design's own colours (app/cinematic.css): the brand, and the page. */
export const ROSE = { theme: "#a43b64", background: "#fff9fb" } as const;

/** The colours the app is drawn in: the owner's, else the store's (`theme`: a store theme's brand and page colours). */
export function appColours(app: AppSettings, site: Site, theme?: { accent: string; bg: string } | null) {
  return {
    theme: app.themeColor ?? color(site.themeColor) ?? (theme ? color(theme.accent) : null) ?? ROSE.theme,
    background: app.backgroundColor ?? (theme ? color(theme.bg) : null) ?? ROSE.background,
  };
}

/** The picture the icon is made of, or null (the store's first letter then). */
export const iconPicture = (app: AppSettings, site: Site) => app.iconUrl ?? picture(site.logoUrl) ?? picture(site.faviconUrl);

/** One letter for an icon without a picture: the store's English name's, else its Latin key's, else "S". */
export function iconLetter(site: Site): string {
  const id = identityOf(site as never);
  const latin = [id.name.en, id.shortName.en, String(site.siteName ?? "")].map((s) => s.trim()).find((s) => /^[A-Za-z0-9]/.test(s));
  return (latin ?? "S").charAt(0).toUpperCase();
}

/** A short fingerprint of what the icons and the worker are made of: a change gives them new addresses. */
export function appVersion(parts: unknown[]): string {
  const text = JSON.stringify(parts);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * The icon's address (sizes 180, 192, 512; "maskable" leaves room for the phone's own shape), with the colour it is
 * drawn on (the icon is drawn at the edge, away from the store's themes) and the version.
 */
export const iconHref = (size: 180 | 192 | 512, purpose: "any" | "maskable", version: string, colour: string) => `/api/app-icon?size=${size}&purpose=${purpose}&c=${colour.replace("#", "")}&v=${version}`;
/** The colour an icon's address asks for, or the rose design's. */
export const iconColour = (v: string | null) => (v && /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v) ? `#${v.toLowerCase()}` : ROSE.theme);

const SHORTCUTS: Record<Lang, Array<[string, string]>> = {
  ar: [["المتجر", "/shop"], ["السلة", "/cart"], ["حسابي", "/account"]],
  en: [["Shop", "/shop"], ["Bag", "/cart"], ["My account", "/account"]],
  he: [["החנות", "/shop"], ["הסל", "/cart"], ["החשבון שלי", "/account"]],
};

/** The manifest (in the store's main language): what a phone needs to install the shop as an app. */
export function manifestOf(site: Site, colours: { theme: string; background: string }, version: string) {
  const app = appOf(site.header);
  const lang = langConfigOf(site.header).default;
  const id = identityOf(site as never);
  const name = (app.name || nameOf(id, lang)).slice(0, 60);
  const shortName = (app.shortName || markOf(id, lang)).slice(0, 24);
  const description = (id.about[lang] || id.tagline[lang] || "").slice(0, 300);
  return {
    id: "/",
    name,
    short_name: shortName,
    ...(description ? { description } : {}),
    lang,
    dir: lang === "en" ? "ltr" : "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: colours.theme,
    background_color: colours.background,
    categories: ["shopping"],
    icons: [
      { src: iconHref(192, "any", version, colours.theme), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconHref(512, "any", version, colours.theme), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconHref(192, "maskable", version, colours.theme), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: iconHref(512, "maskable", version, colours.theme), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: SHORTCUTS[lang].map(([label, url]) => ({ name: label, url, icons: [{ src: iconHref(192, "any", version, colours.theme), sizes: "192x192", type: "image/png" }] })),
  };
}

/** The worker's address: its version and the store's languages, the main one first (it keeps each one's offline page). */
export function workerHref(version: string, header: unknown, dev: boolean) {
  const cfg = langConfigOf(header);
  const list = [cfg.default, ...LANGS.filter((l) => l !== cfg.default && cfg.enabled.includes(l))];
  return `/sw.js?v=${version}&langs=${list.join(",")}${dev ? "&dev=1" : ""}`;
}
