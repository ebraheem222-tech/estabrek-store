import { describe, expect, test } from "vitest";
import type { HistoryEntry } from "../../api/history.api";
import { entrySentence, groupByDay, noRestoreText, rangeOf, restoreLabel } from "./historyText";
import { ltr } from "./automationText";

const e = (over: Partial<HistoryEntry>): HistoryEntry => ({ area: "settings", id: "x", at: "2026-10-17T10:00:00Z", who: null, title: null, what: [], detail: null, restore: "before", done: false, link: null, ...over });

describe("History texts", () => {
  test("each part's change in a line", () => {
    expect(entrySentence(e({ area: "settings", what: ["header.theme", "header.nav", "announcementText"], detail: { note: "بداية «رمضان»" } }))).toBe("الثيم، الهيدر والشكل، شريط الإعلان · بداية «رمضان»");
    expect(entrySentence(e({ area: "speed", what: ["storefront.maxFps"] }))).toBe("أعلى سرعة للـ 3D");
    expect(entrySentence(e({ area: "pages", what: ["Update section HERO"] }))).toBe("تعديل قسم (HERO)");
    expect(entrySentence(e({ area: "products", what: ["delete"] }))).toBe("حذف");
    expect(entrySentence(e({ area: "stock", what: ["عدّ"], detail: { delta: -3, before: 10, after: 7 } }))).toBe(`${ltr("-3")} (من 10 لـ 7) · عدّ`);
    expect(entrySentence(e({ area: "stock", what: ["ORDER_ACCEPT:or1"], detail: { delta: -1, before: 7, after: 6 } }))).toBe(`${ltr("-1")} (من 7 لـ 6) · طلب انقبل`);
    expect(entrySentence(e({ area: "prices", what: ["discount", "unseen"], detail: { sizes: 3 } }))).toBe("خصم على 3 مقاسات");
    expect(entrySentence(e({ area: "schedule", what: ["maintenance"] }))).toBe("وضع الصيانة");
  });

  test("the button, or why there's none", () => {
    expect(restoreLabel(e({ restore: "before" }))).toBe("رجّع لقبلها");
    expect(restoreLabel(e({ restore: "undo" }))).toBe("تراجع عنها");
    expect(restoreLabel(e({ restore: "undo", done: true }))).toBeNull();
    expect(noRestoreText(e({ area: "stock", restore: null }))).toContain("من طلب");
    expect(noRestoreText(e({ area: "stock", restore: "undo", done: true }))).toBe("انرجعت");
    expect(noRestoreText(e({ restore: "before" }))).toBeNull();
  });

  test("by day, and the day ranges", () => {
    const now = new Date(2026, 9, 17, 15, 0).getTime();
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();
    const g = groupByDay([e({ id: "a", at: at(17, 12) }), e({ id: "b", at: at(17, 9) }), e({ id: "c", at: at(16, 20) }), e({ id: "d", at: at(14, 8) })], now);
    expect(g.map((x) => [x.label, x.entries.map((y) => y.id)])).toEqual([
      ["اليوم", ["a", "b"]],
      ["مبارح", ["c"]],
      [new Date(at(14, 8)).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" }), ["d"]],
    ]);
    const y = rangeOf("yesterday", now);
    expect(new Date(y.from).getDate()).toBe(16);
    expect(new Date(y.to).getDate()).toBe(16);
    expect(new Date(rangeOf("week", now).from).getDate()).toBe(11);
  });
});
