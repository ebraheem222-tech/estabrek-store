import { afterEach, beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ env: { STOREFRONT_URL: "https://shop.example.test", STOREFRONT_REVALIDATE_URL: undefined as string | undefined, STOREFRONT_REVALIDATE_URLS: [] as string[] }, fetch: vi.fn() }));
vi.mock("../config/env.js", () => ({ env: m.env }));
import { probePublicPage } from "../lib/publicPageProbe.js";
const page = { id: "fixture", status: "PUBLISHED", slug: "/t", kind: "page" };
beforeEach(() => { vi.clearAllMocks(); m.env.STOREFRONT_URL = "https://shop.example.test"; m.env.STOREFRONT_REVALIDATE_URLS = []; vi.stubGlobal("fetch", m.fetch); });
afterEach(() => vi.unstubAllGlobals());

test("a200 with this page's public marker verifies the selected language and never sends secrets", async () => {
  m.fetch.mockResolvedValue(new Response('<span hidden="" data-cms-page-id="fixture"></span>', { headers: { "content-type": "text/html" } }));
  expect(await probePublicPage(page, "en")).toMatchObject({ state: "shown", targets: [{ origin: "https://shop.example.test", state: "shown", status: 200 }] });
  expect(String(m.fetch.mock.calls[0][0])).toBe("https://shop.example.test/en/t");
  expect(m.fetch.mock.calls[0][1]).toMatchObject({ redirect: "error", headers: { accept: "text/html" } });
});
test("HTTP200 without the requested page marker is not reported as a published page", async () => {
  m.fetch.mockResolvedValue(new Response('<h1>Home fallback</h1>', { headers: { "content-type": "text/html" } }));
  expect(await probePublicPage(page, "ar")).toMatchObject({ state: "pending", targets: [{ state: "different_page" }] });
});
test("404 and redirect failures are distinct from database publication and cannot escape the configured origin", async () => {
  m.env.STOREFRONT_REVALIDATE_URLS = ["https://other.example.test/api/revalidate?secret=private"];
  m.fetch.mockResolvedValueOnce(new Response("missing", { status: 404 })).mockRejectedValueOnce(new Error("redirect blocked"));
  const result = await probePublicPage(page, "he");
  expect(result).toMatchObject({ state: "pending", targets: [{ state: "not_found", status: 404 }, { state: "unavailable" }] });
  expect(JSON.stringify(result)).not.toContain("private");
});
test.each(["//external.example/a", "/../api", "/%2e%2e/api", "/%2f%2fexternal.example", "/x?y=1", "/\\external.example"])("unsafe stored slug is not fetched: %s", async slug => {
  expect(await probePublicPage({ ...page, slug }, "en")).toMatchObject({ state: "pending" });
  expect(m.fetch).not.toHaveBeenCalled();
});
test("unpublished pages and blocks are not publicly probed", async () => {
  expect(await probePublicPage({ ...page, status: "DRAFT" }, "en")).toMatchObject({ state: "not_public" });
  expect(await probePublicPage({ ...page, kind: "block" }, "en")).toMatchObject({ state: "not_public" });
  expect(m.fetch).not.toHaveBeenCalled();
});
