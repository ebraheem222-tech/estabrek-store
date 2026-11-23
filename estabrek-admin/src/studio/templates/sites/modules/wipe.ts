/**
 * A game server's wipes («المسح», wave G6b of docs/sites-300-plan.ar.md): when its world starts over (a Rust server's
 * map and blueprints, a season). The schedule is the site's settings (every week, every two weeks, the first such
 * weekday of each month as Rust's forced wipe, or one day; the weekday, the hour, the server's time zone, a note); the
 * backend (lib/wipes.ts) works out the next wipe and the last as a page is served. The home page has the countdown
 * under the status, and «مواعيد المسح» has it big with what each wipe takes. The panel says when the next one is.
 */
import { CARD, EL, GRID, H, P, SEC, STACK, pop, say, withSkin, type Ctx } from "../../build";
import { w } from "../../words";
import type { CountdownWords, WipeUse } from "../blueprint";
import { WIPE_W } from "../siteWords";
import { head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const NAME = w("مواعيد المسح", "Wipe days", "מועדי המחיקה");
/** The countdown's words: the site's own (a race, a season, the update day), else the wipe's. */
const wordsOf = (u: WipeUse): CountdownWords => u.words ?? { next: WIPE_W.next, done: WIPE_W.done, none: WIPE_W.none, what: WIPE_W.whatTitle, whatSub: WIPE_W.whatSub };
const countdown = (k: Ctx, u: WipeUse, size: "big" | "small") => {
  const t = wordsOf(u);
  return EL(k, "wipeCountdown", { title: say(k, t.next), done: say(k, t.done), none: say(k, t.none), size }, { style: { self: "stretch" } });
};

/** On the home page, under the status: the countdown to the next wipe. */
export const wipeBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [STACK(k, [countdown(k, b.use.wipe!, "small")], { width: "100%", maxWidth: "720px", self: "center" })], { name: b.use.wipe!.title, pad: [56, 24, 56, 24] });
};

/** «مواعيد المسح»: the countdown big, and what each wipe takes. */
const wipeParts = (b: Built): Part[] => {
  const u = b.use.wipe!;
  const what: Part = (c) => {
    const k = withSkin(c, "plain");
    return SEC(k, [
      head(k, wordsOf(u).what, wordsOf(u).whatSub),
      GRID(k, Math.min(3, u.what.length), u.what.map(([title, line]) => CARD(k, [H(k, title, 4, still), P(k, line, still)], { gap: 6 })), { gap: 20, phone: 1 }),
    ], { name: wordsOf(u).what });
  };
  const big: Part = (c) => {
    const k = withSkin(c, "night");
    return SEC(k, [STACK(k, [P(k, u.line, { ...still, style: { size: 18, maxWidth: "620px", color: pop(k) } }), countdown(k, u, "big")], { gap: 24, align: "center", textAlign: "center", width: "100%", maxWidth: "820px", self: "center" })], { name: WIPE_W.next, pad: [72, 24, 72, 24] });
  };
  return [pageHead(u.title, u.sub, "soft"), big, what];
};

const EVERY: Array<[WipeUse["every"], typeof WIPE_W.weekly]> = [["monthly", WIPE_W.monthly], ["weekly", WIPE_W.weekly], ["biweekly", WIPE_W.biweekly], ["date", WIPE_W.once]];
const DAYS: Array<[WipeUse["day"], typeof WIPE_W.thu]> = [["mon", WIPE_W.mon], ["tue", WIPE_W.tue], ["wed", WIPE_W.wed], ["thu", WIPE_W.thu], ["fri", WIPE_W.fri], ["sat", WIPE_W.sat], ["sun", WIPE_W.sun]];
/** The time zones a server most often runs on, by the ids the backend knows (lib/wipes.ts WIPE_ZONES; Rust's forced wipe is London's evening). */
const ZONES: Array<[string, ReturnType<typeof w>]> = [
  ["london", w("لندن", "London", "לונדון")],
  ["utc", w("UTC", "UTC", "UTC")],
  ["berlin", w("برلين", "Berlin", "ברלין")],
  ["istanbul", w("إسطنبول", "Istanbul", "איסטנבול")],
  ["jerusalem", w("القدس", "Jerusalem", "ירושלים")],
  ["amman", w("عمّان", "Amman", "עמאן")],
  ["beirut", w("بيروت", "Beirut", "ביירות")],
  ["riyadh", w("الرياض", "Riyadh", "ריאד")],
  ["dubai", w("دبي", "Dubai", "דובאי")],
  ["new-york", w("نيويورك", "New York", "ניו יורק")],
  ["los-angeles", w("لوس أنجلوس", "Los Angeles", "לוס אנג'לס")],
];
const options = <K extends string>(list: Array<[K, ReturnType<typeof w>]>) => list.map(([id, name]) => ({ id, name }));

export const WIPE: SiteModule = {
  key: "wipe",
  name: NAME,
  note: w("عدّاد للمسح الجاي وجدول متكرّر (كل أسبوع، كل أسبوعين، أول خميس بالشهر متل مسح Rust، أو يوم واحد)، بتوقيت السيرفر، مع شو بينمسح.", "A countdown to the next wipe and a repeating schedule (every week, every two weeks, the first Thursday of the month like Rust's forced wipe, or one day), on the server's time, with what each wipe takes.", "ספירה לאחור למחיקה הבאה ולוח זמנים חוזר (כל שבוע, כל שבועיים, יום חמישי הראשון בחודש כמו המחיקה של Rust, או יום אחד), לפי שעון השרת, עם מה שנמחק."),
  pages: (bp) => [{ key: "wipe", slug: bp.modules.wipe!.slug ?? "/wipe", order: 21, name: bp.modules.wipe!.title, seo: bp.modules.wipe!.sub, parts: wipeParts }],
  // Read by the server alone: it works out the next wipe and the last as a page is served.
  settings: (bp) => {
    const u = bp.modules.wipe!;
    return [
      { key: "wipeEvery", kind: "choice", label: WIPE_W.every, group: u.title, default: u.every, options: options(EVERY) },
      { key: "wipeDay", kind: "choice", label: WIPE_W.day, group: u.title, default: u.day, options: options(DAYS) },
      { key: "wipeTime", kind: "text", label: WIPE_W.time, note: WIPE_W.timeNote, group: u.title, default: u.time },
      { key: "wipeZone", kind: "choice", label: WIPE_W.zone, note: WIPE_W.zoneNote, group: u.title, default: u.zone, options: options(ZONES) },
      { key: "wipeFrom", kind: "text", label: WIPE_W.from, note: WIPE_W.fromNote, group: u.title, default: u.from ?? "" },
      { key: "wipeNote", kind: "words", label: WIPE_W.note, group: u.title, long: true, default: u.note },
    ];
  },
  panel: (bp) => ({ today: [{ kind: "wipe", key: "wipe", title: wordsOf(bp.modules.wipe!).next }] }),
};
