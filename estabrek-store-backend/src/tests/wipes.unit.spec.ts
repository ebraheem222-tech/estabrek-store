import { describe, expect, test } from "vitest";
import { instantIn, wipeRuleOf, wipesAround, wipeView, type WipeRule } from "../lib/wipes.js";
import { twitchLogin } from "../lib/twitch.js";

// A game server's wipe schedule (wave G6b, lib/wipes.ts), without the database: the next wipe and the last by each
// kind of schedule, on the server's own clock (a summer hour is an hour earlier in UTC), and a site's settings read.

const at = (iso: string) => Date.parse(iso);
const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());
const rule = (r: Partial<WipeRule>): WipeRule => ({ every: "monthly", day: 4, hour: 19, minute: 0, zone: "Europe/London", from: null, ...r });
const around = (r: Partial<WipeRule>, now: string) => {
  const got = wipesAround(rule(r), at(now));
  return { next: iso(got.next), last: iso(got.last) };
};

describe("A wipe schedule", () => {
  test("the first Thursday of each month (Rust's forced wipe), on London's clock, winter and summer", () => {
    expect(around({}, "2026-11-23T12:00:00Z")).toEqual({ next: "2026-12-03T19:00:00.000Z", last: "2026-11-05T19:00:00.000Z" });
    // In summer London is an hour ahead of UTC.
    expect(around({}, "2026-06-20T12:00:00Z")).toEqual({ next: "2026-07-02T18:00:00.000Z", last: "2026-06-04T18:00:00.000Z" });
    // On the day, before and after the hour.
    expect(around({}, "2026-12-03T18:59:00Z").next).toBe("2026-12-03T19:00:00.000Z");
    expect(around({}, "2026-12-03T19:00:00Z")).toEqual({ next: "2027-01-07T19:00:00.000Z", last: "2026-12-03T19:00:00.000Z" });
  });

  test("every week, every two weeks from a first day, and once", () => {
    // Fridays at 20:00 in Jerusalem (two hours ahead in winter).
    expect(around({ every: "weekly", day: 5, hour: 20, zone: "Asia/Jerusalem" }, "2026-11-23T12:00:00Z")).toEqual({ next: "2026-11-27T18:00:00.000Z", last: "2026-11-20T18:00:00.000Z" });
    // Every other Thursday from 19 November, at 18:00 UTC.
    const two = { every: "biweekly" as const, hour: 18, zone: "UTC", from: "2026-11-19" };
    expect(around(two, "2026-11-23T12:00:00Z")).toEqual({ next: "2026-12-03T18:00:00.000Z", last: "2026-11-19T18:00:00.000Z" });
    expect(around(two, "2026-12-04T12:00:00Z")).toEqual({ next: "2026-12-17T18:00:00.000Z", last: "2026-12-03T18:00:00.000Z" });
    // Once, on 5 December at 21:00 in Amman (three hours ahead): ahead, then past.
    const once = { every: "date" as const, hour: 21, zone: "Asia/Amman", from: "2026-12-05" };
    expect(around(once, "2026-11-23T12:00:00Z")).toEqual({ next: "2026-12-05T18:00:00.000Z", last: null });
    expect(around(once, "2026-12-06T12:00:00Z")).toEqual({ next: null, last: "2026-12-05T18:00:00.000Z" });
  });

  test("a wall clock time in a zone", () => {
    expect(new Date(instantIn(2026, 7, 2, 19, 0, "Europe/London")).toISOString()).toBe("2026-07-02T18:00:00.000Z");
    expect(new Date(instantIn(2026, 1, 15, 14, 30, "America/New_York")).toISOString()).toBe("2026-01-15T19:30:00.000Z");
  });

  test("a site's settings read as its schedule, or nothing where they can't be", () => {
    const site = (values: Record<string, unknown>) => ({ featureId: "f", decls: [{ key: "wipeEvery" }] as never, values });
    expect(wipeRuleOf(site({ wipeEvery: "monthly", wipeDay: "thu", wipeTime: "19:00", wipeZone: "london", wipeFrom: "" }))).toEqual(rule({}));
    expect(wipeRuleOf(site({ wipeEvery: "monthly", wipeDay: "thu", wipeTime: "19:00", wipeZone: "Europe/London" }))).toEqual(rule({}));
    // A zone that isn't one is UTC; a time that isn't one, or a once without its day, is no schedule.
    expect(wipeRuleOf(site({ wipeEvery: "weekly", wipeDay: "fri", wipeTime: "9:05", wipeZone: "Mars/Base" }))).toMatchObject({ every: "weekly", day: 5, hour: 9, minute: 5, zone: "UTC" });
    expect(wipeRuleOf(site({ wipeEvery: "weekly", wipeDay: "fri", wipeTime: "25:00", wipeZone: "UTC" }))).toBeNull();
    expect(wipeRuleOf(site({ wipeEvery: "date", wipeDay: "fri", wipeTime: "20:00", wipeZone: "UTC", wipeFrom: "soon" }))).toBeNull();
    expect(wipeRuleOf({ featureId: "f", decls: [], values: {} })).toBeNull();
    expect(wipeView(site({ wipeEvery: "monthly", wipeDay: "thu", wipeTime: "19:00", wipeZone: "Europe/London", wipeNote: { en: "Back in 15 minutes." } }), at("2026-11-23T12:00:00Z"))).toEqual({ next: "2026-12-03T19:00:00.000Z", last: "2026-11-05T19:00:00.000Z", every: "monthly", day: "thu", time: "19:00", zone: "Europe/London", note: { en: "Back in 15 minutes." } });
  });

  test("a Twitch channel as an owner may write it", () => {
    expect(["sara_plays", "SaRa_Plays", "https://www.twitch.tv/sara_plays", "twitch.tv/sara_plays/videos", "@sara_plays"].map(twitchLogin)).toEqual(["sara_plays", "sara_plays", "sara_plays", "sara_plays", "sara_plays"]);
    expect([{ ar: "https://twitch.tv/abu_sakhr" }, "", "no spaces please", "x", "https://kick.com/sara"].map(twitchLogin)).toEqual(["abu_sakhr", null, null, null, null]);
  });
});
