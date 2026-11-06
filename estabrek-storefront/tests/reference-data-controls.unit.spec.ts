import { expect, test } from "@playwright/test";
import { scheduleOf, comparisonOf, scheduleDays, filterScheduleItems } from "../src/pageTree/referenceData";
import { pickText } from "../src/pageTree/tree";

test("schedule reader bounds untrusted rows and keeps only safe localized content", () => {
  const parsed = scheduleOf({ items: [null, 1, { day: { en: " Friday ", he: [] }, time: " 09:00 ", title: { ar: "أهلاً" }, href: "javascript:alert(1)" }, ...Array.from({ length: 42 }, () => ({ day: {}, title: { en: "a".repeat(170) }, time: 12, text: { en: "b".repeat(1300) }, href: "/shop" }))], layout: "bad", filterDays: "true", showLocation: false });
  expect(parsed.items).toHaveLength(40);
  expect(parsed).toMatchObject({ layout: "cards", filterDays: false, showLocation: false, label: {} });
  expect(parsed.items[0]).toMatchObject({ day: { en: "Friday" }, time: "09:00", title: { ar: "أهلاً" }, href: undefined });
  expect(parsed.items[1].time).toBe("");
  expect(parsed.items[1].title.en).toHaveLength(160);
  expect(parsed.items[1].text.en).toHaveLength(1200);
  expect(scheduleOf({ items: "bad" }).items).toEqual([]);
});

test("schedule filters use the displayed translation and merge equivalent visible days", () => {
  const parsed = scheduleOf({ items: [{ day: { en: "Friday", he: "שישי" }, time: "09:00", title: {} }, { day: { he: "שישי" }, time: "10:00", title: {} }, { day: { en: "Saturday", he: "שבת" }, time: "11:00", title: {} }] });
  const say = (value: unknown) => pickText(value, "he", "en");
  expect(scheduleDays(parsed.items, say)).toEqual(["שישי", "שבת"]);
  expect(filterScheduleItems(parsed.items, "שישי", say).map(item => item.time)).toEqual(["09:00", "10:00"]);
  expect(filterScheduleItems(parsed.items, null, say)).toHaveLength(3);
});

test("comparison reader aligns malformed cells without shifting their columns", () => {
  const parsed = comparisonOf({ columns: [null, { title: { en: " Standard " }, href: "//evil.test" }, { title: { he: "מלא" }, highlight: true, href: "/shop" }], rows: [null, { label: { en: "Delivery" }, values: [null, { state: "yes" }, { state: "maybe", text: { he: "מהיר" } }, { text: { en: "extra" } }] }, { label: {}, values: "bad" }], stickyHeader: "true" });
  expect(parsed.columns).toHaveLength(2);
  expect(parsed.columns[0]).toMatchObject({ title: { en: "Standard" }, href: undefined, highlight: false });
  expect(parsed.rows[0].values).toEqual([{ state: "yes", text: {} }, { state: "text", text: { he: "מהיר" } }]);
  expect(parsed.rows[1].values).toEqual([{ state: "text", text: {} }, { state: "text", text: {} }]);
  expect(parsed.stickyHeader).toBe(false);
});

test("comparison reader bounds columns, rows and text and tolerates empty drafts", () => {
  const parsed = comparisonOf({ label: { en: "x".repeat(180) }, columns: Array.from({ length: 8 }, () => ({ title: { en: "x".repeat(170) }, cta: { en: "x".repeat(70) } })), rows: Array.from({ length: 23 }, () => ({ label: {}, values: Array.from({ length: 8 }, () => ({ text: { en: "x".repeat(610) }, state: "no" })) })), caption: { en: "x".repeat(1300) }, stickyHeader: true });
  expect(parsed.columns).toHaveLength(6);
  expect(parsed.rows).toHaveLength(20);
  expect(parsed.rows[0].values).toHaveLength(6);
  expect(parsed.rows[0].values[0].text.en).toHaveLength(600);
  expect(parsed.columns[0].title.en).toHaveLength(160);
  expect(parsed.columns[0].cta.en).toHaveLength(60);
  expect(parsed.caption.en).toHaveLength(1200);
  expect(comparisonOf({ columns: null, rows: null })).toMatchObject({ columns: [], rows: [] });
});
