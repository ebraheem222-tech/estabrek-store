import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminPermission } from "../lib/authz";

// The admin follows what the store is (siteKind.ts): a whole site that sells nothing doesn't see the shop's
// pages until its owner brings them back.

const permissions = new Set<AdminPermission>(["dashboard:read", "orders:read", "catalog:read", "catalog:write", "pages:read", "settings:read", "settings:write"]);
let header: Record<string, unknown> = {};

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    admin: { name: "Owner", email: "owner@example.com" },
    logout: { mutateAsync: vi.fn(async () => {}), isPending: false },
    hasPermission: (p: AdminPermission) => permissions.has(p),
  }),
}));
vi.mock("../hooks/useSettings", () => ({ useSettings: () => ({ data: { header } }) }));
vi.mock("../theme/adminTheme", () => ({ applyAdminTheme: vi.fn() }));
vi.mock("../../../estabrek-storefront/src/theme/cursorTheme", () => ({ applyCursorTheme: vi.fn() }));
vi.mock("../theme/buttonTheme", () => ({ applyButtonTheme: vi.fn(), clearButtonTheme: vi.fn() }));
const updateSettings = vi.fn(async (_body: unknown) => ({}));
vi.mock("../api/settings.api", () => ({ getSettings: vi.fn(async () => ({ header })), updateSettings: (body: unknown) => updateSettings(body) }));

import AdminLayout from "./AdminLayout";

const SITE = { siteHome: { featureId: "f1", pageId: "p1", at: "2026-11-24", menus: { header: null, footer: null }, before: { primaryNavId: null, footerNavId: null, cmsNav: false } } };

function renderWith(products: number) {
  // Nothing asks the server here; the dashboard's numbers are already known.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  client.setQueryData(["admin", "overview"], { counts: { products } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<div>Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("the admin follows what the store is", () => {
  beforeEach(() => {
    updateSettings.mockClear();
  });

  it("a plain store sees its shop's pages", () => {
    header = {};
    renderWith(0);
    expect(screen.getAllByRole("link", { name: "المنتجات" }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("show-shop")).not.toBeInTheDocument();
  });

  it("a whole site that sells nothing: the shop's pages tucked away, one click brings them back", async () => {
    header = { ...SITE };
    renderWith(0);
    expect(screen.queryByRole("link", { name: "المنتجات" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "الطلبات" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "المخزون والباركود" })).not.toBeInTheDocument();
    // The site's own: still there.
    expect(screen.getByRole("link", { name: "الصفحات" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الإعدادات" })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("show-shop"));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
    const saved = updateSettings.mock.calls[0][0] as { header: Record<string, unknown> };
    expect(saved.header.adminShop).toBe(true);
    // The rest of the header kept.
    expect(saved.header.siteHome).toEqual(SITE.siteHome);
  });

  it("a whole site that sells (it has products) keeps the shop's pages", () => {
    header = { ...SITE };
    renderWith(4);
    expect(screen.getAllByRole("link", { name: "المنتجات" }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("show-shop")).not.toBeInTheDocument();
  });
});
