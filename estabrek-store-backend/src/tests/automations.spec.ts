import { describe, test, expect, afterEach } from "vitest";
import { CONDITIONS, CONDITION_DEFAULTS, DEFAULT_TEXT, SAMPLES, TRIGGERS, conditionsMet, emitAutomation, render, setAutomationHandler } from "../lib/automations.js";

// Automations (التلقائيات), the light part: messages, conditions, the door. No database.

afterEach(() => setAutomationHandler(null));

describe("Messages", () => {
  test("the words are filled in; unknown ones stay empty", () => {
    expect(render("طلب جديد {{orderId}} من {{customerName}}: {{total}} ₪", { orderId: "ORD-1", customerName: "سارة", total: 240 })).toBe("طلب جديد ORD-1 من سارة: 240 ₪");
    expect(render("باقي {{ stock }} من {{nope}} قطعة", { stock: 2 })).toBe("باقي 2 من قطعة");
  });

  test("every trigger's default message uses only its own words", () => {
    for (const t of TRIGGERS) {
      const words = [...DEFAULT_TEXT[t].matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      for (const w of words) expect(Object.keys(SAMPLES[t]), `${t}: ${w}`).toContain(w);
      expect(render(DEFAULT_TEXT[t], SAMPLES[t])).not.toContain("{{");
    }
  });
});

describe("Conditions", () => {
  test("each trigger's defaults are valid, nonsense isn't", () => {
    for (const t of TRIGGERS) expect(CONDITIONS[t].safeParse(CONDITION_DEFAULTS[t]).success, t).toBe(true);
    expect(CONDITIONS["stock.low"].safeParse({ threshold: -1 }).success).toBe(false);
    expect(CONDITIONS["product.viral"].safeParse({ minScore: 20, factor: 1 }).success).toBe(false);
    expect(CONDITIONS["order.created"].safeParse({ minTotal: 100, extra: 1 }).success).toBe(false);
  });

  test("a rule's own line", () => {
    expect(conditionsMet("order.created", { minTotal: 200 }, { total: 150 })).toBe(false);
    expect(conditionsMet("order.created", { minTotal: 200 }, { total: 250 })).toBe(true);
    expect(conditionsMet("order.created", {}, { total: 5 })).toBe(true);
    expect(conditionsMet("stock.low", { threshold: 3 }, { stock: 3 })).toBe(true);
    expect(conditionsMet("stock.low", { threshold: 3 }, { stock: 4 })).toBe(false);
  });
});

describe("The door", () => {
  test("events reach the rules in the background; a failing rule never reaches the caller", async () => {
    const seen: string[] = [];
    setAutomationHandler(async (t, d, s) => {
      seen.push(`${t}|${s}|${d.orderId}`);
      throw new Error("boom");
    });
    const errors: unknown[] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => void errors.push(a);
    expect(() => emitAutomation("order.created", { orderId: "ORD-9" }, "order:ORD-9")).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    console.error = orig;
    expect(seen).toEqual(["order.created|order:ORD-9|ORD-9"]);
    expect(errors).toHaveLength(1);
  });

  test("before the rules start, events are dropped", () => {
    expect(() => emitAutomation("video.ready", {}, "x")).not.toThrow();
  });
});
