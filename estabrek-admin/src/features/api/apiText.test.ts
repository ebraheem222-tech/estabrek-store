import { describe, expect, test } from "vitest";
import type { ApiField, ApiTable, TableAccess } from "../../api/dataApi.api";
import { accessLine, accessWarnings, agoWords, draftBody, draftOf, draftProblem, examples, fullUrl, nameOf, newDraft, sampleValue, scopesLine, whoChoices } from "./apiText";

// الـ API والمفاتيح: the page's words and small sums.

const closed: TableAccess = { read: "off", create: "off", update: "off", delete: "off" };
const fields: ApiField[] = [
  { id: "title", type: "text", name: { en: "Title" }, required: true },
  { id: "price", type: "number", name: null, required: false },
  { id: "tag", type: "select", name: null, required: true, options: [{ id: "new", name: null }] },
  { id: "author", type: "relation", name: null, required: false, many: false },
];
const table = (access: Partial<TableAccess> = {}, over: Partial<ApiTable> = {}): ApiTable => ({ id: "t1", slug: "posts", name: { en: "Posts", ar: "المقالات" }, access: { ...closed, ...access }, open: Object.values({ ...closed, ...access }).some((w) => w !== "off"), fields, ...over });
const limits = { name: 80, tables: 200, keys: 100, perMinute: { min: 1, max: 1000, default: 60 }, pageSize: 100, publicWritesPerMinute: 10 };

describe("A table's access, in words", () => {
  test("changing and deleting are never offered to everyone", () => {
    expect(whoChoices("read")).toEqual(["off", "key", "public"]);
    expect(whoChoices("create")).toEqual(["off", "key", "public"]);
    expect(whoChoices("update")).toEqual(["off", "key"]);
    expect(whoChoices("delete")).toEqual(["off", "key"]);
  });

  test("one line says what the outside can do, in the three languages", () => {
    expect(accessLine(closed, "en")).toBe("Closed: nothing outside reaches it");
    expect(accessLine(closed, "ar")).toBe("مسكّر: ما حدا من برّا بيوصله");
    expect(accessLine({ read: "public", create: "key", update: "off", delete: "key" }, "en")).toBe("Reading: Everyone · Adding: With a key · Deleting: With a key");
    expect(accessLine({ ...closed, read: "key" }, "he")).toBe("קריאה: עם מפתח");
  });

  test("what is open to everyone is said plainly", () => {
    expect(accessWarnings(closed, limits, "en")).toEqual([]);
    expect(accessWarnings({ ...closed, read: "key", create: "key" }, limits, "en")).toEqual([]);
    const both = accessWarnings({ ...closed, read: "public", create: "public" }, limits, "en");
    expect(both).toEqual(["Anyone can read every field of this table's published rows, without a key.", "Anyone can add rows without a key. They arrive as drafts, up to 10 a minute from one place."]);
    expect(accessWarnings({ ...closed, create: "public" }, { publicWritesPerMinute: 4 }, "ar")[0]).toContain("لحد 4 بالدقيقة");
  });

  test("a name in the admin's language, another one when it has none, the address last", () => {
    expect(nameOf({ en: "Posts", ar: "المقالات" }, "posts", "ar")).toBe("المقالات");
    expect(nameOf({ en: "Posts" }, "posts", "he")).toBe("Posts");
    expect(nameOf({ en: " " }, "posts", "en")).toBe("posts");
    expect(nameOf(null, "posts", "en")).toBe("posts");
  });
});

