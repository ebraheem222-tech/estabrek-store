/**
 * Ready connections, as rules with no network and no database in them (F5; admin → الاتصالات
 * والأسرار; lib/fnReady.ts keeps them and makes the call). A ready connection is a service the
 * owner connects once, with its key and a few settings; a function then uses it by picking it:
 * no address, no header and no key is written in any step.
 *
 * Each kind says: the one site it calls, what its key looks like, the settings it keeps, what it
 * can do and what each of those asks for, and how its key is tried. A kind's calls are written
 * here as the same thing an "http" step is (a method, an address, what is sent), so they leave
 * through lib/fnHttp.ts under every one of its rules; the key is named `{{secret.CONNECTION_KEY}}`
 * in them and nowhere else.
 *
 * A kind may trade its key for a short-lived token before it calls (Google: a service account's
 * claim, signed with its private key, for an hour's access token). Then `{{secret.CONNECTION_KEY}}`
 * in its calls is that token, and the key itself never leaves the server.
 */
import { createPrivateKey, createSign } from "node:crypto";
import type { HttpMethod } from "./fnHttp.js";
import { INFRA_KINDS } from "./fnKindsInfra.js";

/** (neon, railway, vercel, cloudflare: where the store itself is hosted, read and never changed; lib/fnKindsInfra.ts.) */
export const READY_KINDS = ["telegram", "slack", "google", "api", "neon", "railway", "vercel", "cloudflare"] as const;
export type ReadyKind = (typeof READY_KINDS)[number];
/** The name a connection's key goes by inside its own calls. It is never one of the owner's secrets. */
export const READY_KEY = "CONNECTION_KEY";
const KEY = `{{secret.${READY_KEY}}}`;
/** `key`: what may be typed or given as a key (a service account's file is a couple of thousand letters). */
export const READY_LIMITS = { connections: 20, name: 60, key: 8000, test: 300, cells: 100 } as const;

export type ReadyCall = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** What is sent, after the run's values are in it and before it leaves (a sheet's cells made plain values). */
  finish?: (body: unknown) => unknown;
};
export type ReadyField = {
  id: string;
  /** As a problem names it: "The text". */
  what: string;
  required?: boolean;
  /** More than a line. */
  long?: boolean;
  /** A setting of the connection that stands in when the step leaves this empty. */
  or?: string;
  /** What is wrong with what is written here (a body that isn't one), as a problem says it; null when nothing is. */
  problem?: (written: string) => string | null;
};
export type ReadySetting = {
  id: string;
  max: number;
  /** The value as it is kept, from what was typed (a sheet's address → its id); null when it isn't one. */
  tidy?: (typed: string) => string | null;
  /** A connection of this kind has it ("The base address is needed"). */
  required?: boolean;
  /** One of these, and nothing else (a page offers them as a list). */
  choices?: readonly string[];
  /** Asked only while another setting is this ("header" while "auth" is "header"). */
  shownWhen?: [string, string];
  /** As a refusal names it: "The base address". */
  what?: string;
  /** Said when what was typed isn't one. */
  looks?: string;
};
/** How a thing looked is going: well, badly, on its way, or at rest (asleep, cancelled, removed). */
export type LookTone = "good" | "bad" | "busy" | "idle";
/**
 * One thing a look shows: a project, a branch, a service, a deploy. Words the page has its own for
 * are keys (a fact's name: "region"); the rest is the service's own (names, states, commit lines).
 */
export type LookItem = {
  name: string;
  id?: string;
  /** The service's own word for its state ("READY", "active", "CRASHED"). */
  state?: string;
  tone?: LookTone;
  /** When it last changed (a deploy: when it was made), as an ISO time. */
  when?: string;
  /** Where it is seen: the site it serves, or its page at the service. Always https. */
  link?: string;
  facts?: Array<[string, string]>;
  items?: LookItem[];
};
/** A kind of thing a look found ("projects", "zones"), and how many more there were than are shown. */
export type LookGroup = { id: string; items: LookItem[]; more?: number };
export type Look = { /** Whose the key is, as the service says it ("@name", the account's name). */ who: string | null; groups: LookGroup[] };
export type Asked = { ok: boolean; status: number; body: unknown; why: string | null };
export type Ask = (call: ReadyCall) => Promise<Asked>;

