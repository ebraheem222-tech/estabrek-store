import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "../../api/http";
import { setLangForTests } from "../../lib/lang";
import { StorePagesPanel } from "./StorePagesPanel";
import type { Page } from "../../api/pages.api";
const adapter = api.defaults.adapter;
let client: QueryClient;
let writes: string[];
beforeEach(() => {
  writes = []; localStorage.setItem("admin-lang", "en"); setLangForTests("en");
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  api.defaults.adapter = async config => {
    if (config.method !== "get") writes.push(String(config.url));
    const data = config.method === "get" ? { header: { storefront: { cmsOverrideCart: false } } } : { id: "new-shop", name: "Shop", slug: "/shop", status: "DRAFT" };
    return { data, config, headers: {}, status: 200, statusText: "OK" };
  };
});
afterEach(() => { cleanup(); client.clear(); api.defaults.adapter = adapter; localStorage.clear(); setLangForTests("ar"); });
function open(pages: Page[] = [], canWrite = true) {
  const onOpen = vi.fn();
  render(<QueryClientProvider client={client}><StorePagesPanel pages={pages} canWrite={canWrite} canReadSettings onOpen={onOpen} /></QueryClientProvider>);
  return onOpen;
}
test("opening an existing cart preserves its design without creating or updating anything", async () => {
  const onOpen = open([{ id: "own-cart", slug: "/cart", name: "My own design", status: "PUBLISHED" }]);
  await screen.findByText("Default design is active");
  fireEvent.click(screen.getByTestId("store-page-cart"));
  expect(onOpen).toHaveBeenCalledWith("own-cart"); expect(writes).toEqual([]);
});
test("a missing Shop is created as a draft and opened without changing storefront settings", async () => {
  const onOpen = open();
  fireEvent.click(screen.getByTestId("store-page-shop"));
  await waitFor(() => expect(onOpen).toHaveBeenCalledWith("new-shop"));
  expect(writes).toEqual(["/admin/pages/system/shop"]);
});
test("a reader can open an existing design but cannot create a missing system page", () => {
  open([{ id: "own-cart", slug: "/cart", name: "Cart", status: "DRAFT" }], false);
  expect(screen.getByTestId("store-page-cart")).toBeEnabled();
  expect(screen.getByTestId("store-page-shop")).toBeDisabled();
});
