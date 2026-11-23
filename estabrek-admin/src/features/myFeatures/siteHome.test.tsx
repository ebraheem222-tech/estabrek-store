// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature } from "../../api/myFeatures.api";

// ميزاتي → a whole site → «خلّيه الرئيسية» over a stand-in API: what it needs first (the site on, its first
// page published), the menus it sends (its pages by key, named in three languages), and the way back. The
// server's side, with a database, is the backend's siteHome.spec.ts.

const m = vi.hoisted(() => ({ getFeature: vi.fn(), makeSiteHome: vi.fn(), undoSiteHome: vi.fn(), listGallery: vi.fn(async () => ({ items: [], kinds: [], categories: {} })), may: new Set<string>() }));
vi.mock("../../api/myFeatures.api", () => m);
vi.mock("../../api/collections.api", () => ({ createCollection: vi.fn() }));
vi.mock("../../api/functions.api", () => ({ createFunction: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import FeaturePage from "./FeaturePage";
import { siteLinks } from "./siteLinks";
import { SITES, pagesOf, shellOf, siteByKey, slugsOf } from "../../studio/templates/sites";

const RESTAURANT = siteByKey("site-restaurant")!;
const L = (ar: string, en: string, he: string) => ({ ar, en, he });
/** The restaurant as installed here: its pages with their keys, all drafts but `published`. */
function site(over: Partial<Feature> = {}, published: string[] = []): Feature {
  const pages = Object.entries(slugsOf(RESTAURANT)).map(([key, slug]) => ({ id: `p-${key}`, key, name: `Zaytouna: ${key}`, slug, status: published.includes(key) ? ("PUBLISHED" as const) : ("DRAFT" as const), hasDraft: false }));
  return {
    id: "f9",
    name: "Restaurant: Zaytouna",
    note: null,
    enabled: false,
    template: { key: "site-restaurant", version: "1.0.0", name: L("مطعم", "Restaurant", "מסעדה"), installedAt: "2026-11-22T10:00:00Z" },
    createdAt: "2026-11-22T10:00:00Z",
    updatedAt: "2026-11-22T10:00:00Z",
    tables: [],
    functions: [],
    pages,
    siteHome: { homeId: "p-home", on: false, other: null },
    free: { tables: [], functions: [], pages: [] },
    limits: { features: 100, items: 60 },
    ...over,
  };
}

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/my-features/f9"]}>
        <Routes>
          <Route path="/admin/my-features/:id" element={<FeaturePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["features:read", "features:write", "pages:write", "settings:write", "functions:write"]);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A site's menus", () => {
  test("every page in the site's order (but the ones another page leads to), its first one as «الرئيسية», named in three languages", () => {
    for (const s of SITES) {
      const shell = shellOf(s);
      expect(shell.header.map((l) => l.page)).toEqual(pagesOf(s).filter((p) => p.menu !== false).map((p) => p.key));
      // A game server's form for each kind is reached from its applications' page.
      if (s.modules.apply) expect(shell.header.map((l) => l.page)).toEqual(expect.arrayContaining(["rules", "apply"]));
      expect(shell.header.some((l) => l.page.startsWith("apply-"))).toBe(false);
      expect(shell.footer).toEqual(shell.header);
      expect(shell.header[0]).toEqual({ page: "home", label: L("الرئيسية", "Home", "דף הבית") });
      for (const l of shell.header) for (const lang of ["ar", "en", "he"] as const) expect(l.label[lang].length, `${s.key} ${l.page}`).toBeGreaterThan(0);
    }
  });

  test("a site that isn't one of ours: its pages' own names, after the site's", () => {
    const f = site({ template: { key: "site-from-elsewhere", version: "1.0.0", name: L("x", "x", "x"), installedAt: "" } });
    const links = siteLinks(f);
    expect(links.header[0]).toEqual({ page: "home", label: L("Home", "Home", "Home") });
    expect(links.header[1]).toEqual({ page: "offers", label: L("offers", "offers", "offers") });
  });
});

describe("«خلّيه الرئيسية» on a site's page", () => {
  test("waits for the site to be on and its first page published; sends its menus; then goes back with one button", async () => {
    m.getFeature.mockResolvedValueOnce(site());
    show();
    const card = await screen.findByTestId("site-home");
    expect(card.getAttribute("data-on")).toBe("false");
    expect(screen.getByTestId("site-home-step-on").getAttribute("data-done")).toBe("false");
    expect(screen.getByTestId("site-home-step-published").textContent).toContain("/restaurant");
    expect((screen.getByTestId("site-home-make") as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    // On, with its first page and the menu published: the other pages are said to stay out of the menu.
    m.getFeature.mockResolvedValue(site({ enabled: true }, ["home", "offers"]));
    show();
    await screen.findByTestId("site-home");
    expect(screen.getByTestId("site-home-step-published").getAttribute("data-done")).toBe("true");
    expect(screen.getByTestId("site-home-drafts").textContent).toContain("/our-story");
    expect(screen.getByTestId("site-home-drafts").textContent).not.toContain("/restaurant");
    const made = site({ enabled: true, siteHome: { homeId: "p-home", on: true, other: null } }, ["home", "offers"]);
    m.makeSiteHome.mockResolvedValue({ home: "/restaurant", menus: { header: 2, footer: 2 }, left: ["Zaytouna: story"], already: false, feature: made });
    fireEvent.click(screen.getByTestId("site-home-make"));
    const ask = await screen.findByRole("dialog");
    expect(ask.textContent).toContain("“Restaurant: Zaytouna” shows at your store's address (/)");
    m.getFeature.mockResolvedValue(made);
    fireEvent.click(within(ask).getByRole("button", { name: "Make it the home" }));
    await waitFor(() => expect(m.makeSiteHome).toHaveBeenCalledWith("f9", shellOf(RESTAURANT)));
    await waitFor(() => expect(screen.getByTestId("site-home").getAttribute("data-on")).toBe("true"));

    // And back.
    m.undoSiteHome.mockResolvedValue({ ok: true, was: "f9" });
    fireEvent.click(screen.getByTestId("site-home-undo"));
    const back = await screen.findByRole("dialog");
    expect(back.textContent).toContain("the site stays at its own address, /restaurant");
    m.getFeature.mockResolvedValue(site({ enabled: true }, ["home", "offers"]));
    fireEvent.click(within(back).getByRole("button", { name: "Bring it back" }));
    await waitFor(() => expect(m.undoSiteHome).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("site-home").getAttribute("data-on")).toBe("false"));
  });

  test("another site is the home: said so; a member who can't change the settings sees it without the button; a feature that isn't a site has no card", async () => {
    m.getFeature.mockResolvedValue(site({ enabled: true, siteHome: { homeId: "p-home", on: false, other: { id: "f2", name: "Bakery: Sanabel" } } }, ["home"]));
    show();
    expect((await screen.findByTestId("site-home-other")).textContent).toContain("“Bakery: Sanabel” is the home now");
    expect((screen.getByTestId("site-home-make") as HTMLButtonElement).disabled).toBe(false);
    cleanup();

    m.may = new Set(["features:read", "features:write", "pages:write"]);
    show();
    await screen.findByTestId("site-home");
    expect(screen.queryByTestId("site-home-make")).toBeNull();
    cleanup();

    m.getFeature.mockResolvedValue(site({ template: null, siteHome: { homeId: null, on: false, other: null } }));
    show();
    await screen.findByTestId("feature-page");
    expect(screen.queryByTestId("site-home")).toBeNull();
  });
});
