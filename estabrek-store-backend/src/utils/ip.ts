import net from "node:net";

export type IpVersion = 4 | 6;

export type CompiledIpRule =
  | { version: 4; network: number; mask: number; raw: string }
  | { version: 6; network: bigint; mask: bigint; raw: string };

export function parseIpList(raw: string | undefined | null): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function stripZoneId(ip: string) {
  const i = ip.indexOf("%");
  return i >= 0 ? ip.slice(0, i) : ip;
}

function stripPort(ip: string) {
  // [::1]:1234
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end > 1) return ip.slice(1, end);
  }

  // 1.2.3.4:1234
  const m = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
  if (m) return m[1]!;

  return ip;
}

export function normalizeIp(raw: string): string {
  const first = String(raw || "")
    .split(",")[0]
    ?.trim();
  if (!first) return "";

  const noPort = stripPort(first);
  const noZone = stripZoneId(noPort);
  const lower = noZone.toLowerCase();

  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    if (net.isIP(v4) === 4) return v4;
  }

  return lower;
}

function parseIPv4(ip: string): number | null {
  if (net.isIP(ip) !== 4) return null;
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function expandIPv6(ip: string): string[] | null {
  const s = ip.toLowerCase();
  if (net.isIP(s) !== 6) return null;

  const parts = s.split("::");
  if (parts.length > 2) return null;

  const left = parts[0] ? parts[0].split(":").filter(Boolean) : [];
  const right = parts[1] ? parts[1].split(":").filter(Boolean) : [];

  const fixIpv4Group = (g: string): string[] => {
    if (!g.includes(".")) return [g];
    const v4 = parseIPv4(g);
    if (v4 == null) return [];
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    return [hi, lo];
  };

  const leftGroups = left.flatMap(fixIpv4Group);
  const rightGroups = right.flatMap(fixIpv4Group);
  if (leftGroups.some((g) => g.includes(".")) || rightGroups.some((g) => g.includes("."))) return null;

  const total = leftGroups.length + rightGroups.length;
  if (parts.length === 1) {
    if (total !== 8) return null;
    return [...leftGroups, ...rightGroups];
  }

  const missing = 8 - total;
  if (missing < 0) return null;
  return [...leftGroups, ...Array.from({ length: missing }, () => "0"), ...rightGroups];
}

function parseIPv6(ip: string): bigint | null {
  const groups = expandIPv6(ip);
  if (!groups) return null;
  if (groups.length !== 8) return null;

  let n = 0n;
  for (const g of groups) {
    if (!g) return null;
    const v = Number.parseInt(g, 16);
    if (!Number.isFinite(v) || v < 0 || v > 0xffff) return null;
    n = (n << 16n) + BigInt(v);
  }
  return n;
}

function parseWildcardIPv4(rule: string): { ip: string; prefix: number } | null {
  const s = rule.trim();
  if (s === "*") return { ip: "0.0.0.0", prefix: 0 };
  if (!s.includes("*")) return null;

  const parts = s.split(".");
  if (parts.length !== 4) return null;

  const firstStar = parts.indexOf("*");
  if (firstStar < 0) return null;
  for (let i = firstStar; i < parts.length; i += 1) {
    if (parts[i] !== "*") return null;
  }

  const octets: number[] = [];
  for (let i = 0; i < firstStar; i += 1) {
    const v = Number(parts[i]);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    octets.push(v);
  }

  const prefix = firstStar * 8;
  const filled = [...octets, ...Array.from({ length: 4 - octets.length }, () => 0)];
  return { ip: filled.join("."), prefix };
}

function maskForIpv4Prefix(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff >>> 0;
  return ((0xffffffff << (32 - prefix)) >>> 0) >>> 0;
}

function maskForIpv6Prefix(prefix: number): bigint {
  if (prefix <= 0) return 0n;
  if (prefix >= 128) return (1n << 128n) - 1n;
  return ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix);
}

export function compileIpRule(rawRule: string): CompiledIpRule | null {
  const raw = String(rawRule ?? "").trim();
  if (!raw) return null;

  const wildcard = parseWildcardIPv4(raw);
  if (wildcard) {
    const ip4 = parseIPv4(wildcard.ip);
    if (ip4 == null) return null;
    const mask = maskForIpv4Prefix(wildcard.prefix);
    return { version: 4, network: ip4 & mask, mask, raw };
  }

  const [ipPartRaw, prefixRaw] = raw.split("/");
  const ipPart = normalizeIp(ipPartRaw ?? "");
  if (!ipPart) return null;

  const v = net.isIP(ipPart) as 0 | 4 | 6;
  if (!v) return null;

  if (v === 4) {
    const ip4 = parseIPv4(ipPart);
    if (ip4 == null) return null;
    const prefix = prefixRaw == null || prefixRaw === "" ? 32 : Number(prefixRaw);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
    const mask = maskForIpv4Prefix(prefix);
    return { version: 4, network: ip4 & mask, mask, raw };
  }

  const ip6 = parseIPv6(ipPart);
  if (ip6 == null) return null;
  const prefix = prefixRaw == null || prefixRaw === "" ? 128 : Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) return null;
  const mask = maskForIpv6Prefix(prefix);
  return { version: 6, network: ip6 & mask, mask, raw };
}

export function compileIpRules(rules: string[]): CompiledIpRule[] {
  const out: CompiledIpRule[] = [];
  for (const r of rules) {
    const rule = compileIpRule(r);
    if (rule) out.push(rule);
  }
  return out;
}

export function matchesIpRule(ip: string, rule: CompiledIpRule): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;

  if (rule.version === 4) {
    const ip4 = parseIPv4(normalized);
    if (ip4 == null) return false;
    return (ip4 & rule.mask) === rule.network;
  }

  const ip6 = parseIPv6(normalized);
  if (ip6 == null) return false;
  return (ip6 & rule.mask) === rule.network;
}

export function isIpInRules(ip: string, rules: CompiledIpRule[]): boolean {
  for (const r of rules) {
    if (matchesIpRule(ip, r)) return true;
  }
  return false;
}

