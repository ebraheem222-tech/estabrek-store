import { beforeEach, describe, expect, it, vi } from "vitest";
import * as PagesAPI from "../api/pages.api";
import { PREMIUM_THEMES, buildTemplate } from "./templates/catalog";
import { THEME_PART_NAMES } from "./templates/dna/themes";
import { planTheme, putTheme, replaceOps } from "./themeApply";

vi.mock("../api/pages.api", () => ({ listPages: vi.fn(), createPage: vi.fn(), setPageFormat: vi.fn(), getPageDraft: vi.fn(), getPageTree: vi.fn(), changePageDraft: vi.fn() }));
vi.mock("../api/settings.api", () => ({ getSettings: vi.fn() }));

// Plan 3.9c: a whole premium theme put into the store's pages' drafts in one go.
const kit = PREMIUM_THEMES.find((k) => k.theme.key === "midnight")!;
const names = { home: THEME_PART_NAMES.home, about: THEME_PART_NAMES.about, contact: THEME_PART_NAMES.contact };
const build = (template: string) => {
  let n = 0;
  return buildTemplate(template, { ids: (p) => `${p}-${n++}`, fam: "fashion", lang: "ar" });
};
const tree = (ids: string[]) => ({ version: 1 as const, root: { id: "page", type: "page", props: {}, children: ids.map((id) => ({ id, type: "section", props: {} })) } });

describe("a whole premium theme on a store", () => {
  beforeEach(() => vi.clearAllMocks());

  it("goes to the store's own pages, a new one where there's none, and to its header and footer only when it has its own", () => {
    const pages = [{ id: "h", slug: "/" }, { id: "c", slug: "/contact" }, { id: "blk", slug: "/about", kind: "block" as const }];
    const plain = planTheme(kit, pages, { storeDesign: { mode: "theme" } });
    expect(plain.map((t) => [t.part, t.pageId, t.slug, t.skip ?? ""])).toEqual([
      ["home", "h", "/", ""], ["about", null, "/about", ""], ["contact", "c", "/contact", ""],
      ["header", null, null, "no-design"], ["footer", null, null, "no-design"],
    ]);
    const owned = planTheme(kit, pages, { storeDesign: { mode: "cms", headerId: "hd", footerId: "ft" } });
    expect(owned.slice(3).map((t) => [t.part, t.pageId, t.skip ?? ""])).toEqual([["header", "hd", ""], ["footer", "ft", ""]]);
  });

  it("replaces what a page holds, fifty changes at a time", () => {
    const nodes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, type: "section", props: {} }));
    const calls = replaceOps("page", Array.from({ length: 30 }, (_, i) => ({ id: `old${i}` })), nodes);
    expect(calls.map((c) => c.length)).toEqual([50, 10]);
    expect(calls[0][0]).toEqual({ op: "remove", nodeId: "old0" });
    expect(calls[1].at(-1)).toEqual({ op: "insert", parentId: "page", index: 29, node: nodes[29] });
  });

  it("puts the chosen parts into the drafts: a page made where there's none, the drafts' turns followed, the rest left", async () => {
    vi.mocked(PagesAPI.createPage).mockResolvedValue({ id: "new-about" } as never);
    vi.mocked(PagesAPI.getPageDraft).mockImplementation(async (id) => (id === "h" ? { draft: { rev: 4, tree: tree(["a", "b"]) } as never, main: "ar" } : { draft: null, main: "ar" }));
    vi.mocked(PagesAPI.getPageTree).mockResolvedValue({ format: 2, tree: tree([]), saved: true });
    vi.mocked(PagesAPI.changePageDraft).mockImplementation(async (_id, _ops, rev) => ({ draft: { rev: (rev ?? 0) + 1 } as never }));
    const targets = planTheme(kit, [{ id: "h", slug: "/" }], { storeDesign: { mode: "cms", headerId: "hd", footerId: "ft" } });
    const steps: string[] = [];
    const done = await putTheme(targets, new Set(["home", "about", "header"]), build, names, "ar", (p) => steps.push(p));
    expect(done).toEqual([{ part: "home", pageId: "h" }, { part: "about", pageId: "new-about" }, { part: "header", pageId: "hd" }]);
    expect(steps).toEqual(["home", "about", "header"]);
    // The about page didn't exist: made, as a page of the new editor, named in the language being edited.
    expect(PagesAPI.createPage).toHaveBeenCalledWith({ name: THEME_PART_NAMES.about.ar, slug: "/about" });
    expect(PagesAPI.setPageFormat).toHaveBeenCalledWith("new-about", 2);
    // The home's draft: its two sections out, the theme's home in, from the draft's own turn.
    const [homeId, homeOps, homeRev] = vi.mocked(PagesAPI.changePageDraft).mock.calls[0];
    expect([homeId, homeRev]).toEqual(["h", 4]);
    expect(homeOps.slice(0, 2)).toEqual([{ op: "remove", nodeId: "a" }, { op: "remove", nodeId: "b" }]);
    expect(homeOps.slice(2).map((o) => (o as { node: { type: string } }).node.type)).toEqual(kit.theme.pages.home.map(() => "section"));
    // The header's draft holds the look's own header.
    const header = vi.mocked(PagesAPI.changePageDraft).mock.calls.find(([id]) => id === "hd")!;
    expect((header[1][0] as unknown as { node: { props: { tag: string } } }).node.props.tag).toBe("header");
    // Contact and the footer weren't chosen.
    expect(vi.mocked(PagesAPI.changePageDraft).mock.calls.map(([id]) => id)).not.toContain("ft");
  });

  it("stops at a failure, keeping what was done before it", async () => {
    vi.mocked(PagesAPI.getPageDraft).mockResolvedValue({ draft: null, main: "ar" });
    vi.mocked(PagesAPI.getPageTree).mockResolvedValue({ format: 2, tree: tree([]), saved: true });
    vi.mocked(PagesAPI.changePageDraft).mockRejectedValueOnce(new Error("offline"));
    const targets = planTheme(kit, [{ id: "h", slug: "/" }, { id: "a", slug: "/about" }], null);
    await expect(putTheme(targets, new Set(["home", "about"]), build, names, "en")).rejects.toThrow("offline");
    expect(PagesAPI.changePageDraft).toHaveBeenCalledTimes(1);
  });
});
