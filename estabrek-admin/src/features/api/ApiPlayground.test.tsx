// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ApiTable, TableAccess } from "../../api/dataApi.api";

// "جرّب طلب" and "الوثائق": the two panels over a stand-in server. A request goes out as the
// outside sends it (no cookies, a key or nothing); one that writes asks first.

const m = vi.hoisted(() => ({ getDocs: vi.fn(), copied: [] as string[], files: [] as Array<{ name: string; text: string }> }));
vi.mock("../../api/dataApi.api", () => ({ getDocs: m.getDocs }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { setLangForTests } from "../../lib/lang";
import { ApiDocs } from "./ApiDocs";
import { ApiPlayground } from "./ApiPlayground";

const closed: TableAccess = { read: "off", create: "off", update: "off", delete: "off" };
const table = (slug: string, access: Partial<TableAccess>): ApiTable => ({ id: `t-${slug}`, slug, name: { en: slug }, access: { ...closed, ...access }, open: Object.values({ ...closed, ...access }).some((w) => w !== "off"), fields: [{ id: "title", type: "text", name: null, required: true }, { id: "price", type: "number", name: null, required: false }] });
const posts = table("posts", { read: "public", create: "key", update: "key", delete: "key" });
const notes = table("notes", { create: "public" });
const hidden = table("hidden", {});
const url = "https://api.shop.test/v1/data";
const fetched = vi.fn();
const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => ({ status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)), headers: { get: (name: string) => headers[name] ?? null } });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  fetched.mockResolvedValue(reply(200, { data: [{ slug: "first" }], total: 1 }));
  vi.stubGlobal("fetch", fetched);
  m.copied = [];
  m.files = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => void m.copied.push(t) } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setLangForTests("ar");
});

describe("Try a request", () => {
  test("offers the open tables and, of each, what it lets the outside do", () => {
    render(<ApiPlayground tables={[posts, hidden, notes]} url={url} />);
    const options = (id: string) => [...screen.getByTestId(id).querySelectorAll("option")].map((o) => o.textContent);
    expect(options("play-table")).toEqual(["posts", "notes"]);
    expect(options("play-act")).toEqual(["GET · A page of rows", "GET · One row", "POST · A new row", "PATCH · Change a row", "DELETE · Delete a row"]);
    fireEvent.change(screen.getByTestId("play-table"), { target: { value: "t-notes" } });
    expect(options("play-act")).toEqual(["POST · A new row"]);
    // The body starts from the table's own required field.
    expect(JSON.parse((screen.getByTestId("play-body") as HTMLTextAreaElement).value)).toEqual({ values: { title: "…" } });
    cleanup();
    render(<ApiPlayground tables={[hidden]} url={url} />);
    expect(screen.getByTestId("play-empty").textContent).toContain("No table is open to try");
  });

  test("a read goes out as the outside sends it, and the answer shows as it came", async () => {
    render(<ApiPlayground tables={[posts]} url={url} />);
    fireEvent.change(screen.getByTestId("play-query"), { target: { value: "pageSize=1&lang=en" } });
    fireEvent.click(screen.getByTestId("play-send"));
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(1));
    // No cookies and no admin sign-in with it, and (nothing was pasted) no key.
    expect(fetched).toHaveBeenCalledWith(`${url}/posts?pageSize=1&lang=en`, { method: "GET", headers: {}, body: undefined, credentials: "omit" });
    expect((await screen.findByTestId("play-status")).textContent).toBe("200");
    expect(screen.getByTestId("play-status-words").textContent).toBe("OK");
    expect(screen.getByTestId("play-answer").textContent).toBe(JSON.stringify({ data: [{ slug: "first" }], total: 1 }, null, 2));
    expect(screen.getByTestId("play-curl").textContent).toBe(`curl "${url}/posts?pageSize=1&lang=en"`);
    expect(screen.queryByTestId("play-limit")).toBeNull();
  });

  test("with a key: its header goes with the request, its limit shows, and the key is never written on the page", async () => {
    fetched.mockResolvedValue(reply(200, { id: "r1" }, { "X-RateLimit-Key-Limit": "60", "X-RateLimit-Key-Remaining": "59" }));
    render(<ApiPlayground tables={[posts]} url={url} />);
    fireEvent.change(screen.getByTestId("play-act"), { target: { value: "one" } });
    fireEvent.click(screen.getByTestId("play-send"));
    expect(screen.getByTestId("play-problem").textContent).toBe("Write the row's address or id");
    expect(fetched).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("play-row"), { target: { value: "first" } });
    fireEvent.change(screen.getByTestId("play-key"), { target: { value: "ek_the-real-secret-0123456789" } });
    fireEvent.click(screen.getByTestId("play-send"));
    await waitFor(() => expect(fetched).toHaveBeenCalledWith(`${url}/posts/first`, { method: "GET", headers: { "X-Api-Key": "ek_the-real-secret-0123456789" }, body: undefined, credentials: "omit" }));
    expect((await screen.findByTestId("play-limit")).textContent).toBe("Left for the key this minute: 59 of 60");
    expect((screen.getByTestId("play-key") as HTMLInputElement).type).toBe("password");
    expect(screen.getByTestId("play-curl").textContent).toBe(`curl "${url}/posts/first" -H "X-Api-Key: ek_…"`);
    expect(screen.getByTestId("api-play").textContent).not.toContain("real-secret");
  });

  test("a request that writes says it is a real one and asks first", async () => {
    fetched.mockResolvedValue(reply(400, { error: "ROW_INVALID", details: { issues: [{ field: "title", message: "Required" }] } }));
    render(<ApiPlayground tables={[posts]} url={url} />);
    fireEvent.change(screen.getByTestId("play-act"), { target: { value: "create" } });
    expect(screen.getByTestId("play-send").textContent).toBe("Send (a real request)");
    // It needs a key here, and says so before asking anything.
    fireEvent.click(screen.getByTestId("play-send"));
    expect(screen.getByTestId("play-problem").textContent).toBe("This needs a key: paste one of your keys");
    fireEvent.change(screen.getByTestId("play-key"), { target: { value: "ek_k" } });
    fireEvent.change(screen.getByTestId("play-body"), { target: { value: '{"values":{"price":3}}' } });
    fireEvent.click(screen.getByTestId("play-send"));
    const ask = await screen.findByRole("dialog");
    expect(ask.textContent).toContain("This is a real request");
    expect(fetched).not.toHaveBeenCalled();
    // Not now: nothing is sent.
    fireEvent.click(within(ask).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetched).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("play-send"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(fetched).toHaveBeenCalledWith(`${url}/posts`, { method: "POST", headers: { "Content-Type": "application/json", "X-Api-Key": "ek_k" }, body: '{"values":{"price":3}}', credentials: "omit" }));
    // What the server refused shows as it said it.
    expect((await screen.findByTestId("play-status")).textContent).toBe("400");
    expect(screen.getByTestId("play-status-words").textContent).toBe("The request or its values are wrong");
    expect(screen.getByTestId("play-answer").textContent).toContain('"field": "title"');
  });

  test("a request that never reached the server says so", async () => {
    fetched.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<ApiPlayground tables={[posts]} url={url} />);
    fireEvent.click(screen.getByTestId("play-send"));
    expect((await screen.findByTestId("play-failed")).textContent).toContain("Failed to fetch");
    expect(screen.queryByTestId("play-answer")).toBeNull();
  });
});

