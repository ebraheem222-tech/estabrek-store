import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../../api/pages.api";
import { PLACEHOLDERS } from "./build";
import { CAT_NAMES, PAGE_KIND_NAMES, PAGE_TEMPLATES, SECTION_CATS, SECTION_TEMPLATES, SKIN_NAMES, buildTemplate, freshIds, matches, readFile, templateById, toFile } from "./catalog";
import { CAMPAIGNS, FAMILIES, PACKS } from "./words";

// The backend's src/tests/templates.unit.spec.ts checks every build against the page tree's rules.

const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};
const walk = (nodes: PageTreeNode[], f: (n: PageTreeNode) => void) => nodes.forEach((n) => (f(n), n.children && walk(n.children, f)));
/** Every set of words in a build (objects keyed by language only). */
function wordsIn(v: unknown, out: Array<Record<string, unknown>> = []) {
  if (Array.isArray(v)) v.forEach((x) => wordsIn(x, out));
  else if (v && typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length && keys.every((k) => k === "ar" || k === "en" || k === "he")) out.push(v as Record<string, unknown>);
    else Object.values(v).forEach((x) => wordsIn(x, out));
  }
  return out;
}
const full = (w: { ar: string; en: string; he: string }) => Boolean(w.ar.trim() && w.en.trim() && w.he.trim());

describe("the template catalog", () => {
  it("names everything in the three languages", () => {
    for (const t of [...SECTION_TEMPLATES, ...PAGE_TEMPLATES]) expect(full(t.name), t.id).toBe(true);
    for (const n of [...Object.values(CAT_NAMES), ...Object.values(PAGE_KIND_NAMES), ...Object.values(SKIN_NAMES)]) expect(full(n)).toBe(true);
    for (const f of FAMILIES) for (const k of ["label", "eyebrow", "title", "sub", "cta", "product", "story", "collection"] as const) expect(full(PACKS[f][k]), `${f}.${k}`).toBe(true);
    for (const c of CAMPAIGNS) for (const k of ["name", "title", "sub", "strip"] as const) expect(full(c[k]), `${c.key}.${k}`).toBe(true);
  });

  it("has every category filled, three homes for each kind of store and a page for each campaign", () => {
    for (const cat of SECTION_CATS) expect(SECTION_TEMPLATES.filter((t) => t.group === cat).length, cat).toBeGreaterThanOrEqual(2);
    for (const f of FAMILIES) expect(PAGE_TEMPLATES.filter((t) => t.group === "home" && t.fam === f)).toHaveLength(3);
    expect(PAGE_TEMPLATES.filter((t) => t.group === "campaign")).toHaveLength(CAMPAIGNS.length);
  });

  it("builds in the language being edited only, or in all three when asked", () => {
    for (const t of [...SECTION_TEMPLATES, ...PAGE_TEMPLATES]) {
      const he = wordsIn(buildTemplate(t.id, { ids: ids(), fam: "books", lang: "he" }));
      expect(he.every((w) => Object.keys(w).join() === "he"), t.id).toBe(true);
      const all = wordsIn(buildTemplate(t.id, { ids: ids(), fam: "books", lang: "he", all: true }));
      expect(all.every((w) => ["ar", "en", "he"].every((l) => typeof w[l] === "string" && (w[l] as string).length > 0)), t.id).toBe(true);
    }
  });

  it("gives every element its own id", () => {
    for (const t of [...SECTION_TEMPLATES, ...PAGE_TEMPLATES]) {
      const seen = new Set<string>();
      walk(buildTemplate(t.id, { ids: ids(), fam: "food", lang: "ar", motion: "rich" })!, (n) => {
        expect(seen.has(n.id), `${t.id} ${n.id}`).toBe(false);
        seen.add(n.id);
      });
    }
  });

  it("uses the store's own pictures when it has them, else the ready ones", () => {
    const pics = ["https://res.cloudinary.com/demo/image/upload/a.jpg", "https://res.cloudinary.com/demo/image/upload/b.jpg"];
    const srcs = (built: PageTreeNode[]) => {
      const out: string[] = [];
      walk(built, (n) => typeof n.props.src === "string" && out.push(n.props.src));
      return out;
    };
    const own = srcs(buildTemplate("s:gal-grid:plain", { ids: ids(), fam: "home", lang: "en", pics })!);
    expect(own).toEqual([pics[0], pics[1], pics[0]]);
    expect(srcs(buildTemplate("s:gal-grid:plain", { ids: ids(), fam: "home", lang: "en" })!).every((s) => PLACEHOLDERS.includes(s))).toBe(true);
  });

  it("builds a store kind's own words and 3D model, and a campaign's own colours", () => {
    const text = JSON.stringify(buildTemplate("s:hero-model:plain", { ids: ids(), fam: "music", lang: "en" }));
    expect(text).toContain(PACKS.music.title.en);
    expect(text).toContain('"model":"guitar"');
    const ramadan = CAMPAIGNS.find((c) => c.key === "ramadan")!;
    const [hero] = buildTemplate("s:cp-ramadan:campaign", { ids: ids(), fam: "food", lang: "ar" })!;
    expect((hero.style as { base: { bg: string } }).base.bg).toBe(ramadan.colors.bg);
    expect((hero.props.particles as { kind: string }).kind).toBe("stars");
    // A home is made for its own kind of store, whatever kind is shown.
    expect(JSON.stringify(buildTemplate("p:home-gaming-bold", { ids: ids(), fam: "flowers", lang: "en" }))).toContain(PACKS.gaming.title.en);
  });

  it("moves calmly or richly", () => {
    const kinds = (motion: "calm" | "rich") => {
      const out = new Set<string>();
      walk(buildTemplate("s:hero-center:plain", { ids: ids(), fam: "fashion", lang: "en", motion })!, (n) => {
        const m = n.motion as Record<string, { kind: string }> | undefined;
        if (m?.enter) out.add(m.enter.kind);
        if (m?.hover) out.add(`hover:${m.hover.kind}`);
      });
      return [...out].sort();
    };
    expect(kinds("calm")).not.toContain("letters");
    expect(kinds("rich")).toEqual(expect.arrayContaining(["letters", "hover:magnetic"]));
  });

  it("finds templates by words in any language", () => {
    const hero = templateById("s:hero-center:dark")!;
    expect(matches(hero, "")).toBe(true);
    expect(matches(hero, "افتتاحيات غامق")).toBe(true);
    expect(matches(hero, "openings dark")).toBe(true);
    expect(matches(hero, "פתיחים")).toBe(true);
    expect(matches(hero, "footer")).toBe(false);
  });
});

