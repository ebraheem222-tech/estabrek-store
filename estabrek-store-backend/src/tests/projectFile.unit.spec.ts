import { describe, expect, test } from "vitest";
import { diffProject, readProject, toProject, type Here, type Project } from "../lib/projectFile.js";

// The project as one file (stage 3, item 2), without the database: reading a file, writing one from what
// a store holds, and telling piece by piece what bringing it in would do.

const L = (en: string) => ({ ar: en, en, he: en });
const tree = (text: string) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "h1", type: "heading", props: { text: L(text), level: 1 } }] } });

function store(over: Partial<Here> = {}): Here {
  return {
    name: "Estabrek",
    tables: [
      { id: "tbl_posts1", slug: "posts", name: L("Posts"), fields: [{ id: "title", type: "text", name: L("Title") }, { id: "body", type: "longText", name: L("Body") }], api: { read: "public", create: "off", update: "off", delete: "off", private: [] }, itemPage: null },
    ],
    fns: [
      {
        id: "fn_send0001",
        name: "send",
        note: null,
        enabled: true,
        draft: { lang: "en", inputs: [], do: [{ act: "ready", via: "conn_tg001", text: "hi" }, { act: "http", url: "https://api.example.com/x?k={{secret.EXAMPLE_KEY}}", method: "GET" }] },
        live: { lang: "en", inputs: [], do: [{ act: "return", value: 1 }] },
        tests: [],
        triggers: [
          { id: "trg_call001", kind: "call", config: { who: "public" }, slug: "send-it", enabled: true },
          { id: "trg_hook001", kind: "webhook", config: {}, slug: "long-random-token", enabled: true },
        ],
      },
    ],
    pages: [{ id: "page_about1", kind: "page", name: "About", slug: "/our-story", status: "PUBLISHED", tree: tree("About"), draft: null, seoTitle: "About us", seoDescription: null, noIndex: false }],
    roles: [{ key: "member", name: L("Member"), note: null }],
    groups: [{ id: "grp_team001", name: "Team", note: null }],
    features: [{ id: "feat_blog01", name: "Blog", note: null, enabled: true, items: [{ kind: "table", refId: "tbl_posts1" }, { kind: "page", refId: "page_about1" }], template: null }],
    connections: [{ id: "conn_tg001", name: "Shop bot", kind: "telegram" }, { id: "conn_other", name: "Unused", kind: "slack" }],
    ...over,
  };
}
const copy = (p: Project): Project => JSON.parse(JSON.stringify(p));

describe("A project file", () => {
  test("is written from what a store holds: ids kept, a webhook's address never, what its functions need named", () => {
    const p = toProject(store(), new Date("2026-11-20T09:00:00Z"));
    expect(p).toMatchObject({ format: "estabrek.project", formatVersion: 1, name: "Estabrek", exportedAt: "2026-11-20T09:00:00.000Z" });
    expect(p.tables[0]).toMatchObject({ id: "tbl_posts1", slug: "posts", api: { read: "public" } });
    expect(p.tables[0]).not.toHaveProperty("itemPage");
    const fn = p.functions[0];
    expect(fn).toMatchObject({ id: "fn_send0001", live: { do: [{ act: "return" }] } });
    expect(fn).not.toHaveProperty("tests");
    expect(fn.triggers).toEqual([
      { id: "trg_call001", kind: "call", config: { who: "public" }, slug: "send-it", enabled: true },
      { id: "trg_hook001", kind: "webhook", config: {}, enabled: true },
    ]);
    expect(p.pages[0]).toEqual({ id: "page_about1", kind: "page", name: "About", slug: "/our-story", status: "PUBLISHED", tree: tree("About"), seo: { title: "About us" } });
    expect(p.features[0].items).toEqual([{ kind: "table", id: "tbl_posts1" }, { kind: "page", id: "page_about1" }]);
    // The other copy keeps its own secrets, sites and connections: they are named, never their values.
    expect(p.needs).toEqual({ secrets: ["EXAMPLE_KEY"], sites: ["api.example.com"], connections: [{ id: "conn_tg001", name: "Shop bot", kind: "telegram" }] });
    // What it writes, it reads.
    expect(readProject(JSON.parse(JSON.stringify(p)))).toMatchObject({ ok: true });
  });

  test("that isn't one, or is wrong, is said where", () => {
    expect(readProject({ format: "estabrek.feature", formatVersion: 1 })).toMatchObject({ ok: false, problems: [{ at: "format", message: "This is a feature template: install it from my features" }] });
    expect(readProject({ hello: 1 })).toMatchObject({ ok: false, problems: [{ at: "format" }] });
    expect(readProject({ format: "estabrek.project", formatVersion: 9 })).toMatchObject({ ok: false, problems: [{ at: "formatVersion" }] });
    const p = copy(toProject(store()));
    p.tables.push({ ...p.tables[0], id: "tbl_posts2" });
    p.functions.push({ ...p.functions[0], id: "fn_send0002", triggers: [{ id: "trg_call002", kind: "call", config: { who: "public" }, slug: "send-it", enabled: true }] });
    p.pages.push({ ...p.pages[0], id: "page_shop01", slug: "/shop" });
    p.features.push({ id: "feat_two001", name: "Two", enabled: true, items: [{ kind: "table", id: "tbl_posts1" }] });
    const read = readProject(p);
    expect(read.ok).toBe(false);
    const problems = (read as { problems: Array<{ at: string; message: string }> }).problems;
    expect(problems).toEqual(
      expect.arrayContaining([
        { at: "tables.1.slug", message: 'Two tables have the address "posts"' },
        { at: "functions.1.triggers.0.slug", message: 'Two triggers have the address "send-it"' },
        { at: "pages.1.slug", message: "The shop and the cart aren't brought in from a file" },
        { at: "features.1.items.0", message: "A thing is in one feature at most" },
      ]),
    );
  });
});

