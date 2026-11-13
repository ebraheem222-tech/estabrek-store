import { describe, expect, test } from "vitest";
import { FIELD_TYPES, bindNode, boundValue, fieldsFor, type CollectionLite, type Field, type ItemLite } from "../lib/collectionTree.js";
import { CollectionBody, FieldSchema, checkItemData } from "../lib/collections.js";
import { OPS_BY_KIND, filterSql } from "../lib/dataQuery.js";
import { coerceValue, csvLine, looseData } from "../lib/dataRows.js";
import { RULES_BY_TYPE, ruleIssue, uniqueKeys } from "../lib/fieldRules.js";
import { dayOf, dayStart, momentOf, nextDay, zonedToUtc } from "../lib/storeTime.js";

// The newer kinds of field (B2): an email, a phone number, a date with its time, money, several
// choices, a file, a video, a 3D model, any JSON, a place. Without a database.

const ZONE = "Asia/Jerusalem";
const n = (en: string, ar = en) => ({ en, ar });
const fields: Field[] = [
  { id: "title", type: "text", required: true },
  { id: "email", type: "email" },
  { id: "phone", type: "phone" },
  { id: "at", type: "datetime" },
  { id: "price", type: "money", currency: "USD" },
  { id: "tags", type: "multiSelect", options: [{ id: "new", name: n("New", "جديد") }, { id: "sale", name: n("On sale", "تخفيض") }, { id: "last", name: n("Last pieces") }] },
  { id: "manual", type: "file" },
  { id: "clip", type: "video" },
  { id: "model", type: "model3d" },
  { id: "extra", type: "json" },
  { id: "place", type: "location" },
];
const f = (id: string) => fields.find((x) => x.id === id)!;
const one = (id: string, value: unknown) => checkItemData([f(id)], { [id]: value });
const refused = (id: string, value: unknown) => {
  const r = one(id, value);
  return r.ok ? "accepted" : r.issues[0].message;
};

describe("The store's clock", () => {
  test("a time on the store's wall is the moment it is, in winter and in summer and around the clock's change", () => {
    expect(zonedToUtc(2026, 11, 13, 14, 30, 0, ZONE).toISOString()).toBe("2026-11-13T12:30:00.000Z");
    expect(zonedToUtc(2026, 7, 1, 14, 30, 0, ZONE).toISOString()).toBe("2026-07-01T11:30:00.000Z");
    expect(zonedToUtc(2026, 3, 26, 12, 0, 0, ZONE).toISOString()).toBe("2026-03-26T10:00:00.000Z");
    expect(zonedToUtc(2026, 3, 27, 12, 0, 0, ZONE).toISOString()).toBe("2026-03-27T09:00:00.000Z");
    expect(zonedToUtc(2026, 11, 13, 14, 30, 0, "UTC").toISOString()).toBe("2026-11-13T14:30:00.000Z");
    expect(dayStart("2026-11-13", ZONE).toISOString()).toBe("2026-11-12T22:00:00.000Z");
    expect(dayOf("2026-11-13T21:59:59Z", ZONE)).toBe("2026-11-13");
    expect(dayOf("2026-11-13T22:30:00Z", ZONE)).toBe("2026-11-14");
    expect([nextDay("2026-11-30"), nextDay("2026-12-31"), nextDay("2028-02-28")]).toEqual(["2026-12-01", "2027-01-01", "2028-02-29"]);
  });

  test("a date and time as people and spreadsheets write it", () => {
    expect(momentOf("2026-11-13T12:30:00Z", ZONE)).toBe("2026-11-13T12:30:00.000Z");
    expect(momentOf("2026-11-13T14:30:00+02:00", ZONE)).toBe("2026-11-13T12:30:00.000Z");
    expect(momentOf("2026-11-13 14:30", ZONE)).toBe("2026-11-13T12:30:00.000Z");
    expect(momentOf("2026-11-13T14:30", ZONE)).toBe("2026-11-13T12:30:00.000Z");
    expect(momentOf("13/11/2026 14:30", ZONE)).toBe("2026-11-13T12:30:00.000Z");
    expect(momentOf("13.11.2026, 9:05", ZONE)).toBe("2026-11-13T07:05:00.000Z");
    expect(momentOf("2026-11-13", ZONE)).toBe("2026-11-12T22:00:00.000Z");
    for (const bad of ["31/02/2026", "2026-13-01", "13/11/2026 25:00", "tomorrow", ""]) expect(momentOf(bad, ZONE), bad).toBeNull();
  });
});

