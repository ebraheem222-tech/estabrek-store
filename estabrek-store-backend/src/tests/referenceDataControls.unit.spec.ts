import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";

const check = (type: string, props: unknown) => checkTree({ version: 1, root: { id: "page", type: "page", children: [{ id: "section", type: "section", children: [{ id: "data", type, props }] }] } });
const session = { day: { en: "Friday", ar: "الجمعة" }, time: "09:00", title: { en: "Welcome" } };
const column = { title: { en: "Standard" }, cta: { he: "בחירה" }, href: "/shop" };

describe("native schedule contract", () => {
  test("accepts localized sessions, all layouts and an empty editor list", () => {
    for (const layout of ["cards", "table", "timeline"]) expect(check("schedule", { label: { en: "Agenda" }, items: [session], layout, filterDays: true, showLocation: false }).ok).toBe(true);
    expect(check("schedule", { items: [], layout: "cards" }).ok).toBe(true);
    expect(check("schedule", { items: Array.from({ length: 40 }, () => session) }).ok).toBe(true);
  });
  test("rejects unsafe links, excess rows, malformed words and unknown fields", () => {
    for (const props of [{ items: Array.from({ length: 41 }, () => session) }, { items: [{ ...session, href: "javascript:alert(1)" }] }, { items: [{ ...session, day: "Friday" }] }, { items: [{ ...session, time: "x".repeat(81) }] }, { items: [session], layout: "grid" }, { items: [session], script: "bad" }, { items: [{ ...session, hidden: true }] }]) expect(check("schedule", props).ok, JSON.stringify(props).slice(0, 90)).toBe(false);
  });
});

describe("native comparison contract", () => {
  test("accepts bounded semantic cells and empty editor tables", () => {
    expect(check("comparison", { label: { en: "Plans" }, columns: [column, { title: { ar: "مميز" }, highlight: true }], rows: [{ label: { en: "Delivery" }, values: [{ state: "yes" }, {}] }], caption: { he: "מחירים" }, stickyHeader: true }).ok).toBe(true);
    expect(check("comparison", { columns: [], rows: [] }).ok).toBe(true);
    expect(check("comparison", { columns: Array.from({ length: 6 }, () => column), rows: Array.from({ length: 20 }, () => ({ label: {}, values: Array.from({ length: 6 }, () => ({ text: {} })) })) }).ok).toBe(true);
  });
  test("rejects oversized, misaligned, unsafe or unrecognized cells", () => {
    for (const props of [{ columns: Array.from({ length: 7 }, () => column), rows: [] }, { columns: [column], rows: Array.from({ length: 21 }, () => ({ label: {}, values: [{}] })) }, { columns: [column], rows: [{ label: {}, values: [{ state: "maybe" }] }] }, { columns: [column], rows: [{ label: {}, values: [{}, {}] }] }, { columns: [column], rows: [{ label: {}, values: [] }] }, { columns: [{ ...column, href: "//evil.test" }], rows: [] }, { columns: [column], rows: [], script: true }, { columns: [{ ...column, script: true }], rows: [] }, { columns: [column], rows: [{ label: {}, values: [{ text: "yes" }] }] }]) expect(check("comparison", props).ok, JSON.stringify(props).slice(0, 90)).toBe(false);
  });
});
