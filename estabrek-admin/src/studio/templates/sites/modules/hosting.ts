/**
 * Ordering a game server from a hosting company («طلب سيرفر», wave G7d2 of docs/sites-300-plan.ar.md). Its plans are
 * the site's main list (a section a game, each plan's price a month and what it holds). A signed-in customer picks a
 * plan, a place and a name on the order page: a function checks the plan, writes the order in their name, asks for the
 * payment through the store itself (a payment page, lib/payLinks.ts) and sends them to it. Once paid, the order waits to
 * be set up (a bell); the team writes the access details and presses «جاهز» on the panel, and the customer gets an email.
 * «سيرفراتي» lists their orders with where each stands, its payment page and, once ready, its access details.
 */
import { B, CARD, COLS, EL, H, P, SEC, STACK, pop, say, withSkin, type Ctx, type N } from "../../build";
import type { W } from "../../words";
import { HOST_W } from "../siteWords";
import { LIST, T, bound, f, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const STATES: Array<[string, W]> = [["unpaid", HOST_W.unpaid], ["setup", HOST_W.setup], ["ready", HOST_W.ready], ["cancelled", HOST_W.cancelled]];
/** The order function's call address (the order page's form calls it). */
export const ORDER = "order-server";

const orderForm = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const o = b.use.offers!;
  const h = b.use.hosting!;
  const form = EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "plan", kind: "select", label: say(k, HOST_W.plan), required: true, options: o.rows.map((r) => ({ value: r.slug, label: say(k, r.title) })) },
      { name: "location", kind: "select", label: say(k, HOST_W.location), required: true, options: h.locations.map(([value, label]) => ({ value, label: say(k, label) })) },
      { name: "name", kind: "text", label: say(k, HOST_W.serverName), required: true },
      { name: "notes", kind: "long", label: say(k, HOST_W.notes) },
    ],
    send: { to: "fn", fn: ORDER, as: "order" },
    button: say(k, HOST_W.send),
    done: say(k, HOST_W.sent),
  }, { style: { self: "stretch" } });
  // Once the function answers, the customer goes to the payment page it made.
  form.props = { ...form.props, triggers: [{ on: "sent", do: [{ act: "link", to: "order_link" }] }] };
  const side = STACK(k, [H(k, HOST_W.formTitle, 3, still), P(k, HOST_W.formSub, still), STACK(k, [B(k, o.title, b.slugs.offers, "outline", still)], { direction: "row" })], { gap: 12 });
  return SEC(k, [COLS(k, [2, 3], [[side], [CARD(k, [form], { gap: 16, pad: [32, 28, 32, 28] })]], { gap: 48, align: "start", phone: "stack" })], { name: HOST_W.formTitle });
};
/** The customer's own orders, read in their browser: the plan and name, where it stands, its payment page, the access details. */
function orderCard(k: Ctx): N {
  const pay = B(k, HOST_W.payLink, "#", "outline", still);
  return CARD(k, [
    STACK(k, [bound(H(k, HOST_W.serverField, 4, still), { text: "name" }), bound(P(k, HOST_W.unpaid, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "status" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    STACK(k, [bound(P(k, HOST_W.plan, { ...still, style: { size: 14 } }), { text: "plan" }), bound(P(k, HOST_W.location, { ...still, style: { size: 14 } }), { text: "location" })], { direction: "row", gap: 12, wrap: true }),
    bound(P(k, HOST_W.noAccess, { ...still, quiet: false, style: { size: 15 } }), { text: "access" }),
    STACK(k, [bound(pay, { href: "payLink" })], { direction: "row" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
}
const minePart: Part = (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [STACK(k, [STACK(k, [H(k, HOST_W.mine, 2), P(k, HOST_W.mineSub)], { gap: 8 }), LIST(k, "orders", orderCard(k), { columns: 1, limit: 12, feed: "added", sort: "newest", empty: HOST_W.mineEmpty, signin: HOST_W.mineSignin })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: HOST_W.mine });
};

const became = (state: string) => [{ left: "{{input.row.status}}", cmp: "eq", right: state }, { left: "{{input.before.status}}", cmp: "ne", right: state }];

export const HOSTING: SiteModule = {
  key: "hosting",
  name: HOST_W.name,
  note: HOST_W.note,
  needs: () => ["offers"],
  pages: (bp) => [
    { key: "order", slug: "/order-server", order: 11, name: bp.modules.hosting!.title, seo: bp.modules.hosting!.sub, parts: (b) => [pageHead(b.use.hosting!.title, b.use.hosting!.sub, "soft"), orderForm(b)] },
    { key: "myServers", slug: "/my-servers", order: 38, name: HOST_W.mine, seo: HOST_W.mineSub, menu: false, parts: () => [minePart] },
  ],
  tables: (b) => [{
    key: "orders",
    slug: "orders",
    name: HOST_W.orders,
    fields: [
      f.text("plan", HOST_W.plan, { required: true, max: 120 }),
      f.text("planKey", HOST_W.planKey, { max: 80 }),
      f.money("price", HOST_W.price),
      f.select("location", HOST_W.location, b.use.hosting!.locations),
      f.text("name", HOST_W.serverField, { required: true, max: 60 }),
      f.long("notes", HOST_W.notesField, { max: 1000 }),
      f.select("status", HOST_W.status, STATES, { default: "unpaid" }),
      f.link("payLink", HOST_W.payLink),
      { ...f.long("access", HOST_W.access), help: HOST_W.accessHelp },
      f.long("staffNotes", HOST_W.staffNotes),
    ],
    // Written by the order function in the customer's name; theirs to read (never the team's notes); nobody writes it from outside.
    api: { read: "customer", create: "off", update: "off", delete: "off", private: ["staffNotes"] },
  }],
  counts: () => ({ tables: 1, rows: 0 }),
  panel: () => ({
    numbers: [
      { key: "ordersWeek", label: HOST_W.week, table: T("orders"), where: [{ field: "status", op: "isNot", value: "unpaid" }], window: "week", compare: true },
      { key: "ordersSetup", label: HOST_W.toSetUp, table: T("orders"), where: [{ field: "status", op: "is", value: "setup" }] },
    ],
    today: [{
      kind: "queue",
      key: "ordersQueue",
      title: HOST_W.queue,
      table: T("orders"),
      where: [{ field: "status", op: "is", value: "setup" }],
      show: ["$by", "plan", "name", "location", "notes", "access"],
      decisions: [{ key: "ready", label: HOST_W.markReady, set: { status: "ready" }, tone: "good" }],
      empty: HOST_W.none,
    }],
    board: [{ kind: "kanban", key: "ordersBoard", title: HOST_W.board, table: T("orders"), field: "status", show: ["$by", "plan", "name"] }],
    lists: [{ kind: "view", key: "ordersAll", title: HOST_W.all, table: T("orders"), columns: ["$by", "plan", "name", "location", "price", "status", "$createdAt"], sort: { field: "$createdAt", dir: "desc" }, limit: 50 }],
    reports: [{ kind: "chart", key: "ordersDaily", title: HOST_W.daily, table: T("orders"), days: 30, split: "status" }],
  }),
  functions: () => [
    {
      key: "orderServer",
      name: HOST_W.orderFn.ar,
      note: "فورم «اطلب سيرفرك» بيشغّلها: بتتأكّد إنه الخطة منشورة، بتكتب الطلب باسم الزبون، بتطلب الدفع وبترجّع رابط صفحة الدفع.",
      def: {
        lang: "ar",
        inputs: [{ name: "plan", type: "text" }, { name: "location", type: "text" }, { name: "name", type: "text" }, { name: "notes", type: "text" }],
        do: [
          { act: "get", table: T("offers"), row: "{{input.plan}}", as: "p" },
          { act: "if", if: [{ left: "{{p}}", cmp: "empty" }], do: [{ act: "stop", message: HOST_W.gone.ar }] },
          { act: "if", if: [{ left: "{{p.$status}}", cmp: "ne", right: "PUBLISHED" }], do: [{ act: "stop", message: HOST_W.gone.ar }] },
          { act: "add", table: T("orders"), values: { plan: "{{p.title}}", planKey: "{{p.$slug}}", price: "{{p.price}}", location: "{{input.location}}", name: "{{input.name}}", notes: "{{input.notes}}", status: "unpaid" }, owner: "{{caller.id}}", as: "o" },
          { act: "pay", title: "{{p.title}}: {{input.name}}", amount: "{{p.price}}", ref: "{{o.$id}}", email: "{{caller.email}}", back: "/my-servers", as: "payment" },
          { act: "change", table: T("orders"), row: "{{o.$id}}", values: { payLink: "{{payment.link}}" } },
          { act: "return", value: { link: "{{payment.link}}" } },
        ],
      },
      triggers: [{ kind: "call", config: { who: "customer", perMinute: 5 }, slug: ORDER }],
    },
    {
      key: "orderPaid",
      name: HOST_W.paidFn.ar,
      note: "لما يندفع طلب سيرفر: بيصير «عم نجهّزه»، وبيوصلك جرس، وبيوصل الزبون إيميل. الدفعات التانية ما بتلمسها.",
      def: {
        lang: "ar",
        inputs: [{ name: "ref", type: "text" }, { name: "email", type: "text" }],
        do: [
          { act: "get", table: T("orders"), row: "{{input.ref}}", as: "o" },
          {
            act: "if",
            if: [{ left: "{{o}}", cmp: "notEmpty" }, { left: "{{o.status}}", cmp: "eq", right: "unpaid" }],
            do: [
              { act: "change", table: T("orders"), row: "{{o.$id}}", values: { status: "setup" } },
              { act: "notify", title: "سيرفر اندفع: {{o.name}} ({{o.plan}})", text: "جهّزه، اكتب معلومات الدخول بالطلب، واكبس «جاهز» بلوحة الموقع.", link: "/admin/data" },
              { act: "if", if: [{ left: "{{input.email}}", cmp: "notEmpty" }], do: [{ act: "email", to: "{{input.email}}", subject: "وصلنا دفعك: {{o.name}}", text: "شكراً! عم نجهّز سيرفرك ({{o.plan}}). بيوصلك إيميل لما يكون جاهز، ومعلومات الدخول بصفحة «سيرفراتي»." }] },
            ],
          },
        ],
      },
      triggers: [{ kind: "event", config: { event: "payment.paid" } }],
    },
    {
      key: "orderReady",
      name: HOST_W.readyFn.ar,
      note: "لما يصير طلب «جاهز»، بيوصل للزبون إيميل فيه معلومات الدخول.",
      def: {
        lang: "ar",
        inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
        if: became("ready"),
        do: [
          { act: "customer", who: "{{input.row.$owner}}", mark: "read", as: "buyer" },
          { act: "email", to: "{{buyer.email}}", subject: "سيرفرك جاهز: {{input.row.name}}", text: "أهلين {{buyer.name}}،\nسيرفرك جاهز.\n{{input.row.access}}\nبتلاقي كل سيرفراتك بصفحة «سيرفراتي»." },
        ],
      },
      triggers: [{ kind: "row", config: { table: T("orders"), on: ["changed"] } }],
    },
  ],
};
