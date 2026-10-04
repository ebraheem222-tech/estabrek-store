import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPermission } from "../../lib/authz";

const permissions = new Set<AdminPermission>();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    hasPermission: (permission: AdminPermission) => permissions.has(permission),
  }),
}));

vi.mock("../../hooks/useDashboard", () => ({
  useDashboard: () => ({
    overviewQuery: {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        counts: {
          orders: 7,
          products: 22,
          outboxQueued: 3,
          reviewsPending: 5,
          ordersByStatus: {
            NEW: 2,
            CONTACTED: 1,
            ACCEPTED: 1,
            REJECTED: 1,
            SHIPPED: 1,
            CLOSED: 1,
          },
        },
        latestOrders: [
          {
            id: "or_1",
            status: "NEW",
            customerName: "Jane",
            variant: { item: { product: { title: "Blue Shirt" } } },
            createdAt: "2026-02-18T12:00:00.000Z",
          },
        ],
      },
    },
  }),
}));

import DashboardPage from "./DashboardPage";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Dashboard permission visibility", () => {
  beforeEach(() => {
    permissions.clear();
  });

  it("shows only allowed quick actions and order widgets", () => {
    permissions.add("orders:read");

    renderPage();

    expect(screen.getByRole("button", { name: "عرض الطلبات" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إدارة المنتجات" })).not.toBeInTheDocument();
    expect(screen.getByText("آخر الطلبات")).toBeInTheDocument();
  });

  it("shows empty fallback when user lacks section permissions", () => {
    permissions.add("dashboard:read");

    renderPage();

    expect(screen.getByText("لا توجد إحصائيات متاحة لحسابك حالياً.")).toBeInTheDocument();
    expect(screen.getByText("لا توجد إجراءات سريعة متاحة بحسب الصلاحيات الحالية.")).toBeInTheDocument();
    expect(screen.queryByText("آخر الطلبات")).not.toBeInTheDocument();
  });
});
