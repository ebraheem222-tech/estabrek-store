// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { PERSONAS, PERSONA_IDS, personaById, personaFace, personaFaceUrl, personaLines, personasFor } from "../../../estabrek-storefront/src/lib/personas";
import { normalizeStorefrontSettings } from "../../../estabrek-storefront/src/lib/storefrontSettings";
import { setLangForTests } from "../lib/lang";
import { PersonaPicker } from "./PersonaPicker";

// The store assistant's 50 personalities (estabrek-storefront/src/lib/personas.ts, shared with the shop): each one
// whole in three languages with a face drawn as SVG, every kind of store with some that fit it, and the picker.

const INDUSTRIES = ["fashion", "shoes", "electronics", "phones", "gaming", "books", "beauty", "jewelry", "home", "kids", "food", "digital", "marketplace", "general", "computers", "sports", "art", "pets", "flowers", "music"];
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The personalities", () => {
  test("50 of them, each its own, named and placed in three languages", () => {
    expect(PERSONAS).toHaveLength(50);
    expect(new Set(PERSONA_IDS).size).toBe(50);
    for (const p of PERSONAS) {
      expect(p.id).toMatch(/^[a-z0-9-]{2,30}$/);
      for (const l of ["ar", "en", "he"] as const) {
        expect(p.name[l].trim(), `${p.id}.name.${l}`).not.toBe("");
        expect(p.role[l].trim(), `${p.id}.role.${l}`).not.toBe("");
        const lines = personaLines(p, l);
        expect(lines.hello).toContain(p.name[l]);
        expect(lines.hello).not.toMatch(/\{name\}|\{role\}/);
        expect(lines.nudge.trim() && lines.hint.trim()).toBeTruthy();
      }
      expect(p.fits.every((f) => INDUSTRIES.includes(f)), p.id).toBe(true);
    }
    expect(new Set(PERSONAS.map((p) => p.name.en)).size).toBe(50);
  });

  test("every kind of store has some that fit it, first in the list", () => {
    for (const industry of INDUSTRIES) {
      const list = personasFor(industry);
      expect(list).toHaveLength(50);
      expect(list[0].fits, industry).toContain(industry);
      expect(PERSONAS.filter((p) => p.fits.includes(industry)).length, industry).toBeGreaterThanOrEqual(1);
    }
  });

  test("each face is a drawing of its own: valid SVG, its own ids, and as an <img> address", () => {
    const ids = new Set<string>();
    for (const p of PERSONAS) {
      const svg = personaFace(p, 64);
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      expect(doc.getElementsByTagName("parsererror"), p.id).toHaveLength(0);
      expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 100 100");
      const id = doc.querySelector("linearGradient")!.id;
      expect(ids.has(id)).toBe(false);
      ids.add(id);
      expect(personaFaceUrl(p).startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    }
  });

  test("the shop keeps one of them, or none", () => {
    expect(normalizeStorefrontSettings({ assistantPersona: "yousef" }).assistantPersona).toBe("yousef");
    expect(normalizeStorefrontSettings({ assistantPersona: "nobody" }).assistantPersona).toBe("");
    expect(normalizeStorefrontSettings({}).assistantPersona).toBe("");
    expect(personaById("nobody")).toBeNull();
  });
});

describe("The picker", () => {
  test("those that fit first and said so; found by name or role; picked, then none", () => {
    setLangForTests("en");
    let value = "";
    const { rerender } = render(<PersonaPicker value={value} onChange={(id) => (value = id)} industry="books" testid="p" />);
    const first = screen.getByRole("listbox").querySelector("[role=option]")!;
    expect(first.getAttribute("data-fits")).toBe("true");
    fireEvent.change(screen.getByTestId("p-search"), { target: { value: "chef" } });
    const chefs = screen.getAllByRole("option").map((o) => o.getAttribute("data-testid"));
    expect(chefs).toEqual(expect.arrayContaining(["p-hamza", "p-khaled", "p-sana", "p-sukkar"]));
    fireEvent.click(screen.getByTestId("p-hamza"));
    expect(value).toBe("hamza");
    rerender(<PersonaPicker value={value} onChange={(id) => (value = id)} industry="books" testid="p" />);
    expect(screen.getByTestId("p-picked").textContent).toContain("Hamza");
    expect(screen.getByTestId("p-picked").textContent).toContain("I'm Hamza");
    fireEvent.click(screen.getByTestId("p-none"));
    expect(value).toBe("");
  });
});