export type ReadyAction = {
  id: string;
  fields: ReadyField[];
  call: (settings: Record<string, string>, give: Record<string, string>) => ReadyCall;
  /** What the run is handed of the service's answer (its body as it came, when not said). */
  answer?: (body: unknown) => unknown;
};
export type KindDef = {
  kind: ReadyKind;
  /** As a run's line and a failure say it. */
  label: string;
  /** The one site this kind calls ("" for a kind whose site is the connection's own: hostOf). */
  host: string;
  /** The site a connection of this kind calls, from its settings (a generic API: its base address); null when it has none. */
  hostOf?: (settings: Record<string, string>) => string | null;
  /** The key as it is kept, from what was typed; null when it isn't one. */
  key: (typed: string) => string | null;
  /** Said when the key isn't one. */
  keyLooks: string;
  /** The key is a file the service gives (its kind, for a page's file picker: ".json"). */
  keyFile?: string;
  settings: ReadySetting[];
  /** Settings worked out from the key, shown with the others and never typed: Google's service account's address. */
  derived?: string[];
  derive?: (key: string) => Record<string, string>;
  /** The key as a call carries it, from the key as it is kept (a name and password as Basic asks for them: in base64). */
  useKey?: (key: string, settings: Record<string, string>) => string;
  actions: ReadyAction[];
  /**
   * A call that shows the key works. `sends`: there is no quieter way to ask than posting a line.
   * No call (null): the key traded for a token was the test.
   */
  test: { sends: boolean; call: (settings: Record<string, string>, text: string) => ReadyCall | null; said: (body: unknown, settings?: Record<string, string>) => string | null };
  /** Why the service said no, in its own words. */
  why: (body: unknown) => string | null;
  /** A "yes" (2xx) that is a no all the same: a GraphQL answer with errors and nothing else (Railway). */
  fails?: (body: unknown) => boolean;
  /**
   * What is there, read for the owner to see (a hosting service: its projects, what each runs and
   * how its last deploy went). `ask` makes one call through the connection, as a step's would go;
   * it never throws for a "no", and a call it can't make any more (too many) is a no too.
   */
  look?: (ask: Ask, settings: Record<string, string>) => Promise<Look>;
  /** The key traded for a short-lived token before a call: what is asked, of which address, and what the answer holds. */
  token?: {
    ask: (key: string, now: number) => { url: string; type: string; body: string };
    read: (body: unknown) => { token: string; seconds: number } | null;
    why: (body: unknown) => string | null;
  };
};

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const part = (body: unknown, key: string): unknown => (body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>)[key] : undefined);

/* ---------------- A generic API's own pieces ---------------- */

