import { describe, expect, test } from "vitest";
import { FAIL_ACTS, GROUPS, newStep } from "./fnDraft";
import { ACT_NAME, failText, lineText, problemText, stepLine } from "./fnText";

// A function's «إشعار لتلفون الزبون» step (backend lib/fnDef.ts "push"; lib/push.ts sends it): offered with the
// messages, after a failure too; it starts on the one who started the run; its line, what a run did and what is
// wrong with it read in the admin's three languages.

const ctx = { tables: [], fns: [], def: { inputs: [], do: [] } };

describe("A push step", () => {
  test("offered with the messages and after a failure; a new one is for the one who started the run", () => {
    expect(GROUPS.find((g) => g.key === "out")?.acts).toEqual(["notify", "push", "email", "whatsapp", "sms"]);
    expect(FAIL_ACTS).toContain("push");
    expect(newStep("push", ctx)).toEqual({ act: "push", who: "customer", to: "{{caller.id}}", title: "" });
    expect(ACT_NAME.push.split("|")[1]).toBe("A notification on shoppers' phones");
  });

  test("its line, and what a run did, in the admin's language", () => {
    expect(stepLine({ act: "push", who: "customer", to: "{{caller.id}}", title: "Your order left" }, ctx, "en")).toBe("{{caller.id}} · Your order left");
    expect(stepLine({ act: "push", who: "all", title: "Sale" }, ctx, "ar")).toBe("كل اللي قبلوا · Sale");
    expect(lineText({ ok: true, say: ["pushed", "customer", 2] }, "en")).toBe("Sent a notification to the customer (2 phones)");
    expect(lineText({ ok: true, say: ["wouldPush", "all", 7] }, "ar")).toBe("كان رح ينبعت إشعار لـ كل اللي قبلوا (7 تلفون)");
  });

  test("what is wrong with it, and why a run stopped", () => {
    expect(problemText("The customer is empty", "en")).toBe("Which customer? (their id, {{caller.id}}, or their email)");
    expect(problemText("A place in the shop starts with / (/shop)", "he")).toBe("הקישור הוא מקום בחנות, ומתחיל ב-/ (למשל /shop)");
    expect(failText("Notifications are switched off (Settings → the app)", "ar")).toBe("الإشعارات موقّفة (الإعدادات ← التطبيق)");
    expect(failText('No customer "nobody@example.com"', "en")).toBe("No customer “nobody@example.com”");
  });
});
