import { describe, expect, test } from "vitest";
import { agoText, everyText, inText, jobHealth, jobsSummary, runSummary, timerChoices } from "./jobsText";
import { describeJobField, jobLabel } from "./jobNames";
import { describeField } from "./cacheText";

const NOW = Date.parse("2026-10-17T12:00:00Z");
const iso = (msFromNow: number) => new Date(NOW + msFromNow).toISOString();
const healthy = { stuck: false, late: false, failuresInRow: 0, runningSince: null, everyMs: 60_000 };

describe("Background jobs texts", () => {
  test("timers and times", () => {
    expect(everyText(30_000)).toBe("كل 30 ثانية");
    expect(everyText(120_000)).toBe("كل دقيقتين");
    expect(everyText(6 * 3600_000)).toBe("كل 6 ساعات");
    expect(everyText(null)).toBe("وقت الحاجة");
    expect(agoText(iso(-2000), NOW)).toBe("هلّق");
    expect(agoText(iso(-45_000), NOW)).toBe("قبل 45 ثانية");
    expect(agoText(null, NOW)).toBe("لسا ما اشتغل");
    expect(inText(iso(12_000), NOW)).toBe("بعد 12 ثانية");
    expect(inText(iso(-500), NOW)).toBe("هلّق");
  });

  test("what a run did, in words", () => {
    expect(runSummary("outbox", { ok: true, counts: { checked: 4, sent: 3, failed: 1 }, error: null })).toBe("3 انبعت · 1 فشل");
    expect(runSummary("outbox", { ok: true, counts: { checked: 0, sent: 0, failed: 0 }, error: null })).toBe("ما كان في شي");
    expect(runSummary("stockAlerts", { ok: true, counts: { checked: 6, sent: 0, failed: 0 }, error: null })).toBe("6 انفحص، ما في شي يتبعت");
    expect(runSummary("backup", { ok: true, counts: { made: 0 }, error: null })).toBe("مش وقت النسخة");
    expect(runSummary("backup", { ok: true, counts: { made: 1, rows: 1200, bytes: 2_500_000 }, error: null })).toBe("1 نسخة · 1,200 سطر · 2.4 MB");
    expect(runSummary("popularityHot", { ok: true, counts: null, error: null })).toBe("تمام");
    expect(runSummary("backup", { ok: false, counts: null, error: "STORAGE_NOT_READY" })).toBe("STORAGE_NOT_READY");
  });

  test("problems worth a look", () => {
    expect(jobHealth(healthy, NOW)).toBeNull();
    expect(jobHealth({ ...healthy, failuresInRow: 1 }, NOW)?.variant).toBe("warning");
    expect(jobHealth({ ...healthy, failuresInRow: 3 }, NOW)).toMatchObject({ label: "عم يفشل", variant: "danger" });
    expect(jobHealth({ ...healthy, late: true }, NOW)?.label).toBe("متأخر");
    expect(jobHealth({ ...healthy, stuck: true, runningSince: iso(-20 * 60_000), failuresInRow: 5 }, NOW)?.note).toContain("20 دقايق");
    const s = jobsSummary(
      [
        { ...healthy, status: "running" },
        { ...healthy, status: "paused" },
        { ...healthy, status: "off" },
        { ...healthy, status: "waiting", failuresInRow: 4 },
        { ...healthy, status: "waiting", failuresInRow: 1 },
      ],
      NOW,
    );
    expect(s).toEqual({ running: 1, paused: 1, off: 1, problems: 1 });
  });

  test("timer choices stay within the job's limits and keep the current and default", () => {
    expect(timerChoices({ everyMs: 45_000, defaultEveryMs: 120_000, limits: { min: 15_000, max: 3600_000 } })).toEqual([
      15_000, 30_000, 45_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000,
    ]);
    expect(timerChoices({ everyMs: null, defaultEveryMs: null, limits: null })).toEqual([]);
  });

  test("names in the settings history", () => {
    expect(jobLabel("backup")).toBe("النسخة الاحتياطية اليومية");
    expect(jobLabel("newJob")).toBe("newJob");
    expect(describeJobField("jobs.stockAlerts.paused")).toBe("إيميلات «رجع للمخزون»: إيقاف");
    expect(describeField("jobs.rumSave.everyMs")).toBe("حفظ سرعة الزباين: الوقت بين كل مرة");
    expect(describeJobField("traffic.mode")).toBeNull();
  });
});