describe("Each kind's values", () => {
  test("every kind says what may be asked of it and which rules fit it", () => {
    for (const t of FIELD_TYPES) {
      expect(OPS_BY_KIND[t]?.length, t).toBeGreaterThan(0);
      expect(RULES_BY_TYPE[t], t).toBeTruthy();
    }
    expect(FIELD_TYPES).toHaveLength(20);
  });

  test("what each takes, and how it's kept", () => {
    expect(one("email", "  Sara@Example.TEST ")).toEqual({ ok: true, data: { email: "sara@example.test" } });
    expect(refused("email", "sara@")).toBe("An email address");
    expect(one("phone", " +970 599-000 001 ")).toEqual({ ok: true, data: { phone: "+970 599-000 001" } });
    expect(refused("phone", "call me")).toBe("A phone number");
    expect(one("at", "2026-11-13T14:30:00+02:00")).toEqual({ ok: true, data: { at: "2026-11-13T12:30:00.000Z" } });
    expect(refused("at", "13/11/2026")).toBe("A date and time");
    expect(one("price", 1250.5)).toEqual({ ok: true, data: { price: 1250.5 } });
    expect(refused("price", "1250")).toBe("A number");
    // Several choices: in the choices' own order, each once; one that isn't a choice refuses the lot.
    expect(one("tags", ["sale", "new", "sale"])).toEqual({ ok: true, data: { tags: ["new", "sale"] } });
    expect(refused("tags", ["new", "old"])).toBe("Some of its choices");
    expect(refused("tags", "new")).toBe("Some of its choices");
    expect(one("tags", [])).toEqual({ ok: true, data: {} });
    expect(one("manual", " https://files.test/guide.pdf ")).toEqual({ ok: true, data: { manual: "https://files.test/guide.pdf" } });
    expect(refused("manual", "javascript:alert(1)")).toBe("A file's address");
    expect(one("clip", "/media/a.mp4")).toEqual({ ok: true, data: { clip: "/media/a.mp4" } });
    expect(one("model", "https://files.test/chair.glb?v=2")).toEqual({ ok: true, data: { model: "https://files.test/chair.glb?v=2" } });
    expect(refused("model", "https://files.test/chair.png")).toBe("A 3D model's address (.glb or .gltf)");
    // JSON: anything, a number or an empty object too; only too much is refused.
    expect(one("extra", { sizes: ["S", "M"], stock: { S: 2 } })).toEqual({ ok: true, data: { extra: { sizes: ["S", "M"], stock: { S: 2 } } } });
    expect(one("extra", 0)).toEqual({ ok: true, data: { extra: 0 } });
    expect(one("extra", {})).toEqual({ ok: true, data: { extra: {} } });
    expect(refused("extra", { big: "x".repeat(20_001) })).toBe("JSON, up to 20,000 characters");
    expect(one("place", { lat: 31.778, lng: 35.235, label: " The old city ", more: 1 })).toEqual({ ok: true, data: { place: { lat: 31.778, lng: 35.235, label: "The old city" } } });
    expect(one("place", { lat: 31.778, lng: 35.235 })).toEqual({ ok: true, data: { place: { lat: 31.778, lng: 35.235 } } });
    for (const bad of [{ lat: 131, lng: 35 }, { lat: "31", lng: 35 }, { lat: 31 }, "31,35", [31, 35]]) expect(refused("place", bad), JSON.stringify(bad)).toBe("A place: latitude and longitude");
  });

  test("a spreadsheet's words become what each kind holds", () => {
    const from = (id: string, s: string) => coerceValue(f(id), s, "en");
    expect(from("price", "₪1,250.50")).toBe(1250.5);
    expect(from("price", "1200 ILS")).toBe(1200);
    expect(from("price", "-5")).toBe(-5);
    expect(from("price", "cheap")).toBe("cheap");
    expect(from("tags", "جديد, On sale")).toEqual(["new", "sale"]);
    expect(from("tags", "new|last;old")).toEqual(["new", "last", "old"]);
    expect(from("at", "13/11/2026 14:30")).toBe(momentOf("13/11/2026 14:30"));
    expect(from("at", "soon")).toBe("soon");
    expect(from("extra", '{"a":[1,2]}')).toEqual({ a: [1, 2] });
    expect(from("extra", "12")).toBe(12);
    expect(from("extra", "just words")).toBe("just words");
    expect(from("place", "31.778, 35.235")).toEqual({ lat: 31.778, lng: 35.235 });
    expect(from("place", "31.778,35.235, The old city, by the gate")).toEqual({ lat: 31.778, lng: 35.235, label: "The old city, by the gate" });
    expect(from("place", "the old city")).toBe("the old city");
    expect(from("email", " A@b.co ")).toBe("A@b.co");
    const row = looseData(fields, { title: "Chair", email: "A@B.co", tags: "new, sale", price: "$99", place: "31.7, 35.2, Shop", extra: "[1]" }, "en");
    expect(row.issues).toEqual([]);
    expect(checkItemData(fields, row.data)).toEqual({ ok: true, data: { title: { en: "Chair" }, email: "a@b.co", price: 99, tags: ["new", "sale"], extra: [1], place: { lat: 31.7, lng: 35.2, label: "Shop" } } });
  });

  test("their rules: money's limits, a date-and-time's first and last store day, the only email and phone", () => {
    expect([ruleIssue({ ...f("price"), min: 0, max: 100 }, -1), ruleIssue({ ...f("price"), min: 0, max: 100 }, 100), ruleIssue({ ...f("price"), max: 100 }, 101)]).toEqual(["Too small", null, "Too big"]);
    const at = { ...f("at"), min: "2026-11-01", max: "2026-11-13" };
    // 22:30 UTC on the 13th is already the 14th in the store's zone.
    expect(ruleIssue(at, "2026-11-13T21:00:00.000Z")).toBeNull();
    expect(ruleIssue(at, "2026-11-13T22:30:00.000Z")).toBe("Too late");
    expect(ruleIssue(at, "2026-10-31T21:59:00.000Z")).toBe("Too early");
    expect(ruleIssue(at, "2026-10-31T22:00:00.000Z")).toBeNull();
    expect(uniqueKeys(f("email"), "sara@example.test")).toEqual(["sara@example.test"]);
    expect(uniqueKeys(f("phone"), "+970 599-000 001")).toEqual(["+970599000001"]);
    expect(RULES_BY_TYPE.email.unique && RULES_BY_TYPE.phone.unique).toBe(true);
    expect(RULES_BY_TYPE.json).toEqual({ unique: false, limits: null, shape: false, default: false });
  });

  test("saving the table: several choices need their choices; a currency is money's", () => {
    const save = (x: unknown) => {
      const r = FieldSchema.safeParse(x);
      return r.success ? r.data : r.error.issues[0].message;
    };
    expect(save({ id: "tags", type: "multiSelect" })).toBe("A choice field needs its choices");
    expect(save({ id: "tags", type: "multiSelect", options: [{ id: "a" }, { id: "a" }] })).toBe("Two choices with one id");
    expect(save({ id: "tags", type: "multiSelect", options: [{ id: "a" }, { id: "b" }], default: ["b", "a"] })).toEqual({ id: "tags", type: "multiSelect", options: [{ id: "a" }, { id: "b" }], default: ["a", "b"] });
    expect(save({ id: "price", type: "money", currency: "USD", min: 0 })).toEqual({ id: "price", type: "money", currency: "USD", min: 0 });
    expect(save({ id: "price", type: "money", currency: "dollars" })).toContain("three letters");
    expect(save({ id: "price", type: "number", currency: "USD" })).toBe("Only money has a currency");
    expect(save({ id: "at", type: "datetime", min: "2026-01-01" })).toEqual({ id: "at", type: "datetime", min: "2026-01-01" });
    expect(save({ id: "extra", type: "json", unique: true })).toContain("only value");
    expect(CollectionBody.safeParse({ slug: "things", name: { en: "Things" }, fields }).success).toBe(true);
  });

  test("questions that don't fit a kind are refused", () => {
    const why = (filter: Parameters<typeof filterSql>[1]) => {
      try {
        filterSql(fields, filter);
      } catch (e) {
        return (e as Error).message;
      }
      return "accepted";
    };
    expect(why({ field: "tags", op: "is", value: "new" })).toContain("can't be asked");
    expect(why({ field: "tags", op: "anyOf", value: ["new"] })).toBe("accepted");
    expect(why({ field: "at", op: "gte", value: "13/11/2026" })).toContain("a date like 2026-11-13");
    expect(why({ field: "at", op: "is", value: "2026-11-13" })).toBe("accepted");
    expect(why({ field: "price", op: "between", value: 1, value2: 9 })).toBe("accepted");
    expect(why({ field: "extra", op: "contains", value: "x" })).toContain("can't be asked");
    expect(why({ field: "phone", op: "is", value: "no digits" })).toContain("digits are needed");
    expect(why({ field: "email", op: "endsWith", value: "@example.test" })).toBe("accepted");
    // A day asked of a date-and-time is the store's day, as moments.
    expect(filterSql(fields, { field: "at", op: "is", value: "2026-11-13" }).values).toEqual(expect.arrayContaining([dayStart("2026-11-13").toISOString(), dayStart("2026-11-14").toISOString()]));
  });
});

