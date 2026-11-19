import { describe, expect, test } from "vitest";
import { FnDefSchema, STORE_NUMBERS, couponPhone, numberProblem, problemsOf, storeRights, type FnDef } from "../lib/fnDef.js";

// The store steps' shape and checks, without the database (lib/fnDef.ts; lib/fnStore.ts does them).

const def = (d: Partial<FnDef>): FnDef => ({ inputs: [], do: [], ...d });

describe("The store steps' shape", () => {
  test("taken as written; never in what a function does after a failure", () => {
    const ok = FnDefSchema.safeParse(
      def({
        do: [
          { act: "coupon", off: "percent", value: "{{input.v}}", days: 30, as: "coupon" },
          { act: "stock", sku: "CH-BLK-M", how: "take", amount: 1 },
          { act: "customer", who: "{{caller.id}}", mark: "join", what: "Club" },
        ],
      }),
    );
    expect(ok.success).toBe(true);
    expect(FnDefSchema.safeParse(def({ do: [{ act: "coupon", off: "half", value: 1 } as never] })).success).toBe(false);
    expect(FnDefSchema.safeParse(def({ do: [{ act: "customer", who: "x", mark: "ban" } as never] })).success).toBe(false);
    expect(FnDefSchema.safeParse(def({ do: [{ act: "stock", sku: "x", how: "take", amount: 1, extra: 1 } as never] })).success).toBe(false);
    const fail = FnDefSchema.safeParse(def({ do: [{ act: "return" }], fail: [{ act: "coupon", off: "percent", value: 10 }] }));
    expect(fail.success).toBe(false);
  });

  test("what publishing one needs in the admin, wherever it is (inside a question or a loop too)", () => {
    expect(storeRights(def({ do: [{ act: "notify", title: "x" }] }))).toEqual([]);
    expect(
      storeRights(
        def({
          do: [{ act: "if", if: [{ left: 1, cmp: "eq", right: 1 }], do: [{ act: "stock", sku: "a", how: "add", amount: 1 }], else: [{ act: "each", list: "{{rows}}", do: [{ act: "coupon", off: "amount", value: 5 }] }] }],
          else: [{ act: "customer", who: "a@b.co", mark: "read" }],
        }),
      ),
    ).toEqual(["customers:read", "discounts:write", "inventory:write"]);
    expect(storeRights(def({ do: [{ act: "customer", who: "a@b.co", mark: "leave", what: "g" }] }))).toEqual(["customers:write"]);
  });
});

describe("Their numbers and phone", () => {
  test("said the same way before publishing and at a run", () => {
    expect(numberProblem(undefined, STORE_NUMBERS.uses)).toBeNull();
    expect(numberProblem("", STORE_NUMBERS.uses)).toBeNull();
    expect(numberProblem(" 3 ", STORE_NUMBERS.uses)).toBeNull();
    expect(numberProblem("three", STORE_NUMBERS.uses)).toBe("The uses has to be a number");
    expect(numberProblem(true, STORE_NUMBERS.uses)).toBe("The uses has to be a number");
    expect(numberProblem(2.5, STORE_NUMBERS.uses)).toBe("The uses is a whole number");
    expect(numberProblem(0, STORE_NUMBERS.uses)).toBe("The uses is at least 1");
    expect(numberProblem(0, STORE_NUMBERS.percent)).toBe("The discount is more than 0");
    expect(numberProblem(100, STORE_NUMBERS.percent)).toBeNull();
    expect(numberProblem(100.5, STORE_NUMBERS.percent)).toBe("The discount is at most 100");
    expect(numberProblem(0, STORE_NUMBERS.quantity)).toBeNull();
    expect(numberProblem(-1, STORE_NUMBERS.quantity)).toBe("The amount is at least 0");
    expect(couponPhone("+972 (54) 123-4567")).toBe("541234567");
    expect(couponPhone("0599123456")).toBe("599123456");
    expect(couponPhone("12-34")).toBeNull();
  });

  test("a name the run fills is checked at the run, not before", () => {
    const problems = problemsOf(
      def({
        inputs: [{ name: "v", type: "any" }],
        do: [
          { act: "coupon", code: "{{input.v}}", off: "percent", value: "{{input.v}}", uses: "{{input.v}}", phone: "{{input.v}}", as: "c" },
          { act: "stock", sku: "{{c.code}}", how: "set", amount: "{{c.uses}}" },
          { act: "customer", who: "{{c.phone}}", mark: "giveRole", what: "{{input.v}}" },
          { act: "customer", who: "{{nobody.id}}", mark: "read" },
        ],
      }),
      { tables: [], fns: [], roles: ["vip"], groups: [] },
    );
    expect(problems).toEqual([{ at: "do.3", message: 'Nothing is kept under "nobody" before this step' }]);
  });
});
