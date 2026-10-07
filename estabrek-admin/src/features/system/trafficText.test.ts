import { describe, expect, it } from "vitest";
import { humanSeconds, previewUrl, secondsToBlock, steadyPressure, untilText } from "./trafficText";

const s = { halfLifeSeconds: 60, capacity: 200, blockAt: 95 };

describe("traffic examples", () => {
  it("a shopper browsing stays low; a bot gets blocked fast", () => {
    expect(steadyPressure(0.5, 1, s)).toBeLessThan(0.25);
    expect(secondsToBlock(0.5, 1, s)).toBeNull();
    const bot = secondsToBlock(20, 1, s)!;
    expect(bot).toBeGreaterThan(20);
    expect(bot).toBeLessThan(60);
    expect(secondsToBlock(1, 8, s)).toBeGreaterThan(secondsToBlock(5, 8, s)!);
  });

  it("texts", () => {
    expect(humanSeconds(null)).toBe("أبداً");
    expect(humanSeconds(30)).toBe("30 ثانية");
    expect(humanSeconds(600)).toBe("10 دقيقة");
    expect(untilText(null)).toBe("لحتى تفكّه");
    expect(untilText(10 * 60_000, 0)).toBe("10 دقيقة كمان");
    expect(untilText(3 * 3_600_000, 0)).toBe("3 ساعات كمان");
    expect(previewUrl("https://shop.test/", "a b")).toBe("https://shop.test/?preview=a%20b");
  });
});
