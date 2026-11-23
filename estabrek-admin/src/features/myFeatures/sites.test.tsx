// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature, TemplatePreview } from "../../api/myFeatures.api";

// ميزاتي → مواقع كاملة over a stand-in API: a business's whole site for its field, built here from the
// section library (studio/templates/sites), filtered by field and words; one picked is shown (what it
// would make here, with its tables' ready rows) and installed as a draft. Each site is also read,
// planned and installed for real on the server (backend siteTemplates.unit.spec.ts, sites.spec.ts).

const m = vi.hoisted(() => ({
  listFeatures: vi.fn(),
  getFeature: vi.fn(),
  listGallery: vi.fn(),
  galleryFile: vi.fn(),
  previewTemplate: vi.fn(),
  installTemplate: vi.fn(),
  may: new Set<string>(),
}));
vi.mock("../../api/myFeatures.api", () => m);
vi.mock("../../api/collections.api", () => ({ createCollection: vi.fn() }));
vi.mock("../../api/functions.api", () => ({ createFunction: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import SitesPage from "./SitesPage";
import MyFeaturesPage from "./MyFeaturesPage";
import FeaturePage from "./FeaturePage";
import { SITES, buildSite, slugsOf, type ChosenFile } from "../../studio/templates/sites";
import { readyRowsText, siteLine } from "./sitesText";

const L = (ar: string, en: string, he: string) => ({ ar, en, he });
const preview: TemplatePreview = {
  ok: true,
  template: { key: "site-restaurant", version: "1.0.0", name: L("مطعم: زيتونة", "Restaurant: Zaytouna", "מסעדה: זיתונה"), note: null },
  tables: [{ key: "offers", name: L("المنيو", "The menu", "התפריט"), slug: "dishes", was: null, fields: 7, api: { read: "off", create: "off", update: "off", delete: "off" } as never, itemPage: true, rows: 8 }],
  functions: [],
  pages: [{ key: "home", name: "Zaytouna: Zaytouna", slug: "/restaurant", was: null }],
  needs: { secrets: [], sites: [] },
  installed: [],
  problems: [],
};

function show(path = "/admin/my-features/sites") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/my-features" element={<MyFeaturesPage />} />
          <Route path="/admin/my-features/sites" element={<SitesPage />} />
          <Route path="/admin/my-features/:id" element={<FeaturePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["features:read", "features:write", "functions:read", "functions:write", "pages:read", "pages:write"]);
  m.listFeatures.mockResolvedValue({ items: [], limits: { features: 100, items: 60 } });
  m.listGallery.mockResolvedValue({ items: [], kinds: [], categories: {} });
  m.previewTemplate.mockResolvedValue(preview);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The sites themselves", () => {
  test("every site, one key each, every one built in each language with its pages, tables and ready rows", () => {
    expect(SITES.length).toBe(13);
    expect(new Set(SITES.map((s) => s.key)).size).toBe(SITES.length);
    for (const s of SITES)
      for (const lang of ["ar", "en", "he"] as const) {
        const f = buildSite(s, { lang });
        expect(f.format).toBe("estabrek.feature");
        expect(f.pages.map((p) => p.slug)).toEqual(Object.values(slugsOf(s)).filter(Boolean));
        // Its page names in the admin's language; the words on the pages in all three.
        expect(f.pages[0].name).toContain(s.biz.name[lang]);
        const words = JSON.stringify(f.pages);
        expect(words).toContain(s.pack.title.ar);
        expect(words).toContain(s.pack.title.he);
        // The tables visitors and the site's functions write into start empty.
        for (const t of f.tables) if (!["messages", "bookings", "applications", "whitelist", "appeals", "reports"].includes(t.key)) expect(t.rows?.length, `${s.key} ${t.key}`).toBeGreaterThan(0);
        // The library's sample store details gave way to the site's own.
        expect(words).not.toContain("hello@example.com");
        expect(words).toContain(s.biz.email);
      }
  });

  test("its words: what a site holds, and a table's ready rows", () => {
    const r = SITES[0];
    expect(siteLine(r, "en")).toBe("7 pages · 8 tables · 24 ready rows");
    expect(siteLine(r, "ar")).toBe("7 صفحات · 8 جداول · 24 سطر جاهز");
    expect(siteLine(r, "he")).toBe("7 עמודים · 8 טבלאות · 24 שורות מוכנות");
    expect(readyRowsText(8, "ar")).toBe("8 سطور جاهزة");
    expect(readyRowsText(24, "ar")).toBe("24 سطر جاهز");
    expect(readyRowsText(1, "en")).toBe("1 ready row");
  });
});

describe("The sites page", () => {
  test("reached from My features; filtered by field and words; a pick is shown with its rows, then installed as a draft", async () => {
    show("/admin/my-features");
    fireEvent.click(await screen.findByTestId("features-sites-link"));
    expect((await screen.findByTestId("sites-totals")).textContent).toBe("13 ready sites");
    expect(within(screen.getByTestId("sites-list")).getAllByRole("listitem")).toHaveLength(13);
    fireEvent.click(screen.getByTestId("sites-field-health"));
    expect(within(screen.getByTestId("sites-list")).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual(["sites-item-site-dental-clinic"]);
    fireEvent.click(screen.getByTestId("sites-field-all"));
    fireEvent.change(screen.getByTestId("sites-search"), { target: { value: "wedding" } });
    expect(within(screen.getByTestId("sites-list")).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual(["sites-item-site-events-hall", "sites-item-site-photographer"]);
    fireEvent.change(screen.getByTestId("sites-search"), { target: { value: "restaurant" } });
    expect(screen.getByTestId("sites-holds-site-restaurant").textContent).toBe("7 pages · 8 tables · 24 ready rows");

    fireEvent.click(screen.getByTestId("sites-pick-site-restaurant"));
    expect(screen.getByTestId("sites-home-note").textContent).toContain("/restaurant");
    // What it is built from: its modules, in the modules' order.
    expect(within(screen.getByTestId("sites-modules")).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["The main list", "The team", "Our story", "Reviews", "Questions", "News", "Branches", "Contact", "Booking", "Tell me"]);
    // Through the wizard as it is (about you, what it runs, its look), to what it would make: its tables with their ready rows.
    for (let k = 0; k < 4; k++) fireEvent.click(screen.getByTestId("sites-next"));
    expect(screen.getByTestId("sites-wizard").getAttribute("data-step")).toBe("4");
    expect((await screen.findByTestId("template-table-rows-offers")).textContent).toBe("8 ready rows");
    const sent = m.previewTemplate.mock.calls[0][0] as ChosenFile;
    expect(sent.key).toBe("site-restaurant");
    expect(sent.pages).toHaveLength(7);
    // Nothing chosen: the gallery's own site, with no choices in it.
    expect(sent).toEqual(buildSite(SITES[0], { lang: "en" }));
    expect(sent.tables.find((t) => t.key === "offers")?.rows).toHaveLength(8);

    const made = { id: "f9", name: "Restaurant: Zaytouna", note: null, enabled: false, template: { key: "site-restaurant", version: "1.0.0", name: sent.name, installedAt: "2026-11-18T10:00:00Z" }, createdAt: "", updatedAt: "", tables: [], functions: [], pages: [], free: { tables: [], functions: [], pages: [] }, limits: { features: 100, items: 60 } } as unknown as Feature;
    m.installTemplate.mockResolvedValue(made);
    m.getFeature.mockResolvedValue(made);
    fireEvent.click(screen.getByTestId("template-install-go"));
    await waitFor(() => expect(m.installTemplate).toHaveBeenCalledWith(sent, "en"));
    expect(await screen.findByTestId("feature-page")).toBeTruthy();
  });

  test("the wizard: the owner's details over the sample's, the modules kept, the look; all in the file it installs", async () => {
    show();
    fireEvent.click(await screen.findByTestId("sites-pick-site-restaurant"));
    fireEvent.click(screen.getByTestId("sites-next"));
    // About you: typed in the admin's language, the other languages follow until given their own.
    fireEvent.change(screen.getByTestId("sites-biz-name"), { target: { value: "Abu Samir" } });
    fireEvent.click(screen.getByTestId("sites-biz-name-langs"));
    fireEvent.change(screen.getByTestId("sites-biz-name-ar"), { target: { value: "أبو سمير" } });
    fireEvent.change(screen.getByTestId("sites-biz-name"), { target: { value: "Abu Samir's" } });
    fireEvent.change(screen.getByTestId("sites-biz-phone"), { target: { value: "04-111-2222" } });
    fireEvent.click(screen.getByTestId("sites-next"));
    // What it runs: no menu and no news (its table booking has choices of its own, so it stays).
    fireEvent.click(screen.getByTestId("sites-run-offers"));
    fireEvent.click(screen.getByTestId("sites-run-news"));
    expect(screen.queryByTestId("sites-run-dropped")).toBeNull();
    expect(screen.getByTestId("sites-run-holds").textContent).toBe("5 pages · 6 tables · 13 ready rows");
    fireEvent.click(screen.getByTestId("sites-next"));
    fireEvent.click(screen.getByTestId("sites-look-3"));
    fireEvent.click(screen.getByTestId("sites-motion-rich"));
    fireEvent.click(screen.getByTestId("sites-next"));
    await screen.findByTestId("template-install-go");
    const sent = m.previewTemplate.mock.calls.at(-1)![0] as ChosenFile;
    expect(sent.site).toEqual({ biz: { name: { ar: "أبو سمير", en: "Abu Samir's", he: "Abu Samir's" }, phone: "04-111-2222" }, modules: ["team", "story", "reviews", "questions", "branches", "contact", "booking", "notify"], look: 3, motion: "rich" });
    expect(sent.pages.map((p) => p.key)).toEqual(["home", "story", "questions", "contact", "book"]);
    expect(sent.tables.map((t) => t.key)).not.toContain("offers");
    // Its pages named for the business; its contact page calls the owner's number, not the sample's.
    expect(sent.pages.every((p) => p.name.startsWith("Abu Samir's: "))).toBe(true);
    const contact = JSON.stringify(sent.pages.find((p) => p.key === "contact"));
    expect(contact).toContain("tel:041112222");
    expect(contact).not.toContain(SITES[0].biz.phone);
  });

  test("without the permissions to install, the sites are shown but not offered", async () => {
    m.may = new Set(["features:read"]);
    show();
    await screen.findByTestId("sites-list");
    expect(screen.queryByTestId("sites-pick-site-restaurant")).toBeNull();
  });
});
