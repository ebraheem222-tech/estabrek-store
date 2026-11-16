/**
 * A function's call to a site outside (F5; the step is "http" in lib/fnDef.ts, the rules in
 * lib/fnSites.ts). The server makes the call, so it is hemmed in:
 *
 * - https only, to the standard port, to a site by its name, and only a site the owner allowed.
 * - The name is looked up once and the call goes to that very address, which must be out on the
 *   internet: never this machine, the network it sits in, or a cloud's metadata address (a name
 *   that points inside is refused, also when it pointed outside a moment ago).
 * - No redirect is followed: where a site sends the call on is the function's to decide.
 * - A few seconds, a bounded request and a bounded answer; so many calls a run.
 * - A secret goes into the request as it leaves, only to a site that secret is for, and what the
 *   site answers has every secret's value taken out before the run sees it.
 */
import dns from "node:dns";
import https from "node:https";
import net from "node:net";
import { prisma } from "./prisma.js";
import { open } from "./secretBox.js";
import { lookup as named, words, type Scope } from "./fnValues.js";
import { publicAddress, secretsIn, siteAllowed, withoutSecrets } from "./fnSites.js";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
export const HTTP_LIMITS = {
  /** One call. */
  ms: 8000,
  /** What is sent, and what is taken of the answer, in bytes. */
  body: 64_000,
  answer: 256_000,
  /** Calls in one run. */
  calls: 10,
  headers: 20,
  /** Sites the owner allows, and secrets kept. */
  sites: 50,
  secrets: 50,
  /** A secret's value, in letters. */
  value: 4000,
} as const;

export type SiteAnswer = { status: number; type: string; text: string; cut: boolean };
export type Transport = (req: { method: HttpMethod; url: URL; headers: Record<string, string>; body?: string; ms: number }) => Promise<SiteAnswer>;

/** Why a call wasn't made, or didn't come back: said to the owner as it is. */
export class SiteError extends Error {}

/** The name looked up, and only an address out on the internet given back (all of the name's addresses must be). */
export const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, found) => {
    if (err) return callback(err, "", 0);
    const list = (found as dns.LookupAddress[]).filter((a) => publicAddress(a.address));
    if (!list.length || list.length !== (found as dns.LookupAddress[]).length) return callback(Object.assign(new Error("This site's name points inside the network"), { code: "PRIVATE_ADDRESS" }), "", 0);
    if ((options as { all?: boolean }).all) (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    else callback(null, list[0].address, list[0].family);
  });
};

/** The call itself, over the network. */
const overNetwork: Transport = ({ method, url, headers, body, ms }) =>
  new Promise((done, fail) => {
    const req = https.request(
      { method, host: url.hostname, servername: url.hostname, port: 443, path: `${url.pathname}${url.search}`, headers, lookup: safeLookup, agent: false, timeout: ms },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let cut = false;
        res.on("data", (chunk: Buffer) => {
          if (cut) return;
          size += chunk.length;
          if (size > HTTP_LIMITS.answer) {
            cut = true;
            chunks.push(chunk.subarray(0, chunk.length - (size - HTTP_LIMITS.answer)));
            // Enough: the rest isn't read.
            res.destroy();
            done({ status: res.statusCode ?? 0, type: String(res.headers["content-type"] ?? ""), text: Buffer.concat(chunks).toString("utf8"), cut: true });
          } else chunks.push(chunk);
        });
        res.on("end", () => {
          if (!cut) done({ status: res.statusCode ?? 0, type: String(res.headers["content-type"] ?? ""), text: Buffer.concat(chunks).toString("utf8"), cut: false });
        });
        res.on("error", (e) => {
          if (!cut) fail(e);
        });
      },
    );
    const timer = setTimeout(() => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), ms);
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", fail);
    req.on("close", () => clearTimeout(timer));
    if (body !== undefined) req.write(body);
    req.end();
  });

let transport: Transport = overNetwork;
/** For tests: the network stood in for (null: the real one again). */
export function setTransportForTests(t: Transport | null) {
  transport = t ?? overNetwork;
}

