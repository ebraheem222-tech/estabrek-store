import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import type { KeyLite } from "../lib/apiKeys.js";
import { docName, openApi, shownFields, typeNames, typesText } from "../lib/apiDocs.js";
import { accessOf, docTables, type ApiTable, type DocTable } from "../lib/dataApi.js";

// The automatic API described (B4): an OpenAPI document and TypeScript types made from the tables'
// own fields. A caller's document says only what that caller could call.

const postFields: Field[] = [
  { id: "title", type: "text", name: { en: "Title", ar: "العنوان" }, required: true },
  { id: "body", type: "longText" },
  { id: "price", type: "money", currency: "ILS", min: 0, max: 5000 },
  { id: "tag", type: "select", options: [{ id: "news" }, { id: "guide" }] },
  { id: "labels", type: "multiSelect", options: [{ id: "new" }, { id: "sale" }] },
  { id: "email", type: "email", unique: true },
  { id: "day", type: "date" },
  { id: "at", type: "datetime" },
  { id: "live", type: "boolean" },
  { id: "where", type: "location" },
  { id: "extra", type: "json" },
  { id: "cover", type: "image" },
  { id: "author", type: "relation", to: "t-authors" },
  { id: "secret", type: "relation", to: "t-vault", many: true },
];
const table = (id: string, slug: string, fields: Field[], access: Record<string, string>, name: unknown = { en: slug }, hidden: string[] = []): ApiTable => ({ id, slug, name, fields, access: accessOf({ read: "off", create: "off", update: "off", delete: "off", ...access }), private: hidden });
const all = [
  table("t-posts", "demo-posts", postFields, { read: "public", create: "key", update: "key", delete: "key" }, { ar: "المقالات", en: "Posts" }),
  table("t-authors", "authors", [{ id: "name", type: "text", required: true }], { read: "key" }),
  table("t-forms", "contact-forms", [{ id: "name", type: "text", required: true }, { id: "message", type: "longText" }], { create: "public" }),
  table("t-vault", "vault-notes", [{ id: "title", type: "text" }], {}),
];
const key = (tables: "*" | string[], acts: KeyLite["scopes"]["acts"]): KeyLite => ({ id: "k", name: "k", prefix: "ek_x", scopes: { tables, acts }, perMinute: 60, revokedAt: null, expiresAt: null });
const whole = key("*", ["read", "create", "update", "delete"]);
type Doc = { openapi: string; servers: Array<{ url: string }>; tags: Array<{ name: string }>; paths: Record<string, Record<string, any>>; components: { schemas: Record<string, any>; parameters: Record<string, any>; responses: Record<string, any>; securitySchemes: Record<string, any> } };
const doc = (k: KeyLite | null) => openApi(docTables(all, k), { server: "/v1/data" }) as Doc;

describe("The tables a caller's documents describe", () => {
  test("anyone: what is open to everyone, and only the acts that are", () => {
    const tables = docTables(all, null);
    expect(tables.map((t) => t.slug)).toEqual(["demo-posts", "contact-forms"]);
    expect(tables[0].acts).toEqual({ read: "public", create: null, update: null, delete: null });
    expect(tables[1].acts).toEqual({ read: null, create: "public", update: null, delete: null });
    // The authors are open to keys only, the other table to nobody: anyone sees neither relation.
    expect([...tables[0].links]).toEqual([]);
    expect(shownFields(tables[0]).map((f) => f.id)).not.toContain("author");
  });

  test("a key: what it reaches, each act by how the table lets it in; a closed table is never there", () => {
    const tables = docTables(all, whole);
    expect(tables.map((t) => t.slug)).toEqual(["demo-posts", "authors", "contact-forms"]);
    expect(tables[0].acts).toEqual({ read: "public", create: "key", update: "key", delete: "key" });
    expect(tables[1].acts).toEqual({ read: "key", create: null, update: null, delete: null });
    expect([...tables[0].links]).toEqual(["author"]);
    // A key for the posts alone reads them, and still doesn't see who wrote them.
    const narrow = docTables(all, key(["t-posts"], ["read", "create"]));
    expect(narrow.map((t) => t.slug)).toEqual(["demo-posts", "contact-forms"]);
    expect(narrow[0].acts).toEqual({ read: "public", create: "key", update: null, delete: null });
    expect([...narrow[0].links]).toEqual([]);
  });
});

