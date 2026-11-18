/**
 * The app's state on the server (lib/pwa.ts is the pure side): the store's settings, the app's own, its colours
 * (the owner's, a store theme's, or the rose design's), the picture its icons are drawn from, and the version that
 * changes their addresses when any of it changes. The manifest, the icons and the layout all read it.
 */
import { getPublicSettings } from "./api";
import { appColours, appOf, appVersion, iconLetter, iconPicture } from "./pwa";
import { storeThemeOf } from "@/storeThemes";
import { themePalette } from "@/storeThemes/css";

export async function appState() {
  const { site } = await getPublicSettings();
  const app = appOf((site as { header?: unknown }).header);
  const chosen = storeThemeOf((site as { header?: unknown }).header);
  const palette = chosen ? themePalette(chosen.theme, chosen.mode).palette : null;
  const colours = appColours(app, site as never, palette ? { accent: palette.accent, bg: palette.bg } : null);
  const picture = iconPicture(app, site as never);
  const letter = iconLetter(site as never);
  const version = appVersion([colours, picture, letter, app.name, app.shortName]);
  return { site, app, colours, picture, letter, version };
}