/* ---------------- What the owner allowed (read every few seconds, at once after a change) ---------------- */

type Allowed = { at: number; sites: string[]; secrets: Map<string, { sealed: string; sites: string[] }> };
let cache: Allowed | null = null;
export function forgetConnections() {
  cache = null;
}
async function allowed(now = Date.now()): Promise<Allowed> {
  if (!cache || now - cache.at > 10_000) {
    const [sites, secrets] = await Promise.all([prisma.fnSite.findMany({ select: { host: true } }), prisma.fnSecret.findMany({ select: { name: true, sealed: true, sites: true } })]);
    cache = { at: now, sites: sites.map((s) => s.host), secrets: new Map(secrets.map((s) => [s.name, { sealed: s.sealed, sites: s.sites }])) };
  }
  return cache;
}
/** The sites functions may call, and the secrets' names: what a builder offers. Never a value. */
export async function connectionNames(): Promise<{ sites: string[]; secrets: Array<{ name: string; sites: string[] }> }> {
  const a = await allowed();
  return { sites: a.sites, secrets: [...a.secrets].map(([name, s]) => ({ name, sites: s.sites })) };
}

/* ---------------- One call ---------------- */

export type CallIn = {
  method: HttpMethod;
  /** As the owner wrote them: the address, the headers and what is sent, with the run's names and the secrets still named. */
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** The run's own things, for the names. */
  scope: Scope;
  /** Checked as a real call is, and not made. */
  dry?: boolean;
  ms?: number;
};
export type CallOut = { /** What was called, without its secrets: "POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage". */ line: string; dry: boolean; status: number; ok: boolean; /** The answer read as JSON when the site says it is, else its words. */ body: unknown; type: string; cut: boolean };

const HOLE = /\{\{\s*([^{}]*?)\s*\}\}/g;
const WHOLE = /^\{\{\s*([^{}]*?)\s*\}\}$/;
const isSecret = (path: string) => /^secret\.[A-Za-z0-9_]{1,40}$/.test(path);

/**
 * What the owner wrote with its names filled in. A secret goes in only where the owner's own words
 * name it: what the run holds (a shopper's input, a row) is put in as it is and never read for
 * names again, so nothing a caller sends can ask for a secret.
 */
function textOf(written: string, scope: Scope, secret: (name: string) => string, enc: (s: string) => string = (s) => s): string {
  return written.replace(HOLE, (_m, path: string) => (isSecret(path) ? secret(path.slice(7)) : enc(words(named(scope, path)))));
}
function valueOf(written: unknown, scope: Scope, secret: (name: string) => string): unknown {
  if (typeof written === "string") {
    const whole = WHOLE.exec(written);
    // One name and nothing else: the thing itself (a number stays a number, a row a row).
    if (whole && !isSecret(whole[1])) return named(scope, whole[1]) ?? null;
    return textOf(written, scope, secret);
  }
  if (Array.isArray(written)) return written.map((v) => valueOf(v, scope, secret));
  if (written && typeof written === "object") return Object.fromEntries(Object.entries(written).map(([k, v]) => [k, valueOf(v, scope, secret)]));
  return written;
}

/**
 * The call checked and made (or, dry, only checked). Throws `SiteError` (never with a secret in
 * its words) when the site isn't one the owner allowed, a secret isn't for it, or it didn't answer.
 */
