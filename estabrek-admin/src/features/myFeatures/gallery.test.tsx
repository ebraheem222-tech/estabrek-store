// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature, GalleryItem, TemplatePreview } from "../../api/myFeatures.api";

// ميزاتي → المعرض over a stand-in API: ready functions, APIs and features, filtered by kind, topic and
// words; one picked is shown (what it would make here) and installed as a draft. The examples
// themselves are checked on the server (backend templateGallery.unit.spec.ts, featureGallery.spec.ts).

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
import GalleryPage from "./GalleryPage";
import MyFeaturesPage from "./MyFeaturesPage";
import FeaturePage from "./FeaturePage";
import { filtered, holdsLine, matches, needsLine, startsLine, totalsLine } from "./galleryText";

/** Without the marks that keep a piece whole inside the other direction (invisible). */
const plain = (s: string | null | undefined) => (s ?? "").replace(new RegExp(`[${String.fromCodePoint(0x2068, 0x2069)}]`, "g"), "");

const L = (ar: string, en: string, he: string) => ({ ar, en, he });
const item = (over: Partial<GalleryItem>): GalleryItem => ({ key: "x", version: "1.0.0", kind: "function", category: "orders", name: L("س", "X", "ס"), note: L("ن", "Note", "ה"), counts: { tables: 0, functions: 1, pages: 0 }, triggers: [], routes: [], needs: { secrets: [], sites: [], connections: 0 }, ...over });
const ITEMS: GalleryItem[] = [
  item({ key: "order-alert-whatsapp", name: L("واتساب للمتجر مع كل طلب", "WhatsApp the shop on every order", "וואטסאפ לחנות על כל הזמנה"), note: L("رسالة لرقم المتجر.", "A message to the shop's number.", "הודעה למספר החנות."), triggers: ["event"] }),
  item({ key: "order-to-telegram", category: "integrations", name: L("الطلبات على تلغرام", "Orders on Telegram", "הזמנות בטלגרם"), triggers: ["event"], needs: { secrets: [], sites: [], connections: 1 } }),
  item({ key: "api-vat", kind: "api", category: "finance", name: L("حساب الضريبة", "VAT calculation", "חישוב מע״מ"), triggers: ["route"], routes: ["GET vat"] }),
  item({ key: "feat-returns", kind: "feature", name: L("المرتجعات", "Returns", "החזרות"), note: L("الزبون بيطلب إرجاع.", "A shopper asks for a return.", "לקוח מבקש החזרה."), counts: { tables: 1, functions: 2, pages: 1 }, triggers: ["call", "row"] }),
];
const CATEGORIES = { orders: L("الطلبات", "Orders", "הזמנות"), integrations: L("ربط مع أنظمة", "Integrations", "חיבורים"), finance: L("حسابات وفلوس", "Money", "כספים") };
const preview: TemplatePreview = { ok: true, template: { key: "feat-returns", version: "1.0.0", name: L("المرتجعات", "Returns", "החזרות"), note: null }, tables: [], functions: [], pages: [{ key: "page", name: "إرجاع قطعة", slug: "/returns", was: null }], needs: { secrets: [], sites: [], connections: 0 } as never, installed: [], problems: [] };

function show(path = "/admin/my-features/gallery") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/my-features" element={<MyFeaturesPage />} />
          <Route path="/admin/my-features/gallery" element={<GalleryPage />} />
          <Route path="/admin/my-features/:id" element={<FeaturePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["features:read", "features:write", "functions:write", "pages:write"]);
  m.listGallery.mockResolvedValue({ items: ITEMS, kinds: ["function", "api", "feature"], categories: CATEGORIES });
  m.listFeatures.mockResolvedValue({ features: [], limits: { features: 100, items: 60 } });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The gallery's words and filters", () => {
  test("search looks in every language, the key and the addresses; kinds and topics narrow it", () => {
    expect(matches(ITEMS[0], "واتساب")).toBe(true);
    expect(matches(ITEMS[0], "whatsapp shop")).toBe(true);
    expect(matches(ITEMS[2], "vat")).toBe(true);
    expect(matches(ITEMS[2], "telegram")).toBe(false);
    expect(filtered(ITEMS, { kind: "function", category: "", search: "" }).map((x) => x.key)).toEqual(["order-alert-whatsapp", "order-to-telegram"]);
    expect(filtered(ITEMS, { kind: "all", category: "orders", search: "" }).map((x) => x.key)).toEqual(["order-alert-whatsapp", "feat-returns"]);
    expect(holdsLine({ tables: 1, functions: 2, pages: 1 }, "en")).toBe("1 table · 2 functions · 1 page");
    expect(startsLine(ITEMS[0], "ar")).toBe("بتشتغل من: طلب أو حدث بالمتجر");
    expect(startsLine(item({ triggers: [] }), "en")).toBe("You run it from its page");
    expect(needsLine({ secrets: ["ERP_KEY"], sites: ["erp.example.com"], connections: 0 }, "en")).toBe("Needs: secret ERP_KEY, site erp.example.com");
    expect(needsLine({ secrets: [], sites: [], connections: 0 }, "en")).toBe("");
    expect(plain(totalsLine(ITEMS, "en"))).toBe("4 ready: 2 Functions · 1 APIs · 1 Whole features");
    const many = Array.from({ length: 12 }, (_, k) => item({ key: `f${k}`, kind: "feature" }));
    expect(plain(totalsLine(many, "ar"))).toBe("12 جاهز: 0 functions · 0 APIs · 12 ميزة كاملة");
  });
});

