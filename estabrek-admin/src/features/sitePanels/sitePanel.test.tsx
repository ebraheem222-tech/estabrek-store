// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PanelPageView } from "../../api/sitePanels.api";

// A whole site's own page in the admin (sites wave 1.2) over a stand-in API: its numbers with the week before, a queue
// whose buttons decide a row, quick actions (only those that would change something, asked first), a saved table,
// and a member who may only read. The server's side, with a database, is the backend's sitePanels.spec.ts.

const m = vi.hoisted(() => ({ getSitePanelPage: vi.fn(), decide: vi.fn(), act: vi.fn(), listSitePanels: vi.fn(), saveFeatureSettings: vi.fn(), may: new Set<string>() }));
vi.mock("../../api/sitePanels.api", () => ({ getSitePanelPage: m.getSitePanelPage, decide: m.decide, act: m.act, listSitePanels: m.listSitePanels }));
vi.mock("../../api/myFeatures.api", () => ({ saveFeatureSettings: m.saveFeatureSettings }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import SitePanelPage from "./SitePanelPage";
import { cellText, changeText } from "./panelText";

const L = (en: string) => ({ ar: en, en, he: en });
const PAGES = [{ key: "today", name: L("Today"), icon: "today" as const }, { key: "lists", name: L("Lists"), icon: "lists" as const }];
const BOOKINGS = { id: "t-b", slug: "bookings", name: L("Booking requests") };
const COLUMNS = [
  { id: "name", type: "text", name: L("Name") },
  { id: "phone", type: "phone", name: L("Phone") },
  { id: "service", type: "select", name: L("What"), options: [{ id: "dinner", name: L("Dinner") }] },
];
function today(over: Partial<{ rows: Array<{ id: string; cells: Record<string, unknown> }>; canDecide: boolean; done: boolean; enabled: boolean }> = {}): PanelPageView {
  const rows = over.rows ?? [{ id: "r1", cells: { name: { en: "Rana" }, phone: "050-123-4567", service: "dinner" } }, { id: "r2", cells: { name: { en: "Sami" }, phone: null, service: "dinner" } }];
  return {
    featureId: "f9",
    name: "Restaurant: Zaytouna",
    enabled: over.enabled ?? true,
    page: PAGES[0],
    pages: PAGES,
    parts: [
      { kind: "numbers", key: "numbers", items: [{ key: "bookingsNew", label: L("Booking requests waiting"), value: rows.length, table: BOOKINGS }, { key: "bookingsWeek", label: L("Booking requests this week"), value: 5, before: 3, window: "week", table: BOOKINGS }] },
      { kind: "queue", key: "bookings", title: L("Booking requests waiting"), table: BOOKINGS, columns: COLUMNS, rows, total: rows.length, decisions: [{ key: "confirm", label: L("Confirm"), tone: "good" }, { key: "done", label: L("Done") }], canDecide: over.canDecide ?? true, empty: L("No booking requests waiting.") },
      { kind: "actions", key: "actions", title: L("In one tap"), items: [{ key: "bookingClose", label: L("Close online booking"), note: L("The booking page says it's closed."), setting: "bookingOpen", value: false, done: !!over.done }, { key: "bookingOpen", label: L("Open online booking"), note: null, setting: "bookingOpen", value: true, done: !over.done }] },
      { kind: "view", key: "offers", title: L("The menu"), table: { id: "t-o", slug: "dishes", name: L("Menu") }, columns: [{ id: "title", type: "text", name: L("Dish") }, { id: "price", type: "money", name: L("Price"), currency: "ILS" }, { id: "$createdAt", type: "$date", name: L("Came in") }], rows: [{ id: "d1", cells: { title: { en: "Hummus" }, price: 32, $createdAt: "2026-11-22T10:00:00.000Z" } }], total: 1 },
    ],
  };
}
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

describe("A whole site's own page", () => {
  test("its numbers with the week before, its pages as tabs, its queue's rows in words", async () => {
    m.getSitePanelPage.mockResolvedValue(today());
    show();
    expect((await screen.findByTestId("site-panel-name")).textContent).toBe("Restaurant: Zaytouna");
    expect(m.getSitePanelPage).toHaveBeenCalledWith("f9", "today", "en");
    expect(screen.getByTestId("site-number-bookingsNew-value").textContent).toBe("2");
    expect(screen.getByTestId("site-number-bookingsWeek-change").textContent).toBe("+2 on the week before");
    expect(within(screen.getByTestId("site-panel-pages")).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/admin/site/f9/today", "/admin/site/f9/lists"]);
    const row = screen.getByTestId("site-row-r1");
    expect(row.textContent).toContain("Rana");
    expect(row.textContent).toContain("050-123-4567");
    expect(row.textContent).toContain("Dinner");
    // A saved table: money as money, a date as a date.
    expect(screen.getByTestId("site-view-row-d1").textContent).toContain("32");
    expect(screen.getByTestId("site-part-offers").querySelector('a[href="/admin/data?table=dishes"]')).toBeTruthy();
  });

  test("a queue's button decides one row; the page is what the server answers", async () => {
    m.getSitePanelPage.mockResolvedValue(today());
    m.decide.mockResolvedValue(today({ rows: [{ id: "r2", cells: { name: { en: "Sami" } } }] }));
    show();
    fireEvent.click(await screen.findByTestId("site-decide-r1-confirm"));
    await waitFor(() => expect(m.decide).toHaveBeenCalledWith("f9", "today", "bookings", "r1", "confirm", "en"));
    await waitFor(() => expect(screen.queryByTestId("site-row-r1")).toBeNull());
    expect(screen.getByTestId("site-number-bookingsNew-value").textContent).toBe("1");
  });

  test("quick actions: only what would change something, asked first; done, the other shows", async () => {
    m.getSitePanelPage.mockResolvedValue(today());
    m.act.mockResolvedValue(today({ done: true }));
    show();
    expect(await screen.findByTestId("site-action-bookingClose")).toBeTruthy();
    expect(screen.queryByTestId("site-action-bookingOpen")).toBeNull();
    fireEvent.click(screen.getByTestId("site-action-bookingClose"));
    const ask = await screen.findByRole("dialog");
    expect(ask.textContent).toContain("The booking page says it's closed.");
    fireEvent.click(within(ask).getByRole("button", { name: "Close online booking" }));
    await waitFor(() => expect(m.act).toHaveBeenCalledWith("f9", "today", "actions", "bookingClose", "en"));
    expect(await screen.findByTestId("site-action-bookingOpen")).toBeTruthy();
    expect(screen.queryByTestId("site-action-bookingClose")).toBeNull();
  });

  test("a member who may only read: no buttons; an empty queue says so; a site that is off says so", async () => {
    m.may = new Set(["features:read"]);
    m.getSitePanelPage.mockResolvedValue(today({ canDecide: false, rows: [], enabled: false }));
    show();
    expect((await screen.findByTestId("site-part-bookings-empty")).textContent).toBe("No booking requests waiting.");
    expect(screen.queryByTestId("site-decide-r1-confirm")).toBeNull();
    expect(screen.getByTestId("site-panel-off")).toBeTruthy();
  });

  test("a page this member can't see: what the server said", async () => {
    m.getSitePanelPage.mockRejectedValue({ response: { status: 404, data: { message: "No such page in a site's panel" } } });
    show();
    expect((await screen.findByTestId("site-panel-error")).textContent).toBeTruthy();
  });
});

describe("The panel's words", () => {
  test("a cell in words, a number against the window before", () => {
    expect(cellText(COLUMNS[2], "dinner", "en")).toBe("Dinner");
    expect(cellText(COLUMNS[0], { ar: "رنا", en: "Rana" }, "ar")).toBe("رنا");
    expect(cellText({ id: "x", type: "boolean", name: null }, true, "en")).toBe("✓");
    expect(cellText({ id: "x", type: "$status", name: null }, "PUBLISHED", "en")).toBe("Published");
    expect(cellText({ id: "x", type: "text", name: null }, null, "en")).toBe("");
    expect(changeText(5, 5, "week")).toBe("Same as the week before");
    expect(changeText(2, 5, "today")).toBe("−3 on yesterday");
    expect(changeText(null, 5, "week")).toBe("");
  });
});
