import { expect, test } from "@playwright/test";
import { declarations } from "../src/pageTree/css";
import { linksOn } from "../src/storeThemes/css";
import { contrast } from "../src/storeThemes/colour";
import { reachProblem, storeFormOf } from "../src/pageTree/formSpec";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import { TEMPLATE_THEMES } from "../src/storeThemes/kits/themes";
import type { Node } from "../src/storeThemes/kits/tree";

// What tests/template-audit.spec.ts found on stores made from templates (2026-11-20), as rules:
// links in the theme's colour that reads on the box they sit on, real contact and newsletter forms, and headers that
// stay one bar on a phone.

const palette = (id: string) => {
  const theme = TEMPLATE_THEMES.find((x) => x.id === `tpl-${id}`)!;
  return theme.palettes[theme.mode]!;
};
const lum = (c: string) => contrast(c, "#000000") * 0.05 - 0.05;

test("a link reads on any box the renderer calls dark or light, in every template's theme", () => {
  // Tale's strong colour is its ink: its name on the purple header bar was ink on purple (1.8 : 1).
  const tale = palette("reference-tale-seo-agency");
  expect(tale.strong).toBe(tale.ink);
  expect(linksOn(tale, "light").dark).toBe(tale.bg);
  expect(linksOn(tale, "light").light).toBe(tale.strong);
  for (const theme of TEMPLATE_THEMES) {
    for (const mode of ["light", "dark"] as const) {
      const p = theme.palettes[mode];
      if (!p) continue;
      const links = linksOn(p, mode);
      // The lightest box called dark (0.18) and the darkest called light (0.5): 3 : 1 at least on both.
      expect((lum(links.dark) + 0.05) / 0.23, `${theme.id} ${mode} on dark`).toBeGreaterThanOrEqual(2.99);
      expect(0.55 / (lum(links.light) + 0.05), `${theme.id} ${mode} on light`).toBeGreaterThanOrEqual(2.99);
    }
  }
});

test("a painted box hands its links the theme's link colour for its tone; a box in a theme colour starts over", () => {
  expect(declarations({ bg: "#5b03e4", color: "#ffffff" }, "section")).toContain("--pt-link:var(--pt-link-on-dark)");
  expect(declarations({ bg: "#ffffff" }, "section")).toContain("--pt-link:var(--pt-link-on-light)");
  expect(declarations({ bg: "surface" }, "section")).toContain("--pt-link:initial");
  expect(declarations({ pad: [10, 10, 10, 10] }, "section").some((d) => d.startsWith("--pt-link"))).toBe(false);
});

test("the shop's contact form has its fields and a way to answer; the newsletter one email box", () => {
  const contact = storeFormOf("contact", "تواصل معنا", "ar", [{ label: "واتساب", value: "0599", href: "https://wa.me/970599" }]);
  expect(contact.fields.map((f) => [f.name, f.kind, f.required])).toEqual([["name", "text", true], ["email", "email", false], ["phone", "phone", false], ["message", "long", true]]);
  expect(contact.send).toEqual({ to: "contact" });
  expect(contact.ways).toHaveLength(1);
  expect(reachProblem(contact, { name: "سارة", message: "مرحبا" }, "ar")).toBeTruthy();
  expect(reachProblem(contact, { name: "سارة", message: "مرحبا", phone: "0599123456" }, "ar")).toBeNull();
  const letter = storeFormOf("newsletter", "Stay close", "en");
  expect(letter.fields.map((f) => f.name)).toEqual(["email"]);
  expect(letter).toMatchObject({ send: { to: "newsletter" }, inline: true, button: "Subscribe" });
  expect(reachProblem(letter, {}, "en")).toBeNull();
});

test("a template's header keeps a phone's bar compact: little padding, its call to action off the bar", () => {
  const sections = (id: string) => importDesign(id)!.design.header.root.children as Node[];
  for (const id of ["reference-liberty-market", "reference-quantix-saas", "reference-celadon"]) {
    const [header] = sections(id);
    const pad = header.style?.mobile?.pad as number[];
    expect(Math.max(...pad), id).toBeLessThanOrEqual(16);
  }
  // sourceHeader's call to action (SnapX "Share a photograph") hides on a phone.
  const hidden: string[] = [];
  const walk = (n: Node) => { if (n.style?.mobile?.hidden === true) hidden.push(n.type); n.children?.forEach(walk); };
  sections("reference-snapx-photography").forEach(walk);
  expect(hidden).toEqual(["button"]);
});
