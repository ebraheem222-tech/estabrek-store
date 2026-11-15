// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Collection } from "../../api/collections.api";
import type { GridMeta, GridPage, GridRow } from "../../api/data.api";

// A member whose role was given single tables (E0.5): the grid shows the tables the server lists
// for them, and lets them write only where the table was given to change.

const NOTES = "cnotes000001";
const SUPPLIERS = "csuppliers02";
const m = vi.hoisted(() => ({ admin: null as unknown, may: new Set<string>(), listCollections: vi.fn(), gridMeta: vi.fn(), getRows: vi.fn(), patchRow: vi.fn(), bulkRows: vi.fn(), storeTables: vi.fn(), lookupRows: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p), admin: m.admin }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections }));
vi.mock("../../api/data.api", () => ({ gridMeta: m.gridMeta, getRows: m.getRows, patchRow: m.patchRow, bulkRows: m.bulkRows, storeTables: m.storeTables, lookupRows: m.lookupRows }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));

import { setLangForTests } from "../../lib/lang";
import DataPage from "./DataPage";

const table = (id: string, slug: string): Collection => ({ id, slug, name: { en: slug }, templateId: null, items: 1, published: 0, createdAt: "", updatedAt: "", fields: [{ id: "title", type: "text", name: { en: "Title" }, required: true }] });
const row: GridRow = { id: "r1", collectionId: NOTES, slug: "first", status: "DRAFT", data: { title: { en: "First" } }, sort: 0, publishedAt: null, createdAt: "2026-11-01T10:00:00.000Z", updatedAt: "2026-11-02T10:00:00.000Z", deletedAt: null };
const meta = {
  ops: { text: ["contains"], $slug: ["contains"], $status: ["is"], $date: ["gt"], $from: ["empty"] },
  systemColumns: ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"],
  views: ["all", "draft", "published", "archived", "trash"],
  limits: { pageSize: 200, filters: 12, sorts: 3, search: 100, value: 200, anyOf: 30, rows: 50_000, importRows: 500, bulkIds: 500, trashDays: 30 },
  rules: {},
  shapes: [],
} as unknown as GridMeta;
const page: GridPage = { rows: [row], total: 1, page: 1, pageSize: 50, counts: { all: 1, draft: 1, published: 0, archived: 0, trash: 0 }, ms: 3 };
const show = (at: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[at]}>
        <DataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["data:tables"]);
  m.admin = { role: "STAFF", owner: false, permissions: ["dashboard:read", `data:${NOTES}:write`, `data:${SUPPLIERS}:read`] };
  // The server lists only the tables this member was given.
  m.listCollections.mockResolvedValue([table(NOTES, "order-notes"), table(SUPPLIERS, "suppliers")]);
  m.gridMeta.mockResolvedValue(meta);
  m.getRows.mockResolvedValue(page);
  m.storeTables.mockRejectedValue(new Error("403"));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The grid for a member given single tables", () => {
  test("a table given to change is written in; one given to see is only looked at", async () => {
    show("/admin/data");
    // The first of their tables: given to change.
    expect(await screen.findByTestId("row-first")).toBeTruthy();
    expect(screen.getByTestId("row-add")).toBeTruthy();
    expect(screen.getByTestId("data-import")).toBeTruthy();
    // Making tables and fields isn't theirs: the way there isn't offered.
    expect(screen.queryByTestId("data-schema-link")).toBeNull();
    cleanup();
    m.admin = { role: "STAFF", owner: false, permissions: ["dashboard:read", `data:${NOTES}:read`] };
    show("/admin/data");
    expect(await screen.findByTestId("row-first")).toBeTruthy();
    expect(screen.queryByTestId("row-add")).toBeNull();
    expect(screen.queryByTestId("data-import")).toBeNull();
    // It can still be read out.
    expect(screen.getByTestId("data-export")).toBeTruthy();
  });
});
