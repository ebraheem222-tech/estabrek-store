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
 */
import type { HttpMethod } from "./fnHttp.js";

export const READY_KINDS = ["telegram", "slack"] as const;
export type ReadyKind = (typeof READY_KINDS)[number];
/** The name a connection's key goes by inside its own calls. It is never one of the owner's secrets. */
export const READY_KEY = "CONNECTION_KEY";
const KEY = `{{secret.${READY_KEY}}}`;
export const READY_LIMITS = { connections: 20, name: 60, key: 400, test: 300 } as const;

export type ReadyCall = { method: HttpMethod; url: string; headers?: Record<string, string>; body?: unknown };
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
export type ReadySetting = { id: string; max: number };
export type ReadyAction = { id: string; fields: ReadyField[]; call: (settings: Record<string, string>, give: Record<string, string>) => ReadyCall };
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
  settings: ReadySetting[];
  actions: ReadyAction[];
  /** A call that shows the key works. `sends`: there is no quieter way to ask than posting a line. */
  test: { sends: boolean; call: (settings: Record<string, string>, text: string) => ReadyCall; said: (body: unknown) => string | null };
  /** Why the service said no, in its own words. */
  why: (body: unknown) => string | null;
};

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const part = (body: unknown, key: string): unknown => (body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>)[key] : undefined);

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
    };
  });
}

/** A connection's settings as they are kept: the kind's own, each a short line with no name in it. Null when one isn't right. */
export function settingsOf(kind: KindDef, raw: unknown): Record<string, string> | null {
  const out: Record<string, string> = {};
  if (raw === undefined || raw === null) return out;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const def = kind.settings.find((s) => s.id === id);
    if (!def || typeof v !== "string") return null;
    const value = v.trim();
    // A setting is a plain value: it never names something of a run's, or a secret.
    if (value.length > def.max || value.includes("{{") || value.includes("}}")) return null;
    if (value) out[id] = value;
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
