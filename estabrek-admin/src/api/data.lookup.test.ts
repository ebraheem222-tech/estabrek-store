import { beforeEach, describe, expect, test, vi } from "vitest";

// A relation's picker asks the right place: one of the owner's tables by its id, one of the
// store's ("store:products") through the store's own route, which asks for that table's permission.
const http = vi.hoisted(() => ({ get: vi.fn(async () => ({ data: { rows: [], total: 0 } })) }));
vi.mock("./http", () => ({ api: http }));

import { lookupRows } from "./data.api";

beforeEach(() => vi.clearAllMocks());

describe("lookupRows", () => {
  test("one of the owner's tables", async () => {
    await lookupRows("tbl-1", " amal ");
    expect(http.get).toHaveBeenLastCalledWith("/admin/collections/tbl-1/rows/lookup", { params: { search: "amal" } });
    await lookupRows("tbl-1", "  ");
    expect(http.get).toHaveBeenLastCalledWith("/admin/collections/tbl-1/rows/lookup", { params: {} });
  });

  test("one of the store's tables", async () => {
    expect(await lookupRows("store:products", "coat")).toEqual({ rows: [], total: 0 });
    expect(http.get).toHaveBeenLastCalledWith("/admin/data/store/products/lookup", { params: { search: "coat" } });
    await lookupRows("store:customers", "");
    expect(http.get).toHaveBeenLastCalledWith("/admin/data/store/customers/lookup", { params: {} });
  });
});
