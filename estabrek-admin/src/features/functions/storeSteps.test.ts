import { describe, expect, test } from "vitest";
import type { FnDef } from "../../api/functions.api";
import { FAIL_ACTS, GROUPS, newStep, offers } from "./fnDraft";
import { ACT_NAME, failText, lineText, outcomeLine, problemText, stepLine } from "./fnText";

// A function's store steps (backend lib/fnStore.ts): «اعمل كوبون», «عدّل مخزون», «علّم زبون». Offered in a group
// of their own, never after a failure; their lines, what a run did, and what is wrong, in the admin's three languages.

const store = { roles: [{ key: "vip", name: { ar: "مميّزة", en: "VIP" } }], groups: [{ id: "g1", name: "Club" }] };
const ctx = { tables: [], fns: [], def: { inputs: [], do: [] } as FnDef, store };

describe("The store steps", () => {
  test("offered in their own group, never after a failure; a new one is ready to go", () => {
    expect(GROUPS.find((g) => g.key === "store")?.acts).toEqual(["coupon", "stock", "customer"]);
    for (const act of ["coupon", "stock", "customer"] as const) expect(FAIL_ACTS).not.toContain(act);
    expect(newStep("coupon", ctx)).toEqual({ act: "coupon", off: "percent", value: 10, days: 30, as: "coupon" });
    expect(newStep("stock", ctx)).toEqual({ act: "stock", sku: "", how: "take", amount: 1, as: "stock" });
    expect(newStep("customer", ctx)).toEqual({ act: "customer", who: "{{caller.id}}", mark: "giveRole", what: "vip", as: "buyer" });
    expect(newStep("customer", { ...ctx, store: { roles: [], groups: [] } })).toMatchObject({ what: "" });
    expect(ACT_NAME.coupon.split("|")[0]).toBe("اعمل كوبون");
  });

  test("what each keeps is offered to the steps after it", () => {
    const def: FnDef = { inputs: [], do: [{ act: "customer", who: "{{caller.id}}", mark: "read", as: "buyer" }, { act: "coupon", off: "amount", value: 5, phone: "{{buyer.phone}}", as: "c" }, { act: "stock", sku: "A", how: "set", amount: 1, as: "s" }] };
    const names = offers(def, ["do", 3], []);
    expect(names).toEqual(expect.arrayContaining(["buyer.phone", "buyer.email", "buyer.roles", "c.code", "c.endsAt", "s.after", "s.before"]));
    expect(names).not.toContain("buyer");
  });

  test("each in a line, in the admin's language", () => {
    expect(stepLine({ act: "coupon", off: "percent", value: 15, days: 7, as: "coupon" }, ctx, "ar")).toBe("كود جديد · 15% · 7 يوم ← coupon");
    expect(stepLine({ act: "coupon", code: "GIFT", off: "amount", value: 20 }, ctx, "he")).toBe("GIFT · 20 הנחה");
    expect(stepLine({ act: "stock", sku: "CH-BLK-M", how: "take", amount: 2 }, ctx, "en")).toBe("CH-BLK-M −2");
    expect(stepLine({ act: "stock", sku: "", how: "set", amount: 0 }, ctx, "en")).toBe("SKU? = 0");
    expect(stepLine({ act: "customer", who: "a@b.co", mark: "giveRole", what: "vip" }, ctx, "ar")).toBe("a@b.co · أعطيه دور «مميّزة»");
    expect(stepLine({ act: "customer", who: "", mark: "read", as: "buyer" }, ctx, "en")).toBe("which customer? · read ← buyer");
  });

  test("what a run did, and how it ended", () => {
    expect(lineText({ ok: true, say: ["couponMade", "K7QM2XPA", "15%"] }, "en")).toBe("Made the coupon K7QM2XPA (15% off)");
    expect(lineText({ ok: true, say: ["wouldCoupon", "K7QM2XPA", "20"] }, "ar")).toBe("كان رح ينعمل كوبون متل K7QM2XPA (خصم 20)");
    expect(lineText({ ok: true, say: ["stocked", "CH-BLK-M", 5, 3] }, "ar")).toBe("صار 3 بدل 5: \u2068CH-BLK-M\u2069");
    expect(lineText({ ok: true, say: ["wouldStock", "CH-BLK-M", 5, 4] }, "he")).toBe("היה הופך ל-4 במקום 5: \u2068CH-BLK-M\u2069");
    expect(lineText({ ok: true, say: ["wouldStock", "CH-BLK-M", 5, 3] }, "en")).toBe("CH-BLK-M would go 5 → 3");
    expect(lineText({ ok: true, say: ["gaveRole", "vip", "Sara"] }, "he")).toBe("התפקיד «vip» ניתן ל-Sara");
    expect(lineText({ ok: true, say: ["wouldJoin", "Club", "Sara"] }, "ar")).toBe("كان رح ينضاف Sara لمجموعة «Club»");
    expect(outcomeLine({ ok: true, dry: false, counts: { added: 0, changed: 0, deleted: 0, sent: 1, store: 2 }, ms: 40 }, "en")).toContain("2 store changes");
    expect(outcomeLine({ ok: true, dry: true, counts: { added: 0, changed: 0, deleted: 0, sent: 0, store: 1 }, ms: 9 }, "ar")).toContain("1 تغيير بالمتجر");
  });

  test("what is wrong with one, and why one stopped a run", () => {
    expect(problemText("The discount is at most 100", "ar")).toBe("الخصم أكتر شي 100");
    expect(problemText("The uses is a whole number", "en")).toBe("The number of uses is a whole number");
    expect(problemText("The days is more than 0", "he")).toBe("מספר הימים: חייב להיות יותר מ-0");
    expect(problemText("The most off is for a percent", "en")).toBe("“The most off” is only for a percent off");
    expect(problemText('No role "vipp"', "ar")).toBe("ما في دور «vipp» (الزبائن ← الأدوار والمجموعات)");
    expect(problemText("The piece is empty", "en")).toBe("Which piece? (its SKU)");
    expect(failText("Only 2 left of CH-BLK-M", "ar")).toBe("باقي بس 2 من CH-BLK-M");
    expect(failText('A coupon "GIFT" is there already', "en")).toBe("There is a coupon “GIFT” already");
    expect(failText('No piece with the SKU "X"', "he")).toBe("אין פריט עם ה-SKU «X»");
    expect(failText("The amount has to be a number", "ar")).toBe("الكمية لازم يكون رقم");
    expect(failText("A run changes the store up to 50 times", "en")).toBe("A run changes the store up to 50 times");
    // A customer who isn't there is said as the notification step says it.
    expect(failText('No customer "x@y.co"', "ar")).toBe("ما في زبون «x@y.co»");
  });
});