/** How its key goes with a call: "Authorization: Bearer <key>", in a header of the owner's naming, or as a name and password (Basic). */
export const API_AUTH = ["bearer", "header", "basic"] as const;
const SITE_NAME = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
/** The headers a call writes itself, or that aren't a key's to take. */
const NOT_KEY_HEADERS = new Set(["host", "content-length", "content-type", "connection", "transfer-encoding", "upgrade", "te", "trailer", "proxy-authorization", "cookie", "user-agent", "accept", "accept-encoding"]);
/** A base address as it is kept: https, a site by its name, the standard port, no name and password, no "?" or "#"; its last "/" off. Null when it isn't one. */
export function baseOf(typed: string): string | null {
  let u: URL;
  try {
    u = new URL(typed.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") || u.search || u.hash || !SITE_NAME.test(host)) return null;
  return `https://${host}${u.pathname.replace(/\/+$/, "")}`;
}
/** A header's name a key may go in ("X-API-Key"), in small letters; null when it isn't one or is one a call writes itself. */
export function headerName(typed: string): string | null {
  const name = typed.trim().toLowerCase();
  return /^[a-z0-9-]{1,60}$/.test(name) && !NOT_KEY_HEADERS.has(name) ? name : null;
}
/** A path after the base address ("/orders?status=new"): never a whole address, nor one that starts another site. */
export function pathOf(typed: string): string | null {
  const v = typed.trim();
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith("//") || /[\s#\\]/.test(v)) return null;
  return v.startsWith("/") ? v : `/${v}`;
}
/** A path a step writes (a run's names in it are filled as the call leaves), or why it can't be one. */
function pathProblem(written: string): string | null {
  const v = written.trim().replace(/\{\{[^{}]*\}\}/g, "x");
  return pathOf(v) === null ? "The path comes after the base address: /orders, not a whole address" : null;
}
/** A plain value written in a line of a body: a number, yes/no and nothing are themselves; the rest are words. */
function plain(v: string): unknown {
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true" || v === "false") return v === "true";
  if (v === "null") return null;
  return v;
}
const NO_KEYS = new Set(["__proto__", "prototype", "constructor"]);
/**
 * What a step sends, from what it wrote: JSON as it is (a run's name in quotes: "{{input.total}}"), or one
 * line a field, "name: value", a dot going deeper ("customer.name: {{input.name}}"). Empty: nothing is sent.
 */
export function apiBody(written: string): { body: unknown } | { problem: string } | null {
  const v = written.trim();
  if (!v) return null;
  if (v.startsWith("{") || v.startsWith("[")) {
    try {
      return { body: JSON.parse(v) };
    } catch {
      return { problem: "What is sent isn't JSON (a run's name in it goes in quotes: \"{{input.total}}\")" };
    }
  }
  const out: Record<string, unknown> = {};
  for (const raw of v.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^([A-Za-z_$][\w$-]{0,59}(?:\.[A-Za-z_$][\w$-]{0,59}){0,5})\s*:\s*(.*)$/.exec(line);
    if (!m) return { problem: "Each line of what is sent is name: value" };
    const keys = m[1].split(".");
    if (keys.some((k) => NO_KEYS.has(k))) return { problem: "Each line of what is sent is name: value" };
    let at = out;
    for (const k of keys.slice(0, -1)) {
      if (!at[k] || typeof at[k] !== "object" || Array.isArray(at[k])) at[k] = {};
      at = at[k] as Record<string, unknown>;
    }
    at[keys[keys.length - 1]] = plain(m[2].trim());
  }
  return { body: out };
}
/** The key's header for a call, by how the connection sends it. */
function apiAuth(settings: Record<string, string>): Record<string, string> {
  const auth = settings.auth ?? "bearer";
  if (auth === "header") return { [settings.header || "x-api-key"]: KEY };
  return { authorization: `${auth === "basic" ? "Basic" : "Bearer"} ${KEY}` };
}
const API_METHODS = ["get", "post", "put", "patch", "delete"] as const;

/* ---------------- Google Sheets' own pieces ---------------- */

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

/** A spreadsheet's id: from its address (…/spreadsheets/d/<id>/edit) or as it is; null when it isn't one. */
export function sheetId(typed: string): string | null {
  const v = typed.trim();
  const id = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(v)?.[1] ?? v;
  return /^[A-Za-z0-9_-]{20,100}$/.test(id) ? id : null;
}
/** A tab as A1 notation names it: in quotes, a quote in it doubled ("It's" → 'It''s'). */
export const tabRef = (tab: string) => `'${tab.replace(/'/g, "''")}'`;
/** Part of an address: what is written is made safe for it; a run's name in it ({{input.tab}}) is left for the call to fill. */
const inPath = (s: string) =>
  s
    .split(/(\{\{[^{}]*\}\})/g)
    .map((piece, i) => (i % 2 ? piece : encodeURIComponent(piece)))
    .join("");
/** A column's name as a sheet shows it: 0 → A, 26 → AA. */
export function columnName(i: number): string {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
/** One cell as it is sent: a number or yes/no stays one; a list of plain values is joined; anything else is said as text. */
export function cellOf(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  if (typeof v === "boolean" || typeof v === "string") return v;
  if (Array.isArray(v) && v.every((x) => x === null || typeof x !== "object")) return v.map((x) => (x ?? "") as string).join(", ");
  return JSON.stringify(v);
}
/** The cells a step lists, one a line: the empty lines at the end aren't cells. */
export function cellsOf(written: string): string[] {
  const cells = written.split(/\r?\n/).map((line) => line.trim());
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  return cells.slice(0, READY_LIMITS.cells);
}
/** A sheet's rows as the run reads them: the first row names the columns; each row after it by those names. */
export function rowsOf(values: unknown): { values: unknown[][]; rows: Array<Record<string, unknown>>; count: number } {
  const all = Array.isArray(values) ? values.filter((r): r is unknown[] => Array.isArray(r)) : [];
  const [head = [], ...rest] = all;
  const names = head.map((h, i) => text(typeof h === "string" ? h : String(h ?? ""), 60) ?? columnName(i));
  const width = Math.max(names.length, ...rest.map((r) => r.length));
  for (let i = names.length; i < width; i++) names.push(columnName(i));
  return { values: all, rows: rest.map((r) => Object.fromEntries(names.map((n, i) => [n, r[i] ?? ""]))), count: rest.length };
}
/** The key a service account's file holds, as it is kept: its address and its private key, nothing else of the file. */
function serviceAccount(typed: string): { client_email: string; private_key: string } | null {
  let file: unknown;
  try {
    file = JSON.parse(typed.trim());
  } catch {
    return null;
  }
  const email = text(part(file, "client_email"), 200);
  const key = part(file, "private_key");
  if (part(file, "type") !== "service_account" || !email || !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(email) || typeof key !== "string" || !key.includes("PRIVATE KEY")) return null;
  try {
    createPrivateKey(key);
  } catch {
    return null;
  }
  return { client_email: email, private_key: key };
}
const b64url = (s: string) => Buffer.from(s).toString("base64url");

const KINDS: Record<ReadyKind, KindDef> = {
  /** A Telegram bot (made with @BotFather): it writes to a chat, a group or a channel it was added to. */
  telegram: {
    kind: "telegram",
    label: "Telegram",
    host: "api.telegram.org",
    key: (typed) => {
      const t = typed.trim().replace(/^bot/i, "");
      return /^\d{5,15}:[A-Za-z0-9_-]{30,60}$/.test(t) ? t : null;
    },
    keyLooks: "A Telegram bot's token looks like 123456789:AAH… (from @BotFather)",
    // The chat it usually writes to: a number, or @channelname.
    settings: [{ id: "chat", max: 100 }],
    actions: [
      {
        id: "message",
        fields: [
          { id: "chat", what: "The chat", required: true, or: "chat" },
          { id: "text", what: "The text", required: true, long: true },
        ],
        call: (settings, give) => ({
          method: "POST",
          url: `https://api.telegram.org/bot${KEY}/sendMessage`,
          body: { chat_id: give.chat?.trim() ? give.chat.trim() : (settings.chat ?? ""), text: give.text ?? "", disable_web_page_preview: true },
        }),
      },
    ],
    test: {
      sends: false,
      call: () => ({ method: "GET", url: `https://api.telegram.org/bot${KEY}/getMe` }),
      said: (body) => {
        const name = text(part(part(body, "result"), "username"), 60);
        return name ? `@${name}` : null;
      },
    },
    why: (body) => text(part(body, "description")),
  },
  /** A Slack "incoming webhook": an address Slack gives for one channel; what is posted to it shows there. */
  slack: {
    kind: "slack",
    label: "Slack",
    host: "hooks.slack.com",
    // The whole address is the key: only its end (after /services/) is kept.
    key: (typed) => /^https:\/\/hooks\.slack\.com\/services\/([A-Za-z0-9]{6,20}\/[A-Za-z0-9]{6,20}\/[A-Za-z0-9]{12,60})\/?$/.exec(typed.trim())?.[1] ?? null,
    keyLooks: "A Slack webhook's address starts with https://hooks.slack.com/services/",
    settings: [],
    actions: [
      {
        id: "message",
        fields: [{ id: "text", what: "The text", required: true, long: true }],
        call: (_settings, give) => ({ method: "POST", url: `https://hooks.slack.com/services/${KEY}`, body: { text: give.text ?? "" } }),
      },
    ],
    test: { sends: true, call: (_settings, line) => ({ method: "POST", url: `https://hooks.slack.com/services/${KEY}`, body: { text: line } }), said: () => null },
    // Slack answers a word or two as plain text: "invalid_payload", "no_service".
    why: (body) => text(body),
  },
  /**
   * Google Sheets, through a service account (Google Cloud → a service account → a key, as a JSON
   * file). The owner shares their spreadsheet with the account's address, as they would with a
   * person; the account then adds rows to it and reads it. Its key is traded for an hour's token.
   */
  google: {
    kind: "google",
    label: "Google Sheets",
    host: "sheets.googleapis.com",
    key: (typed) => {
      const account = serviceAccount(typed);
      return account ? JSON.stringify(account) : null;
    },
    keyLooks: "A service account's key is the JSON file Google gives for it (\"type\": \"service_account\")",
    keyFile: ".json",
    // The spreadsheet it usually works in (its address or its id), and the tab.
    settings: [
      { id: "sheet", max: 300, tidy: sheetId },
      { id: "tab", max: 100 },
    ],
    derived: ["account"],
    derive: (key): Record<string, string> => {
      try {
        const email = (JSON.parse(key) as { client_email?: unknown }).client_email;
        return typeof email === "string" ? { account: email } : {};
      } catch {
        return {};
      }
    },
    actions: [
      {
        id: "append",
        fields: [
          { id: "sheet", what: "The spreadsheet", required: true, or: "sheet" },
          { id: "tab", what: "The tab", required: true, or: "tab" },
          { id: "cells", what: "The row", required: true, long: true },
        ],
        call: (settings, give) => {
          const sheet = give.sheet?.trim() ? (sheetId(give.sheet) ?? give.sheet.trim()) : (settings.sheet ?? "");
          const tab = give.tab?.trim() ? give.tab.trim() : (settings.tab ?? "");
          return {
            method: "POST",
            // RAW: a value is kept as it is given. A shopper's "=…" is words in a cell, never a formula.
            url: `${SHEETS}/${inPath(sheet)}/values/${inPath(tabRef(tab))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            headers: { authorization: `Bearer ${KEY}` },
            body: { majorDimension: "ROWS", values: [cellsOf(give.cells ?? "")] },
            finish: (body) => {
              const b = body as { values?: unknown };
              return { ...b, values: (Array.isArray(b.values) ? b.values : []).map((row) => (Array.isArray(row) ? row.map(cellOf) : [])) };
            },
          };
        },
        answer: (body) => {
          const updates = part(body, "updates");
          return { range: text(part(updates, "updatedRange"), 200), rows: Number(part(updates, "updatedRows") ?? 0) || 0 };
        },
      },
      {
        id: "read",
        fields: [
          { id: "sheet", what: "The spreadsheet", required: true, or: "sheet" },
          { id: "tab", what: "The tab", required: true, or: "tab" },
          // "A1:D100": empty, the whole tab.
          { id: "range", what: "The cells to read" },
        ],
        call: (settings, give) => {
          const sheet = give.sheet?.trim() ? (sheetId(give.sheet) ?? give.sheet.trim()) : (settings.sheet ?? "");
          const tab = give.tab?.trim() ? give.tab.trim() : (settings.tab ?? "");
          const range = give.range?.trim() ? `${tabRef(tab)}!${give.range.trim()}` : tabRef(tab);
          return { method: "GET", url: `${SHEETS}/${inPath(sheet)}/values/${inPath(range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`, headers: { authorization: `Bearer ${KEY}` } };
        },
        answer: (body) => rowsOf(part(body, "values")),
      },
    ],
    test: {
      sends: false,
      // With a spreadsheet: its title and tabs, which also shows it was shared with the account. Without: the token itself was the test.
      call: (settings) => (settings.sheet ? { method: "GET", url: `${SHEETS}/${inPath(settings.sheet)}?fields=properties.title,sheets.properties.title`, headers: { authorization: `Bearer ${KEY}` } } : null),
      said: (body, settings) => {
        if (body === null) return settings?.account ?? null;
        const title = text(part(part(body, "properties"), "title"), 100);
        const sheets = part(body, "sheets");
        const tabs = (Array.isArray(sheets) ? sheets : []).map((s) => text(part(part(s, "properties"), "title"), 60)).filter(Boolean);
        return title ? `${title}${tabs.length ? ` (${tabs.join(", ")})` : ""}` : null;
      },
    },
    why: (body) => text(part(part(body, "error"), "message")),
    token: {
      // A claim signed with the account's private key (RS256), traded for an hour's access token.
      ask: (key, now) => {
        const account = JSON.parse(key) as { client_email: string; private_key: string };
        const iat = Math.floor(now / 1000);
        const signed = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: GOOGLE_SCOPE, aud: GOOGLE_TOKEN, iat, exp: iat + 3600 }))}`;
        const signature = createSign("RSA-SHA256").update(signed).sign(account.private_key).toString("base64url");
        return { url: GOOGLE_TOKEN, type: "application/x-www-form-urlencoded", body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${signed}.${signature}` };
      },
      read: (body) => {
        const token = text(part(body, "access_token"), 4000);
        const seconds = Number(part(body, "expires_in"));
        return token ? { token, seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 3600 } : null;
      },
      why: (body) => text(part(body, "error_description")) ?? text(part(body, "error")),
    },
  },
  /**
   * Any other system with an API (an ERP, a warehouse, a shipping company): a base address and a key,
   * connected once. A step writes only the path after the base ("/orders/{{input.id}}") and what it
   * sends; the key goes with it as the connection says, and only to that system.
   */
  api: {
    kind: "api",
    label: "API",
    host: "",
    hostOf: (settings) => {
      const base = settings.base ? baseOf(settings.base) : null;
      return base ? new URL(base).hostname : null;
    },
    // Whatever the system gave, on one line (a name and password for Basic: "name:password").
    key: (typed) => {
      const t = typed.trim();
      return t && t.length <= 4000 && !/[\r\n]/.test(t) && !t.includes("{{") ? t : null;
    },
    keyLooks: "The key is one line, as the other system gave it",
    settings: [
      { id: "base", max: 300, tidy: baseOf, required: true, what: "The base address", looks: "The base address is https:// and a site's name, with no ? or # (like https://erp.example.com/api)" },
      { id: "auth", max: 10, choices: API_AUTH, what: "How the key is sent", looks: "The key is sent as bearer, header or basic" },
      { id: "header", max: 60, tidy: headerName, shownWhen: ["auth", "header"], what: "The header's name", looks: "A header's name is letters, digits and - (like X-API-Key)" },
      { id: "check", max: 200, tidy: pathOf, what: "The path to try", looks: "The path to try comes after the base address (like /me)" },
    ],
    useKey: (key, settings) => (settings.auth === "basic" ? Buffer.from(key).toString("base64") : key),
    actions: API_METHODS.map(
      (m): ReadyAction => ({
        id: m,
        fields: [
          { id: "path", what: "The path", required: true, problem: pathProblem },
          ...(m === "get" || m === "delete" ? [] : [{ id: "body", what: "What is sent", long: true, problem: (w: string) => { const b = apiBody(w); return b && "problem" in b ? b.problem : null; } }]),
        ],
        call: (settings, give) => {
          const path = (give.path ?? "").trim();
          const sent = m === "get" || m === "delete" ? null : apiBody(give.body ?? "");
          return {
            method: m.toUpperCase() as HttpMethod,
            url: `${baseOf(settings.base ?? "") ?? ""}${path.startsWith("/") ? path : `/${path}`}`,
            headers: apiAuth(settings),
            ...(sent && "body" in sent ? { body: sent.body } : {}),
          };
        },
      }),
    ),
    test: {
      sends: false,
      call: (settings) => ({ method: "GET", url: `${baseOf(settings.base ?? "") ?? ""}${settings.check ?? ""}`, headers: apiAuth(settings) }),
      // A few words of what it answered about itself, where it says some.
      said: (body) => text(part(body, "name"), 80) ?? text(part(body, "title"), 80) ?? text(part(body, "email"), 80) ?? text(part(body, "version"), 40) ?? text(part(body, "status"), 40),
    },
    // Systems say why in many shapes: a message, an error (words, or a thing with a message), a detail, a title; or a page.
    why: (body) =>
      typeof body === "string"
        ? text(body.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " "), 200)
        : (text(part(body, "message")) ?? text(part(body, "error")) ?? text(part(part(body, "error"), "message")) ?? text(part(body, "detail")) ?? text(part(body, "title")) ?? text(part(body, "error_description"))),
  },
  ...INFRA_KINDS,
};

export const kindOf = (kind: string): KindDef | null => ((READY_KINDS as readonly string[]).includes(kind) ? KINDS[kind as ReadyKind] : null);

/** The kinds as a page needs them: what to ask for, never how the call is made. */
export function kindsOut() {
  return READY_KINDS.map((k) => {
    const d = KINDS[k];
    return {
      kind: d.kind,
      label: d.label,
      host: d.host,
      settings: d.settings.map((s) => ({ id: s.id, max: s.max, ...(s.required ? { required: true } : {}), ...(s.choices ? { choices: [...s.choices] } : {}), ...(s.shownWhen ? { shownWhen: s.shownWhen } : {}) })),
      actions: d.actions.map((a) => ({ id: a.id, fields: a.fields.map((f) => ({ id: f.id, required: !!f.required, long: !!f.long, ...(f.or ? { or: f.or } : {}) })) })),
      test: { sends: d.test.sends },
      ...(d.look ? { look: true } : {}),
      ...(d.keyFile ? { keyFile: d.keyFile } : {}),
      ...(d.derived?.length ? { derived: d.derived } : {}),
    };
  });
}

/**
 * A connection's settings as they are kept: the kind's own, each a short line with no name in it,
 * and the ones it can't do without. Else which one isn't right, and what it should be.
 */
export function settingsCheck(kind: KindDef, raw: unknown): { settings: Record<string, string> } | { id: string; message: string } {
  const out: Record<string, string> = {};
  const plainOnly = "A setting is a short plain value";
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== "object" || Array.isArray(raw)) return { id: "", message: plainOnly };
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
      // Worked out from the key (a page sends back what it was shown): never taken from what is typed.
      if (kind.derived?.includes(id)) continue;
      const def = kind.settings.find((s) => s.id === id);
      if (!def || typeof v !== "string") return { id, message: plainOnly };
      const value = v.trim();
      // A setting is a plain value: it never names something of a run's, or a secret.
      if (value.length > def.max || value.includes("{{") || value.includes("}}")) return { id, message: def.looks ?? plainOnly };
      if (!value) continue;
      const kept = def.tidy ? def.tidy(value) : value;
      if (kept === null || (def.choices && !def.choices.includes(kept))) return { id, message: def.looks ?? plainOnly };
      out[id] = kept;
    }
  }
  const missing = kind.settings.find((s) => s.required && !out[s.id]);
  if (missing) return { id: missing.id, message: `${missing.what ?? missing.id} is needed` };
  return { settings: out };
}
/** The settings as they are kept, or null when one isn't right (settingsCheck says which). */
export function settingsOf(kind: KindDef, raw: unknown): Record<string, string> | null {
  const c = settingsCheck(kind, raw);
  return "settings" in c ? c.settings : null;
}

/** What a step that uses a connection still lacks: each as a problem says it ("The text is empty"). */
export function missingIn(action: ReadyAction, give: Record<string, unknown> | undefined, has: (setting: string) => boolean): string[] {
  const out: string[] = [];
  for (const f of action.fields) {
    const v = give?.[f.id];
    const empty = v === undefined || v === null || (typeof v === "string" && !v.trim());
    if (f.required && empty && !(f.or && has(f.or))) out.push(`${f.what} is empty`);
    const wrong = !empty && typeof v === "string" && f.problem ? f.problem(v) : null;
    if (wrong) out.push(wrong);
  }
  return out;
}
