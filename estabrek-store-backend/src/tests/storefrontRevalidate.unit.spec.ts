import { afterEach, beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ env: { STOREFRONT_REVALIDATE_URL: undefined as string | undefined, STOREFRONT_REVALIDATE_URLS: [] as string[], STOREFRONT_REVALIDATE_SECRET: "fixture-secret" }, fetch: vi.fn() }));
vi.mock("../config/env.js", () => ({ env: m.env }));
import { revalidateStorefront } from "../lib/storefrontRevalidate.js";
beforeEach(() => { vi.clearAllMocks(); m.env.STOREFRONT_REVALIDATE_URL = undefined; m.env.STOREFRONT_REVALIDATE_URLS = []; vi.stubGlobal("fetch", m.fetch); });
afterEach(() => vi.unstubAllGlobals());

test("no configured endpoint is reported as unconfigured", async () => {
  expect(await revalidateStorefront({ paths: ["/t"] })).toEqual({ state: "not_configured", targets: [] });
  expect(m.fetch).not.toHaveBeenCalled();
});
test("all configured storefronts are invalidated, including the legacy single endpoint", async () => {
  m.env.STOREFRONT_REVALIDATE_URL = "https://one.example.test/api/revalidate";
  m.env.STOREFRONT_REVALIDATE_URLS = ["https://two.example.test/api/revalidate", "https://one.example.test/api/revalidate"];
  m.fetch.mockResolvedValue(new Response("", { status: 200 }));
  expect(await revalidateStorefront({ tags: ["cms:pages"], paths: ["/t"] })).toMatchObject({ state: "success", targets: [{ origin: "https://one.example.test", ok: true }, { origin: "https://two.example.test", ok: true }] });
  expect(m.fetch).toHaveBeenCalledTimes(2);
  expect(m.fetch.mock.calls[0][1]).toMatchObject({ method: "POST", redirect: "error", headers: { "x-revalidate-secret": "fixture-secret" } });
});
test("partial HTTP failure reports safe per-origin diagnostics without response content or URL secrets", async () => {
  m.env.STOREFRONT_REVALIDATE_URL = "https://one.example.test/api/revalidate?secret=private";
  m.env.STOREFRONT_REVALIDATE_URLS = ["https://two.example.test/api/revalidate"];
  m.fetch.mockResolvedValueOnce(new Response("sensitive response", { status: 401 })).mockResolvedValueOnce(new Response("", { status: 200 }));
  const result = await revalidateStorefront({ paths: ["/t"] });
  expect(result).toMatchObject({ state: "failed", targets: [{ origin: "https://one.example.test", ok: false, status: 401 }, { origin: "https://two.example.test", ok: true }] });
  expect(JSON.stringify(result)).not.toContain("private"); expect(JSON.stringify(result)).not.toContain("sensitive");
});
test("a network failure is a bounded failed delivery rather than a rejected publication", async () => {
  m.env.STOREFRONT_REVALIDATE_URL = "https://one.example.test/api/revalidate";
  m.fetch.mockRejectedValue(new Error("network"));
  expect(await revalidateStorefront({ paths: ["/t"] })).toMatchObject({ state: "failed", targets: [{ origin: "https://one.example.test", ok: false }] });
  expect(m.fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});
