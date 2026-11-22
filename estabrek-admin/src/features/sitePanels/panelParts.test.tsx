// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PanelPageView, PanelPartView } from "../../api/sitePanels.api";

// A whole site's panel parts beyond the first five (sites wave 1.3) over a stand-in API: a chart, a board whose cards
// move, a month's calendar (moved to another day, another month asked), a customer's page, a report for a period with
// its file, a map that sends nothing until a place is picked, and a scanner. The server's side is the backend's
// sitePanels.spec.ts.

const m = vi.hoisted(() => ({ getSitePanelPage: vi.fn(), move: vi.fn(), searchPeople: vi.fn(), findCode: vi.fn(), exportReport: vi.fn(), decide: vi.fn(), act: vi.fn(), may: new Set<string>() }));
vi.mock("../../api/sitePanels.api", () => m);
vi.mock("../../api/myFeatures.api", () => ({ saveFeatureSettings: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import SitePanelPage from "./SitePanelPage";

const L = (en: string) => ({ ar: en, en, he: en });
const T = { id: "t-b", slug: "bookings", name: L("Bookings") };
const STATES = [{ id: "fresh", name: L("New") }, { id: "confirmed", name: L("Confirmed") }];
const SHOW = [{ id: "name", type: "text", name: L("Name") }, { id: "phone", type: "phone", name: L("Phone") }];
const MONTH = "2026-11";
function pageWith(parts: PanelPartView[], over: Partial<PanelPageView> = {}): PanelPageView {
  return { featureId: "f9", name: "Restaurant: Zaytouna", enabled: true, page: { key: "board", name: L("Bookings"), icon: "calendar" }, pages: [{ key: "board", name: L("Bookings"), icon: "calendar" }], parts, ...over };
}
const kanban = (fresh: string[], confirmed: string[]): PanelPartView => ({
  kind: "kanban", key: "board", title: L("By state"), table: T, field: "status", show: SHOW, canMove: true,
  columns: [
    { id: "fresh", name: L("New"), rows: fresh.map((n) => ({ id: `r-${n}`, cells: { name: { en: n }, phone: "050" } })), total: fresh.length },
    { id: "confirmed", name: L("Confirmed"), rows: confirmed.map((n) => ({ id: `r-${n}`, cells: { name: { en: n }, phone: "050" } })), total: confirmed.length },
  ],
});
const calendar = (day: string, month = MONTH): PanelPartView => ({ kind: "calendar", key: "calendar", title: L("Calendar"), table: T, month, date: "day", color: "status", options: STATES, show: SHOW, rows: [{ id: "r-Rana", cells: { day, name: { en: "Rana" }, phone: "050-123", status: "fresh" } }], total: 1, canMove: true });

/** Where the page is now (its address with its question), for the test to read. */
function Where() {
  const at = useLocation();
  return <output hidden data-testid="where">{`${at.pathname}${at.search}`}</output>;
}
const where = () => screen.getByTestId("where").textContent;
function show(path = "/admin/site/f9/board") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/site/:featureId/:page" element={<><SitePanelPage /><Where /></>} />
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

describe("A board and a calendar", () => {
  test("a card moves to another column without a mouse; the page is what the server answers", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([kanban(["Rana", "Sami"], [])]));
    m.move.mockResolvedValue(pageWith([kanban(["Sami"], ["Rana"])]));
    show();
    expect(within(await screen.findByTestId("site-kanban-board-fresh")).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.change(screen.getByTestId("site-card-r-Rana-move"), { target: { value: "confirmed" } });
    await waitFor(() => expect(m.move).toHaveBeenCalledWith("f9", "board", "board", "r-Rana", "confirmed", "en", {}));
    await waitFor(() => expect(within(screen.getByTestId("site-kanban-board-confirmed")).getByTestId("site-card-r-Rana")).toBeTruthy());
  });

  test("a month by day: a booking opened and moved to another day; the month after is asked for in the address", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([calendar(`${MONTH}-15`)]));
    m.move.mockResolvedValue(pageWith([calendar(`${MONTH}-20`)]));
    show(`/admin/site/f9/board?month=${MONTH}`);
    await waitFor(() => expect(m.getSitePanelPage).toHaveBeenCalledWith("f9", "board", "en", { month: MONTH }));
    const day = await screen.findByTestId(`site-day-${MONTH}-15`);
    fireEvent.click(within(day).getByTestId("site-event-r-Rana"));
    expect(screen.getByTestId("site-event-r-Rana-open").textContent).toContain("050-123");
    fireEvent.change(screen.getByTestId("site-event-r-Rana-day"), { target: { value: `${MONTH}-20` } });
    fireEvent.click(screen.getByTestId("site-event-r-Rana-move"));
    await waitFor(() => expect(m.move).toHaveBeenCalledWith("f9", "board", "calendar", "r-Rana", `${MONTH}-20`, "en", { month: MONTH }));
    await waitFor(() => expect(within(screen.getByTestId(`site-day-${MONTH}-20`)).getByTestId("site-event-r-Rana")).toBeTruthy());
    m.getSitePanelPage.mockResolvedValue(pageWith([calendar("2026-12-02", "2026-12")]));
    fireEvent.click(screen.getByTestId("site-calendar-calendar-next"));
    await waitFor(() => expect(where()).toBe("/admin/site/f9/board?month=2026-12"));
    await waitFor(() => expect(screen.getByTestId("site-part-calendar").getAttribute("data-month")).toBe("2026-12"));
  });

  test("a member who may only read: no moving", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([{ ...kanban(["Rana"], []), canMove: false } as PanelPartView]));
    show();
    await screen.findByTestId("site-card-r-Rana");
    expect(screen.queryByTestId("site-card-r-Rana-move")).toBeNull();
    expect(screen.getByTestId("site-card-r-Rana").getAttribute("draggable")).toBe("false");
  });
});

