import { describe, expect, test } from "vitest";
import { buildCommand, countdown, eventText, eventTone, nextVersion, shortHash } from "./vaultText";

describe("Vault text", () => {
  test("the session countdown", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(countdown(new Date(now + 19 * 60_000 + 5_000).toISOString(), now)).toBe("19:05");
    expect(countdown(new Date(now + 9_000).toISOString(), now)).toBe("0:09");
    expect(countdown(new Date(now - 1).toISOString(), now)).toBeNull();
    expect(countdown(null, now)).toBeNull();
  });

  test("the vault's log in words", () => {
    expect(eventText({ at: "", event: "file.added", name: "tool.py" })).toBe("انرفع ملف: tool.py");
    expect(eventText({ at: "", event: "refused", why: "BAD_SIGNATURE" })).toBe("طلب مرفوض (توقيع غلط)");
    expect(eventText({ at: "", event: "package.made", files: 3 })).toBe("انعملت نسخة لزبونة (3 ملفات)");
    expect(eventText({ at: "", event: "something.new" })).toBe("something.new");
    expect(eventTone({ at: "", event: "refused" })).toBe("bad");
    expect(eventTone({ at: "", event: "session.opened" })).toBe("info");
  });

  test("building the launcher", () => {
    expect(buildCommand("https://api.shop.test/v1", "1.0.2")).toBe("powershell -ExecutionPolicy Bypass -File estabrek-launcher\\build.ps1 -ApiUrl https://api.shop.test -Version 1.0.2");
    expect(buildCommand("", "1.0.0")).toContain("https://YOUR-API");
    expect(nextVersion("1.0.4")).toBe("1.0.5");
    expect(nextVersion(null)).toBe("1.0.0");
    expect(shortHash("47158e0478551e0f")).toBe("47158e…1e0f");
  });
});
