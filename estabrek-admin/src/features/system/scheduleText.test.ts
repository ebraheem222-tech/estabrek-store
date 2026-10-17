import { describe, expect, test } from "vitest";
import type { ScheduledChange } from "../../api/schedule.api";
import type { Campaign } from "../../api/selling.api";
import { payloadSummary, previewLineText, timelineGroups } from "./scheduleText";

const names = { theme: (id: string | null) => (id ? ({ luxury_gold: "Luxury Paper", estabrak_soft_gold: "Estabrak Soft" } as Record<string, string>)[id] ?? id : "الافتراضي"), section: () => "الرئيسية · عرض العيد" };

const change = (over: Partial<ScheduledChange>): ScheduledChange => ({
  id: "c",
  kind: "theme",
  title: "t",
  payload: {},
  runAt: "2026-10-20T10:00:00Z",
  undoAt: null,
  status: "scheduled",
  before: null,
  appliedAt: null,
  undoneAt: null,
  note: null,
  ...over,
});

describe("Timeline texts", () => {
  test("what each change sets", () => {
    expect(payloadSummary("theme", { presetId: "luxury_gold" }, names)).toBe("الثيم: Luxury Paper");
    expect(payloadSummary("motion", { changes: { maxFps: 60, phoneGlass: true } }, names)).toBe("أعلى سرعة للـ 3D: 60 إطار/ث · تأثير الزجاج على التلفونات: شغّال");
    expect(payloadSummary("maintenance", { on: true, message: "راجعين الصبح" }, names)).toBe("الصيانة شغّالة: «راجعين الصبح»");
    expect(payloadSummary("maintenance", { on: false }, names)).toBe("الصيانة مطفية");
    expect(payloadSummary("announcement", { on: true, text: "شحن مجاني" }, names)).toBe("شريط الإعلان: «شحن مجاني»");
    expect(payloadSummary("section", { sectionId: "s", visible: false }, names)).toBe("إخفاء: الرئيسية · عرض العيد");
    expect(payloadSummary("cachePurge", { namespace: null }, names)).toBe("تفريغ كل الكاش");
  });

  test("the preview: from now to then", () => {
    expect(previewLineText({ key: "theme", from: "estabrak_soft_gold", to: "luxury_gold" }, names)).toBe("الثيم: Estabrak Soft ← Luxury Paper");
    expect(previewLineText({ key: "storefront.maxFps", from: 120, to: 60 }, names)).toBe("أعلى سرعة للـ 3D: 120 إطار/ث ← 60 إطار/ث");
    expect(previewLineText({ key: "maintenance.on", from: false, to: true }, names)).toBe("الصيانة: مطفي ← شغّال");
    expect(previewLineText({ key: "announcement.text", from: null, to: "شحن مجاني" }, names)).toBe("نص الإعلان: فاضي ← «شحن مجاني»");
    expect(previewLineText({ key: "section.visible", from: true, to: false, label: "الرئيسية · عرض" }, names)).toBe("الرئيسية · عرض: ظاهر ← مخفي");
    expect(previewLineText({ key: "cache.all", from: null, to: null }, names)).toBe("كل الكاش بيفضى، والمتجر بيبني صفحاته من جديد.");
  });

  test("now, next and past", () => {
    const g = timelineGroups(
      [
        change({ id: "later", runAt: "2026-10-25T10:00:00Z" }),
        change({ id: "soon", runAt: "2026-10-18T10:00:00Z" }),
        change({ id: "on", status: "applied", runAt: "2026-10-10T10:00:00Z", undoAt: "2026-10-19T10:00:00Z" }),
        change({ id: "old", status: "undone", runAt: "2026-10-01T10:00:00Z" }),
        change({ id: "older", status: "done", runAt: "2026-09-01T10:00:00Z" }),
      ],
      [{ id: "ramadan", status: "scheduled", startsAt: "2026-10-21T00:00:00Z", endsAt: "2026-11-20T00:00:00Z" } as Campaign],
    );
    const ids = (xs: typeof g.next) => xs.map((i) => (i.type === "change" ? i.change.id : i.campaign.id));
    expect(ids(g.now)).toEqual(["on"]);
    expect(ids(g.next)).toEqual(["soon", "ramadan", "later"]);
    expect(ids(g.past)).toEqual(["old", "older"]);
  });
});
