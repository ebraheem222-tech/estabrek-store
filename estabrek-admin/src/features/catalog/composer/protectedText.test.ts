import { describe, expect, test } from "vitest";
import { cleanExt, downloadsText, formatBytes, licenceState, markPreview, placementText, timeLeft, windowLength } from "./protectedText";
import { protectionForSave, protectionProblem } from "./composerModel";

const now = Date.parse("2026-10-18T12:00:00Z");
const inH = (h: number) => new Date(now + h * 3600_000).toISOString();

describe("Protected products text", () => {
  test("where the mark goes", () => {
    expect(placementText({ placed: "inside" })).toEqual({ text: "🏷️ العلامة جوّا الملف", tone: "good" });
    expect(placementText({ placed: "package", why: "signed" }).text).toContain("موقّع");
    expect(placementText({ placed: "package", why: "binary" }).text).toContain("مش نص");
    expect(placementText({ placed: "package", why: "type" }).text).toBe("📦 العلامة جنبه بـ LICENCE.txt");
    expect(markPreview({ mode: "comment", commentStart: "--" })).toMatch(/^-- Licensed copy .* estb:K7QM2XHPAB$/);
    expect(markPreview({ mode: "comment", commentStart: "<!--", commentEnd: "-->" })).toMatch(/^<!-- .* -->$/);
    expect(markPreview({ mode: "package" })).toBe("LICENCE.txt");
  });

  test("time left and the serial's state", () => {
    expect(timeLeft(inH(5), now)).toBe("باقي 5 ساعات");
    expect(timeLeft(inH(0.25), now)).toBe("باقي 15 دقيقة");
    expect(timeLeft(inH(72), now)).toBe("باقي 3 أيام");
    expect(timeLeft(inH(-1), now)).toBeNull();
    const l = { status: "active" as const, revokedReason: null, expiresAt: inH(3), downloads: 1, maxDownloads: 3, ready: true };
    expect(licenceState(l, now).label).toBe("شغّال");
    expect(licenceState({ ...l, downloads: 3 }, now).label).toBe("خلصت التنزيلات");
    expect(licenceState({ ...l, expiresAt: inH(-1) }, now).label).toBe("انتهت المدة");
    expect(licenceState({ ...l, ready: false }, now).label).toBe("الملفات مش جاهزة");
    expect(licenceState({ ...l, status: "revoked", revokedReason: "owner" }, now).label).toBe("موقوف");
    expect(licenceState({ ...l, status: "revoked", revokedReason: "order" }, now).label).toBe("الطلب ملغي");
    expect(downloadsText(0, 3)).toBe("ما نزّلته لسا (لحد 3)");
    expect(downloadsText(2, 3)).toBe("نزّلته 2 من 3");
  });

  test("lengths, sizes, extensions", () => {
    expect([1, 2, 5, 24, 48, 72].map(windowLength)).toEqual(["ساعة", "ساعتين", "5 ساعات", "24 ساعة", "يومين", "3 أيام"]);
    expect(formatBytes(2048)).toBe("2 KB");
    expect(cleanExt(" .PY ")).toBe("py");
    expect(cleanExt("x y")).toBeNull();
    expect(cleanExt("")).toBeNull();
  });

  test("the protection settings as the server takes them", () => {
    expect(protectionForSave({ protection: { on: true, hours: "", downloads: "" } })).toEqual({ isProtected: true, licenceHours: null, licenceDownloads: null, licenceDevices: null });
    expect(protectionForSave({ protection: { on: true, hours: "٤٨", downloads: "5", devices: "2" } })).toEqual({ isProtected: true, licenceHours: 48, licenceDownloads: 5, licenceDevices: 2 });
    expect(protectionProblem({ protection: { on: true, hours: "", downloads: "", devices: "0" } })).toContain("الأجهزة");
    expect(protectionProblem({ protection: { on: true, hours: "1.5", downloads: "" } })).toContain("ساعات");
    expect(protectionProblem({ protection: { on: true, hours: "", downloads: "0" } })).toContain("التنزيلات");
    // Off: the numbers don't matter.
    expect(protectionProblem({ protection: { on: false, hours: "x", downloads: "y" } })).toBeNull();
  });
});