describe("Documentation", () => {
  const show = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ApiDocs url={url} />
      </QueryClientProvider>,
    );
  const types = 'export type Lang = "ar" | "en" | "he";\nexport type PostsRow<T = Words> = Row<PostsValues<T>>;\n';

  beforeEach(() => {
    m.getDocs.mockResolvedValue({ tables: 2, openapi: { openapi: "3.1.0", servers: [{ url: "/v1/data" }], paths: { "/posts": {} } }, types, openapiPath: "/v1/data/openapi.json" });
    // The browser's own way of handing over a file, watched: what was made, and under what name.
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: (blob: Blob) => (void blob.text().then((text) => m.files.push({ name: "", text })), "blob:made"), revokeObjectURL: () => {} }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      void Promise.resolve().then(() => m.files.length && (m.files[m.files.length - 1].name = this.download));
    });
  });

  test("says where the document is, and hands over the file and the types", async () => {
    show();
    expect((await screen.findByTestId("docs-address")).textContent).toBe(`${url}/openapi.json`);
    // The types are there to look at, to copy, and to keep as a file.
    expect(screen.queryByTestId("docs-types")).toBeNull();
    fireEvent.click(screen.getByTestId("docs-show-types"));
    expect(screen.getByTestId("docs-types").textContent).toBe(types);
    fireEvent.click(screen.getByTestId("docs-copy-types"));
    await waitFor(() => expect(m.copied).toEqual([types]));
    fireEvent.click(screen.getByTestId("docs-download-openapi"));
    await waitFor(() => expect(m.files).toHaveLength(1));
    await waitFor(() => expect(m.files[0].name).toBe("openapi.json"));
    // The file names the API's whole address, so a tool that opens it knows where to call.
    expect(JSON.parse(m.files[0].text)).toEqual({ openapi: "3.1.0", servers: [{ url }], paths: { "/posts": {} } });
    fireEvent.click(screen.getByTestId("docs-download-types"));
    await waitFor(() => expect(m.files).toHaveLength(2));
    await waitFor(() => expect(m.files[1]).toEqual({ name: "data-api.d.ts", text: types }));
  });

  test("with nothing open there is nothing to document yet", async () => {
    m.getDocs.mockResolvedValue({ tables: 0, openapi: {}, types: "", openapiPath: "/v1/data/openapi.json" });
    show();
    expect((await screen.findByTestId("docs-empty")).textContent).toContain("No table is open yet");
    expect(screen.queryByTestId("docs-download-openapi")).toBeNull();
  });
});