describe("A key, in words", () => {
  const tables = [table(), table({}, { id: "t2", slug: "notes", name: { en: "Notes" } })];

  test("what it reaches", () => {
    expect(scopesLine({ tables: "*", acts: ["read", "create"] }, tables, "en")).toBe("Every table: read, add");
    expect(scopesLine({ tables: "*", acts: ["delete", "read"] }, tables, "ar")).toBe("كل الجداول: يقرأ، يحذف");
    expect(scopesLine({ tables: ["t2", "t1"], acts: ["read"] }, tables, "en")).toBe("Notes, Posts: read");
    // A table deleted since: said, not hidden.
    expect(scopesLine({ tables: ["t1", "gone", "gone2"], acts: ["update"] }, tables, "en")).toBe("Posts, a deleted table ×2: change");
    expect(scopesLine({ tables: [], acts: ["read"] }, tables, "en")).toBe("No table: read");
  });

  test("when it was last used", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    expect(agoWords(null, now, "en")).toBe("Never used");
    expect(agoWords("2026-11-15T11:59:30Z", now, "en")).toBe("Just now");
    expect(agoWords("2026-11-15T11:40:00Z", now, "en")).toBe("20 min ago");
    expect(agoWords("2026-11-15T09:00:00Z", now, "ar")).toBe("قبل 3 ساعة");
    expect(agoWords("2026-11-12T12:00:00Z", now, "he")).toBe("לפני 3 ימים");
  });

  test("its form: a new one starts by reading every table; an old one opens as it is", () => {
    expect(newDraft(limits)).toEqual({ name: "", all: true, tables: [], acts: ["read"], perMinute: "60", expires: "" });
    const draft = draftOf({ name: "ERP", scopes: { tables: ["t1"], acts: ["delete", "read"] }, perMinute: 90, expiresAt: "2026-12-31T23:59:59.999Z" });
    expect(draft).toEqual({ name: "ERP", all: false, tables: ["t1"], acts: ["read", "delete"], perMinute: "90", expires: "2026-12-31" });
    expect(draftBody(draft)).toEqual({ name: "ERP", scopes: { tables: ["t1"], acts: ["read", "delete"] }, perMinute: 90, expiresAt: "2026-12-31" });
    expect(draftBody({ ...draft, name: "  ERP  ", all: true, expires: "" })).toEqual({ name: "ERP", scopes: { tables: "*", acts: ["read", "delete"] }, perMinute: 90, expiresAt: null });
  });

  test("its form says what's missing before anything is sent", () => {
    const ok = { name: "ERP", all: true, tables: [], acts: ["read" as const], perMinute: "60", expires: "" };
    const why = (over: object) => draftProblem({ ...ok, ...over }, limits, "2026-11-15", "en");
    expect(why({})).toBeNull();
    expect(why({ name: "  " })).toBe("Give the key a name (the accounting program, say)");
    expect(why({ name: "x".repeat(81) })).toBe("The name is too long");
    expect(why({ acts: [] })).toBe("Choose what the key may do");
    expect(why({ all: false })).toBe("Choose at least one table, or every table");
    expect(why({ all: false, tables: ["t1"] })).toBeNull();
    for (const perMinute of ["", "0", "1001", "2.5", "many"]) expect(why({ perMinute }), perMinute).toBe("Requests a minute: a number from 1 to 1000");
    expect(why({ expires: "2026-11-15" })).toBe("The day the key ends has to be after today");
    expect(why({ expires: "2026-11-16" })).toBeNull();
  });
});

describe("How to call a table", () => {
  const url = "https://api.shop.test/v1/data";

  test("the whole address from the server's own and where the routes start", () => {
    expect(fullUrl("/v1/data", "https://api.shop.test/v1", "https://admin.shop.test")).toBe(url);
    expect(fullUrl("/v1/data", "https://api.shop.test/v1/", "https://admin.shop.test")).toBe(url);
    // The admin and the API on one address (a local run).
    expect(fullUrl("/v1/data", "/v1", "http://localhost:5173")).toBe("http://localhost:5173/v1/data");
    expect(fullUrl("/v1/data", "::bad::", "nowhere")).toBe("/v1/data");
  });

  test("a closed table has no examples; an open one has one for each thing it lets the outside do", () => {
    expect(examples(table(), url, "en")).toEqual([]);
    const all = examples(table({ read: "public", create: "public", update: "key", delete: "key" }), url, "en");
    expect(all.map((e) => e.id)).toEqual(["read", "one", "create", "update", "delete"]);
    // Open to everyone: no key in the request. With a key: its header, never the address.
    expect(all[0].code).toBe(`curl "${url}/posts?pageSize=10&sort=-createdAt&title[notEmpty]=1"`);
    expect(all[1].code).toBe(`curl "${url}/posts/row-address"`);
    expect(all[2].code).toBe(`curl -X POST "${url}/posts" -H "Content-Type: application/json" -d '{"values":{"title":"…","tag":"new"}}'`);
    expect(all[3].code).toBe(`curl -X PATCH "${url}/posts/row-address" -H "Content-Type: application/json" -H "X-Api-Key: ek_…" -d '{"values":{"title":"…","tag":"new"}}'`);
    expect(all[4].code).toBe(`curl -X DELETE "${url}/posts/row-address" -H "X-Api-Key: ek_…"`);
    expect(examples(table({ read: "key" }), url, "en").map((e) => e.code)).toEqual([`curl "${url}/posts?pageSize=10&sort=-createdAt&title[notEmpty]=1" -H "X-Api-Key: ek_…"`, `curl "${url}/posts/row-address" -H "X-Api-Key: ek_…"`]);
    expect(all.every((e) => !e.code.includes("ek_…") || e.code.includes('-H "X-Api-Key'))).toBe(true);
    // No required field: the first two stand in.
    const loose = examples(table({ create: "key" }, { fields: fields.map((f) => ({ ...f, required: false })) }), url, "en");
    expect(loose[0].code).toContain(`-d '{"values":{"title":"…","price":10}}'`);
  });

  test("a value of each kind, as its field takes it", () => {
    const of = (type: ApiField["type"], more: Partial<ApiField> = {}) => sampleValue({ id: "f", type, name: null, required: false, ...more });
    expect(of("number")).toBe(10);
    expect(of("boolean")).toBe(true);
    expect(of("date")).toBe("2026-12-31");
    expect(of("multiSelect", { options: [{ id: "a", name: null }] })).toEqual(["a"]);
    expect(of("select")).toBe("…");
    expect(of("relation")).toEqual(["row-address"]);
    expect(of("location")).toEqual({ lat: 31.77, lng: 35.21 });
    expect(of("image")).toBe("https://example.com/file");
  });
});
