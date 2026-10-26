import type { Lang } from "@/lib/i18n";
import type { StoreTheme, Words } from "./types";

/** A theme's own words in the page's language. */
export const say = (w: Words, lang: Lang) => w[lang] || w.en;
/** The running strip's words. */
export const marqueeWords = (theme: StoreTheme, lang: Lang) => theme.copy.marquee.map((m) => say(m, lang));
