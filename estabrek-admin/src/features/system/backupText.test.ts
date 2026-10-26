import { describe, expect, it } from "vitest";
import { backupHealth, errorText, hourText, humanBytes } from "./backupText";

describe("backup texts", () => {
  it("health from the last good backup", () => {
    const now = Date.UTC(2026, 9, 13, 12);
    const at = (h: number) => ({ startedAt: new Date(now - h * 3_600_000).toISOString() });
    expect(backupHealth(at(5), { enabled: true, storageReady: true }, now).level).toBe("ok");
    expect(backupHealth(at(40), { enabled: true, storageReady: true }, now).level).toBe("warn");
    expect(backupHealth(at(100), { enabled: true, storageReady: true }, now).level).toBe("bad");
    expect(backupHealth(null, { enabled: true, storageReady: true }, now).level).toBe("warn");
    expect(backupHealth(at(5), { enabled: true, storageReady: false }, now).level).toBe("bad");
  });

  it("sizes, errors, hours", () => {
    expect(humanBytes(500)).toBe("500 بايت");
    expect(humanBytes(2048)).toBe("2 كيلوبايت");
    expect(humanBytes(3.5 * 1024 * 1024)).toBe("3.5 ميغابايت");
    expect(errorText("STORAGE_NOT_READY")).toContain("Cloudinary");
    expect(errorText("weird")).toBe("weird");
    expect(hourText(3)).toBe("3 بالليل");
    expect(hourText(20)).toBe("8 المسا");
  });
});