describe("A customer's page, reports, a chart", () => {
  test("a customer found by their phone: their rows in each table", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([{ kind: "people", key: "person", title: L("A customer's page"), by: "phone" }]));
    m.searchPeople.mockResolvedValue({ people: [{ key: "0501234567", by: "050-123-4567", name: "Rana", last: "2026-11-22T10:00:00Z", tables: [{ table: T, title: L("Their bookings"), columns: [{ id: "service", type: "select", name: L("What"), options: [{ id: "dinner", name: L("Dinner") }] }], rows: [{ id: "b1", cells: { service: "dinner" } }] }] }] });
    show();
    fireEvent.change(await screen.findByTestId("site-people-person-q"), { target: { value: "1234567" } });
    fireEvent.click(screen.getByTestId("site-people-person-go"));
    await waitFor(() => expect(m.searchPeople).toHaveBeenCalledWith("f9", "board", "person", "1234567", "en"));
    const card = await screen.findByTestId("site-person-0501234567");
    expect(card.textContent).toContain("Rana");
    expect(card.textContent).toContain("Their bookings (1)");
    expect(card.textContent).toContain("Dinner");
  });

  test("a report for a period: its groups, another period asked for, the period as a file", async () => {
    const report = (period: "month" | "lastMonth"): PanelPartView => ({ kind: "report", key: "by", title: L("By kind"), table: T, period, from: "2026-11-01", to: "2026-11-22", groups: [{ id: "dinner", name: L("Dinner"), n: 3 }, { id: "lunch", name: L("Lunch"), n: 1 }], total: 4 });
    m.getSitePanelPage.mockResolvedValue(pageWith([report("month")]));
    m.exportReport.mockResolvedValue({ blob: new Blob(["x"]), name: "bookings.csv" });
    const made = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL: made, revokeObjectURL: vi.fn() });
    show();
    expect((await screen.findByTestId("site-report-by-total")).textContent).toBe("4");
    expect(screen.getByTestId("site-report-by-dinner").textContent).toContain("3");
    fireEvent.click(screen.getByTestId("site-report-by-export"));
    await waitFor(() => expect(m.exportReport).toHaveBeenCalledWith("f9", "board", "by", "month", "en"));
    await waitFor(() => expect(made).toHaveBeenCalled());
    m.getSitePanelPage.mockResolvedValue(pageWith([report("lastMonth")]));
    fireEvent.change(screen.getByTestId("site-report-by-period"), { target: { value: "lastMonth" } });
    await waitFor(() => expect(where()).toBe("/admin/site/f9/board?period=lastMonth"));
    await waitFor(() => expect(m.getSitePanelPage).toHaveBeenLastCalledWith("f9", "board", "en", { period: "lastMonth" }));
  });

  test("a chart: a bar a day, split by the state's options", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([{ kind: "chart", key: "daily", title: L("A day"), table: T, days: [{ day: "2026-11-21", total: 0, parts: {} }, { day: "2026-11-22", total: 3, parts: { fresh: 2, confirmed: 1 } }], options: STATES }]));
    show();
    expect((await screen.findByTestId("site-chart-daily-2026-11-22")).getAttribute("data-total")).toBe("3");
    expect(screen.getByTestId("site-part-daily").textContent).toContain("A day (3)");
    expect(screen.getByTestId("site-part-daily").textContent).toContain("Confirmed");
  });
});