describe("template files", () => {
  it("go out and come back", () => {
    const built = buildTemplate("p:about-story", { ids: ids(), fam: "art", lang: "ar" })!;
    const back = readFile(toFile("  من نحن  ", built));
    expect(back).toEqual({ ok: true, name: "من نحن", sections: built });
  });

  it("refuse what isn't a template file", () => {
    expect(readFile("not json")).toEqual({ ok: false, why: "json" });
    expect(readFile(JSON.stringify({ kind: "other", sections: [] }))).toEqual({ ok: false, why: "kind" });
    expect(readFile(JSON.stringify({ kind: "estabrek-template", sections: [] }))).toEqual({ ok: false, why: "empty" });
    expect(readFile(JSON.stringify({ kind: "estabrek-template", sections: [{ id: "x", type: "heading", props: {} }] }))).toEqual({ ok: false, why: "shape" });
    expect(readFile(JSON.stringify({ kind: "estabrek-template", sections: [{ id: "x", type: "section", props: {}, children: "no" }] }))).toEqual({ ok: false, why: "shape" });
    const many = Array.from({ length: 21 }, (_, i) => ({ id: `s${i}`, type: "section", props: {} }));
    expect(readFile(JSON.stringify({ kind: "estabrek-template", sections: many }))).toEqual({ ok: false, why: "big" });
  });

  it("copies with new ids all the way down", () => {
    const [sec] = buildTemplate("s:feat-cards:plain", { ids: ids(), fam: "pets", lang: "en" })!;
    const before = new Set<string>();
    walk([sec], (n) => before.add(n.id));
    const copy = freshIds(sec, (p) => `new-${p}-${Math.random().toString(36).slice(2, 7)}`);
    walk([copy], (n) => expect(before.has(n.id)).toBe(false));
    expect(JSON.stringify(copy).length).toBeGreaterThan(JSON.stringify(sec).length - 1);
  });
});
