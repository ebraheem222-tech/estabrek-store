// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PanelArrange, PanelPageView } from "../../api/sitePanels.api";

// A whole site's panel page as its owner arranges it (sites wave 1.4) over a stand-in API: parts moved and hidden,
// a part of their own added from the site's tables, what is sent, and the server's refusal said.

const m = vi.hoisted(() => ({ getSitePanelPage: vi.fn(), saveLayout: vi.fn(), may: new Set<string>() }));
vi.mock("../../api/sitePanels.api", () => m);
vi.mock("../../api/myFeatures.api", () => ({ saveFeatureSettings: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import SitePanelPage from "./SitePanelPage";

const L = (en: string) => ({ ar: en, en, he: en });
const ARRANGE: PanelArrange = {
  parts: [
    { key: "numbers", kind: "numbers", label: L("Booking requests waiting"), hidden: false, own: false },
    { key: "messages", kind: "queue", label: L("Messages waiting"), hidden: false, own: false },
    { key: "actions", kind: "actions", label: null, hidden: false, own: false },
  ],
  tables: [
    { key: "offers", ref: "@table:offers", slug: "dishes", name: L("Menu"), fields: [{ id: "title", type: "text", name: L("Dish") }, { id: "price", type: "money", name: L("Price") }, { id: "group", type: "select", name: L("Section"), options: [{ id: "mains", name: L("Mains") }] }] },
  ],
};
const page = (arrange?: PanelArrange): PanelPageView => ({ featureId: "f9", name: "Restaurant", enabled: true, page: { key: "today", name: L("Today"), icon: "today" }, pages: [{ key: "today", name: L("Today"), icon: "today" }], parts: [], ...(arrange ? { arrange } : {}) });
function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/site/f9/today"]}>
        <Routes>
          <Route path="/admin/site/:featureId/:page" element={<SitePanelPage />} />
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

describe("Arranging a site's panel page", () => {
  test("moved, hidden, and a table of their own added: all of it sent at once", async () => {
    m.getSitePanelPage.mockResolvedValue(page(ARRANGE));
    m.saveLayout.mockResolvedValue(page(ARRANGE));
    show();
    fireEvent.click(await screen.findByTestId("site-panel-arrange"));
    // A part with no title is named by its kind.
    expect(screen.getByTestId("site-arrange-actions").textContent).toContain("Quick actions");
    fireEvent.click(screen.getByTestId("site-arrange-actions-up"));
    fireEvent.click(screen.getByTestId("site-arrange-messages-toggle"));
    expect(screen.getByTestId("site-arrange-messages").getAttribute("data-hidden")).toBe("true");
    // The first can't go up, the last can't go down.
    expect((screen.getByTestId("site-arrange-numbers-up") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("site-arrange-messages-down") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByTestId("site-arrange-add"));
    fireEvent.click(screen.getByTestId("site-own-kind-view"));
    fireEvent.change(screen.getByTestId("site-own-label"), { target: { value: "The menu at a glance" } });
    expect((screen.getByTestId("site-own-add") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("site-own-column-title"));
    fireEvent.click(screen.getByTestId("site-own-column-price"));
    fireEvent.click(screen.getByTestId("site-own-add"));
    fireEvent.click(screen.getByTestId("site-arrange-save"));

    await waitFor(() => expect(m.saveLayout).toHaveBeenCalled());
    const [featureId, pageKey, body, lang] = m.saveLayout.mock.calls[0];
    expect([featureId, pageKey, lang]).toEqual(["f9", "today", "en"]);
    expect(body.order.slice(0, 3)).toEqual(["numbers", "actions", "messages"]);
    expect(body.hidden).toEqual(["messages"]);
    expect(body.own).toHaveLength(1);
    expect(body.own[0]).toMatchObject({ kind: "view", title: L("The menu at a glance"), table: "@table:offers", columns: ["title", "price"] });
    expect(body.own[0].key).toMatch(/^my[a-z0-9]+$/);
    expect(body.order[3]).toBe(body.own[0].key);
    // Saved: the page as the server answered, arranging closed.
    await waitFor(() => expect(screen.queryByTestId("site-arrange")).toBeNull());
  });

  test("a number of their own, only of one choice, this week; a refusal is said", async () => {
    m.getSitePanelPage.mockResolvedValue(page(ARRANGE));
    m.saveLayout.mockRejectedValue({ response: { status: 400, data: { message: "The page can't be arranged this way", details: { problems: [{ at: "own.0", message: '"mya": the table "offers" has no field "group"' }] } } } });
    show();
    fireEvent.click(await screen.findByTestId("site-panel-arrange"));
    fireEvent.click(screen.getByTestId("site-arrange-add"));
    fireEvent.change(screen.getByTestId("site-own-label"), { target: { value: "Mains" } });
    fireEvent.change(screen.getByTestId("site-own-choice"), { target: { value: "group" } });
    // A choice asks which of its options.
    expect((screen.getByTestId("site-own-add") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("site-own-option"), { target: { value: "mains" } });
    fireEvent.change(screen.getByTestId("site-own-window"), { target: { value: "week" } });
    fireEvent.click(screen.getByTestId("site-own-add"));
    fireEvent.click(screen.getByTestId("site-arrange-save"));
    await waitFor(() => expect(m.saveLayout).toHaveBeenCalled());
    expect(m.saveLayout.mock.calls[0][2].own[0]).toMatchObject({ kind: "numbers", items: [{ label: L("Mains"), table: "@table:offers", where: [{ field: "group", op: "is", value: "mains" }], window: "week", compare: true }] });
    expect((await screen.findByTestId("site-arrange-problems")).textContent).toContain('has no field "group"');
  });

  test("an own part is deleted; a member who may not arrange sees no button", async () => {
    const withOwn: PanelArrange = { ...ARRANGE, parts: [...ARRANGE.parts, { key: "myone", kind: "view", label: L("Mine"), hidden: false, own: true, part: { kind: "view", key: "myone", title: L("Mine"), table: "@table:offers", columns: ["title"] } }] };
    m.getSitePanelPage.mockResolvedValue(page(withOwn));
    m.saveLayout.mockResolvedValue(page(ARRANGE));
    show();
    fireEvent.click(await screen.findByTestId("site-panel-arrange"));
    fireEvent.click(screen.getByTestId("site-arrange-myone-remove"));
    expect(screen.queryByTestId("site-arrange-myone")).toBeNull();
    fireEvent.click(screen.getByTestId("site-arrange-save"));
    await waitFor(() => expect(m.saveLayout.mock.calls[0][2].own).toEqual([]));
    cleanup();
    m.getSitePanelPage.mockResolvedValue(page());
    show();
    await screen.findByTestId("site-panel");
    expect(screen.queryByTestId("site-panel-arrange")).toBeNull();
    // A page with nothing shown says how to bring its parts back (to whoever arranges).
    expect(screen.getByTestId("site-panel-empty")).toBeTruthy();
  });
});