describe("On the shop's pages", () => {
  const collection: CollectionLite = { id: "c1", slug: "things", fields };
  const item: ItemLite = { id: "i1", slug: "chair", data: { title: { en: "Chair" }, email: "sara@example.test", phone: "+970 599-000 001", at: "2026-11-13T12:30:00.000Z", price: 1250.5, tags: ["new", "sale"], manual: "https://files.test/guide.pdf", clip: "/media/a.mp4", place: { lat: 31.778, lng: 35.235, label: "The old city" }, extra: { a: 1 } } };
  const text = (ref: string) => boundValue("text", ref, item, collection) as Record<string, string> | undefined;

  test("each kind as words, in each language", () => {
    expect(text("email")).toEqual({ ar: "sara@example.test", en: "sara@example.test", he: "sara@example.test" });
    expect(text("price")?.en).toBe("US$1,250.50");
    expect(text("tags")).toEqual({ ar: "جديد، تخفيض", en: "New, On sale", he: "جديد, تخفيض" });
    expect(text("place")?.en).toBe("The old city");
    expect(text("at")?.en).toMatch(/13 November 2026.*14:30/);
    // Kinds that aren't words give a text nothing.
    for (const ref of ["manual", "clip", "extra"]) expect(text(ref), ref).toBeUndefined();
  });

  test("links: write to an email, call a phone, open a file, find a place", () => {
    const href = (ref: string) => boundValue("href", ref, item, collection);
    expect(href("email")).toBe("mailto:sara@example.test");
    expect(href("phone")).toBe("tel:+970599000001");
    expect(href("manual")).toBe("https://files.test/guide.pdf");
    expect(href("place")).toBe("https://www.google.com/maps/search/?api=1&query=31.778,35.235");
    expect(href("price")).toBeUndefined();
  });

  test("a video element takes a video field; a picture doesn't", () => {
    expect(fieldsFor("video", "src")).toEqual(["video", "image"]);
    expect(fieldsFor("image", "src")).toEqual(["image"]);
    expect(boundValue("src", "clip", item, collection, "video")).toBe("/media/a.mp4");
    expect(boundValue("src", "clip", item, collection, "image")).toBeUndefined();
    const video = bindNode({ id: "v", type: "video", props: { src: "/sample.mp4", bind: { src: "clip" } } }, item, collection);
    expect(video.props).toEqual({ src: "/media/a.mp4" });
    const picture = bindNode({ id: "p", type: "image", props: { src: "/sample.jpg", bind: { src: "clip" } } }, item, collection);
    expect(picture.props).toEqual({ src: "/sample.jpg" });
  });
});

