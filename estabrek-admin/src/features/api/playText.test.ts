import { describe, expect, test } from "vitest";
import type { ApiTable, TableAccess } from "../../api/dataApi.api";
import { curlOf, keyNeeded, openApiFile, playActs, playRequest, playTables, prettyBody, sampleBody, statusWords, type PlayDraft } from "./playText";

// "جرّب طلب": a request put together from the form, as the outside would send it.

const closed: TableAccess = { read: "off", create: "off", update: "off", delete: "off" };
const table = (access: Partial<TableAccess>, slug = "posts"): ApiTable => ({
  id: `t-${slug}`,
  slug,
  name: { en: slug },
  access: { ...closed, ...access },
  open: Object.values({ ...closed, ...access }).some((w) => w !== "off"),
  fields: [
    { id: "title", type: "text", name: null, required: true },
    { id: "price", type: "number", name: null, required: false },
    { id: "tag", type: "select", name: null, required: false, options: [{ id: "news", name: null }] },
  ],
});
const url = "https://api.shop.test/v1/data";
const draft = (over: Partial<PlayDraft> = {}): PlayDraft => ({ act: "list", row: "", query: "", body: "", key: "", ...over });
const made = (t: ApiTable, d: PlayDraft) => playRequest(t, d, url, "en");

describe("What can be tried", () => {
  test("only open tables, and of each only what it lets the outside do", () => {
    const all = [table({ read: "public", create: "key" }), table({}, "notes"), table({ delete: "key" }, "old")];
    expect(playTables(all).map((t) => t.slug)).toEqual(["posts", "old"]);
    expect(playActs(all[0])).toEqual(["list", "one", "create"]);
    expect(playActs(all[2])).toEqual(["delete"]);
    expect(playActs(table({ read: "key", create: "public", update: "key", delete: "key" }))).toEqual(["list", "one", "create", "update", "delete"]);
    expect(keyNeeded(all[0], "list")).toBe(false);
    expect(keyNeeded(all[0], "create")).toBe(true);
  });

  test("a body to start from: the fields a row needs, each with a value of its kind", () => {
    expect(JSON.parse(sampleBody(table({})))).toEqual({ values: { title: "…" } });
    const loose = { fields: table({}).fields.map((f) => ({ ...f, required: false })) };
    expect(JSON.parse(sampleBody(loose))).toEqual({ values: { title: "…", price: 10 } });
    expect(sampleBody(table({}))).toContain("\n");
  });
});

describe("The request the form describes", () => {
  const t = table({ read: "public", create: "public", update: "key", delete: "key" });

  test("a page of rows: the table's address and what follows the question mark, with a key only when one is given", () => {
    expect(made(t, draft({ query: "pageSize=5&price[gte]=10" }))).toEqual({ request: { method: "GET", url: `${url}/posts?pageSize=5&price[gte]=10`, headers: {} } });
    expect(made(t, draft({ query: "  ?sort=-price " }))).toEqual({ request: { method: "GET", url: `${url}/posts?sort=-price`, headers: {} } });
    expect(made(t, draft({ key: " ek_abc " }))).toEqual({ request: { method: "GET", url: `${url}/posts`, headers: { "X-Api-Key": "ek_abc" } } });
  });

  test("one row, a new row, a change, a delete", () => {
    expect(made(t, draft({ act: "one", row: " first ", query: "ignored=1" }))).toEqual({ request: { method: "GET", url: `${url}/posts/first`, headers: {} } });
    expect(made(t, draft({ act: "one", row: "a b/c" }))).toMatchObject({ request: { url: `${url}/posts/a%20b%2Fc` } });
    expect(made(t, draft({ act: "create", body: '{ "values": { "title": "Hi" } }' }))).toEqual({ request: { method: "POST", url: `${url}/posts`, headers: { "Content-Type": "application/json" }, body: '{"values":{"title":"Hi"}}' } });
    expect(made(t, draft({ act: "update", row: "first", key: "ek_k", body: '{"values":{"price":3}}' }))).toEqual({ request: { method: "PATCH", url: `${url}/posts/first`, headers: { "Content-Type": "application/json", "X-Api-Key": "ek_k" }, body: '{"values":{"price":3}}' } });
    expect(made(t, draft({ act: "delete", row: "first", key: "ek_k" }))).toEqual({ request: { method: "DELETE", url: `${url}/posts/first`, headers: { "X-Api-Key": "ek_k" } } });
  });

  test("what's missing is said before anything is sent", () => {
    expect(made(t, draft({ act: "update", row: "first", body: "{}" }))).toEqual({ problem: "This needs a key: paste one of your keys" });
    expect(made(t, draft({ act: "one" }))).toEqual({ problem: "Write the row's address or id" });
    for (const body of ["", "{ values: }", "[1]", '"words"', "null"]) expect(made(t, draft({ act: "create", body })), body).toEqual({ problem: 'The values have to be JSON, like {"values": {…}}' });
    expect(playRequest(t, draft({ act: "one" }), url, "ar")).toEqual({ problem: "اكتب عنوان السطر أو رقمه" });
  });

  test("the same request for a terminal never writes the key out", () => {
    const patch = made(t, draft({ act: "update", row: "first", key: "ek_the-real-secret", body: `{"values":{"title":"it's"}}` }));
    if (!("request" in patch)) throw new Error("no request");
    expect(curlOf(patch.request)).toBe(`curl -X PATCH "${url}/posts/first" -H "Content-Type: application/json" -H "X-Api-Key: ek_…" -d '{"values":{"title":"it'\\''s"}}'`);
    expect(curlOf(patch.request)).not.toContain("real-secret");
    expect(curlOf({ method: "GET", url: `${url}/posts`, headers: {} })).toBe(`curl "${url}/posts"`);
  });
});

describe("The answer", () => {
  test("JSON is laid out to read; anything else is shown as it came", () => {
    expect(prettyBody('{"a":1,"b":[2]}')).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
    expect(prettyBody("<html>502</html>")).toBe("<html>502</html>");
    expect(prettyBody("")).toBe("");
  });

  test("a status in a word, in the three languages", () => {
    expect(statusWords(200, "en")).toBe("OK");
    expect(statusWords(201, "ar")).toBe("تمام");
    expect(statusWords(401, "en")).toBe("A key is needed, or this one doesn't work");
    expect(statusWords(403, "en")).toContain("Not allowed");
    expect(statusWords(404, "he")).toBe("אין טבלה או שורה כזו");
    expect(statusWords(429, "en")).toBe("Too many requests: wait a little");
    expect(statusWords(502, "en")).toBe("The server couldn't answer");
  });
});

test("the OpenAPI file to keep names the API's whole address", () => {
  const file = openApiFile({ openapi: "3.1.0", servers: [{ url: "/v1/data" }], paths: { "/": {} } }, url);
  expect(JSON.parse(file)).toEqual({ openapi: "3.1.0", servers: [{ url }], paths: { "/": {} } });
  expect(file.endsWith("}\n")).toBe(true);
  expect(JSON.parse(openApiFile(null, url))).toEqual({ servers: [{ url }] });
});
