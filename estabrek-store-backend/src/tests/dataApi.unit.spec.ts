import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import { hashKey, keyCovers, keyState, keyView, looksLikeKey, newSecret, scopesOf, ScopesSchema, type KeyLite } from "../lib/apiKeys.js";
import { AccessSchema, CLOSED, accessOf, allow, apiRow, asShown, columnOf, fieldView, isOpen, listAsk, mineAsked, privateOf, seenFields, shapeAsk, wordsIn, type LinkModes, type Viewer } from "../lib/dataApi.js";

// The automatic API (B4) without a database: a key and what is kept of it, who gets into a table
// and as what, a list's question read from an address, and a row as it is answered.

const refused = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return `${(e as { code?: string }).code}: ${(e as Error).message}`;
  }
  return "accepted";
};

describe("A key", () => {
  test("is made of random letters behind a mark; only its hash and first letters are for keeping", () => {
    const a = newSecret();
    const b = newSecret();
    expect(a.secret).toMatch(/^ek_[A-Za-z0-9_-]{32}$/);
    expect(a.secret).not.toBe(b.secret);
    expect(a.prefix).toBe(a.secret.slice(0, 8));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toBe(hashKey(a.secret));
    expect(a.hash).not.toContain(a.secret.slice(3));
    expect(looksLikeKey(a.secret)).toBe(true);
    // Someone else's token, a short guess, odd letters: not looked up at all.
    for (const v of ["eyJhbGciOiJIUzI1NiJ9.x.y", "ek_short", `ek_${"a".repeat(90)}`, "ek_abc def ghi jkl mno pqr", ""]) expect(looksLikeKey(v), v).toBe(false);
  });

  test("works until it is revoked or its day passes", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    expect(keyState({ revokedAt: null, expiresAt: null }, now)).toBe("active");
    expect(keyState({ revokedAt: null, expiresAt: new Date(now + 1) }, now)).toBe("active");
    expect(keyState({ revokedAt: null, expiresAt: new Date(now) }, now)).toBe("expired");
    expect(keyState({ revokedAt: new Date(now - 5), expiresAt: new Date(now + 5) }, now)).toBe("revoked");
  });

  test("reaches the tables and the acts it was given, and nothing else", () => {
    expect(keyCovers({ tables: "*", acts: ["read"] }, "t1", "read")).toBe(true);
    expect(keyCovers({ tables: "*", acts: ["read"] }, "t1", "create")).toBe(false);
    expect(keyCovers({ tables: ["t1"], acts: ["read", "delete"] }, "t1", "delete")).toBe(true);
    expect(keyCovers({ tables: ["t1"], acts: ["read", "delete"] }, "t2", "read")).toBe(false);
    // As kept: each act once and in order; what isn't scopes opens nothing.
    expect(scopesOf({ tables: ["a", "a", "b"], acts: ["delete", "read", "read"] })).toEqual({ tables: ["a", "b"], acts: ["read", "delete"] });
    for (const odd of [null, "x", { tables: "*" }, { tables: "*", acts: [] }, { tables: "all", acts: ["read"] }, { tables: "*", acts: ["drop"] }]) expect(keyCovers(scopesOf(odd), "t1", "read")).toBe(false);
    expect(ScopesSchema.safeParse({ tables: "*", acts: ["read"], more: 1 }).success).toBe(false);
  });

  test("is shown to the admin without the key itself or what is kept of it", () => {
    const at = new Date("2026-11-15T10:00:00Z");
    const view = keyView({ id: "k1", name: "ERP", prefix: "ek_Ab12c", hash: "h".repeat(64), scopes: { tables: "*", acts: ["read"] }, perMinute: 60, expiresAt: null, revokedAt: at, lastUsedAt: null, lastUsedIp: null, createdBy: "o@shop.test", createdAt: at, updatedAt: at } as never);
    expect(view).toMatchObject({ id: "k1", name: "ERP", prefix: "ek_Ab12c", state: "revoked", scopes: { tables: "*", acts: ["read"] } });
    expect(Object.keys(view)).not.toContain("hash");
    expect(JSON.stringify(view)).not.toContain("hhhh");
  });
});