describe("CSV cells", () => {
  test("each kind in one cell, and back the same", () => {
    const table: Field[] = fields.filter((x) => x.id !== "title");
    const data = { email: "sara@example.test", phone: "+970 599-000 001", at: "2026-11-13T12:30:00.000Z", price: -5, tags: ["new", "sale"], manual: "https://files.test/guide.pdf", clip: "/media/a.mp4", model: "/m/chair.glb", extra: { a: [1, 2], b: "x,y" }, place: { lat: 31.778, lng: 35.235, label: "The old city" } };
    const line = csvLine(table, { slug: "chair", status: "DRAFT", data });
    expect(line).toBe(`chair,DRAFT,sara@example.test,'+970 599-000 001,2026-11-13T12:30:00.000Z,-5,"new, sale",https://files.test/guide.pdf,/media/a.mp4,/m/chair.glb,"{""a"":[1,2],""b"":""x,y""}","31.778, 35.235, The old city"`);
    // Read back cell by cell, as an import would.
    const cells = ["sara@example.test", "'+970 599-000 001", "2026-11-13T12:30:00.000Z", "-5", "new, sale", "https://files.test/guide.pdf", "/media/a.mp4", "/m/chair.glb", '{"a":[1,2],"b":"x,y"}', "31.778, 35.235, The old city"];
    const back = looseData(table, Object.fromEntries(table.map((x, i) => [x.id, cells[i]])), "en");
    expect(checkItemData(table, back.data)).toEqual({ ok: true, data });
  });
});