describe("A map and a scanner", () => {
  test("a map sends nothing to the map's site until a place is picked", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([{ kind: "map", key: "branches", title: L("Branches"), table: T, label: "name", address: "address", columns: [{ id: "name", type: "text", name: L("Branch") }, { id: "address", type: "text", name: L("Address") }], rows: [{ id: "p1", cells: { name: { en: "Haifa" }, address: { en: "1 Port St, Haifa" } } }] }]));
    show();
    await screen.findByTestId("site-place-p1");
    expect(screen.queryByTestId("site-map-branches")).toBeNull();
    fireEvent.click(screen.getByTestId("site-place-p1"));
    expect(screen.getByTestId("site-map-branches").getAttribute("src")).toContain(encodeURIComponent("1 Port St, Haifa"));
  });

  test("a scanner: a typed code finds a row, a button decides it, an unknown code says so", async () => {
    m.getSitePanelPage.mockResolvedValue(pageWith([{ kind: "scanner", key: "scan", title: L("Scan"), table: T, columns: [{ id: "holder", type: "text", name: L("Holder") }, { id: "state", type: "select", name: L("State"), options: [{ id: "valid", name: L("Valid") }, { id: "used", name: L("Used") }] }], decisions: [{ key: "in", label: L("Let in"), tone: "good" }], canDecide: true }]));
    m.findCode.mockResolvedValueOnce({ row: { id: "t1", cells: { holder: { en: "Rana" }, state: "valid" } } }).mockResolvedValueOnce({ row: { id: "t1", cells: { holder: { en: "Rana" }, state: "used" } } });
    m.decide.mockResolvedValue(pageWith([]));
    show();
    fireEvent.change(await screen.findByTestId("site-scanner-scan-code"), { target: { value: "ABCD-2345" } });
    fireEvent.click(screen.getByTestId("site-scanner-scan-find"));
    expect((await screen.findByTestId("site-scanner-scan-row")).textContent).toContain("Valid");
    fireEvent.click(screen.getByTestId("site-scanner-scan-in"));
    await waitFor(() => expect(m.decide).toHaveBeenCalledWith("f9", "board", "scan", "t1", "in", "en"));
    await waitFor(() => expect(screen.getByTestId("site-scanner-scan-row").textContent).toContain("Used"));
    m.findCode.mockRejectedValueOnce({ response: { status: 404 } });
    fireEvent.change(screen.getByTestId("site-scanner-scan-code"), { target: { value: "NOPE" } });
    fireEvent.click(screen.getByTestId("site-scanner-scan-find"));
    expect(await screen.findByTestId("site-scanner-scan-missing")).toBeTruthy();
  });
});
