import { describe, expect, it } from "vitest";
import { describeChanged, normalizeMarketing, normalizeSearch, validateMarketing } from "./settingsCentre";

describe("settings centre helpers", () => {
  it("accepts real pixel ids and explains wrong ones in Arabic", () => {
    expect(validateMarketing({ ga4Id: "G-AB12CD34EF", metaPixelId: "123456789012345", tiktokPixelId: "C4ABCDEFGH1234567890" })).toEqual({});
    const bad = validateMarketing({ ga4Id: "UA-1234-1", metaPixelId: "12ab", tiktokPixelId: "short" });
    expect(Object.keys(bad).sort()).toEqual(["ga4Id", "metaPixelId", "tiktokPixelId"]);
    expect(bad.ga4Id).toContain("G-");
    expect(validateMarketing({})).toEqual({});
  });

  it("trims what it keeps", () => {
    expect(normalizeMarketing({ ga4Id: " G-AB12CD34EF ", other: 1 })).toEqual({ ga4Id: "G-AB12CD34EF", metaPixelId: "", tiktokPixelId: "" });
  });

  it("matches Arabic search without caring about hamza, teh marbuta or diacritics", () => {
    expect(normalizeSearch("الإعدادات")).toBe(normalizeSearch("الاعدادات"));
    expect(normalizeSearch("واجهةُ")).toBe("واجهه");
  });

  it("says in words what a save changed", () => {
    expect(describeChanged(["header.marketing", "siteName"])).toBe("التسويق والتتبع، اسم الموقع");
    expect(describeChanged(["announcementText", "announcementIsActive"])).toBe("الشريط العلوي");
    expect(describeChanged(null)).toBe("—");
  });
});
