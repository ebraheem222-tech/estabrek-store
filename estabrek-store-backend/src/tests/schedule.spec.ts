import { describe, test, expect, beforeAll } from "vitest";

let checkTimes: typeof import("../modules/admin/schedule.service.js").checkTimes;
let parsePayload: typeof import("../modules/admin/schedule.service.js").parsePayload;
beforeAll(async () => {
  // The module loads the server's settings: they need these two.
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
  process.env.JWT_SECRET ||= "test-secret-at-least-16";
  ({ checkTimes, parsePayload } = await import("../modules/admin/schedule.service.js"));
}, 60_000);

// The timeline (الجدول الزمني): what each kind of change may say, and its times. No database.

const now = Date.parse("2026-10-17T12:00:00Z");
const at = (h: number) => new Date(now + h * 3600_000);
const code = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as { code?: string }).code ?? String(e);
  }
};

describe("What a change may say", () => {
  test("each kind checks its own fields", () => {
    expect(parsePayload("theme", { presetId: "luxury_gold" })).toEqual({ presetId: "luxury_gold" });
    expect(parsePayload("theme", { presetId: null })).toEqual({ presetId: null });
    expect(parsePayload("maintenance", { on: true, message: "  راجعين الساعة 6  " })).toEqual({ on: true, message: "راجعين الساعة 6" });
    expect(parsePayload("section", { sectionId: "s1", visible: false })).toEqual({ sectionId: "s1", visible: false });
    expect(parsePayload("cachePurge", { namespace: null })).toEqual({ namespace: null });
    expect(parsePayload("motion", { changes: { maxFps: 60, phoneGlass: true } })).toEqual({ changes: { maxFps: 60, phoneGlass: true } });
  });

  test("anything else is refused", () => {
    expect(code(() => parsePayload("motion", { changes: {} }))).toBe("BAD_SCHEDULE_PAYLOAD");
    expect(code(() => parsePayload("motion", { changes: { maxFps: 75 } }))).toBe("BAD_SCHEDULE_PAYLOAD");
    expect(code(() => parsePayload("motion", { changes: { sections: {} } }))).toBe("BAD_SCHEDULE_PAYLOAD");
    expect(code(() => parsePayload("theme", { presetId: "<script>" }))).toBe("BAD_SCHEDULE_PAYLOAD");
    expect(code(() => parsePayload("announcement", { on: true, text: "" }))).toBe("BAD_SCHEDULE_PAYLOAD");
    expect(code(() => parsePayload("cachePurge", { namespace: "everything" }))).toBe("BAD_SCHEDULE_PAYLOAD");
    expect(code(() => parsePayload("maintenance", { on: "yes" }))).toBe("BAD_SCHEDULE_PAYLOAD");
  });
});

describe("Times", () => {
  test("now or later, within a year; going back after the start", () => {
    expect(code(() => checkTimes("theme", at(0), at(24), now))).toBeNull();
    expect(code(() => checkTimes("theme", new Date(now - 30_000), null, now))).toBeNull(); // a minute of slack
    expect(code(() => checkTimes("theme", at(-1), null, now))).toBe("SCHEDULE_IN_THE_PAST");
    expect(code(() => checkTimes("theme", at(24 * 400), null, now))).toBe("SCHEDULE_TOO_FAR");
    expect(code(() => checkTimes("maintenance", at(5), at(4), now))).toBe("SCHEDULE_UNDO_BEFORE_START");
    expect(code(() => checkTimes("cachePurge", at(1), at(2), now))).toBe("SCHEDULE_NOTHING_TO_UNDO");
  });
});
