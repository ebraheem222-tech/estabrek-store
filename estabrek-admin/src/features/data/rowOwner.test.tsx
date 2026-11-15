// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Collection } from "../../api/collections.api";
import type { GridMeta, GridPage, GridRow } from "../../api/data.api";

// A row a signed-in shopper added through the API (B4) has an owner: the row's window says who,
// by name for members who may see the customers, and only that there is one for the others.

const m = vi.hoisted(() => ({ listCollections: vi.fn(), gridMeta: vi.fn(), getRows: vi.fn(), patchRow: vi.fn(), bulkRows: vi.fn(), storeTables: vi.fn(), lookupRows: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections }));
vi.mock("../../api/data.api", () => ({ gridMeta: m.gridMeta, getRows: m.getRows, patchRow: m.patchRow, bulkRows: m.bulkRows, storeTables: m.storeTables, lookupRows: m.lookupRows }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));

import { setLangForTests } from "../../lib/lang";
import DataPage from "./DataPage";

const table: Collection = { id: "c1", slug: "requests", name: { en: "Requests" }, templateId: null, items: 3, published: 0, createdAt: "", updatedAt: "", fields: [{ id: "title", type: "text", name: { en: "Title" }, required: true }] };
const row = (slug: string, more: Partial<GridRow> = {}): GridRow => ({ id: `id-${slug}`, collectionId: "c1", slug, status: "DRAFT", data: { title: { en: slug.toUpperCase() } }, sort: 0, publishedAt: null, createdAt: "2026-11-01T10:00:00.000Z", updatedAt: "2026-11-02T10:00:00.000Z", deletedAt: null, ...more });
const rows = [row("r1", { ownerId: "u1", owner: { id: "u1", name: "Sara", email: "sara@shop.test" } }), row("r2", { ownerId: "u2", owner: { id: "u2" } }), row("r3", { ownerId: null })];
const meta = {
  ops: { text: ["contains"], $slug: ["contains"], $status: ["is"], $date: ["gt"], $from: ["empty"] },
  systemColumns: ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"],
  views: ["all", "draft", "published", "archived", "trash"],
  limits: { pageSize: 200, filters: 12, sorts: 3, search: 100, value: 200, anyOf: 30, rows: 50_000, importRows: 500, bulkIds: 500, trashDays: 30 },
  rules: {},
  shapes: [],
} as unknown as GridMeta;
const page: GridPage = { rows, total: 3, page: 1, pageSize: 50, counts: { all: 3, draft: 3, published: 0, archived: 0, trash: 0 }, ms: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.listCollections.mockResolvedValue([table]);
  m.gridMeta.mockResolvedValue(meta);
  m.getRows.mockResolvedValue(page);
  m.storeTables.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A row's owner", () => {
  test("the row's window says whose row it is, as far as the member may know", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/data"]}>
          <DataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByTestId("open-r1"));
    expect((await screen.findByTestId("row-owner")).textContent).toBe("The row's owner (a shopper added it through the API): Sara · sara@shop.test");
    cleanup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/data"]}>
          <DataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // The member may not see the customers: only that the row is a shopper's.
    fireEvent.click(await screen.findByTestId("open-r2"));
    expect((await screen.findByTestId("row-owner")).textContent).toBe("The row's owner (a shopper added it through the API): a shopper");
    cleanup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/data"]}>
          <DataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // A row the owner or a key added has no owner: nothing is said.
    fireEvent.click(await screen.findByTestId("open-r3"));
    await screen.findByTestId("row-field-title");
    expect(screen.queryByTestId("row-owner")).toBeNull();
  });
});
