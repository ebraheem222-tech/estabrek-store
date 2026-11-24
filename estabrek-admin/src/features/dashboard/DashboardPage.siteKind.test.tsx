import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPermission } from "../../lib/authz";

// The admin's home follows what the store is (docs/clean-platform-plan.ar.md, 4.3): a whole site's own numbers
// first; a site that sells nothing, none of the shop's.

const ALL: AdminPermission[] = ["dashboard:read", "orders:read", "catalog:read", "catalog:write", "inventory:read", "outbox:read", "ugc:read", "settings:read"];
let products = 0;
let header: Record<string, unknown> = {};

vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: AdminPermission) => ALL.includes(p) }) }));
vi.mock("../../hooks/useDashboard", () => ({
  useDashboard: () => ({
    overviewQuery: { isLoading: false, isError: false, refetch: vi.fn(), data: { counts: { orders: 3, products, outboxQueued: 0, reviewsPending: 0, ordersByStatus: {} }, latestOrders: [] } },
  }),
}));
vi.mock("../../hooks/useSettings", () => ({ useSettings: () => ({ data: { header } }) }));
vi.mock("../../api/sitePanels.api", () => ({
  listSitePanels: vi.fn(async () => ({ sites: [{ featureId: "f1", name: "سيرفر نور", enabled: true, pages: [{ key: "today", name: { ar: "اليوم" }, icon: "today" }] }] })),
  getSitePanelPage: vi.fn(async () => ({ parts: [{ kind: "numbers", key: "n", items: [{ key: "members", label: { ar: "أعضاء جدد", en: "New members" }, value: 12 }] }] })),
}));

import DashboardPage from "./DashboardPage";

const SITE = { siteHome: { featureId: "f1", pageId: "p1", at: "2026-11-24", menus: { header: null, footer: null }, before: { primaryNavId: null, footerNavId: null, cmsNav: false } } };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("the admin's home follows what the store is", () => {
  beforeEach(() => {
    products = 0;
    header = {};
  });

  it("a plain store: the shop's numbers, no site's", () => {
    renderPage();
    expect(screen.getByText("إجمالي الطلبات")).toBeInTheDocument();
    expect(screen.queryByTestId("site-today")).not.toBeInTheDocument();
  });

  it("a whole site that sells nothing: its own numbers and a way into its panel, none of the shop's", async () => {
    header = { ...SITE };
    renderPage();
    expect(await screen.findByTestId("site-number-members-value")).toHaveTextContent("12");
    expect(screen.getByText("سيرفر نور")).toBeInTheDocument();
    expect(screen.getByTestId("site-today-open")).toHaveAttribute("href", "/admin/site/f1/today");
    expect(screen.queryByText("إجمالي الطلبات")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إدارة المنتجات" })).not.toBeInTheDocument();
    expect(screen.queryByText("آخر الطلبات")).not.toBeInTheDocument();
  });

  it("a whole site that sells: its own numbers first, and the shop's too", async () => {
    header = { ...SITE };
    products = 5;
    renderPage();
    expect(await screen.findByTestId("site-number-members-value")).toHaveTextContent("12");
    expect(screen.getByText("إجمالي الطلبات")).toBeInTheDocument();
  });
});
