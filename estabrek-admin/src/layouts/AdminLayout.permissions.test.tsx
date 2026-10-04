import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminPermission } from "../lib/authz";

const permissions = new Set<AdminPermission>();
const hasPermission = vi.fn((permission: AdminPermission) => permissions.has(permission));
const logoutMutateAsync = vi.fn(async () => {});

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    admin: { name: "Tester", email: "tester@example.com" },
    logout: { mutateAsync: logoutMutateAsync, isPending: false },
    hasPermission,
  }),
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: () => ({ data: null }),
}));

vi.mock("../theme/adminTheme", () => ({
  applyAdminTheme: vi.fn(),
}));

vi.mock("../theme/cursorTheme", () => ({
  applyCursorTheme: vi.fn(),
}));

vi.mock("../theme/buttonTheme", () => ({
  applyButtonTheme: vi.fn(),
  clearButtonTheme: vi.fn(),
}));

import AdminLayout from "./AdminLayout";

function renderWithRouter(content: ReactNode = <div>Page content</div>) {
  // The layout polls the orders summary for the new-order badge.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  render(
    <QueryClientProvider client={client}>
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={content} />
        </Route>
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AdminLayout permission visibility", () => {
  beforeEach(() => {
    permissions.clear();
    hasPermission.mockClear();
    logoutMutateAsync.mockClear();
  });

  it("hides navigation items when permissions are missing", () => {
    permissions.add("dashboard:read");
    permissions.add("account:read");

    renderWithRouter();

    expect(screen.getByRole("link", { name: "الملف الشخصي" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "الطلبات" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "الصفحات" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "تغيير البريد" })).not.toBeInTheDocument();
  });

  it("shows navigation items when matching permissions exist", () => {
    permissions.add("dashboard:read");
    permissions.add("orders:read");
    permissions.add("pages:read");
    permissions.add("settings:read");
    permissions.add("account:write");

    renderWithRouter();

    // Orders shows in the sidebar and in the phone tab bar.
    expect(screen.getAllByRole("link", { name: "الطلبات" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "الصفحات" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الإعدادات" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تغيير البريد" })).toBeInTheDocument();
  });
});
