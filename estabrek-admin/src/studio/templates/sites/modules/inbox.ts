/**
 * The modules visitors write through: the contact form (into a messages table), the booking request
 * (into a bookings table), and the bell telling the owner of each new one. Visitors may only add rows
 * to these tables; nobody reads them but the store's own members.
 */
import { CARD, COLS, EL, H, P, SEC, STACK, pop, say, withSkin } from "../../build";
import { w } from "../../words";
import { SW } from "../siteWords";
import { branchCard, questionsPart } from "./lists";
import { LIST, S, T, WRITE_ONLY, f, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

/** What a booking asks the visitor to pick: its own options, else the main list's groups. */
const choicesOf = (b: Built) => b.use.booking?.options ?? b.use.offers?.groups ?? [];

/** The visitor's message: a form writing a row into the messages table, beside the branches. */
const contactPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const formCard = CARD(k, [H(k, SW.writeUs, 3, still), EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "name", kind: "text", label: say(k, SW.name), required: true },
      { name: "phone", kind: "phone", label: say(k, SW.phone), required: true },
      { name: "email", kind: "email", label: say(k, SW.email) },
      { name: "message", kind: "long", label: say(k, SW.message), required: true },
    ],
    send: { to: "table", table: "messages" },
    button: say(k, SW.send),
    done: say(k, SW.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  if (!b.use.branches) return SEC(k, [STACK(k, [formCard], { maxWidth: "720px", width: "100%", self: "center" })], { name: SW.contact });
  const places = STACK(k, [H(k, SW.branches, 3), LIST(k, "branches", branchCard(k, b), { columns: 1 })], { gap: 16 });
  return SEC(k, [COLS(k, [3, 2], [[formCard], [places]], { gap: 40, align: "start" })], { name: SW.contact });
};
/** A booking: what to choose, the day, and the steps after. */
const bookingPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const bk = b.use.booking!;
  const formCard = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "name", kind: "text", label: say(k, SW.name), required: true },
      { name: "phone", kind: "phone", label: say(k, SW.phone), required: true },
      { name: "service", kind: "select", label: say(k, bk.ask), required: true, options: choicesOf(b).map(([id, name]) => ({ value: id, label: say(k, name) })) },
      { name: "day", kind: "date", label: say(k, SW.day) },
      { name: "notes", kind: "long", label: say(k, SW.notes) },
    ],
    send: { to: "table", table: "bookings" },
    button: say(k, bk.button),
    done: say(k, bk.done),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const steps = STACK(k, [H(k, SW.howBook, 3), ...SW.bookSteps.map(([t, line], i) => STACK(k, [
    P(k, w(String(i + 1), String(i + 1), String(i + 1)), { ...still, quiet: false, style: { size: 28, weight: 800, color: pop(k), width: "44px" } }),
    STACK(k, [H(k, t, 4, still), P(k, line, still)], { gap: 4 }),
  ], { direction: "row", gap: 16, align: "start" }))], { gap: 20 });
  return SEC(k, [COLS(k, [2, 3], [[steps], [formCard]], { gap: 48, align: "start", phone: "stack" })], { name: bk.title });
};

const contactParts = (b: Built): Part[] => [pageHead(SW.contact, SW.contactSub, "soft"), contactPart(b), S("contact-map", "surface")];
const bookParts = (b: Built): Part[] => [pageHead(b.use.booking!.title, b.use.booking!.sub, "soft"), bookingPart(b), ...(b.use.questions ? [questionsPart(b, "surface", 4)] : [])];

/** A request's state, as the owner moves it along. */
const status = (more: Array<[string, typeof SW.fresh]>) => f.select("status", SW.status, [["fresh", SW.fresh], ...more], { default: "fresh" });

export const CONTACT: SiteModule = {
  key: "contact",
  name: w("التواصل", "Contact", "יצירת קשר"),
  note: w("فورم رسائل الزوار بجدول إلها، والفروع جنبه.", "A form writing visitors' messages into a table of their own, beside the branches.", "טופס שכותב הודעות מבקרים לטבלה משלהן, ליד הסניפים."),
  pages: () => [{ key: "contact", slug: "/reach-us", order: 50, name: SW.contact, seo: SW.contactSub, parts: contactParts }],
  tables: () => [{ key: "messages", slug: "messages", name: SW.messages, fields: [f.text("name", SW.name, { required: true }), f.phone("phone", SW.phone, { required: true }), f.email("email", SW.email), f.long("message", SW.message, { required: true }), status([["replied", SW.replied]])], api: WRITE_ONLY }],
  inbox: ["messages"],
  counts: () => ({ tables: 1, rows: 0 }),
};

export const BOOKING: SiteModule = {
  key: "booking",
  name: w("الحجز", "Booking", "הזמנה"),
  note: w("فورم طلب حجز بجدول إله، وخطوات الحجز.", "A booking request form writing into a table of its own, with the steps after.", "טופס בקשת הזמנה שכותב לטבלה משלו, עם השלבים שאחריו."),
  needs: (bp) => (bp.modules.booking?.options ? [] : ["offers"]),
  pages: (bp) => [{ key: "book", slug: "/book", order: 60, name: bp.modules.booking!.title, seo: bp.modules.booking!.sub, parts: bookParts }],
  tables: (b) => [{ key: "bookings", slug: "bookings", name: SW.bookings, fields: [f.text("name", SW.name, { required: true }), f.phone("phone", SW.phone, { required: true }), f.select("service", b.use.booking!.ask, choicesOf(b)), f.date("day", SW.day), f.long("notes", SW.notes), status([["confirmed", SW.confirmed], ["done", SW.done]])], api: WRITE_ONLY }],
  inbox: ["bookings"],
  counts: () => ({ tables: 1, rows: 0 }),
};

/** The owner is told of each new row the visitors write (a draft: they publish it to switch it on). */
export const NOTIFY: SiteModule = {
  key: "notify",
  name: w("خبّرني", "Tell me", "תודיעו לי"),
  note: w("جرس بلوحة الإدارة مع كل رسالة أو حجز.", "A bell in the admin with each message or booking.", "פעמון בניהול עם כל הודעה או הזמנה."),
  functions: (b) => [{
    key: "notify",
    name: SW.notify,
    note: "بيوصلك جرس بلوحة الإدارة مع كل رسالة أو طلب حجز بيجي من الموقع.",
    def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: `${SW.newRequest}: {{input.row.phone}}`, text: "افتح الجدول لتشوف التفاصيل وترد.", link: "/admin/data" }] },
    triggers: b.inbox.map((table) => ({ kind: "row" as const, config: { table: T(table), on: ["added"] } })),
  }],
};
