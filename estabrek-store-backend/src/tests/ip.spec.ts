import { describe, expect, it } from "vitest";
import { compileIpRule, isIpInRules, matchesIpRule, normalizeIp, type CompiledIpRule } from "../utils/ip.js";

describe("ip utils", () => {
  it("normalizes ipv4-mapped ipv6", () => {
    expect(normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
  });

  it("supports ipv4 cidr matching", () => {
    const rule = compileIpRule("192.168.0.0/16");
    expect(rule).not.toBeNull();
    expect(matchesIpRule("192.168.1.10", rule!)).toBe(true);
    expect(matchesIpRule("192.169.1.10", rule!)).toBe(false);
  });

  it("supports ipv4 wildcard matching", () => {
    const rule = compileIpRule("10.2.*.*");
    expect(rule).not.toBeNull();
    expect(matchesIpRule("10.2.3.4", rule!)).toBe(true);
    expect(matchesIpRule("10.3.3.4", rule!)).toBe(false);
  });

  it("supports ipv6 cidr matching", () => {
    const rule = compileIpRule("2001:db8::/32");
    expect(rule).not.toBeNull();
    expect(matchesIpRule("2001:db8:abcd::1", rule!)).toBe(true);
    expect(matchesIpRule("2001:dead:beef::1", rule!)).toBe(false);
  });

  it("checks against multiple rules", () => {
    const rules = [compileIpRule("10.0.0.0/8"), compileIpRule("192.168.1.1")].filter(Boolean) as CompiledIpRule[];
    expect(isIpInRules("10.9.9.9", rules)).toBe(true);
    expect(isIpInRules("192.168.1.1", rules)).toBe(true);
    expect(isIpInRules("172.16.0.1", rules)).toBe(false);
  });
});
