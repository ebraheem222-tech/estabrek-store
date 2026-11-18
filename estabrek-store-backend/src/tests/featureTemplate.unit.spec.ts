import { describe, expect, test } from "vitest";
import { compareVersions, freeWord, keyFrom, nameIn, planInstall, readTemplate, refKey, renameWords, TEMPLATE_FORMAT } from "../lib/featureTemplate.js";

// The template file itself (lib/featureTemplate.ts), without the database: reading it, versions,
// free addresses, and its pages' words given their new addresses. The round trip through a store
// is featureTemplates.spec.ts.

const file = (over: Record<string, unknown> = {}) => ({
  format: TEMPLATE_FORMAT,
  formatVersion: 1,
  key: "waitlist",
  version: "1.0.0",
  name: { en: "Waiting list" },
  tables: [{ key: "entries", slug: "waitlist", name: { en: "Entries" }, fields: [{ id: "email", type: "email", required: true }] }],
  ...over,
});
const empty = { tables: new Set<string>(), pages: new Set<string>(), calls: new Set<string>(), routes: new Set<string>() };

describe("A template file", () => {
  test("is read, or refused with where it is wrong", () => {
    expect(readTemplate(file()).ok).toBe(true);
    expect(readTemplate("hello")).toEqual({ ok: false, problems: [{ at: "format", message: "This file isn't a feature template" }] });
    expect(readTemplate(file({ formatVersion: 9 }))).toMatchObject({ ok: false, problems: [{ at: "formatVersion" }] });
    expect(readTemplate(file({ tables: [], functions: [], pages: [] }))).toMatchObject({ ok: false, problems: [{ at: "tables", message: "A template holds something" }] });
    expect(readTemplate(file({ name: { en: " " } }))).toMatchObject({ ok: false, problems: [{ at: "name" }] });
    const twice = file({ tables: [file().tables[0], { ...file().tables[0], slug: "other" }] });
    expect(readTemplate(twice)).toMatchObject({ ok: false, problems: [{ at: "tables.1.key", message: 'Two tables have the key "entries"' }] });
    expect(readTemplate(file({ pages: [{ key: "p", name: "Cart", slug: "/cart", tree: {} }] }))).toMatchObject({ ok: false, problems: [{ at: "pages.0.slug" }] });
    expect(readTemplate(file({ pages: [{ key: "p", name: "x", slug: "/checkout/x", tree: {} }] }))).toMatchObject({ ok: false, problems: [{ at: "pages.0.slug", message: "The shop already uses this address" }] });
    expect(readTemplate(file({ extra: 1 })).ok).toBe(false);
    expect(readTemplate(file({ note: { ar: "x".repeat(1_600_000) } }))).toMatchObject({ ok: false, problems: [{ message: "A template file is up to 2 MB" }] });
  });

  test("versions compare by their numbers", () => {
    expect(compareVersions("1.2.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  test("a reference names a key; a key comes from a Latin name, else from the id", () => {
    expect(refKey("@table:entries", "table")).toBe("entries");
    expect(refKey("@fn:send", "table")).toBeNull();
    expect(refKey("cabc", "fn")).toBeNull();
    expect(keyFrom("Waiting list", "cxyz12345678")).toBe("waiting-list");
    expect(keyFrom("قائمة انتظار", "cxyz12345678")).toBe("feature-12345678");
    expect(nameIn({ ar: "قائمة", en: "List" }, "he")).toBe("قائمة");
  });
});

describe("Installing, before anything is written", () => {
  test("a taken address gets the next free one", () => {
    const taken = new Set(["waitlist", "waitlist-2"]);
    expect(freeWord("waitlist", taken, () => true)).toBe("waitlist-3");
    expect(freeWord("fresh", taken, () => true)).toBe("fresh");
    const r = planInstall(readTemplate(file({ pages: [{ key: "mine", name: "Mine", slug: "/my-waitlist", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [] } } }] })).template!, { ...empty, tables: new Set(["waitlist"]), pages: new Set(["/my-waitlist"]) });
    expect(r.problems).toEqual([]);
    expect(r.plan.tables[0]).toMatchObject({ slug: "waitlist-2", was: "waitlist" });
    expect(r.plan.pages[0]).toMatchObject({ slug: "/my-waitlist-2", was: "/my-waitlist" });
    expect(r.plan.tables[0].id).toMatch(/^c[0-9a-f]{24}$/);
  });

  test("its pages' words follow their addresses: a function's, a table's, a page's", () => {
    const tree = { root: { props: { send: { to: "fn", fn: "join" }, triggers: [{ on: "click", do: [{ act: "fn", fn: "join" }, { act: "link", href: "/mine" }] }], other: { to: "table", table: "waitlist" }, keep: { fn: "join" } } } };
    const out = renameWords(tree, { calls: new Map([["join", "join-2"]]), tables: new Map([["waitlist", "waitlist-2"]]), pages: new Map([["/mine", "/mine-2"]]) }) as any;
    expect(out.root.props.send.fn).toBe("join-2");
    expect(out.root.props.triggers[0].do).toEqual([{ act: "fn", fn: "join-2" }, { act: "link", href: "/mine-2" }]);
    expect(out.root.props.other.table).toBe("waitlist-2");
    // Only where the word is used as an address.
    expect(out.root.props.keep.fn).toBe("join");
    expect(tree.root.props.send.fn, "the file itself isn't changed").toBe("join");
  });

  test("an own address another function has is said, not moved", () => {
    const t = readTemplate(file({ functions: [{ key: "f", name: "F", def: { inputs: [], do: [] }, triggers: [{ kind: "route", config: { method: "GET", path: "waitlist/:id", who: "public" } }] }] })).template!;
    expect(planInstall(t, empty).problems).toEqual([]);
    expect(planInstall(t, { ...empty, routes: new Set(["GET waitlist/:"]) }).problems).toEqual([{ at: "functions.0.triggers.0.config.path", message: "Another address here has this method and path" }]);
  });
});
