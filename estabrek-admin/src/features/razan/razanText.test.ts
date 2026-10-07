import { describe, expect, it } from "vitest";
import { parsePaths, seasonNow } from "./razanText";

describe("razanText", () => {
  it("reads page prefixes from text", () => {
    expect(parsePaths("/cart, checkout، /order  /bad path!")).toEqual(["/cart", "/checkout", "/order", "/bad"]);
  });
  it("knows Ramadan, Eid and the seasons", () => {
    const auto = { seasonal: { mode: "auto" as const, outfit: true, lines: {} as Record<"ramadan" | "eid" | "summer" | "winter", { ar: string; en: string }> } };
    expect(seasonNow(auto, new Date("2027-02-15T12:00:00Z"))).toBe("ramadan");
    expect(seasonNow(auto, new Date("2027-03-10T12:00:00Z"))).toBe("eid");
    expect(seasonNow(auto, new Date("2026-07-15T12:00:00Z"))).toBe("summer");
    expect(seasonNow(auto, new Date("2026-10-06T12:00:00Z"))).toBe(null);
    expect(seasonNow({ seasonal: { ...auto.seasonal, mode: "off" } }, new Date("2027-02-15T12:00:00Z"))).toBe(null);
    expect(seasonNow({ seasonal: { ...auto.seasonal, mode: "winter" } })).toBe("winter");
  });
});
