import { describe, test, expect } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkSiteStyles } from "../lib/siteStyles.js";

// A theme pack's shared styles (estabrek-admin src/studio/packs.ts stylesOfKit): whatever the
// pack, the h1–h6, body, button and card styles it writes pass the site styles' own check.

const PACKS = path.resolve(__dirname, "../../../estabrek-admin/src/studio/packs.ts");

describe("a theme pack's shared styles", () => {
  test("pass the site styles' check for every button and box look, weight, scale and corners", async () => {
    const { stylesOfKit, withPackStyles } = (await import(pathToFileURL(PACKS).href)) as {
      stylesOfKit: (kit: unknown, theme: { round?: number; pill?: string }) => Array<{ id: string }>;
      withPackStyles: (styles: unknown[], pack: unknown[]) => Array<{ id: string }>;
    };
    const buttons = ["solid", "outline", "soft", "shadow", "glow", "underline"];
    const boxes = ["flat", "line", "shadow", "soft", "glass", "pop"];
    const bad: string[] = [];
    buttons.forEach((button, i) =>
      boxes.forEach((box, j) => {
        const kit = {
          type: { scale: [1.2, 1.33, 1.42, 1.6][(i + j) % 4], weight: [500, 600, 700, 800][j % 4], caps: (i + j) % 2 === 0 },
          button: { look: button, weight: [600, 700][i % 2] }, box: { look: box },
          hover: { button: "lift", image: "zoom" }, focus: "ring", icons: "lucide", decor: { shape: "rounded", pattern: "dots", edge: "wave" },
          motion: { enter: "up", heading: "words", ease: "smooth", duration: 1, stagger: 0.1 }, cursor: "none", loader: "none", model: { finish: "matte", lights: "studio", floor: "shadow" },
        };
        const styles = stylesOfKit(kit, { round: [0, 0.4, 1, 2][j % 4], pill: ["999px", "2px", "10px"][i % 3] });
        const r = checkSiteStyles(styles);
        if (!r.ok) bad.push(`${button}/${box}: ${JSON.stringify(r.issues.slice(0, 2))}`);
        expect(styles.map((s) => s.id)).toEqual(["h1", "h2", "h3", "h4", "h5", "h6", "body", "solid", "outline", "link", "card"]);
      }),
    );
    expect(bad).toEqual([]);
    // The store's own named styles stay beside a pack's.
    const mine = { id: "promo", kind: "text", style: { base: { size: 30 } } };
    const old = { id: "h1", kind: "text", style: { base: { size: 99 } } };
    const pack = [{ id: "h1", kind: "text", style: { base: { size: 56 } } }];
    expect(withPackStyles([old, mine], pack)).toEqual([pack[0], mine]);
  });
});
