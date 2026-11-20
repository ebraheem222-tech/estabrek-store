import { expect, test } from "@playwright/test";
import { declarations, toneOf } from "../src/pageTree/css";
import { themeCss, treeThemeVars, wordsOn } from "../src/storeThemes/css";
import { themeById } from "../src/storeThemes/registry";

// A box painted its own colour, its words left to the page's, gets the theme's colour that reads on it
// (pageTree/css.ts toneOf; storeThemes/css.ts wordsOn): a client's light theme had its template's dark hero
// with the theme's navy words on it.

test("a box's tone from what it is painted with: dark, light, or neither", () => {
  expect(toneOf("#1e1e1e")).toBe("dark");
  expect(toneOf("#262044", "#1e1e1e")).toBe("dark");
  expect(toneOf("#ffffff")).toBe("light");
  expect(toneOf("#f5f6f8")).toBe("light");
  // A middle tone, a variable, a see-through colour: not decided.
  expect(toneOf("#808080")).toBeNull();
  expect(toneOf("var(--accent)")).toBeNull();
  // Half of it the theme's own colour (unknown): not decided either.
  expect(toneOf("linear-gradient(45deg,var(--accent),#000)")).toBeNull();
  expect(toneOf("rgba(255,255,255,0.1)")).toBeNull();
  expect(toneOf(undefined)).toBeNull();
  expect(toneOf("radial-gradient(at 0% 0%,rgb(38, 32, 68) 0,transparent 90%)", "#1e1e1e")).toBe("dark");
});

test("the words of a painted box take the theme's colour for its tone; words with their own colour, or none painted, are left", () => {
  const dark = declarations({ bg: "#1e1e1e" }, "section");
  expect(dark).toContain("color:var(--pt-on-dark,currentColor)");
  expect(declarations({ bg: "#ffffff" }, "section")).toContain("color:var(--pt-on-light,currentColor)");
  // Their own colour wins; nothing painted, a middle tone or a theme colour: nothing added.
  expect(declarations({ bg: "#1e1e1e", color: "#ff0000" }, "section").filter((d) => d.startsWith("color:"))).toEqual(["color:#ff0000"]);
  for (const s of [{}, { bg: "#808080" }, { bg: "accent" }]) expect(declarations(s, "section").some((d) => d.startsWith("color:var(--pt-on-")), JSON.stringify(s)).toBe(false);
});

test("the theme's colours for words on dark and on light: its ink on the right side, its page colour on the other", () => {
  const theme = themeById("mega-market")!;
  const p = theme.palettes.light!;
  expect(wordsOn(p, "light")).toEqual({ dark: p.bg, light: p.ink });
  const vars = treeThemeVars(theme, "light") as Record<string, string>;
  expect(vars["--pt-on-dark"]).toBe(p.bg);
  expect(vars["--pt-on-light"]).toBe(p.ink);
  const css = themeCss(theme, "light");
  expect(css).toContain(`--th-on-dark:${p.bg}`);
  expect(css).toContain(`--th-on-light:${p.ink}`);
});
