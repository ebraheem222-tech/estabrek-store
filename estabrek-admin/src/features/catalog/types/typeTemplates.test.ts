import { describe, expect, it } from "vitest";
import { TEMPLATE_GROUPS, TYPE_TEMPLATES, findTemplates } from "./typeTemplates";
import { canFilter, hasOptions } from "./typeText";

describe("Type templates", () => {
  it("every template is something the server takes as it is", () => {
    const ids = new Set<string>();
    for (const t of TYPE_TEMPLATES) {
      expect(ids.has(t.id), t.id).toBe(false);
      ids.add(t.id);
      expect(t.type.name.length).toBeLessThanOrEqual(60);
      expect(t.type.colorLabel.length).toBeLessThanOrEqual(30);
      expect(t.type.sizeLabel.length).toBeLessThanOrEqual(30);
      expect((t.type.description ?? "").length).toBeLessThanOrEqual(300);
      expect(t.type.fields.length).toBeLessThanOrEqual(40);
      const keys = new Set<string>();
      for (const f of t.type.fields) {
        const where = `${t.id}.${f.key}`;
        expect(f.key, where).toMatch(/^[a-z][a-z0-9_]{0,31}$/);
        expect(keys.has(f.key), where).toBe(false);
        keys.add(f.key);
        expect(f.label.trim().length, where).toBeGreaterThan(0);
        expect(f.label.length, where).toBeLessThanOrEqual(60);
        expect((f.help ?? "").length, where).toBeLessThanOrEqual(160);
        expect((f.unit ?? "").length, where).toBeLessThanOrEqual(16);
        if (hasOptions(f.kind)) {
          expect(f.options?.length, where).toBeGreaterThan(0);
          expect(new Set(f.options).size, where).toBe(f.options!.length);
          expect(f.options!.every((o) => o.trim() && o.length <= 60), where).toBe(true);
        } else expect(f.options, where).toBeUndefined();
        if (f.filterable) expect(canFilter(f.kind), where).toBe(true);
      }
    }
  });

  it("every group has templates; codes and files are digital", () => {
    for (const g of TEMPLATE_GROUPS) expect(TYPE_TEMPLATES.some((t) => t.group === g.id), g.id).toBe(true);
    expect(TYPE_TEMPLATES.filter((t) => t.group === "digital").every((t) => t.type.fulfillment === "DIGITAL")).toBe(true);
    expect(TYPE_TEMPLATES.filter((t) => t.group === "booking").every((t) => t.type.fulfillment === "BOOKING")).toBe(true);
    expect(TYPE_TEMPLATES.filter((t) => t.quick).length).toBeGreaterThanOrEqual(3);
  });

  it("search by name, field or choice, within a group", () => {
    expect(findTemplates("موبايل").map((t) => t.id)).toEqual(["phones"]);
    expect(findTemplates("steam").map((t) => t.id)).toContain("game_keys");
    expect(findTemplates("الماركة", "electronics").every((t) => t.group === "electronics")).toBe(true);
    expect(findTemplates("", "beauty").map((t) => t.id)).toEqual(["perfume", "cosmetics"]);
    expect(findTemplates("لا شيء هيك")).toEqual([]);
  });
});