describe("A table's access", () => {
  const key = (tables: "*" | string[], acts: KeyLite["scopes"]["acts"]): KeyLite => ({ id: "k", name: "k", prefix: "ek_x", scopes: { tables, acts }, perMinute: 60, revokedAt: null, expiresAt: null });

  test("is closed unless it says otherwise; changing and deleting are never for everyone", () => {
    for (const odd of [null, undefined, "public", {}, { read: "public" }, { read: "anyone", create: "off", update: "off", delete: "off" }]) expect(accessOf(odd)).toEqual(CLOSED);
    expect(isOpen(CLOSED)).toBe(false);
    const open = { read: "public", create: "key", update: "key", delete: "off" } as const;
    expect(accessOf(open)).toEqual(open);
    expect(isOpen(accessOf(open))).toBe(true);
    expect(AccessSchema.safeParse({ ...open, update: "public" }).success).toBe(false);
    expect(AccessSchema.safeParse({ ...open, delete: "public" }).success).toBe(false);
    // Kept wrong (by hand, by an older version): the whole table is closed, not half open.
    expect(accessOf({ ...open, delete: "public" })).toEqual(CLOSED);
  });

  test("who gets in, and as what", () => {
    const access = accessOf({ read: "public", create: "key", update: "key", delete: "off" });
    // Reading is for everyone: anyone sees published rows, a key that reaches the table sees all.
    expect(allow(access, "read", null, "t1")).toEqual({ as: "public" });
    expect(allow(access, "read", key("*", ["read"]), "t1")).toEqual({ as: "key" });
    // A key that doesn't reach it is still someone: published rows.
    expect(allow(access, "read", key(["t2"], ["read"]), "t1")).toEqual({ as: "public" });
    // Adding needs a key that may add here.
    expect(allow(access, "create", null, "t1")).toEqual({ no: "keyNeeded" });
    expect(allow(access, "create", key("*", ["read"]), "t1")).toEqual({ no: "keyLacks" });
    expect(allow(access, "create", key(["t2"], ["create"]), "t1")).toEqual({ no: "keyLacks" });
    expect(allow(access, "create", key(["t1"], ["create"]), "t1")).toEqual({ as: "key" });
    // Closed is closed, whatever the key.
    expect(allow(access, "delete", key("*", ["read", "create", "update", "delete"]), "t1")).toEqual({ no: "closed" });
  });
});

const fields: Field[] = [
  { id: "title", type: "text", required: true },
  { id: "price", type: "number" },
  { id: "tags", type: "multiSelect", options: [{ id: "new" }, { id: "sale" }] },
  // A field of the table's own wins over the row's column of the same name.
  { id: "status", type: "select", options: [{ id: "open" }] },
  { id: "author", type: "relation", to: "t-authors" },
  { id: "editors", type: "relation", to: "t-closed", many: true },
];

