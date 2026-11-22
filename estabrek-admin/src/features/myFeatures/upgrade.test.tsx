// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature, UpgradeItem, UpgradePreview } from "../../api/myFeatures.api";

// ميزاتي → upgrading a feature made from a template, over a stand-in API: a newer version in the gallery
// (or a file) shows piece by piece what it would do; a piece both sides changed stays the owner's
// unless they tick "take the template's"; the upgrade is made with their choices. The merging itself
// is tested on the server (backend featureUpgrade.spec.ts).

const m = vi.hoisted(() => ({
  listFeatures: vi.fn(),
  getFeature: vi.fn(),
  listGallery: vi.fn(),
  galleryFile: vi.fn(),
  previewUpgrade: vi.fn(),
  upgradeFeature: vi.fn(),
  exportFeature: vi.fn(),
  may: new Set<string>(),
}));
vi.mock("../../api/myFeatures.api", () => m);
vi.mock("../../api/collections.api", () => ({ createCollection: vi.fn() }));
vi.mock("../../api/functions.api", () => ({ createFunction: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import FeaturePage from "./FeaturePage";
import { compareVersions, inOrder, summaryLine, withChoices } from "./upgradeText";

const L = (ar: string, en: string, he: string) => ({ ar, en, he });
const feature = (over: Partial<Feature> = {}): Feature => ({
  id: "m1",
  name: "Help desk",
  note: null,
  enabled: true,
  template: { key: "feat-returns", version: "1.0.0", name: L("المرتجعات", "Returns", "החזרות"), installedAt: "2026-11-18T10:00:00Z" },
  createdAt: "2026-11-18T10:00:00Z",
  updatedAt: "2026-11-18T10:00:00Z",
  tables: [],
  functions: [],
  pages: [],
  free: { tables: [], functions: [], pages: [] },
  limits: { features: 100, items: 60 },
  ...over,
});
const item = (id: string, action: UpgradeItem["action"], name = id): UpgradeItem => ({ id, kind: id.split(":")[0] as UpgradeItem["kind"], key: id.split(":")[1], name, action });
const ITEMS = [item("function:send", "conflict", "Send"), item("page:page", "update", "Returns page"), item("field:main.reason", "waits", "Reasons"), item("function:fresh", "add", "Fresh")];
const preview: UpgradePreview = { ok: true, from: "1.0.0", to: "1.1.0", key: "feat-returns", name: L("المرتجعات", "Returns", "החזרות"), items: ITEMS, counts: { add: 1, update: 1, conflict: 1, taken: 0, dropped: 0, gone: 0, waits: 1 }, problems: [] };

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/my-features/m1"]}>
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
  m.may = new Set(["features:read", "features:write", "functions:read", "functions:write", "pages:read", "pages:write"]);
  m.getFeature.mockResolvedValue(feature());
  m.listGallery.mockResolvedValue({ items: [{ key: "feat-returns", version: "1.1.0", kind: "feature", category: "orders", name: L("المرتجعات", "Returns", "החזרות"), note: null, counts: { tables: 1, functions: 2, pages: 1 }, triggers: [], routes: [], needs: { secrets: [], sites: [], connections: 0 } }], kinds: [], categories: {} });
  m.galleryFile.mockResolvedValue({ template: { format: "estabrek.feature", key: "feat-returns", version: "1.1.0" } });
  m.previewUpgrade.mockResolvedValue(preview);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The upgrade's words", () => {
  test("what needs the owner comes first; a ticked conflict is the template's; versions compare by number", () => {
    expect(inOrder(ITEMS).map((i) => i.action)).toEqual(["conflict", "waits", "update", "add"]);
    expect(withChoices(ITEMS, new Set(["function:send"]))[0].action).toBe("taken");
    expect(summaryLine(ITEMS, "en")).toBe("1 Yours stays · 1 Waits for you · 1 Updated · 1 New");
    expect(summaryLine(ITEMS, "ar")).toBe("1 تعديلك بيضل · 1 بيستناك · 1 بيتحدّث · 1 جديد");
    expect(compareVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
  });
});

describe("Upgrading from the feature's page", () => {
  test("a newer version in the gallery shows what it would do, and is made with the owner's choices", async () => {
    const upgraded = feature({ template: { key: "feat-returns", version: "1.1.0", name: L("المرتجعات", "Returns", "החזרות"), installedAt: "2026-11-18T10:00:00Z", upgradedAt: "2026-11-18T12:00:00Z", from: "1.0.0" } });
    m.upgradeFeature.mockResolvedValue({ from: "1.0.0", to: "1.1.0", items: withChoices(ITEMS, new Set(["function:send"])), counts: preview.counts, feature: upgraded });
    // Asked again after the upgrade, the server answers with the upgraded feature.
    m.getFeature.mockImplementation(async () => (m.upgradeFeature.mock.calls.length ? upgraded : feature()));
    show();
    expect((await screen.findByTestId("feature-upgrade-newer")).textContent).toContain("The gallery has a newer version: 1.1.0 (you have 1.0.0)");
    fireEvent.click(screen.getByTestId("feature-upgrade-gallery"));
    const p = await screen.findByTestId("feature-upgrade-preview");
    expect(m.previewUpgrade).toHaveBeenCalledWith("m1", { format: "estabrek.feature", key: "feat-returns", version: "1.1.0" }, "en");
    expect(within(p).getByTestId("feature-upgrade-versions").textContent).toContain("From 1.0.0 to 1.1.0");
    // What needs the owner first, each with what it means.
    expect([...within(p).getByTestId("feature-upgrade-items").querySelectorAll("li")].map((li) => li.getAttribute("data-action"))).toEqual(["conflict", "waits", "update", "add"]);
    expect(within(p).getByTestId("feature-upgrade-item-field:main.reason").textContent).toContain("Make it from the table's page");
    // Ticked: the template's version, and the owner is told what that means.
    fireEvent.click(within(p).getByTestId("feature-upgrade-take-function:send"));
    expect(within(p).getByTestId("feature-upgrade-item-function:send").getAttribute("data-action")).toBe("taken");
    expect(within(p).getByTestId("feature-upgrade-item-function:send").textContent).toContain("your change to it goes");
    fireEvent.click(within(p).getByTestId("feature-upgrade-go"));
    await waitFor(() => expect(m.upgradeFeature).toHaveBeenCalledWith("m1", { format: "estabrek.feature", key: "feat-returns", version: "1.1.0" }, ["function:send"], "en"));
    expect((await screen.findByTestId("feature-template-upgraded")).textContent).toContain("Upgraded from 1.0.0");
  });

  test("the latest already: said; a file of another template or an older one: refused in words", async () => {
    m.getFeature.mockResolvedValue(feature({ template: { key: "feat-returns", version: "1.1.0", name: L("المرتجعات", "Returns", "החזרות"), installedAt: "2026-11-18T10:00:00Z" } }));
    m.previewUpgrade.mockRejectedValue({ response: { data: { error: "NOT_NEWER", message: "This feature is at 1.1.0 already" } } });
    show();
    expect((await screen.findByTestId("feature-upgrade-latest")).textContent).toContain("You have the gallery's latest (1.1.0)");
    fireEvent.change(screen.getByTestId("feature-upgrade-file"), { target: { files: [new File(['{"format":"estabrek.feature"}'], "old.feature.json", { type: "application/json" })] } });
    expect((await screen.findByTestId("feature-upgrade-refused")).textContent).toContain("nothing to upgrade");
  });

  test("a whole site: its newer version is built here, from the admin's own sites", async () => {
    m.getFeature.mockResolvedValue(feature({ template: { key: "site-restaurant", version: "0.9.0", name: L("مطعم", "Restaurant", "מסעדה"), installedAt: "2026-11-18T10:00:00Z" } }));
    show();
    expect((await screen.findByTestId("feature-upgrade-newer")).textContent).toContain("The gallery has a newer version: 1.1.0 (you have 0.9.0)");
    fireEvent.click(screen.getByTestId("feature-upgrade-gallery"));
    await screen.findByTestId("feature-upgrade-preview");
    expect(m.galleryFile).not.toHaveBeenCalled();
    const sent = m.previewUpgrade.mock.calls[0][1] as { key: string; version: string; pages: unknown[] };
    expect([sent.key, sent.version, sent.pages.length]).toEqual(["site-restaurant", "1.1.0", 7]);
  });

  test("not for a feature that didn't come from a template, or without the permissions", async () => {
    m.getFeature.mockResolvedValue(feature({ template: null }));
    show();
    await screen.findByTestId("feature-page");
    expect(screen.queryByTestId("feature-upgrade")).toBeNull();
    cleanup();
    m.getFeature.mockResolvedValue(feature());
    m.may = new Set(["features:read", "features:write"]);
    show();
    await screen.findByTestId("feature-page");
    expect(screen.queryByTestId("feature-upgrade")).toBeNull();
  });
});
