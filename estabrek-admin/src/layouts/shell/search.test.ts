import { describe, expect, it } from "vitest";
import { normalizeSearch, phoneDigits } from "./search";

describe("quick search matching", () => {
  it("ignores hamza, taa marbuta and the article", () => {
    expect(normalizeSearch("آلاء")).toBe(normalizeSearch("الاء"));
    expect(normalizeSearch("فاطمة")).toBe("فاطمه");
    expect(normalizeSearch("الفستان الوردي")).toBe("فستان وردي");
  });
  it("reduces phones to the same digits", () => {
    expect(phoneDigits("+972 54-420-4029")).toBe("544204029");
    expect(phoneDigits("0544204029")).toBe("544204029");
    expect(phoneDigits("00970599123456")).toBe("599123456");
  });
});
