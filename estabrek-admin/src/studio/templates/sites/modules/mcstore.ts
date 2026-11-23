/**
 * A Minecraft server's own store (wave G4 of docs/sites-300-plan.ar.md). Minecraft servers may sell, unlike FiveM's
 * (Tebex alone), through the shop's own payments; but Mojang's rules forbid selling what gives an advantage in the
 * game. Each package says whether it does («بتعطي أفضلية باللعب؟», with the rule and its source): one that does is
 * never shown (the store's list asks for the ones that don't) and never sold (the buying function refuses it), and
 * the panel lists them as held back. Its pages carry Mojang's line («مش منتج رسمي لماينكرافت»).
 *
 * Buying: a package's «اشتري» (signed in) calls the site's function with that row; it writes the purchase (theirs,
 * unpaid) and asks for the payment («اطلب دفع»), and the player is sent to the shop's payment page. Paid, another
 * function moves the purchase to «بتستنّى التسليم» and writes to the player. The server's link (wave G5b, the Paper
 * plugin) gives it by itself once the player linked their Minecraft account: «عم تنعطى» while the server runs the
 * package's command, then given, or failed with why; the staff can still mark it given, or failed and tried again.
 */
import { B, CARD, H, IMG, P, SEC, STACK, pop, withSkin, type Ctx, type N } from "../../build";
import { w, type W } from "../../words";
import { MC_W } from "../siteWords";
import { LIST, T, bound, callBand, f, head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const STATES: Array<[string, W]> = [["unpaid", MC_W.unpaid], ["waiting", MC_W.waiting], ["giving", MC_W.giving], ["given", MC_W.given], ["failed", MC_W.failed]];
/** The call address the store's «اشتري» runs (renamed by an install where it is taken). */
const BUY = "buy-package";

/** A package as the store's card: its picture, name, kind, price, words, and «اشتري» on that row. */
function packageCard(c: Ctx, b: Built): N {
  const first = b.use.mcstore!.rows[0];
  const buy = B(c, MC_W.buy, "#", "solid", still);
  // Signed in: the function asks for the payment for this row, and the player goes to its page.
  buy.props = {
    ...buy.props,
    triggers: [{ on: "click", who: "customer", deny: "signin", do: [{ act: "fn", fn: BUY, input: { package: "{{row_id}}" }, as: "order" }, { act: "link", to: "order_link" }] }],
  };
  return CARD(c, [
    bound(IMG(c, first.title, { aspect: "4 / 3", radius: 14, motion: false }), { src: "picture", alt: "title" }),
    bound(P(c, b.use.mcstore!.kinds[0][1], { ...still, style: { size: 13 } }), { text: "kind" }),
    bound(H(c, first.title, 4, still), { text: "title" }),
    bound(P(c, w(String(first.price), String(first.price), String(first.price)), { ...still, quiet: false, style: { weight: 800, size: 20, color: pop(c) } }), { text: "price" }),
    bound(P(c, first.text, { ...still, style: { size: 15 } }), { text: "summary" }),
    STACK(c, [buy], { direction: "row" }),
  ], { gap: 8, pad: [16, 16, 20, 16] });
}
/** The packages that give no advantage, read in the visitor's browser so each «اشتري» knows its row. */
const packagesPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, MC_W.pick, MC_W.pickSub), LIST(k, "packages", packageCard(k, b), { columns: 3, limit: 24, feed: "live", where: [{ field: "advantage", op: "isFalse" }], empty: MC_W.empty })], { name: MC_W.pick });
};
/** The player's own purchases, and where each stands. */
const minePart: Part = (c) => {
  const k = withSkin(c, "surface");
  const card = CARD(k, [
    STACK(k, [bound(H(k, MC_W.package, 4, still), { text: "package" }), bound(P(k, MC_W.waiting, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "status" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(k, MC_W.price, still), { text: "price" }),
  ], { gap: 8, pad: [18, 20, 18, 20] });
  return SEC(k, [STACK(k, [STACK(k, [H(k, MC_W.mine, 2), P(k, MC_W.mineSub)], { gap: 8 }), LIST(k, "purchases", card, { columns: 1, limit: 12, feed: "added", sort: "newest", empty: MC_W.mineEmpty, signin: MC_W.mineSignin })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: MC_W.mine });
};
/** Mojang's line, where a Minecraft server sells and on its first page. */
export const mcNoticePart: Part = (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [P(k, MC_W.notice, { ...still, style: { size: 13, textAlign: "center", maxWidth: "720px" } })], { name: w("سطر Mojang", "Mojang's line", "השורה של Mojang"), pad: [24, 24, 32, 24] });
};
/** A band on the home page calling to the store. */
export const mcStoreBand = (b: Built): Part => callBand(MC_W.bandTitle, MC_W.bandSub, MC_W.bandButton, b.slugs.store, "bold");

const NAME = w("متجر ماينكرافت", "Minecraft store", "חנות מיינקראפט");
const waitingNow = [{ field: "status", op: "is" as const, value: "waiting" }];
const newest = { field: "$createdAt", dir: "desc" as const };

export const MCSTORE: SiteModule = {
  key: "mcstore",
  name: NAME,
  note: w("باقات ماينكرافت بالدفع تبع المتجر، وبوابة «بتعطي أفضلية؟»: اللي بتعطي أفضلية ما بتنعرض ولا بتنباع، حسب قواعد Mojang. مشتريات بتستنّى التسليم باللوحة.", "Minecraft packages paid through the shop, behind the «gives an advantage?» gate: those that do are never shown or sold, by Mojang's rules. Purchases wait to be given in the panel.", "חבילות מיינקראפט בתשלום דרך החנות, עם שער «נותנת יתרון?»: מה שנותן יתרון לא מוצג ולא נמכר, לפי הכללים של Mojang. רכישות ממתינות למסירה בלוח."),
  pages: (bp) => [{ key: "store", slug: "/store", order: 22, name: bp.modules.mcstore!.title, seo: bp.modules.mcstore!.sub, parts: (b) => [pageHead(b.use.mcstore!.title, b.use.mcstore!.sub, "soft"), packagesPart(b), minePart, mcNoticePart] }],
  tables: (b) => {
    const s = b.use.mcstore!;
    return [
      {
        key: "packages",
        slug: "packages",
        name: MC_W.pick,
        fields: [
          f.text("title", MC_W.package, { required: true }),
          f.select("kind", MC_W.kind, s.kinds),
          f.money("price", MC_W.price),
          f.image("picture", MC_W.picture),
          f.long("summary", MC_W.summary),
          { ...f.bool("advantage", MC_W.advantage), help: MC_W.advantageHelp },
          f.text("command", MC_W.command, { help: MC_W.commandHelp }),
        ],
        // Anyone reads the published ones (the store's list); the command is the server's alone.
        api: { read: "public", create: "off", update: "off", delete: "off", private: ["command"] },
        rows: s.rows.map((r, i) => ({ slug: r.slug, data: { title: r.title, kind: r.kind, price: r.price, picture: b.bp.pics ? `/templates/${b.bp.pics}/product-${(i % 6) + 1}.svg` : `/templates/photo-${(i % 6) + 1}.svg`, summary: r.text, advantage: r.advantage, command: w(r.command, r.command, r.command) } })),
      },
      {
        key: "purchases",
        slug: "purchases",
        name: MC_W.purchases,
        fields: [f.text("package", MC_W.package, { required: true }), f.text("packageId", MC_W.packageId), f.money("price", MC_W.price), f.select("status", MC_W.status, STATES, { default: "unpaid" }), f.long("note", MC_W.note)],
        // Written by the store's functions; the player reads theirs, never the staff's note.
        api: { read: "customer", create: "off", update: "off", delete: "off", private: ["note"] },
      },
    ];
  },
  counts: (bp) => ({ tables: 2, rows: bp.modules.mcstore!.rows.length }),
  panel: () => ({
    numbers: [
      { key: "purchasesWeek", label: MC_W.salesWeek, table: T("purchases"), where: [{ field: "status", op: "isNot", value: "unpaid" }], window: "week", compare: true },
      { key: "purchasesWaiting", label: MC_W.waitingCount, table: T("purchases"), where: waitingNow },
      { key: "packagesHeld", label: MC_W.held, table: T("packages"), where: [{ field: "advantage", op: "is", value: true }] },
    ],
    today: [
      { kind: "queue", key: "purchases", title: MC_W.queue, table: T("purchases"), where: waitingNow, show: ["$by", "package", "price", "$createdAt"], decisions: [{ key: "given", label: MC_W.markGiven, set: { status: "given" }, tone: "good" }, { key: "failed", label: MC_W.markFailed, set: { status: "failed" }, tone: "bad" }], empty: MC_W.queueEmpty },
      { kind: "queue", key: "purchasesFailed", title: MC_W.failedQueue, table: T("purchases"), where: [{ field: "status", op: "is", value: "failed" }], show: ["$by", "package", "note", "$createdAt"], decisions: [{ key: "retry", label: MC_W.retry, set: { status: "waiting" } }], empty: MC_W.failedEmpty },
    ],
    board: [{ kind: "kanban", key: "purchasesBoard", title: MC_W.board, table: T("purchases"), field: "status", show: ["$by", "package", "price"] }],
    lists: [
      { kind: "view", key: "packagesHeld", title: MC_W.held, table: T("packages"), where: [{ field: "advantage", op: "is", value: true }], columns: ["title", "kind", "price", "$status"] },
      { kind: "view", key: "packagesAll", title: MC_W.allPackages, table: T("packages"), columns: ["title", "kind", "price", "advantage", "$status"] },
      { kind: "view", key: "purchasesAll", title: MC_W.allPurchases, table: T("purchases"), columns: ["$by", "package", "price", "status", "$createdAt"], sort: newest, limit: 30 },
    ],
    reports: [
      { kind: "chart", key: "purchasesDaily", title: MC_W.daily, table: T("purchases"), days: 30, split: "status" },
      { kind: "report", key: "purchasesBy", title: MC_W.byStatus, table: T("purchases"), by: "status", columns: ["$by", "package", "price", "status", "$createdAt"] },
    ],
  }),
  functions: () => [
    {
      key: "buyPackage",
      name: MC_W.buyFn.ar,
      note: "كبسة «اشتري» بالمتجر بتشغّلها: بتتأكد إنه الباقة للبيع وما بتعطي أفضلية (قواعد Mojang)، بتكتب الشراية باسم اللاعب، وبتطلب الدفع وبترجّع رابطه.",
      def: {
        lang: "ar",
        inputs: [{ name: "package", type: "text" }],
        do: [
          { act: "get", table: T("packages"), row: "{{input.package}}", as: "pkg" },
          { act: "if", if: [{ left: "{{pkg}}", cmp: "empty" }], do: [{ act: "stop", message: MC_W.gone.ar }] },
          { act: "if", if: [{ left: "{{pkg.$status}}", cmp: "ne", right: "PUBLISHED" }], do: [{ act: "stop", message: MC_W.notForSale.ar }] },
          // The gate: what gives an advantage is never sold.
          { act: "if", if: [{ left: "{{pkg.advantage}}", cmp: "eq", right: true }], do: [{ act: "stop", message: MC_W.gate.ar }] },
          { act: "add", table: T("purchases"), values: { package: "{{pkg.title}}", packageId: "{{pkg.$id}}", price: "{{pkg.price}}", status: "unpaid" }, owner: "{{caller.id}}", as: "buy" },
          { act: "pay", title: "{{pkg.title}}", amount: "{{pkg.price}}", ref: "{{buy.$id}}", email: "{{caller.email}}", back: "/store", as: "payment" },
          { act: "return", value: { link: "{{payment.link}}" } },
        ],
      },
      triggers: [{ kind: "call", config: { who: "customer", perMinute: 10 }, slug: BUY }],
    },
    {
      key: "packagePaid",
      name: MC_W.paidFn.ar,
      note: "لما تندفع باقة: الشراية بتصير «بتستنّى التسليم»، بيوصلك جرس، وبيوصل اللاعب إيميل. الدفعات التانية (حجوزات وغيرها) ما بتلمسها.",
      def: {
        lang: "ar",
        inputs: [{ name: "ref", type: "text" }, { name: "email", type: "text" }],
        do: [
          { act: "get", table: T("purchases"), row: "{{input.ref}}", as: "buy" },
          {
            act: "if",
            if: [{ left: "{{buy}}", cmp: "notEmpty" }, { left: "{{buy.status}}", cmp: "eq", right: "unpaid" }],
            do: [
              { act: "change", table: T("purchases"), row: "{{buy.$id}}", values: { status: "waiting" } },
              { act: "notify", title: "انباعت باقة: {{buy.package}}", text: "إذا لينك السيرفر شغّال واللاعب رابط حسابه، بتنعطى باللعبة لحالها. وإلا سلّمها من «بتستنّى التسليم» بلوحة الموقع.", link: "/admin/data" },
              { act: "if", if: [{ left: "{{input.email}}", cmp: "notEmpty" }], do: [{ act: "email", to: "{{input.email}}", subject: "شكراً عالدعم!", text: "وصلنا دفعك لـ {{buy.package}}. بتوصلك باللعبة، ولحالها كمان إذا ربطت حساب ماينكرافت تبعك من «حسابي» (‎/link والكود). وبتشوف وين وصلت بـ «مشترياتي» بصفحة المتجر." }] },
            ],
          },
        ],
      },
      triggers: [{ kind: "event", config: { event: "payment.paid" } }],
    },
  ],
};
