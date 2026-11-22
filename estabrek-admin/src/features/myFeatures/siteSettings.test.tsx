// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature, SiteSettingDecl } from "../../api/myFeatures.api";

// ميزاتي → a whole site → إعدادات الموقع over a stand-in API: the restaurant's own settings (as its file declares
// them) in their sections, each with its control; only what changed is sent; the server's refusal is said by the
// setting. The server's side, with a database, is the backend's siteSettings.spec.ts.

const m = vi.hoisted(() => ({ getFeature: vi.fn(), saveFeatureSettings: vi.fn(), listGallery: vi.fn(async () => ({ items: [], kinds: [], categories: {} })), may: new Set<string>() }));
vi.mock("../../api/myFeatures.api", () => m);
vi.mock("../../api/collections.api", () => ({ createCollection: vi.fn() }));
vi.mock("../../api/functions.api", () => ({ createFunction: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import FeaturePage from "./FeaturePage";
import { buildSite, siteByKey } from "../../studio/templates/sites";

const RESTAURANT = siteByKey("site-restaurant")!;
const DECLARED = buildSite(RESTAURANT, { lang: "en" }).settings as unknown as SiteSettingDecl[];
const DEFAULTS = Object.fromEntries(DECLARED.map((d) => [d.key, d.default]));
const L = (ar: string, en: string, he: string) => ({ ar, en, he });

function site(values: Record<string, unknown> = DEFAULTS, over: Partial<Feature> = {}): Feature {
  return {
    id: "f9",
    name: "Restaurant: Zaytouna",
    note: null,
    enabled: true,
    template: { key: "site-restaurant", version: "1.1.0", name: L("مطعم", "Restaurant", "מסעדה"), installedAt: "2026-11-22T10:00:00Z" },
    createdAt: "2026-11-22T10:00:00Z",
    updatedAt: "2026-11-22T10:00:00Z",
    tables: [],
    functions: [],
    pages: [],
    siteHome: { homeId: null, on: false, other: null },
    settings: { declared: DECLARED, values },
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
  m.may = new Set(["features:read", "features:write"]);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A whole site's settings", () => {
  test("in their sections, each with its control, said whether the shop sees it", async () => {
    m.getFeature.mockResolvedValue(site());
    show();
    const panel = await screen.findByTestId("site-settings");
    expect(within(panel).getAllByTestId("site-settings-group").map((g) => g.querySelector("h3")?.textContent)).toEqual(["The site", "The main list", "Booking", "Tell me"]);
    expect(within(panel).getByTestId("site-setting-noticeOn").dataset.kind).toBe("toggle");
    expect(within(panel).getByRole("switch", { name: "Online booking is open" }).getAttribute("aria-checked")).toBe("true");
    // Words in three languages, the admin's first.
    expect((screen.getByTestId("site-setting-hours-en") as HTMLInputElement).value).toBe(RESTAURANT.biz.hours.en);
    expect((screen.getByTestId("site-setting-hours-he") as HTMLInputElement).value).toBe(RESTAURANT.biz.hours.he);
    expect(screen.getByTestId("site-setting-notice").querySelectorAll("textarea")).toHaveLength(3);
    // Public ones reach the shop, the bell's stay on the server.
    expect(screen.getByTestId("site-setting-bookingOpen-who").textContent).toBe("On the shop");
    expect(screen.getByTestId("site-setting-notifyEmail-who").textContent).toBe("Private: functions only");
    expect(screen.getByTestId("site-setting-notifyEmail").textContent).toContain("{{settings.notifyEmail}}");
    // Nothing changed: nothing to save.
    expect((screen.getByTestId("site-settings-save") as HTMLButtonElement).disabled).toBe(true);
  });

  test("only what changed is sent; the saved site is what the page shows next", async () => {
    m.getFeature.mockResolvedValue(site());
    const saved = { ...DEFAULTS, noticeOn: true, bookingOpen: false, notifyEmail: "me@zaytouna.example" };
    m.saveFeatureSettings.mockResolvedValue(site(saved, { updatedAt: "2026-11-22T11:00:00Z" }));
    show();
    await screen.findByTestId("site-settings");
    fireEvent.click(screen.getByRole("switch", { name: "A notice bar over the first page" }));
    fireEvent.click(screen.getByRole("switch", { name: "Online booking is open" }));
    fireEvent.change(screen.getByTestId("site-setting-notifyEmail-input"), { target: { value: "me@zaytouna.example" } });
    expect(screen.getByTestId("site-settings-dirty")).toBeTruthy();
    expect(screen.getByTestId("site-setting-bookingOpen").dataset.changed).toBe("true");
    fireEvent.click(screen.getByTestId("site-settings-save"));
    await waitFor(() => expect(m.saveFeatureSettings).toHaveBeenCalledWith("f9", { noticeOn: true, bookingOpen: false, notifyEmail: "me@zaytouna.example" }));
    await waitFor(() => expect(screen.queryByTestId("site-settings-dirty")).toBeNull());
    expect(screen.getByRole("switch", { name: "Online booking is open" }).getAttribute("aria-checked")).toBe("false");
  });

  test("a value the server refuses is said by its setting; undo brings the saved values back", async () => {
    m.getFeature.mockResolvedValue(site());
    m.saveFeatureSettings.mockRejectedValue({ response: { status: 400, data: { error: "BAD_SETTINGS", message: "Some settings can't take these values", details: { problems: [{ key: "notifyEmail", message: "Words of 500 letters at most" }] } } } });
    show();
    await screen.findByTestId("site-settings");
    fireEvent.change(screen.getByTestId("site-setting-notifyEmail-input"), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("site-settings-save"));
    expect((await screen.findByTestId("site-setting-notifyEmail-error")).textContent).toBe("Words of 500 letters at most");
    fireEvent.click(screen.getByTestId("site-settings-undo"));
    expect((screen.getByTestId("site-setting-notifyEmail-input") as HTMLInputElement).value).toBe("");
    expect(screen.queryByTestId("site-setting-notifyEmail-error")).toBeNull();
  });

  test("read only without features:write; none at all for a feature with no settings", async () => {
    m.may = new Set(["features:read"]);
    m.getFeature.mockResolvedValue(site());
    show();
    await screen.findByTestId("site-settings");
    expect(screen.queryByTestId("site-settings-save")).toBeNull();
    expect((screen.getByTestId("site-setting-notifyEmail-input") as HTMLInputElement).disabled).toBe(true);
    cleanup();
    m.getFeature.mockResolvedValue(site(DEFAULTS, { settings: null }));
    show();
    await screen.findByTestId("feature-page");
    expect(screen.queryByTestId("site-settings")).toBeNull();
  });
});