describe("The gallery page", () => {
  test("lists everything, narrows by kind, topic and words", async () => {
    show();
    await screen.findByTestId("gallery-list");
    expect(plain(screen.getByTestId("gallery-totals").textContent)).toBe("4 ready: 2 Functions · 1 APIs · 1 Whole features");
    expect(screen.getByTestId("gallery-count").textContent).toBe("4 results");
    fireEvent.click(screen.getByTestId("gallery-kind-api"));
    expect(screen.getByTestId("gallery-count").textContent).toBe("1 results");
    expect(screen.getByTestId("gallery-item-api-vat").textContent).toContain("/v1/api/vat (GET)");
    fireEvent.click(screen.getByTestId("gallery-kind-all"));
    fireEvent.change(screen.getByTestId("gallery-category"), { target: { value: "integrations" } });
    expect(screen.getByTestId("gallery-count").textContent).toBe("1 results");
    expect(screen.getByTestId("gallery-item-order-to-telegram").textContent).toContain("Needs: a ready connection");
    fireEvent.change(screen.getByTestId("gallery-category"), { target: { value: "" } });
    fireEvent.change(screen.getByTestId("gallery-search"), { target: { value: "nothing like this" } });
    expect(screen.getByTestId("gallery-empty")).toBeTruthy();
  });

  test("one picked is shown as it would be made here, then installed as a draft", async () => {
    m.galleryFile.mockResolvedValue({ template: { format: "estabrek.feature", key: "feat-returns" } });
    m.previewTemplate.mockResolvedValue(preview);
    m.installTemplate.mockResolvedValue({ id: "m5", name: "المرتجعات", note: null, enabled: false, template: { key: "feat-returns", version: "1.0.0", name: L("المرتجعات", "Returns", "החזרות"), installedAt: "2026-11-18T10:00:00Z" }, createdAt: "", updatedAt: "", tables: [], functions: [], pages: [], free: { tables: [], functions: [], pages: [] }, limits: { features: 100, items: 60 } } satisfies Feature);
    m.getFeature.mockImplementation(async () => (await m.installTemplate.mock.results[0].value) as Feature);
    show();
    fireEvent.click(await screen.findByTestId("gallery-pick-feat-returns"));
    const picked = await screen.findByTestId("gallery-selected");
    await within(picked).findByTestId("template-preview");
    expect(m.galleryFile).toHaveBeenCalledWith("feat-returns");
    expect(m.previewTemplate).toHaveBeenCalledWith({ format: "estabrek.feature", key: "feat-returns" });
    expect(within(picked).getByTestId("template-pages").textContent).toContain("/returns");
    fireEvent.click(within(picked).getByTestId("template-install-go"));
    await waitFor(() => expect(m.installTemplate).toHaveBeenCalledWith({ format: "estabrek.feature", key: "feat-returns" }, "en"));
    expect((await screen.findByTestId("feature-template")).textContent).toContain("From the template “Returns”");
  });

  test("without the permissions installing needs, it is only to look at", async () => {
    m.may = new Set(["features:read"]);
    show();
    await screen.findByTestId("gallery-list");
    expect(screen.queryByTestId("gallery-pick-feat-returns")).toBeNull();
  });

  test("«My features» leads to it", async () => {
    show("/admin/my-features");
    expect((await screen.findByTestId("features-gallery-link")).getAttribute("href")).toBe("/admin/my-features/gallery");
  });
});