describe("What bringing a file in would do", () => {
  test("the same project: nothing; the order things are listed in doesn't count, nor a webhook's address here", () => {
    const here = toProject(store());
    const file = copy(here);
    file.functions[0].triggers.reverse();
    file.features[0].items.reverse();
    const items = diffProject(file, here, "en");
    expect(items.every((i) => i.action === "same")).toBe(true);
    expect(items.map((i) => i.ref)).toEqual(["table:tbl_posts1", "function:fn_send0001", "page:page_about1", "role:member", "group:grp_team001", "feature:feat_blog01"]);
  });

  test("piece by piece: made, changed (and what in it), only here, and an address something else holds", () => {
    const here = toProject(
      store({
        tables: [...store().tables, { id: "tbl_other1", slug: "faq", name: L("Questions"), fields: [{ id: "q", type: "text", name: L("Question") }], api: null, itemPage: null }],
        pages: [...store().pages, { id: "page_mine01", kind: "page", name: "Mine", slug: "/mine", status: "DRAFT", tree: tree("Mine"), draft: null, seoTitle: null, seoDescription: null, noIndex: false }],
      }),
    );
    const file = copy(toProject(store()));
    // A table changed: its name, a field renamed, one gone, one new.
    file.tables[0].name = L("Articles");
    file.tables[0].fields = [{ id: "title", type: "text", name: L("Headline") }, { id: "tags", type: "multiSelect", name: L("Tags"), options: [{ id: "a" }] }];
    // A function's published steps and a trigger switched off.
    file.functions[0].live = { lang: "en", inputs: [], do: [{ act: "return", value: 2 }] };
    file.functions[0].triggers[0].enabled = false;
    // A page unpublished with a new design; a new page whose address another holds here; a new table at a free address.
    file.pages[0] = { ...file.pages[0], status: "DRAFT", tree: tree("About (new)") };
    file.pages.push({ id: "page_new001", kind: "page", name: "New", slug: "/mine", status: "PUBLISHED", tree: tree("New") });
    file.tables.push({ id: "tbl_new0001", slug: "news", name: L("News"), fields: [{ id: "t", type: "text", name: L("T") }] });
    // A group whose name another group has here.
    file.groups = [{ id: "grp_team002", name: "Team" }];
    const items = diffProject(file, here, "en");
    const of = (ref: string) => items.find((i) => i.ref === ref);
    expect(of("table:tbl_posts1")).toEqual({ ref: "table:tbl_posts1", kind: "table", id: "tbl_posts1", name: "Articles", action: "change", parts: ["name", "fields"], fields: { added: ["Tags"], removed: ["Body"], changed: ["Headline"] } });
    expect(of("table:tbl_new0001")).toMatchObject({ action: "add", name: "News" });
    expect(of("table:tbl_other1")).toMatchObject({ action: "only", name: "Questions" });
    expect(of("function:fn_send0001")).toMatchObject({ action: "change", parts: ["live", "triggers"] });
    expect(of("page:page_about1")).toMatchObject({ action: "change", parts: ["status", "design"] });
    expect(of("page:page_new001")).toMatchObject({ action: "clash", clash: { what: "slug", word: "/mine", by: "Mine" } });
    expect(of("page:page_mine01")).toMatchObject({ action: "only" });
    expect(of("group:grp_team002")).toMatchObject({ action: "clash", clash: { what: "name", word: "Team", by: "Team" } });
    expect(of("group:grp_team001")).toMatchObject({ action: "only" });
  });

  test("a call address another function holds here is a clash", () => {
    const here = toProject(store());
    const file = copy(here);
    file.functions = [{ ...file.functions[0], id: "fn_other001", name: "other", triggers: [{ id: "trg_call009", kind: "call", config: { who: "public" }, slug: "send-it", enabled: true }] }];
    const items = diffProject(file, here, "en");
    expect(items.find((i) => i.ref === "function:fn_other001")).toMatchObject({ action: "clash", clash: { what: "address", word: "send-it", by: "send" } });
    expect(items.find((i) => i.ref === "function:fn_send0001")).toMatchObject({ action: "only" });
  });
});
