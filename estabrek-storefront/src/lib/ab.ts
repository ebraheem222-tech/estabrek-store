/**
 * A/B tests (admin → تجارب A/B). The running tests come with the public settings
 * (site.experiments), written into the page by the root layout
 * (window.__estabrekAb), where a small script picks A or B for each test before
 * the page shows (abHeadScript). The choice is kept for this visit only
 * (sessionStorage): no cookie, nothing about the shopper; a new visit may get the
 * other side. Browsers asking not to be tracked, or without sessionStorage, are
 * left out (they see the shop as set).
 *
 * Once per visit and test, the shop says (backend lib/experiments.ts): the visit
 * (when the tested thing is used), a bag add, an order and its total.
 */
import { apiBaseClient } from "./apiClient";

export type AbKind = "heroOpening" | "motion";
export type AbTest = { id: string; kind: AbKind; field: string | null; a: unknown; b: unknown; split: number };
export type AbSide = "A" | "B";
type Event = { x: string; v: AbSide; k: "visit" | "bag" | "order"; a?: number };

const PICKS = "estabrek_ab";
const SENT = "estabrek_ab_sent";

type AbWindow = Window & { __estabrekAb?: unknown };

/** The running tests, checked (anything odd is left out). */
export function abTests(raw: unknown = typeof window === "undefined" ? [] : (window as AbWindow).__estabrekAb): AbTest[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (t): t is AbTest =>
      !!t &&
      typeof t === "object" &&
      typeof (t as AbTest).id === "string" &&
      ((t as AbTest).kind === "heroOpening" || (t as AbTest).kind === "motion") &&
      Number.isFinite((t as AbTest).split),
  );
}

function leftOut() {
  try {
    const n = navigator as Navigator & { globalPrivacyControl?: boolean };
    return n.globalPrivacyControl === true || n.doNotTrack === "1";
  } catch {
    return true;
  }
}

function read(key: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(key) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return null;
  }
}

function write(key: string, v: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked */
  }
}

const listeners = new Set<() => void>();

/** Told when a side is picked after the page showed (the hero re-reads its choice). */
export function onAbChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** This visit's side in a test (picked now if the head script didn't), or null when left out. */
export function abSide(t: AbTest, random = Math.random): AbSide | null {
  if (typeof window === "undefined" || leftOut()) return null;
  const picks = read(PICKS);
  if (!picks) return null;
  const v = picks[t.id];
  if (v === "A" || v === "B") return v;
  const side: AbSide = random() * 100 < t.split ? "B" : "A";
  write(PICKS, { ...picks, [t.id]: side });
  for (const fn of listeners) fn();
  return side;
}

/** The value this visit sees, if a side is already picked; nothing is picked or counted. */
export function abPeek(kind: AbKind, field: string | null = null): unknown {
  if (typeof window === "undefined" || leftOut()) return null;
  const t = abTests().find((x) => x.kind === kind && (kind !== "motion" || x.field === field));
  const picks = t ? read(PICKS) : null;
  const v = t && picks ? picks[t.id] : null;
  return t && (v === "A" || v === "B") ? (v === "B" ? t.b : t.a) : null;
}

/** The value this visit sees for the tested thing (and counts the visit), or null when not tested. */
export function abValue(kind: AbKind, field: string | null = null): { value: unknown; test: AbTest; side: AbSide } | null {
  const t = abTests().find((x) => x.kind === kind && (kind !== "motion" || x.field === field));
  if (!t) return null;
  const side = abSide(t);
  if (!side) return null;
  report([{ x: t.id, v: side, k: "visit" }]);
  return { value: side === "B" ? t.b : t.a, test: t, side };
}

/** A bag add or an order: counted for each test this visit saw (once per visit). */
export function abConvert(k: "bag" | "order", amount?: number) {
  if (typeof window === "undefined" || leftOut()) return;
  const picks = read(PICKS);
  const sent = read(SENT);
  if (!picks || !sent) return;
  const events: Event[] = [];
  for (const t of abTests()) {
    const side = picks[t.id];
    if ((side !== "A" && side !== "B") || !(sent[`${t.id}|visit`])) continue;
    events.push({ x: t.id, v: side, k, ...(k === "order" && amount != null && Number.isFinite(amount) ? { a: Math.max(0, Math.round(amount * 100) / 100) } : {}) });
  }
  report(events);
}

let unsupported = false;

/** Sends what wasn't sent yet in this visit (each test and kind once). */
function report(events: Event[]) {
  if (unsupported || !events.length) return;
  const sent = read(SENT);
  if (!sent) return;
  const fresh = events.filter((e) => !sent[`${e.x}|${e.k}`]);
  if (!fresh.length) return;
  write(SENT, { ...sent, ...Object.fromEntries(fresh.map((e) => [`${e.x}|${e.k}`, 1])) });
  try {
    void fetch(`${apiBaseClient()}/storefront/ab`, {
      method: "POST",
      body: JSON.stringify({ e: fresh.slice(0, 10) }),
      headers: { "Content-Type": "text/plain" },
      credentials: "omit",
      keepalive: true,
    })
      .then((res) => {
        if (res.status === 404 || res.status === 405) unsupported = true;
      })
      .catch(() => undefined);
  } catch {
    /* counting must never break the shop */
  }
}

/**
 * The head script (before the page shows): picks the sides, and when the home
 * page's opening is tested, marks <html data-ab-hero="film|photo"> so the other
 * opening stays hidden until the page switches to this visit's (globals.css).
 * The mark goes after 4 s whatever happens.
 */
export function abHeadScript(tests: AbTest[]): string {
  const json = JSON.stringify(tests).replace(/</g, "\\u003c");
  return `window.__estabrekAb=${json};(function(){try{var c=window.__estabrekAb;if(!c.length)return;var n=navigator;if(n.globalPrivacyControl===true||n.doNotTrack==="1")return;var k="${PICKS}",s=JSON.parse(sessionStorage.getItem(k)||"{}")||{},d=document.documentElement;for(var i=0;i<c.length;i++){var t=c[i];if(s[t.id]!=="A"&&s[t.id]!=="B")s[t.id]=Math.random()*100<t.split?"B":"A";if(t.kind==="heroOpening"){d.setAttribute("data-ab-hero",String(s[t.id]==="B"?t.b:t.a));setTimeout(function(){d.removeAttribute("data-ab-hero")},4000)}}sessionStorage.setItem(k,JSON.stringify(s))}catch(e){}})();`;
}

/** Tests: start a visit over. */
export function resetAbForTests() {
  unsupported = false;
  try {
    sessionStorage.removeItem(PICKS);
    sessionStorage.removeItem(SENT);
  } catch {
    /* ignore */
  }
}
