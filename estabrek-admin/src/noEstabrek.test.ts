import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NAV_GROUPS } from "./layouts/adminNav";

// Phase 5 of the clean platform plan (docs/clean-platform-plan.ar.md): the admin is any site's, not a hijab
// shop's. Razan (the rose design's guide), hijabs, abayas and modest-fashion words are said only in the places
// that are the rose design's store's own, or that its owner picks; a new one anywhere else fails here.

const SRC = path.join(process.cwd(), "src");
const WORDS = /رزان|Razan|حجاب|عباي|محتشم/;

/** Where those words may be, and why. */
const ALLOWED: Record<string, string> = {
  "api/razan.api.ts": "Razan's own settings",
  "features/razan/": "Razan's page (roseOnly in the menu)",
  "features/quiz/QuizPage.tsx": "the quiz Razan offers (roseOnly in the menu)",
  "routes/router.tsx": "the route to Razan's page",
  "layouts/adminNav.tsx": "Razan's menu item (roseOnly)",
  "layouts/AdminLayout.tsx": "Razan's page's title",
  "hooks/useRoseOwner.ts": "the rose owner's check",
  "features/requests/RequestsPage.tsx": "Razan's requests, said only for the rose owner (useRoseOwner)",
  "features/requests/requestsText.ts": "a request's source when Razan sent it (only she does)",
  "features/inventory/ScarcityCard.tsx": "Razan's help, said only for the rose owner (useRoseOwner)",
  "lib/orders.ts": "an order's source when Razan helped (only she does)",
  "lib/scarcity.ts": "a comment",
  "api/requests.api.ts": "a comment",
  "features/settings/CheckoutTermsCard.tsx": "a comment",
  "features/settings/SettingsPage.tsx": "the rose design's colour scenes (shown only to its store) and a comment",
  "features/setup/packs.ts": "the modest-fashion pack, an owner's own pick",
  "features/themes/ThemesPage.tsx": "the rose design's card (shown only to its owner)",
  "studio/StudioPanels.tsx": "the rose opening's scenes (shown only when the store wears it)",
  "studio/storeThemes.ts": "the rose design's own theme (ROSE_ID) and a comment",
  "studio/iconLibrary.ts": "words to find an icon by",
  "studio/templates/": "the template library: an owner picks a fashion or modest template",
  "lib/productComposer.ts": "guessing a product's sizes from its name",
  "lib/words.he.ts": "the Hebrew of the lines above",
};

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "test" ? [] : files(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("nothing of Estabrek in another store's admin", () => {
  it("Razan, hijabs and abayas are said only in the rose design's places", () => {
    const leaks: string[] = [];
    for (const file of files(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (Object.keys(ALLOWED).some((a) => (a.endsWith("/") ? rel.startsWith(a) : rel === a))) continue;
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (WORDS.test(line)) leaks.push(`${rel}:${i + 1}: ${line.trim().slice(0, 90)}`);
      });
    }
    expect(leaks).toEqual([]);
  });

  it("every allowed place still has a reason to be on the list", () => {
    for (const a of Object.keys(ALLOWED)) expect(fs.existsSync(path.join(SRC, a)), a).toBe(true);
  });

  it("the menu's Razan pages are the rose design's store's alone", () => {
    for (const item of NAV_GROUPS.flatMap((g) => g.items)) {
      if (WORDS.test(item.label) || /razan|quiz/.test(item.to)) expect(item.roseOnly, item.to).toBe(true);
    }
  });
});
