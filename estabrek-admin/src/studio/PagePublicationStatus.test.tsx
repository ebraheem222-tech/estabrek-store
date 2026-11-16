import { afterEach, beforeEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/http";
import { setLangForTests } from "../lib/lang";
import { PagePublicationStatus } from "./PagePublicationStatus";
import type { Page } from "../api/pages.api";
const adapter = api.defaults.adapter;
let client: QueryClient;
let paths: string[];
const page: Page = { id: "page", name: "Test", slug: "/t", status: "PUBLISHED" };
beforeEach(() => {
  paths = []; localStorage.setItem("admin-lang", "en"); setLangForTests("en");
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  api.defaults.adapter = async config => {
    const path = String(config.url); paths.push(path);
    const data = path.endsWith("/check") ? { state: "shown", targets: [{ origin: "https://shop.example.test", url: "https://shop.example.test/en/t", state: "shown", status: 200 }] }
      : { publication: { status: "PUBLISHED", slug: "/t", state: "live", public: true, publishAt: null, unpublishAt: null }, hasDraft: false, delivery: { id: "publication-1", state: "pending", targets: [] } };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
});
afterEach(() => { cleanup(); client.clear(); api.defaults.adapter = adapter; localStorage.clear(); setLangForTests("ar"); });
function open(patch: Partial<Page> = {}, canPublish = true) {
  return render(<QueryClientProvider client={client}><PagePublicationStatus page={{ ...page, ...patch }} lang="en" hasDraft={false} canPublish={canPublish} /></QueryClientProvider>);
}
test("a committed publication with pending cache delivery is reported separately and can be publicly verified", async () => {
  open();
  expect(await screen.findByText("Storefront refresh is pending.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Check public page" }));
  expect(await screen.findByText("This page is visible on the checked storefronts.")).toBeVisible();
  expect(paths).toContain("/admin/pages/page/publication/check");
});
test("a page of a switched-off feature says it is hidden from the shop, and by which feature", async () => {
  api.defaults.adapter = async config => {
    const path = String(config.url); paths.push(path);
    const data = path.endsWith("/check") ? { state: "not_public", targets: [] }
      : { publication: { status: "PUBLISHED", slug: "/t", state: "live", public: true, publishAt: null, unpublishAt: null }, hasDraft: false, delivery: null, hiddenBy: { id: "m1", name: "Friend requests" } };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  render(<QueryClientProvider client={client}><MemoryRouter><PagePublicationStatus page={page} lang="en" hasDraft={false} canPublish /></MemoryRouter></QueryClientProvider>);
  const note = await screen.findByTestId("studio-hidden-by");
  expect(note.textContent).toBe("Hidden from the shop: it belongs to a feature that is switched off, Friend requests. Switch the feature on to show it again.");
  // The way to the feature, where its switch is.
  expect(screen.getByRole("link", { name: "Friend requests" }).getAttribute("href")).toBe("/admin/my-features/m1");
  // Its own status is still said (it shows again without publishing), but not as a page that is live.
  expect(screen.getByText("Published").className).toContain("text-amber-200");
});
test("a page of no feature, or of one that is on, says nothing about being hidden", async () => {
  open();
  await screen.findByText("Storefront refresh is pending.");
  expect(screen.queryByTestId("studio-hidden-by")).not.toBeInTheDocument();
  expect(screen.getByText("Published").className).toContain("text-emerald-300");
});
test("a read-only editor can inspect availability but cannot retry a publishing operation", async () => {
  open({}, false);
  expect(await screen.findByRole("button", { name: "Check public page" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Retry storefront refresh" })).not.toBeInTheDocument();
});
test("a reusable block does not expose a public page check or make a public status request", () => {
  open({ kind: "block" });
  expect(screen.queryByRole("button", { name: "Check public page" })).not.toBeInTheDocument();
  expect(paths).toEqual([]);
});
test("changing the content locale hides the previous locale's public verification", async () => {
  const view = open();
  await screen.findByText("Storefront refresh is pending.");
  fireEvent.click(await screen.findByRole("button", { name: "Check public page" }));
  expect(await screen.findByText("This page is visible on the checked storefronts.")).toBeVisible();
  view.rerender(<QueryClientProvider client={client}><PagePublicationStatus page={page} lang="ar" hasDraft={false} canPublish /></QueryClientProvider>);
  expect(screen.queryByText("This page is visible on the checked storefronts.")).not.toBeInTheDocument();
  expect(screen.queryByText("https://shop.example.test")).not.toBeInTheDocument();
});