export async function callSite(input: CallIn): Promise<CallOut> {
  const a = await allowed();
  const hole = (name: string) => `{{secret.${name}}}`;
  // The address as it is said: the run's names filled in (each as one piece of an address), the secrets still named.
  const shown = textOf(input.url, input.scope, hole, encodeURIComponent).trim();
  let read: URL;
  try {
    read = new URL(shown.replace(/\{\{secret\.([A-Za-z0-9_]+)\}\}/g, "secret-$1"));
  } catch {
    throw new SiteError("The address isn't one");
  }
  if (read.protocol !== "https:") throw new SiteError("The address starts with https://");
  if (read.username || read.password) throw new SiteError("An address doesn't carry a name and password");
  if (read.port && read.port !== "443") throw new SiteError("Only the standard https port is called");
  const host = read.hostname.toLowerCase();
  if (net.isIP(host.replace(/^\[|\]$/g, "")) || host.includes("secret-")) throw new SiteError("A site is called by its name");
  if (!siteAllowed(host, a.sites)) throw new SiteError(`"${host}" isn't among the allowed sites`);
  const line = `${input.method} ${host}${read.pathname.replace(/secret-([A-Za-z0-9_]+)/g, "{{secret.$1}}")}`.slice(0, 200);

  // Its secrets, as the owner's own words name them: each one kept, and for this site.
  const values = new Map<string, string>();
  for (const name of secretsIn([input.url, input.headers, input.body])) {
    const kept = a.secrets.get(name);
    if (!kept) throw new SiteError(`No secret called "${name}"`);
    if (!siteAllowed(host, kept.sites)) throw new SiteError(`The secret "${name}" isn't for "${host}"`);
    try {
      values.set(name, open(kept.sealed));
    } catch {
      throw new SiteError(`The secret "${name}" can't be read (was the server's key changed?)`);
    }
  }
  if (input.dry) return { line, dry: true, status: 0, ok: true, body: null, type: "", cut: false };
  const secret = (name: string) => values.get(name) ?? "";

  const url = new URL(textOf(input.url, input.scope, secret, encodeURIComponent).trim());
  if (url.hostname.toLowerCase() !== host || url.protocol !== "https:") throw new SiteError("A site is called by its name");
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.headers ?? {}).slice(0, HTTP_LIMITS.headers)) {
    const name = k.trim().toLowerCase();
    // The connection's own lines are the server's to write.
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,60}$/.test(name) || ["host", "content-length", "connection", "transfer-encoding", "upgrade", "proxy-authorization", "te", "trailer"].includes(name)) continue;
    headers[name] = textOf(String(v), input.scope, secret).replace(/[\r\n]+/g, " ").slice(0, 4000);
  }
  let body: string | undefined;
  if (input.method !== "GET" && input.body !== undefined && input.body !== null && input.body !== "") {
    const sent = valueOf(input.body, input.scope, secret);
    if (typeof sent === "string") body = sent;
    else {
      body = JSON.stringify(sent);
      headers["content-type"] ??= "application/json";
    }
    if (Buffer.byteLength(body) > HTTP_LIMITS.body) throw new SiteError(`What is sent is more than ${Math.round(HTTP_LIMITS.body / 1000)} KB`);
    headers["content-length"] = String(Buffer.byteLength(body));
  }
  // Named after what it is, not after one store: a copy of the platform serves any client.
  headers["user-agent"] ??= "store-functions/1";
  headers.accept ??= "application/json, text/plain;q=0.9, */*;q=0.5";

  let got: SiteAnswer;
  try {
    got = await transport({ method: input.method, url, headers, body, ms: Math.max(500, Math.min(input.ms ?? HTTP_LIMITS.ms, HTTP_LIMITS.ms)) });
  } catch (e) {
    const code = String((e as { code?: unknown })?.code ?? "");
    throw new SiteError(code === "ETIMEDOUT" ? `"${host}" didn't answer in time` : code === "PRIVATE_ADDRESS" ? `"${host}" points inside the network: it isn't called` : code === "ENOTFOUND" || code === "EAI_AGAIN" ? `No site is found at "${host}"` : `"${host}" couldn't be reached`);
  }
  // What comes back never carries a secret into the run.
  const text = withoutSecrets(got.text, values.values());
  let parsed: unknown = text;
  if (/json/i.test(got.type) && !got.cut) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (values.size) void prisma.fnSecret.updateMany({ where: { name: { in: [...values.keys()] } }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { line, dry: false, status: got.status, ok: got.status >= 200 && got.status < 300, body: parsed, type: got.type.split(";")[0].trim().slice(0, 100), cut: got.cut };
}
