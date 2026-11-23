import { describe, expect, test } from "vitest";
import { NODE_PROPS } from "../lib/pageTree.js";
import { PanelSchema, panelProblems } from "../lib/sitePanel.js";
import { WaitsSchema, heldWords, waitProblems } from "../lib/siteWaits.js";
import { SettingsSchema, lockedOf } from "../lib/dataApi.js";

// Wave G3 of docs/sites-300-plan.ar.md, by itself: a site's rule on what its visitors add (once a kind, again after
// some days) and why it holds a new one back, in the player's words; a queue's votes and the buttons waiting for them;
// a table's locked fields; and a form's values the row always gets.

describe("Again only after some days", () => {
  test("why a new application waits, said as each language says a count of days", () => {
    expect(heldWords({ why: "waiting" }).ar).toBe("طلبك اللي قبل لسّا عم ينراجع. بيوصلك الرد عليه قبل ما تقدّم مرة تانية.");
    expect(heldWords({ why: "soon", since: 0, left: 7 })).toEqual({ ar: "قدّمت اليوم. فيك تقدّم كمان مرة بعد 7 أيام.", en: "You applied today. You can apply again in 7 days.", he: "הגשתם היום. אפשר להגיש שוב בעוד 7 ימים." });
    expect(heldWords({ why: "soon", since: 1, left: 1 }).ar).toBe("قدّمت مبارح. فيك تقدّم كمان مرة من بكرا.");
    expect(heldWords({ why: "soon", since: 1, left: 1 }).en).toBe("You applied yesterday. You can apply again tomorrow.");
    expect(heldWords({ why: "soon", since: 2, left: 12 }).ar).toBe("قدّمت قبل يومين. فيك تقدّم كمان مرة بعد 12 يوم.");
  });

  test("a site's rule names its own table, its fields and one of its number settings", () => {
    const tables = [{ key: "applications", fields: [{ id: "kind" }, { id: "status" }] }];
    const decls = [{ key: "applyWaitDays", kind: "number" }, { key: "applyOpen", kind: "toggle" }];
    const good = WaitsSchema.parse([{ table: "@table:applications", same: ["kind"], days: 7, setting: "applyWaitDays", open: { field: "status", values: ["fresh"] } }]);
    expect(waitProblems(good, tables, decls)).toEqual([]);
    const bad = WaitsSchema.parse([
      { table: "@table:orders", same: [], days: 1 },
      { table: "@table:applications", same: ["job"], days: 1, setting: "applyOpen", open: { field: "state", values: ["x"] } },
    ]);
    expect(waitProblems(bad, tables, decls).map((p) => p.message)).toEqual([
      `"orders" isn't one of the site's tables`,
      `The table "applications" has no field "job"`,
      `The table "applications" has no field "state"`,
      `"applyOpen" isn't one of the site's number settings`,
    ]);
    expect(WaitsSchema.safeParse([{ table: "@table:applications", same: ["kind"], days: 400 }]).success).toBe(false);
  });
});

describe("A queue the staff vote on", () => {
  const tables = [{ key: "applications", fields: [{ id: "status", type: "select" }, { id: "name", type: "text" }] }];
  const queue = (more: Record<string, unknown>) => PanelSchema.parse([{ key: "today", name: { en: "Today" }, icon: "today", parts: [{ kind: "queue", key: "apps", title: { en: "Apps" }, table: "@table:applications", where: [], show: ["$by", "name"], decisions: [{ key: "accept", label: { en: "Accept" }, set: { status: "accepted" }, afterVotes: true }], ...more }] }]);
  test("its votes' number is one of the site's settings; a button waits for votes only where they are counted", () => {
    expect(panelProblems(queue({ votes: { need: "applyVotes" } }), tables, ["applyVotes"])).toEqual([]);
    expect(panelProblems(queue({ votes: { need: "votes" } }), tables, ["applyVotes"]).map((p) => p.message)).toEqual([`"apps" names "votes", which isn't one of the site's settings`]);
    expect(panelProblems(queue({}), tables, []).map((p) => p.message)).toEqual([`"apps": a button waits for votes in a queue that counts them`]);
  });
});

describe("Fields a shopper reads but never writes, and a form's own values", () => {
  test("a table's locked fields, as kept", () => {
    expect(lockedOf({ read: "customer", create: "customer", update: "off", delete: "off", private: [], locked: ["status", "status", "reply"] })).toEqual(["status", "reply"]);
    expect(lockedOf({ read: "off", create: "off", update: "off", delete: "off" })).toEqual([]);
    expect(SettingsSchema.safeParse({ read: "off", create: "off", update: "off", delete: "off", locked: "status" }).success).toBe(false);
  });
  test("a form to a table may always send a few values beside what was typed", () => {
    const form = (set: unknown) => NODE_PROPS.form.safeParse({ kind: "custom", fields: [{ name: "character", kind: "text", label: { en: "Name" } }], send: { to: "table", table: "applications", set } });
    expect(form({ kind: "police" }).success).toBe(true);
    expect(form({ kind: "police", age: 20, ok: true }).success).toBe(true);
    expect(form({ Kind: "police" }).success).toBe(false);
    expect(form(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`f${n}`, "x"]))).success).toBe(false);
  });
});
