// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StudioPage from "./StudioPage";
import { api } from "../api/http";
import { authStore } from "../store/auth.store";
import { env } from "../config/env";
import { setLangForTests } from "../lib/lang";
import { shopOriginOf } from "../hooks/useShopOrigin";

// The page editor opens full screen, outside the admin's frame that follows the store's own shop. A client's copy
// built before it had a shop points at another store's, which refuses to be shown in this admin: the editor showed
// an empty page with a broken-page sign. It now frames the store's own shop, and waits until it is known.

const originalAdapter = api.defaults.adapter;
const originalShop = env.VITE_STOREFRONT_BASE_URL;
const pageId = "studio-shop-test";
const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [] }] } };
let shopAnswer: () => Promise<unknown>;

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  localStorage.setItem("admin-lang", "en");
  setLangForTests("en");
  env.VITE_STOREFRONT_BASE_URL = "https://other-store.vercel.app";
  authStore.setAdmin({ id: "fixture-owner", email: "owner@example.test", role: "SUPERADMIN", owner: true } as never);
  api.defaults.adapter = async (config) => {
    const path = String(config.url).split("?")[0];
    const data = path.endsWith("/settings/shop")
      ? await shopAnswer()
      : path.endsWith("/preview-token")
        ? { token: "fixture-only", expiresAt: new Date(Date.now() + 1_800_000).toISOString() }
        : path.endsWith("/draft")
          ? { draft: { version: 1, rev: 1, baseHash: "local", sections: [], trash: [], startedAt: "", updatedAt: "", tree }, main: "en" }
          : path.endsWith("/tree")
            ? { format: 2, tree, saved: true }
            : path.endsWith("/site-styles")
              ? { styles: [], draft: null }
              : path.endsWith("/settings")
                ? { header: { identity: { industry: "fashion", audience: "women" } }, languages: { default: "en", enabled: ["en"] } }
                : path.endsWith(`/pages/${pageId}`)
                  ? { id: pageId, name: "Fixture", slug: "/", status: "DRAFT", kind: "page", sections: [], format: 2 }
                  : path.includes("/models")
                    ? { items: [], maxBytes: 1_000_000 }
                    : [];
    return { data: structuredClone(data), status: 200, statusText: "OK", headers: {}, config };
  };
});
afterEach(() => {
  cleanup();
  api.defaults.adapter = originalAdapter;
  env.VITE_STOREFRONT_BASE_URL = originalShop;
  localStorage.clear();
  vi.unstubAllGlobals();
  setLangForTests("ar");
});

function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  client.setQueryData(["store-themes"], []);
  client.setQueryData(["store-themes", "full"], { themes: [], models: [], fonts: [] });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/studio/${pageId}`]}>
        <Routes>
          <Route path="/studio/:id" element={<StudioPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("a shop made from the store's setup is the one the editor frames", async () => {
  shopAnswer = async () => ({ source: "made", url: "https://client-shop.vercel.app/", connect: false, error: null, making: null, repo: null, branch: "main" });
  open();
  await waitFor(() => expect(screen.getByTestId("studio-frame").getAttribute("src")).toMatch(/^https:\/\/client-shop\.vercel\.app\/(en\/)?studio-frame\?token=fixture-only/));
});

test("while the server is asked the frame doesn't open the address the admin was built with", async () => {
  let answer!: (v: unknown) => void;
  shopAnswer = () => new Promise((resolve) => (answer = resolve));
  open();
  // The ticket comes back; the shop doesn't yet: no frame of the other store's shop.
  await new Promise((r) => setTimeout(r, 300));
  expect(screen.queryByTestId("studio-frame")?.getAttribute("src") ?? "").not.toContain("other-store");
  answer({ source: "made", url: "https://client-shop.vercel.app", connect: false, error: null, making: null, repo: null, branch: "main" });
  await waitFor(() => expect(screen.getByTestId("studio-frame").getAttribute("src")).toMatch(/^https:\/\/client-shop\.vercel\.app\/(en\/)?studio-frame/));
});

test("a shop given by the server's own variables, or no answer, leaves the built address", () => {
  expect(shopOriginOf({ source: "server", url: "https://elsewhere.vercel.app", connect: false, error: null, making: null, repo: null, branch: "main" })).toBe("https://other-store.vercel.app");
  expect(shopOriginOf(null)).toBe("https://other-store.vercel.app");
  expect(shopOriginOf({ source: "made", url: "http://not-https.example", connect: false, error: null, making: null, repo: null, branch: "main" })).toBe("https://other-store.vercel.app");
});
