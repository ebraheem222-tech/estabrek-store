import { expect, test } from "@playwright/test";
import { APP_DEFAULTS, ROSE, appColours, appOf, appVersion, iconLetter, iconPicture, manifestOf, workerHref } from "../src/lib/pwa";

// The shop as an app (src/lib/pwa.ts), its pure side: the owner's settings as the shop reads them, the colours and
// picture of its icon, and the manifest a phone installs it from.

const identity = { name: { ar: "متجر استبرق", en: "Estabrek", he: "" }, shortName: { ar: "استبرق", en: "Estabrek", he: "" }, about: { ar: "حجاب وفساتين.", en: "Hijabs and dresses.", he: "" }, industry: "fashion", audience: "women" };

test("the owner's settings, every value checked: off unless switched on", () => {
  expect(appOf(null)).toEqual(APP_DEFAULTS);
  expect(appOf({ app: { enabled: "yes" } }).enabled).toBe(false);
  const a = appOf({ app: { enabled: true, shortName: "  استبرق  ", themeColor: "#ABCDEF", backgroundColor: "red", iconUrl: "javascript:alert(1)", prompt: "popup" } });
  expect(a).toEqual({ ...APP_DEFAULTS, enabled: true, shortName: "استبرق", themeColor: "#abcdef" });
  expect(appOf({ app: { iconUrl: "https://res.cloudinary.com/x/icon.png", prompt: "button" } })).toMatchObject({ iconUrl: "https://res.cloudinary.com/x/icon.png", prompt: "button" });
  expect(appOf({ app: { iconUrl: "//evil.example/x.png" } }).iconUrl).toBeNull();
});

test("its colours: the owner's, else the store's, else a store theme's, else the rose design's", () => {
  const app = appOf({ app: { enabled: true } });
  expect(appColours(app, {})).toEqual({ theme: ROSE.theme, background: ROSE.background });
  expect(appColours(app, { themeColor: "#112233" })).toEqual({ theme: "#112233", background: ROSE.background });
  expect(appColours(app, {}, { accent: "#00ff00", bg: "#000000" })).toEqual({ theme: "#00ff00", background: "#000000" });
  expect(appColours(appOf({ app: { themeColor: "#123456", backgroundColor: "#fefefe" } }), { themeColor: "#112233" })).toEqual({ theme: "#123456", background: "#fefefe" });
});

test("its picture: the app's, else the logo, else the favicon; a store without one gets its first Latin letter", () => {
  const app = appOf({ app: { enabled: true } });
  expect(iconPicture(app, { logoUrl: "https://x.test/logo.png", faviconUrl: "/favicon.png" })).toBe("https://x.test/logo.png");
  expect(iconPicture(app, { faviconUrl: "/favicon.png" })).toBe("/favicon.png");
  expect(iconPicture(appOf({ app: { iconUrl: "/app.png" } }), { logoUrl: "https://x.test/logo.png" })).toBe("/app.png");
  expect(iconLetter({ header: { identity } })).toBe("E");
  expect(iconLetter({ siteName: "متجر" })).toBe("S");
  // A change to what an icon is made of gives it a new address.
  expect(appVersion(["#a", null])).not.toBe(appVersion(["#b", null]));
  expect(appVersion(["#a", null])).toBe(appVersion(["#a", null]));
});

test("the manifest: the store's name and words in its main language, its colours, its icons, opening as an app", () => {
  const site = { header: { identity, app: { enabled: true } } };
  const m = manifestOf(site, { theme: "#a43b64", background: "#fff9fb" }, "v1");
  expect(m).toMatchObject({ id: "/", name: "متجر استبرق", short_name: "استبرق", description: "حجاب وفساتين.", lang: "ar", dir: "rtl", start_url: "/", scope: "/", display: "standalone", theme_color: "#a43b64", background_color: "#fff9fb" });
  expect(m.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(["192x192 any", "512x512 any", "192x192 maskable", "512x512 maskable"]);
  expect(m.icons[0].src).toBe("/api/app-icon?size=192&purpose=any&c=a43b64&v=v1");
  expect(m.shortcuts.map((s) => s.url)).toEqual(["/shop", "/cart", "/account"]);
  // An English store; the owner's own names win.
  const en = manifestOf({ header: { identity, languages: { enabled: ["en", "ar"], default: "en" }, app: { enabled: true, name: "Estabrek Shop", shortName: "Estabrek" } } }, { theme: "#000000", background: "#ffffff" }, "v2");
  expect(en).toMatchObject({ name: "Estabrek Shop", short_name: "Estabrek", lang: "en", dir: "ltr" });
  expect(en.shortcuts[0].name).toBe("Shop");
});

test("the worker's address: its version and the store's languages, the main one first", () => {
  expect(workerHref("v1", { languages: { enabled: ["ar", "en", "he"], default: "he" } }, false)).toBe("/sw.js?v=v1&langs=he,ar,en");
  expect(workerHref("v1", { languages: { enabled: ["ar"], default: "ar" } }, true)).toBe("/sw.js?v=v1&langs=ar&dev=1");
});
