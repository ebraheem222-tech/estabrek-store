import { describe, expect, it } from "vitest";
import { changedPaths, describeChanged, humanMinutes, outOfRange, parseIpLines, policyPatch } from "./policyText";
import type { SecurityPolicy } from "../../api/system.api";

const base: SecurityPolicy = {
  login: { maxFailed: 5, lockMinutes: 15 },
  session: { lifetimeDays: 30, idleHours: 0, accessMinutes: 15 },
  twoFactor: { required: "off" },
  otp: { ttlMinutes: 5, maxAttempts: 5 },
  alerts: { newDevice: true },
  rateLimit: { windowSeconds: 60, perPath: 120, perIp: 600, authWindowSeconds: 60, auth: 20 },
  ip: { adminAllow: [], adminBlock: [], siteBlock: [] },
  pressure: {
    mode: "watch",
    halfLifeSeconds: 60,
    capacity: 200,
    slowAt: 75,
    blockAt: 95,
    blockMinutes: 10,
    maxBlockHours: 24,
    weightRead: 1,
    weightWrite: 3,
    weightAuth: 8,
    weightFail: 4,
    allow: [],
  },
};
const limits = { "login.maxFailed": { min: 3, max: 20 }, "session.idleHours": { min: 0, max: 720 } };

describe("security rules page helpers", () => {
  it("IP lists: one per line or comma, trimmed, no repeats", () => {
    expect(parseIpLines(" 1.2.3.4\n\n5.6.7.0/24, 1.2.3.4 ")).toEqual(["1.2.3.4", "5.6.7.0/24"]);
    expect(parseIpLines("")).toEqual([]);
  });

  it("sends only the sections that changed", () => {
    const draft = { ...base, login: { ...base.login, maxFailed: 3 } };
    expect(policyPatch(draft, base)).toEqual({ login: { maxFailed: 3, lockMinutes: 15 } });
    expect(changedPaths(draft, base)).toEqual(["login.maxFailed"]);
    expect(policyPatch(base, base)).toEqual({});
  });

  it("flags values outside the allowed range", () => {
    expect(outOfRange({ ...base, login: { ...base.login, maxFailed: 1 } }, limits)).toEqual(["login.maxFailed"]);
    expect(outOfRange({ ...base, session: { ...base.session, idleHours: NaN } }, limits)).toEqual(["session.idleHours"]);
    expect(outOfRange(base, limits)).toEqual([]);
  });

  it("plain Arabic", () => {
    expect(describeChanged(["login.maxFailed", "ip.siteBlock"])).toBe("محاولات الدخول الغلط قبل القفل، IPs ممنوعة من كل الموقع");
    expect(humanMinutes(15)).toBe("15 دقيقة");
    expect(humanMinutes(120)).toBe("ساعتين");
    expect(humanMinutes(1440)).toBe("يوم");
  });
});
