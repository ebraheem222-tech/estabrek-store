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

export const READY_KINDS = ["telegram", "slack", "google"] as const;
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
};
export type ReadySetting = { id: string; max: number; /** The value as it is kept, from what was typed (a sheet's address → its id); null when it isn't one. */ tidy?: (typed: string) => string | null };
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
  /** The one site this kind calls. */
  host: string;
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
  actions: ReadyAction[];
  /**
   * A call that shows the key works. `sends`: there is no quieter way to ask than posting a line.
   * No call (null): the key traded for a token was the test.
   */
  test: { sends: boolean; call: (settings: Record<string, string>, text: string) => ReadyCall | null; said: (body: unknown, settings?: Record<string, string>) => string | null };
  /** Why the service said no, in its own words. */
  why: (body: unknown) => string | null;
  /** The key traded for a short-lived token before a call: what is asked, of which address, and what the answer holds. */
  token?: {
    ask: (key: string, now: number) => { url: string; type: string; body: string };
    read: (body: unknown) => { token: string; seconds: number } | null;
    why: (body: unknown) => string | null;
  };
};

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const part = (body: unknown, key: string): unknown => (body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>)[key] : undefined);

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
      settings: d.settings.map((s) => ({ id: s.id, max: s.max })),
      actions: d.actions.map((a) => ({ id: a.id, fields: a.fields.map((f) => ({ id: f.id, required: !!f.required, long: !!f.long, ...(f.or ? { or: f.or } : {}) })) })),
      test: { sends: d.test.sends },
      ...(d.keyFile ? { keyFile: d.keyFile } : {}),
      ...(d.derived?.length ? { derived: d.derived } : {}),
    };
  });
}

/** A connection's settings as they are kept: the kind's own, each a short line with no name in it. Null when one isn't right. */
export function settingsOf(kind: KindDef, raw: unknown): Record<string, string> | null {
  const out: Record<string, string> = {};
  if (raw === undefined || raw === null) return out;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    // Worked out from the key (a page sends back what it was shown): never taken from what is typed.
    if (kind.derived?.includes(id)) continue;
    const def = kind.settings.find((s) => s.id === id);
    if (!def || typeof v !== "string") return null;
    const value = v.trim();
    // A setting is a plain value: it never names something of a run's, or a secret.
    if (value.length > def.max || value.includes("{{") || value.includes("}}")) return null;
    if (!value) continue;
    const kept = def.tidy ? def.tidy(value) : value;
    if (kept === null) return null;
    out[id] = kept;
  }
  return out;
}

/** What a step that uses a connection still lacks: each as a problem says it ("The text is empty"). */
export function missingIn(action: ReadyAction, give: Record<string, unknown> | undefined, has: (setting: string) => boolean): string[] {
  const out: string[] = [];
  for (const f of action.fields) {
    const v = give?.[f.id];
    const empty = v === undefined || v === null || (typeof v === "string" && !v.trim());
    if (f.required && empty && !(f.or && has(f.or))) out.push(`${f.what} is empty`);
  }
  return out;
}
