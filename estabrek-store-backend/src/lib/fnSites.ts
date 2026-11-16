/**
 * The sites a function may call and the secrets it may send them (F5; admin → الاتصالات والأسرار),
 * as rules with no network and no database in them (lib/fnHttp.ts makes the call):
 *
 * - A site is a host name: "api.telegram.org", or "*.example.com" for every name under one.
 *   Never an address in numbers, never a port of its own, always https.
 * - A secret is named in capitals (TELEGRAM_TOKEN) and written in a step as {{secret.TELEGRAM_TOKEN}}.
 *   It is put into the request as it leaves and nowhere else: it is never one of the run's own
 *   things, so no step can read it, keep it or give it back.
 */

/** A host name, or every name under one ("*.example.com"). Small letters. */
export const SITE = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
/** A secret's name: capitals, digits and _. */
export const SECRET_NAME = /^[A-Z][A-Z0-9_]{1,39}$/;
const SECRET_HOLE = /\{\{\s*secret\.([A-Za-z0-9_]{1,40})\s*\}\}/g;

/** A site as it is kept: small letters, no dot at its end. Null when it isn't one. */
export function siteOf(raw: string): string | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/\.$/, "");
  return s.length <= 200 && SITE.test(s) ? s : null;
}

/** Whether a host is one of these sites: the same name, or a name under a "*." one (never that name itself). */
export function siteAllowed(host: string, sites: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return sites.some((s) => (s.startsWith("*.") ? h.endsWith(s.slice(1)) && h.length > s.length - 1 : h === s));
}

/**
 * The host an address names, when it can be told before the run: "https://api.x.com/a/{{id}}" →
 * api.x.com. Null when the host itself is a name the run fills in.
 */
export function hostIn(url: string): string | null {
  const m = /^https:\/\/([^/?#]+)/i.exec(url.trim());
  if (!m || m[1].includes("{{") || m[1].includes("}}")) return null;
  return m[1].toLowerCase();
}

/** The secrets a value names, each once, in the order it names them. */
export function secretsIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    for (const m of value.matchAll(SECRET_HOLE)) if (!out.includes(m[1])) out.push(m[1]);
  } else if (Array.isArray(value)) for (const v of value) secretsIn(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) secretsIn(v, out);
  return out;
}

/** A text with every secret's value taken out of it (what a site echoes back mustn't become one of the run's things). */
export function withoutSecrets(text: string, values: Iterable<string>): string {
  let out = text;
  for (const v of values) if (v.length >= 6) out = out.split(v).join("•••");
  return out;
}

/* ---------------- Addresses in numbers: only the public ones ---------------- */

const v4 = (ip: string): number[] | null => {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const n = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
  return n.every((x) => x >= 0 && x <= 255) ? n : null;
};
function publicV4([a, b, c]: number[]): boolean {
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}
/** An IPv6 address as its eight groups; null when it isn't one. */
function v6(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  // The last 32 bits written as an IPv4 address.
  const tail = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (tail) {
    const n = v4(tail[2]);
    if (!n) return null;
    s = `${tail[1]}${((n[0] << 8) | n[1]).toString(16)}:${((n[2] << 8) | n[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const read = (part: string) => (part === "" ? [] : part.split(":").map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN)));
  const head = read(halves[0]);
  const rest = halves.length === 2 ? read(halves[1]) : [];
  if ([...head, ...rest].some(Number.isNaN)) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  if (head.length + rest.length > 7) return null;
  return [...head, ...Array(8 - head.length - rest.length).fill(0), ...rest];
}

/**
 * Whether an address is out on the internet: not this machine, not the network it sits in, not a
 * cloud's own metadata address, not anything set aside. What a call may be sent to.
 */
export function publicAddress(ip: string): boolean {
  const four = v4(ip);
  if (four) return publicV4(four);
  const g = v6(ip);
  if (!g) return false;
  const embedded = [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255];
  // ::, ::1, and an IPv4 address written as IPv6 (mapped, or the old "compatible" way).
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return g[5] === 0xffff ? publicV4(embedded) : g[6] === 0 && g[7] <= 1 ? false : publicV4(embedded);
  // NAT64: an IPv4 address behind 64:ff9b::/96.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return publicV4(embedded);
  if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7, a private network
  if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10, this link
  if ((g[0] & 0xff00) === 0xff00) return false; // ff00::/8, multicast
  if (g[0] === 0x2001 && g[1] === 0xdb8) return false; // the examples' range
  return true;
}
