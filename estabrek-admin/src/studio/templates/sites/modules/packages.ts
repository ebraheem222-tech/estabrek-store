/**
 * A game server's packages from its own Tebex webstore (wave G4 of docs/sites-300-plan.ar.md). FiveM servers sell
 * through Tebex alone (Cfx.re's rules), on the owner's own Tebex account: the site shows the webstore's packages in its
 * own look (the backend's lib/tebex.ts reads them with the webstore's public token, a setting) and sends the player to
 * each one on the webstore, where they sign in, pay and get it. The site never takes the payment. Its panel says
 * whether the webstore answers, with its categories and packages.
 */
import { EL, SEC, STACK, say, withSkin } from "../../build";
import { w } from "../../words";
import { PACKAGES_W } from "../siteWords";
import { head, pageHead, type Built, type Part, type SiteModule } from "./kit";

/** The webstore's packages, as the server fills them when the page is served. */
const packagesPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const p = b.use.packages!;
  return SEC(k, [
    head(k, PACKAGES_W.pick, PACKAGES_W.pickSub),
    STACK(k, [EL(k, "tebexPackages", { buy: say(k, PACKAGES_W.buy), all: say(k, PACKAGES_W.all), empty: say(k, PACKAGES_W.empty), note: say(k, PACKAGES_W.note), columns: 3 }, { style: { self: "stretch" } })], { width: "100%" }),
  ], { name: p.title });
};

const NAME = w("الباقات (Tebex)", "Packages (Tebex)", "חבילות (Tebex)");
export const PACKAGES: SiteModule = {
  key: "packages",
  name: NAME,
  note: w("باقات السيرفر من متجر Tebex تبع صاحبه، بشكل الموقع، وكل باقة بتفتح عند Tebex للدفع. الموقع ما بيقبض.", "The server's packages from its owner's Tebex store, in the site's look; each opens on Tebex to pay. The site takes no payment.", "החבילות של השרת מחנות ה-Tebex של הבעלים, בעיצוב האתר; כל חבילה נפתחת ב-Tebex לתשלום. האתר לא גובה."),
  pages: (bp) => [{ key: "packages", slug: "/packages", order: 22, name: bp.modules.packages!.title, seo: bp.modules.packages!.sub, parts: (b) => [pageHead(b.use.packages!.title, b.use.packages!.sub, "soft"), packagesPart(b)] }],
  // Read by the server alone (the shop gets the packages, never the token).
  settings: () => [{ key: "tebexToken", kind: "text", label: PACKAGES_W.token, note: PACKAGES_W.tokenNote, group: NAME, default: "" }],
  panel: () => ({ today: [{ kind: "tebex", key: "tebex", title: PACKAGES_W.panel }] }),
};