describe("The OpenAPI document", () => {
  test("has a path for each thing the caller may do, and no more", () => {
    const anyone = doc(null);
    expect(anyone.openapi).toBe("3.1.0");
    expect(anyone.servers).toEqual([{ url: "/v1/data" }]);
    expect(Object.keys(anyone.paths)).toEqual(["/", "/demo-posts", "/demo-posts/{row}", "/contact-forms"]);
    expect(Object.keys(anyone.paths["/demo-posts"])).toEqual(["get"]);
    expect(Object.keys(anyone.paths["/demo-posts/{row}"])).toEqual(["get"]);
    expect(Object.keys(anyone.paths["/contact-forms"])).toEqual(["post"]);
    expect(JSON.stringify(anyone)).not.toContain("authors");
    expect(JSON.stringify(anyone)).not.toContain("vault");
    expect(JSON.stringify(doc(whole))).not.toContain("vault");
    const full = doc(whole);
    expect(Object.keys(full.paths)).toEqual(["/", "/demo-posts", "/demo-posts/{row}", "/authors", "/authors/{row}", "/contact-forms"]);
    expect(Object.keys(full.paths["/demo-posts"])).toEqual(["get", "post"]);
    expect(Object.keys(full.paths["/demo-posts/{row}"])).toEqual(["get", "patch", "delete"]);
    expect(full.tags.map((t) => t.name)).toEqual(["demo-posts", "authors", "contact-forms"]);
    // Every operation has its own id.
    const ids = Object.values(full.paths).flatMap((p) => Object.values(p).map((op) => op.operationId));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["listTables", "listDemoPosts", "addDemoPosts", "getDemoPosts", "changeDemoPosts", "deleteDemoPosts", "listAuthors", "getAuthors", "addContactForms"]);
  });

  test("says how each act is entered: a key in a header, or anyone", () => {
    const full = doc(whole);
    expect(full.components.securitySchemes.apiKey).toMatchObject({ type: "apiKey", in: "header", name: "X-Api-Key" });
    // Open to everyone: a key is optional. With a key only: it is required.
    expect(full.paths["/demo-posts"].get.security).toEqual([{}, { apiKey: [] }]);
    expect(full.paths["/demo-posts"].post.security).toEqual([{ apiKey: [] }]);
    expect(full.paths["/demo-posts/{row}"].delete.security).toEqual([{ apiKey: [] }]);
    expect(full.paths["/contact-forms"].post.security).toEqual([{}, { apiKey: [] }]);
    expect(full.paths["/contact-forms"].post.description).toContain("Without a key the row is a draft, and up to 10 rows a minute");
    expect(full.paths["/demo-posts"].post.description).not.toContain("draft");
  });

  test("a list's questions: its parameters, and a table of what each column can be asked", () => {
    const list = doc(whole).paths["/demo-posts"].get;
    // Everyone reads this table: a signed-in shopper may ask for their own rows of it.
    expect(list.parameters.map((p: { $ref: string }) => p.$ref.split("/").pop())).toEqual(["page", "pageSize", "sort", "search", "lang", "status", "fields", "expand", "match", "mine"]);
    expect(doc(whole).paths["/authors"].get.parameters.map((p: { $ref: string }) => p.$ref.split("/").pop())).not.toContain("mine");
    // A table with no relation the caller sees has nothing to expand.
    expect(doc(null).paths["/demo-posts"].get.parameters.map((p: { $ref: string }) => p.$ref.split("/").pop())).not.toContain("expand");
    expect(list.description).toContain("| `price` | is, isNot, gt, gte, lt, lte, between, empty, notEmpty |");
    expect(list.description).toContain("| `labels` | anyOf, empty, notEmpty |");
    expect(list.description).toContain("| `author` | anyOf, empty, notEmpty |");
    expect(list.description).toContain("| `slug` | contains, is, startsWith |");
    expect(list.description).not.toContain("`secret`");
    expect(doc(whole).components.parameters.pageSize.schema).toEqual({ type: "integer", minimum: 1, maximum: 100, default: 25 });
  });

  test("a table's rows by its own fields: each kind's shape, its choices and limits, null where empty", () => {
    const s = doc(whole).components.schemas;
    const v = s.DemoPostsValues.properties;
    expect(Object.keys(v)).toEqual(["title", "body", "price", "tag", "labels", "email", "day", "at", "live", "where", "extra", "cover", "author"]);
    expect(v.title.oneOf).toEqual([{ oneOf: [{ $ref: "#/components/schemas/Words" }, { type: "string" }] }, { type: "null" }]);
    expect(v.title.description).toBe("Title. Words by language; one string when `lang` is asked.");
    expect(v.price.oneOf[0]).toEqual({ type: "number", minimum: 0, maximum: 5000 });
    expect(v.tag.oneOf[0]).toEqual({ type: "string", enum: ["news", "guide"] });
    expect(v.labels.oneOf[0]).toEqual({ type: "array", items: { type: "string", enum: ["new", "sale"] } });
    expect(v.email).toMatchObject({ oneOf: [{ type: "string", format: "email" }, { type: "null" }], description: "Unique in the table." });
    expect(v.day.oneOf[0]).toEqual({ type: "string", format: "date" });
    expect(v.at.oneOf[0]).toEqual({ type: "string", format: "date-time" });
    expect(v.live.oneOf[0]).toEqual({ type: "boolean" });
    expect(v.where.oneOf[0]).toEqual({ $ref: "#/components/schemas/Place" });
    expect(v.extra).toEqual({ description: "Any JSON." });
    expect(v.cover.oneOf[0]).toEqual({ type: "string" });
    expect(v.author.type).toBe("array");
    expect(s.DemoPostsRow.required).toEqual(["id", "slug", "status", "values", "createdAt", "updatedAt", "publishedAt"]);
    expect(s.DemoPostsPage.properties.data).toEqual({ type: "array", items: { $ref: "#/components/schemas/DemoPostsRow" } });
    // Every $ref in the document points at something in it.
    const text = JSON.stringify(doc(whole));
    const refs = [...text.matchAll(/"\$ref":"#\/components\/(schemas|parameters|responses)\/([A-Za-z0-9]+)"/g)];
    expect(refs.length).toBeGreaterThan(30);
    for (const [, part, name] of refs) expect(doc(whole).components[part as "schemas"][name], `${part}/${name}`).toBeDefined();
  });

  test("what a write takes: the required fields named, plain words or words by language, rows to link by address", () => {
    const s = doc(whole).components.schemas;
    const create = s.DemoPostsCreate;
    expect(create.required).toEqual(["values"]);
    expect(create.properties.values.required).toEqual(["title"]);
    expect(create.properties.values.additionalProperties).toBe(false);
    expect(create.properties.values.properties.title.oneOf).toEqual([{ type: "string", description: "Goes to the language in `lang` (ar when not given)." }, { $ref: "#/components/schemas/Words" }]);
    expect(create.properties.values.properties.price).toEqual({ type: "number", minimum: 0, maximum: 5000 });
    expect(create.properties.values.properties.author).toMatchObject({ type: "array", items: { type: "string" } });
    expect(Object.keys(create.properties)).toEqual(["values", "slug", "status", "lang"]);
    // A change needs nothing in particular.
    expect(s.DemoPostsChange.required).toBeUndefined();
    expect(s.DemoPostsChange.properties.values.required).toBeUndefined();
    // A table only read has no write shapes; a table only written has no page.
    expect(s.AuthorsCreate).toBeUndefined();
    expect(s.AuthorsChange).toBeUndefined();
    expect(s.ContactFormsPage).toBeUndefined();
    expect(s.ContactFormsCreate.properties.values.required).toEqual(["name"]);
    expect(doc(null).components.schemas.DemoPostsCreate).toBeUndefined();
  });

  test("names: one for each table even when two addresses would make the same; a name to read from what there is", () => {
    expect([...typeNames(["demo-posts", "demoposts", "demo--posts", "2024-plans", "a"]).entries()]).toEqual([["demo-posts", "DemoPosts"], ["demoposts", "Demoposts"], ["demo--posts", "DemoPosts2"], ["2024-plans", "T2024Plans"], ["a", "A"]]);
    expect(docName({ ar: "المقالات", en: "Posts" }, "posts")).toBe("Posts");
    expect(docName({ ar: "المقالات" }, "posts")).toBe("المقالات");
    expect(docName({ en: "  " }, "posts")).toBe("posts");
    expect(docName(null, "posts")).toBe("posts");
  });
});