describe("A list's question", () => {
  test("with nothing asked: the first page of 25, every row a key may see, published ones for anyone", () => {
    expect(listAsk(fields, {}, "key")).toEqual({ q: { page: 1, pageSize: 25, lang: "ar", view: "all", sort: [], filters: [], match: "all" }, lang: null, pick: null, expand: [], shown: false });
    expect(listAsk(fields, {}, "public").q.view).toBe("published");
    expect(listAsk(fields, { status: "published" }, "public").q.view).toBe("published");
    expect(refused(() => listAsk(fields, { status: "draft" }, "public"))).toBe("BAD_QUERY: Only published rows are open without a key");
    expect(listAsk(fields, { status: "Draft" }, "key").q.view).toBe("draft");
    expect(refused(() => listAsk(fields, { status: "trash" }, "key"))).toContain("BAD_QUERY");
  });

  test("pages, order, search and language", () => {
    const ask = listAsk(fields, { page: "3", pageSize: "100", sort: "-price, title,-createdAt", search: " silk ", lang: "en", match: "any" }, "key");
    expect(ask.q).toMatchObject({ page: 3, pageSize: 100, search: "silk", lang: "en", match: "any", sort: [{ field: "price", dir: "desc" }, { field: "title", dir: "asc" }, { field: "$createdAt", dir: "desc" }] });
    expect(ask.lang).toBe("en");
    // The table has a field called status: that is what "status" sorts by; the row's own is "$status".
    expect(listAsk(fields, { sort: "status,$status,slug" }, "key").q.sort.map((s) => s.field)).toEqual(["status", "$status", "$slug"]);
    expect(columnOf([{ id: "title", type: "text" }], "status")).toBe("$status");
    for (const [query, why] of [
      [{ pageSize: "101" }, "pageSize: a whole number from 1 to 100"],
      [{ page: "0" }, "page: a whole number from 1 to 1000000"],
      [{ page: "1.5" }, "page: a whole number from 1 to 1000000"],
      [{ sort: "nope" }, 'No column "nope" to sort by'],
      [{ sort: "a,b,c,d".replace(/[abcd]/g, "price") }, "Up to 3 columns to sort by"],
      [{ lang: "fr" }, "lang: ar, en or he"],
      [{ match: "some" }, "match: all or any"],
    ] as const) expect(refused(() => listAsk(fields, query, "key"))).toBe(`BAD_QUERY: ${why}`);
  });

  test("filters are written field[question]=value; what isn't known is refused, never ignored", () => {
    const ask = listAsk(fields, { "price[gte]": "10", "title[contains]": "scarf", "tags[anyOf]": "new, sale", "price[between]": "5,50", "author[notEmpty]": "1", "publishedAt[gt]": "2026-01-01", "$slug[startsWith]": "a" }, "key");
    expect(ask.q.filters).toEqual([
      { field: "price", op: "gte", value: "10" },
      { field: "title", op: "contains", value: "scarf" },
      { field: "tags", op: "anyOf", value: ["new", "sale"] },
      { field: "price", op: "between", value: "5", value2: "50" },
      { field: "author", op: "notEmpty" },
      { field: "$publishedAt", op: "gt", value: "2026-01-01" },
      { field: "$slug", op: "startsWith", value: "a" },
    ]);
    // The same, as a server that reads addresses the nested way hands it over.
    expect(listAsk(fields, { price: { gte: "10", lt: "90" } }, "key").q.filters).toEqual([{ field: "price", op: "gte", value: "10" }, { field: "price", op: "lt", value: "90" }]);
    expect(refused(() => listAsk(fields, { "titel[contains]": "x" }, "key"))).toBe('BAD_QUERY: No column "titel" in this table');
    expect(refused(() => listAsk(fields, { "title[like]": "x" }, "key"))).toContain('BAD_QUERY: "like" isn\'t a question');
    expect(refused(() => listAsk(fields, { price: "10" }, "key"))).toContain('BAD_QUERY: "price" isn\'t something a list can be asked');
    expect(refused(() => listAsk(fields, { _: "123" }, "key"))).toContain("BAD_QUERY");
    const thirteen = Object.fromEntries([...["is", "isNot", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"].map((op) => [`price[${op}]`, "1"]), ...["contains", "is", "isNot", "startsWith"].map((op) => [`title[${op}]`, "x"])]);
    expect(refused(() => listAsk(fields, thirteen, "key"))).toBe("BAD_QUERY: Up to 12 filters");
  });

  test("which fields come back, and which relations are opened", () => {
    expect(shapeAsk(fields, { fields: "title, price", expand: "author" })).toEqual({ lang: null, pick: ["title", "price"], expand: ["author"], shown: false });
    expect(refused(() => shapeAsk(fields, { fields: "title,nope" }))).toBe('BAD_QUERY: No field "nope" in this table');
    expect(refused(() => shapeAsk(fields, { expand: "price" }))).toBe('BAD_QUERY: "price" isn\'t a relation of this table');
    expect(refused(() => shapeAsk(fields, { expand: "author,author,author,author,author,author" }))).toBe("BAD_QUERY: Up to 5 relations can be opened at once");
  });
});

describe("A row, as answered", () => {
  const at = new Date("2026-11-15T10:00:00Z");
  const linked = (id: string, status = "PUBLISHED") => ({ id, slug: id, status, title: { en: id.toUpperCase(), ar: `ع-${id}` } });
  const row = { id: "r1", collectionId: "t1", slug: "first", status: "PUBLISHED", sort: 0, deletedAt: null, createdAt: at, updatedAt: at, publishedAt: at, data: { title: { ar: "وشاح", en: "Scarf" }, price: 10, author: [linked("a1"), linked("a2", "DRAFT")], editors: [linked("e1")], "price$was": "ten" } };
  const modes = (m: Record<string, "all" | "published">): LinkModes => new Map(Object.entries(m));

  test("every field the caller sees, in the table's order, null where the row has nothing", () => {
    const out = apiRow(row, fields, { lang: null, links: modes({ author: "all" }) });
    expect(out).toEqual({
      id: "r1",
      slug: "first",
      status: "PUBLISHED",
      createdAt: at,
      updatedAt: at,
      publishedAt: at,
      values: { title: { ar: "وشاح", en: "Scarf" }, price: 10, tags: null, status: null, author: [linked("a1"), linked("a2", "DRAFT")] },
    });
    // Nothing else of the stored row: not its place in the table, not what a change of fields put aside.
    expect(Object.keys(out)).toEqual(["id", "slug", "status", "values", "createdAt", "updatedAt", "publishedAt"]);
    expect(Object.keys(out.values)).toEqual(["title", "price", "tags", "status", "author"]);
  });

  test("words in one language; a relation as far as its table is open", () => {
    const en = apiRow(row, fields, { lang: "en", links: modes({ author: "published" }) });
    expect(en.values.title).toBe("Scarf");
    // Anyone sees the published linked rows only; the relation to a closed table isn't there at all.
    expect(en.values.author).toEqual([{ id: "a1", slug: "a1", status: "PUBLISHED", title: "A1" }]);
    expect("editors" in en.values).toBe(false);
    // A language the words don't have: the next one that does.
    expect(apiRow(row, fields, { lang: "he" }).values.title).toBe("وشاح");
    expect(wordsIn({ en: " " }, "en")).toBeNull();
    expect(wordsIn("plain", "ar")).toBe("plain");
    expect(apiRow(row, fields, { lang: null, pick: ["price"], links: modes({ author: "all" }) }).values).toEqual({ price: 10 });
  });

  test("a relation opened: the linked rows themselves, those the caller sees", () => {
    const whole = apiRow({ ...row, id: "a1", slug: "a1", data: { title: { en: "A1" } } }, [{ id: "title", type: "text" }], { lang: "en" });
    const out = apiRow(row, fields, { lang: null, links: modes({ author: "all" }), expand: new Map([["author", new Map([["a1", whole]])]]) });
    expect(out.values.author).toEqual([whole]);
  });

  test("a field as the list of tables describes it", () => {
    expect(fieldView({ id: "tags", type: "multiSelect", name: { en: "Tags" }, options: [{ id: "new", name: { en: "New" } }], unique: true, pattern: "x" } as Field)).toEqual({ id: "tags", type: "multiSelect", name: { en: "Tags" }, required: false, options: [{ id: "new", name: { en: "New" } }] });
    expect(fieldView({ id: "author", type: "relation", to: "t-authors", many: true, required: true })).toEqual({ id: "author", type: "relation", name: null, required: true, many: true });
    expect(fieldView({ id: "price", type: "money", currency: "ILS" })).toEqual({ id: "price", type: "money", name: null, required: false, currency: "ILS" });
  });
});

describe("A row as a page shows it", () => {
  const F: Field[] = [
    { id: "note", type: "text" },
    { id: "state", type: "select", options: [{ id: "waiting", name: { ar: "ناطر", en: "Waiting" } }, { id: "done", name: { en: "Done" } }] },
    { id: "amount", type: "money", currency: "ILS" },
    { id: "count", type: "number" },
    { id: "day", type: "date" },
    { id: "seen", type: "boolean" },
    { id: "to", type: "customer" },
    { id: "photo", type: "image" },
    { id: "site", type: "link" },
    { id: "mail", type: "email" },
    { id: "posts", type: "relation", to: "t2", many: true },
    { id: "empty", type: "text" },
  ];
  const stored = { id: "r1", slug: "r-1", status: "DRAFT", createdAt: new Date(0), updatedAt: new Date(0), publishedAt: null, ownerId: "u-sara", data: {
    note: { ar: "مرحبا", en: "Hello" }, state: "waiting", amount: 1250.5, count: 1234, day: "2026-03-01", seen: false, to: "lina@x.test", photo: "/a.png", site: "/shop", mail: "hi@x.test",
    posts: [{ id: "p1", slug: "one", status: "PUBLISHED", title: { en: "One" } }, { id: "p2", slug: "two", status: "DRAFT", title: { en: "Two" } }],
  } };
  const T = { id: "t1", slug: "requests" };
  const links: LinkModes = new Map([["posts", "published"]]);
  const viewer = (id: string | null, email: string | null): Viewer => ({ id, email, names: new Map([["lina@x.test", "Lina Nasser"]]), owners: new Map([["u-sara", "Sara Haddad"]]) });

  test("each field's words in the asked language, the way a page's elements show them; the address a field opens", () => {
    const { shown, links: to } = asShown(stored, F, T, { lang: "en", links, viewer: viewer("u-lina", "lina@x.test") });
    expect(shown).toEqual({ note: "Hello", state: "Waiting", amount: "₪1,250.50", count: "1,234", day: "1 March 2026", seen: "No", to: "Lina Nasser", posts: "One", mail: "hi@x.test", $by: "Sara" });
    expect(to).toEqual({ site: "/shop", mail: "mailto:hi@x.test" });
    const ar = asShown(stored, F, T, { lang: "ar", links, viewer: viewer("u-lina", "lina@x.test") }).shown;
    expect([ar.note, ar.state, ar.seen]).toEqual(["مرحبا", "ناطر", "لا"]);
    // Only the fields asked for.
    expect(Object.keys(asShown(stored, F, T, { lang: "en", pick: ["note", "site"], links }).shown)).toEqual(["note"]);
    expect(asShown(stored, F, T, { lang: "en", pick: ["note", "site"], links }).links).toEqual({ site: "/shop" });
  });

  test("who a row points at and who added it: as far as the reader may know", () => {
    const by = (v?: Viewer) => asShown(stored, F, T, { lang: "en", links, viewer: v }).shown;
    // The one it points at: her whole name; who added it by first name.
    expect([by(viewer("u-lina", "lina@x.test")).to, by(viewer("u-lina", "lina@x.test")).$by]).toEqual(["Lina Nasser", "Sara"]);
    // The one who added it: the other's first name, her own whole name.
    expect([by(viewer("u-sara", "sara@x.test")).to, by(viewer("u-sara", "sara@x.test")).$by]).toEqual(["Lina", "Sara Haddad"]);
    // Anyone else: a first name, and never who added it (the rows aren't theirs).
    const anyone: Viewer = { id: null, email: null, names: new Map([["lina@x.test", "Lina Nasser"]]) };
    expect(by(anyone).to).toBe("Lina");
    expect(by(anyone)).not.toHaveProperty("$by");
    // Nobody with that email: nothing to show (never the email); the row's owner sees the email they wrote.
    const unknown: Viewer = { id: "u-dana", email: "dana@x.test", names: new Map() };
    expect(by(unknown)).not.toHaveProperty("to");
    expect(by({ id: "u-sara", email: "sara@x.test", names: new Map() }).to).toBe("lina@x.test");
    // A key is answered the email itself.
    expect(by(undefined).to).toBe("lina@x.test");
    expect(JSON.stringify(by(anyone))).not.toContain("lina@x.test");
  });

  test("only when asked for; a relation the caller can't read shows nothing", () => {
    expect(apiRow(stored, F, { lang: "en", links })).not.toHaveProperty("shown");
    const row = apiRow(stored, F, { lang: "en", links: new Map(), shown: T, viewer: viewer(null, null) });
    expect(row.shown).not.toHaveProperty("posts");
    expect(row.links).toEqual({ site: "/shop", mail: "mailto:hi@x.test" });
    expect(shapeAsk(F, {}).shown).toBe(false);
    expect(shapeAsk(F, { shown: "1" }).shown).toBe(true);
    expect(refused(() => shapeAsk(F, { shown: "yes" }))).toBe("BAD_QUERY: shown: 1 to answer each row also as a page shows it");
  });
});

describe("A signed-in shopper, and fields that are a key's alone", () => {
  const key = (tables: "*" | string[], acts: KeyLite["scopes"]["acts"]): KeyLite => ({ id: "k", name: "k", prefix: "ek_x", scopes: { tables, acts }, perMinute: 60, revokedAt: null, expiresAt: null });
  const theirs = accessOf({ read: "customer", create: "customer", update: "customer", delete: "off" });

  test("every act can be the shopper's; changing and deleting still never everyone's", () => {
    expect(theirs).toEqual({ read: "customer", create: "customer", update: "customer", delete: "off" });
    expect(AccessSchema.safeParse({ read: "customer", create: "public", update: "customer", delete: "customer" }).success).toBe(true);
    expect(AccessSchema.safeParse({ read: "customer", create: "customer", update: "public", delete: "off" }).success).toBe(false);
    expect(isOpen(theirs)).toBe(true);
  });

  test("who gets in: the shopper as themself, a key as a key, nobody else", () => {
    expect(allow(theirs, "read", null, "t1", "u1")).toEqual({ as: "customer" });
    // Not signed in: asked to; a key that doesn't reach the table: told so.
    expect(allow(theirs, "read", null, "t1")).toEqual({ no: "signInNeeded" });
    expect(allow(theirs, "read", key(["t2"], ["read"]), "t1")).toEqual({ no: "keyLacks" });
    expect(allow(theirs, "update", key("*", ["update"]), "t1", "u1")).toEqual({ as: "key" });
    expect(allow(theirs, "delete", null, "t1", "u1")).toEqual({ no: "closed" });
    // Where everyone reads, a shopper reads as everyone does; a key-only act isn't a shopper's.
    expect(allow(accessOf({ read: "public", create: "key", update: "off", delete: "off" }), "read", null, "t1", "u1")).toEqual({ as: "public" });
    expect(allow(accessOf({ read: "public", create: "key", update: "off", delete: "off" }), "create", null, "t1", "u1")).toEqual({ no: "keyNeeded" });
  });

  test("private fields are kept with the table's access, and seen through a key only", () => {
    const kept = { read: "public", create: "off", update: "off", delete: "off", private: ["staffNote", "cost", "cost"] };
    expect(accessOf(kept)).toEqual({ read: "public", create: "off", update: "off", delete: "off" });
    expect(privateOf(kept)).toEqual(["staffNote", "cost"]);
    // What #138 kept (no list at all) is as before; nonsense is closed with nothing private.
    expect(privateOf({ read: "public", create: "off", update: "off", delete: "off" })).toEqual([]);
    expect(privateOf({ ...kept, private: "all" })).toEqual([]);
    expect(accessOf({ ...kept, private: "all" })).toEqual(CLOSED);
    const table = { fields: [{ id: "title", type: "text" as const }, { id: "cost", type: "number" as const }, { id: "staffNote", type: "text" as const }], private: ["staffNote", "cost"] };
    expect(seenFields(table, "key").map((f) => f.id)).toEqual(["title", "cost", "staffNote"]);
    expect(seenFields(table, "public").map((f) => f.id)).toEqual(["title"]);
    expect(seenFields(table, "customer").map((f) => f.id)).toEqual(["title"]);
    expect(seenFields({ ...table, private: [] }, "public")).toBe(table.fields);
  });

  test("a shopper's list: their rows whatever their status; `mine` asks for them where everyone reads", () => {
    const fields: Field[] = [{ id: "title", type: "text" }];
    expect(listAsk(fields, {}, "customer").q.view).toBe("all");
    expect(listAsk(fields, { status: "draft", mine: "1" }, "customer").q.view).toBe("draft");
    expect(mineAsked({})).toBeNull();
    expect(mineAsked({ mine: "0" })).toBeNull();
    expect(mineAsked({ mine: "1" })).toBe("all");
    expect(mineAsked({ mine: "true" })).toBe("all");
    // One half of them: the ones they added, the ones that point at them.
    expect(mineAsked({ mine: "added" })).toBe("added");
    expect(mineAsked({ mine: "tome" })).toBe("tome");
    expect(refused(() => mineAsked({ mine: "yes" }))).toBe("BAD_QUERY: mine: 1 for the signed-in shopper's own rows (added: the ones they added, tome: the ones that point at them)");
    // A private field isn't one of a shopper's columns: asked about, it is a column that isn't there.
    expect(refused(() => listAsk(fields, { "staffNote[contains]": "x" }, "customer"))).toBe('BAD_QUERY: No column "staffNote" in this table');
  });
});
