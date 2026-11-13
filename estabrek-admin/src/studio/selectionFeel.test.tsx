// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { setLangForTests } from "../lib/lang";
import { clickPick } from "./selectionPicking";
import { distancesAround } from "./handles";
import { ShortcutsDialog } from "./ShortcutsDialog";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

// A review widget in a section; its quote and name are inner parts (deepest first, as picked).
const PATHS: Record<string, string[]> = {
  "detail:reviews/quote": ["page", "sec", "reviews", "detail:reviews/quote"],
  "detail:reviews/quote/b": ["page", "sec", "reviews", "detail:reviews/quote", "detail:reviews/quote/b"],
  "detail:reviews/name": ["page", "sec", "reviews", "detail:reviews/name"],
  reviews: ["page", "sec", "reviews"],
  sec: ["page", "sec"],
};
const under = ["detail:reviews/quote/b", "detail:reviews/quote", "reviews", "sec"];
const opts = (more: Partial<Parameters<typeof clickPick>[2]> = {}) => ({ deep: true, deepest: false, cycle: false, isPart: (x: string) => x.startsWith("detail:"), pathOf: (x: string) => PATHS[x] ?? [x], ...more });

describe("a click picks like a design tool", () => {
  it("the object first, never its inner part", () => {
    expect(clickPick(under, null, opts())).toBe("reviews");
    expect(clickPick(under, "sec", opts())).toBe("reviews");
  });
  it("a second click on the selected object goes one level inside", () => {
    expect(clickPick(under, "reviews", opts())).toBe("detail:reviews/quote");
  });
  it("inside an object, its parts are one click away; another object takes the click back out", () => {
    expect(clickPick(under, "detail:reviews/name", opts())).toBe("detail:reviews/quote/b");
    expect(clickPick(["heading-2", "sec"], "detail:reviews/quote", opts())).toBe("heading-2");
  });
  it("words of a section laid over its picture pick the section, not the picture behind them", () => {
    // An opening section: its headline (an inner part) is drawn over its picture (a field of the same section).
    const paths: Record<string, string[]> = {
      "detail:hero/h1": ["page", "hero", "detail:hero/h1"],
      "slot:hero:image": ["page", "hero", "slot:hero:image"],
      hero: ["page", "hero"],
      card: ["page", "card"],
    };
    const o = opts({ pathOf: (x: string) => paths[x] ?? [x] });
    const onWords = ["detail:hero/h1", "slot:hero:image", "hero"];
    expect(clickPick(onWords, null, o)).toBe("hero");
    // A second click goes inside, to the headline itself.
    expect(clickPick(onWords, "hero", o)).toBe("detail:hero/h1");
    // Beside the words the picture is what's under the pointer, and is picked.
    expect(clickPick(["slot:hero:image", "hero"], null, o)).toBe("slot:hero:image");
    // Something else placed under a see-through part of a section is still the object (it isn't that section's).
    expect(clickPick(["detail:hero/h1", "card", "hero"], null, o)).toBe("card");
  });
  it("Ctrl/⌘ goes to the deepest at once; Alt goes round; without deep selection parts never come", () => {
    expect(clickPick(under, null, opts({ deepest: true }))).toBe("detail:reviews/quote/b");
    expect(clickPick(under, "detail:reviews/quote/b", opts({ cycle: true }))).toBe("detail:reviews/quote");
    expect(clickPick(under, "reviews", opts({ deep: false, deepest: true }))).toBe("reviews");
    expect(clickPick([], null, opts())).toBeNull();
  });
});

describe("distances while dragging", () => {
  it("to the nearest thing on each side, else the holder's edge", () => {
    const holder = { x: 0, y: 0, w: 1000, h: 600 };
    const box = { x: 300, y: 200, w: 100, h: 50 };
    const gaps = distancesAround(box, holder, [{ x: 100, y: 180, w: 120, h: 40 }, { x: 900, y: 0, w: 50, h: 50 }, { x: 320, y: 400, w: 60, h: 60 }]);
    expect(gaps.map((g) => Math.round(g.length))).toEqual([80, 600, 200, 150]);
    // Along its middle.
    expect(gaps[0]).toMatchObject({ x1: 220, x2: 300, y1: 225, y2: 225 });
    expect(gaps[3]).toMatchObject({ x1: 350, y1: 250, y2: 400 });
  });
  it("touching sides show nothing", () => {
    expect(distancesAround({ x: 0, y: 0, w: 1000, h: 600 }, { x: 0, y: 0, w: 1000, h: 600 }, [])).toEqual([]);
  });
});

describe("the shortcuts list", () => {
  it("lists the selection, moving, editing and view keys in the editor's language", () => {
    setLangForTests("en");
    let closed = false;
    render(<ShortcutsDialog onClose={() => { closed = true; }} />);
    for (const words of ["Selects the object itself", "The deepest part under the pointer, at once", "Moves (from any part inside) with guides and distances", "Copy the look / paste the look", "Fit the page"]) expect(screen.getByText(words)).toBeTruthy();
    fireEvent.click(screen.getByTestId("studio-shortcuts-close"));
    expect(closed).toBe(true);
  });
});