describe("The TypeScript types", () => {
  const types = (k: KeyLite | null) => typesText(docTables(all, k), { server: "/v1/data" });

  test("a table's rows and what a new row takes, from its own fields", () => {
    const text = types(whole);
    expect(text).toContain('export type Lang = "ar" | "en" | "he";');
    expect(text).toContain("export type Row<V> = { id: string; slug: string; status: Status; values: V; createdAt: string; updatedAt: string; publishedAt: string | null };");
    expect(text).toContain("/** Posts: /v1/data/demo-posts */");
    expect(text).toContain(
      [
        "export type DemoPostsValues<T = Words> = {",
        "  title: T | null;",
        "  body: T | null;",
        "  price: number | null;",
        '  tag: "news" | "guide" | null;',
        '  labels: Array<"new" | "sale"> | null;',
        "  email: string | null;",
        "  day: string | null;",
        "  at: string | null;",
        "  live: boolean | null;",
        "  where: Place | null;",
        "  extra: unknown;",
        "  cover: string | null;",
        "  author: LinkedRow<T>[];",
        "};",
      ].join("\n"),
    );
    expect(text).toContain("export type DemoPostsRow<T = Words> = Row<DemoPostsValues<T>>;");
    // The required field first and without a question mark; the rest may be left out or emptied.
    expect(text).toContain(["export type DemoPostsInput = {", "  title: string | Words;", "  body?: string | Words | null;", "  price?: number | null;", '  tag?: "news" | "guide" | null;'].join("\n"));
    expect(text).toContain("  author?: string[] | null;");
    expect(text).not.toContain("secret");
    // Only read: no input type. Never the closed table.
    expect(text).toContain("export type AuthorsRow<T = Words>");
    expect(text).not.toContain("AuthorsInput");
    expect(text).not.toContain("Vault");
    expect(text.endsWith("};\n")).toBe(true);
  });

  test("for anyone: only what is open to everyone", () => {
    const text = types(null);
    expect(text).toContain("export type DemoPostsValues<T = Words>");
    expect(text).not.toContain("DemoPostsInput");
    expect(text).not.toContain("author");
    expect(text).not.toContain("Authors");
    expect(text).toContain("export type ContactFormsInput = {\n  name: string | Words;\n  message?: string | Words | null;\n};");
  });

  test("a name that would end a comment doesn't", () => {
    const odd: DocTable = { slug: "odd", name: { en: "a */ b" }, fields: [{ id: "title", type: "text" }], acts: { read: "public", create: null, update: null, delete: null }, links: new Set() };
    const text = typesText([odd], { server: "/v1/data" });
    expect(text).toContain("/** a * / b: /v1/data/odd */");
    expect(text.match(/\*\//g)).toHaveLength((text.match(/\/\*\*/g) ?? []).length);
  });
});

describe("A shopper's own rows, and fields that are a key's alone", () => {
  const fields: Field[] = [
    { id: "title", type: "text", required: true },
    { id: "details", type: "longText" },
    { id: "staffNote", type: "text", required: true },
  ];
  const tables = [
    table("t-req", "requests", fields, { read: "customer", create: "customer", update: "customer", delete: "customer" }, { en: "Requests" }, ["staffNote"]),
    table("t-rev", "reviews", fields, { read: "public", create: "customer" }, { en: "Reviews" }, ["staffNote"]),
  ];
  const ids = (t: DocTable) => ({ read: t.fields.map((f) => f.id), write: (t.writeFields ?? t.fields).map((f) => f.id) });

  test("anyone sees only what everyone reads; a shopper also what is theirs; a key everything", () => {
    const anyone = docTables(tables, null);
    expect(anyone.map((t) => t.slug)).toEqual(["reviews"]);
    expect(anyone[0].acts).toEqual({ read: "public", create: null, update: null, delete: null });
    const shopper = docTables(tables, null, "u1");
    expect(shopper.map((t) => t.slug)).toEqual(["requests", "reviews"]);
    expect(shopper[0].acts).toEqual({ read: "customer", create: "customer", update: "customer", delete: "customer" });
    expect(shopper[1].acts).toEqual({ read: "public", create: "customer", update: null, delete: null });
    // The private field isn't a shopper's to see or to write; a key has it both ways.
    expect(ids(shopper[0])).toEqual({ read: ["title", "details"], write: ["title", "details"] });
    expect(ids(docTables(tables, whole)[0])).toEqual({ read: ["title", "details", "staffNote"], write: ["title", "details", "staffNote"] });
    // A key that only adds reviews: it writes the private field, and is answered as anyone is.
    const adder = docTables(tables, key(["t-rev"], ["create"]))[0];
    expect(adder.acts).toEqual({ read: "public", create: "customer", update: null, delete: null });
    expect(ids(adder)).toEqual({ read: ["title", "details"], write: ["title", "details", "staffNote"] });
  });

  test("the document says a shopper's token gets in, and keeps the private field out of a shopper's shapes", () => {
    const mine = openApi(docTables(tables, null, "u1"), { server: "/v1/data" }) as Doc;
    expect(mine.components.securitySchemes.shopper).toMatchObject({ type: "http", scheme: "bearer" });
    expect(mine.paths["/requests"].get.security).toEqual([{ shopper: [] }, { apiKey: [] }]);
    expect(mine.paths["/requests/{row}"].patch.security).toEqual([{ shopper: [] }, { apiKey: [] }]);
    expect(mine.paths["/requests"].get.description).toContain("their own rows only");
    expect(mine.paths["/reviews"].get.security).toEqual([{}, { apiKey: [] }]);
    expect(Object.keys(mine.components.schemas.RequestsValues.properties)).toEqual(["title", "details"]);
    expect(Object.keys(mine.components.schemas.RequestsCreate.properties.values.properties)).toEqual(["title", "details"]);
    // Its required private field isn't asked of a shopper (the row gets the field's default, or the owner fills it).
    expect(mine.components.schemas.RequestsCreate.properties.values.required).toEqual(["title"]);
    expect(JSON.stringify(mine)).not.toContain("staffNote");
    const full = openApi(docTables(tables, whole), { server: "/v1/data" }) as Doc;
    expect(Object.keys(full.components.schemas.RequestsValues.properties)).toEqual(["title", "details", "staffNote"]);
    expect(full.components.schemas.RequestsCreate.properties.values.required).toEqual(["title", "staffNote"]);
    const types = typesText(docTables(tables, null, "u1"), { server: "/v1/data" });
    expect(types).toContain("export type RequestsInput = {\n  title: string | Words;\n  details?: string | Words | null;\n};");
    expect(types).not.toContain("staffNote");
    expect(typesText(docTables(tables, whole), { server: "/v1/data" })).toContain("  staffNote: string | Words;");
  });
});
