/**
 * A game server's link (wave G5 of docs/sites-300-plan.ar.md): the piece its owner puts on the game server (a FiveM
 * resource; the backend's lib/gameLink.ts stamps it with the site's key as it is downloaded from the panel). It says
 * hello every minute, links a player's game account to their account on the site (/link and the code from «حسابي»),
 * and keeps the server's whitelist: while on, only those in the whitelist table come in. The panel says when it last
 * spoke and gives the download; the whitelist is one of the site's settings, and a quick action.
 */
import { w } from "../../words";
import { LINK_W } from "../siteWords";
import type { SiteModule } from "./kit";

const NAME = w("لينك السيرفر", "The server's link", "הקישור לשרת");
export const LINK: SiteModule = {
  key: "link",
  name: NAME,
  note: w("قطعة صغيرة بتنحط على سيرفر اللعبة وبتحكي مع الموقع: الوايتلست، وربط حساب اللاعب بكود. ما في منفذ بينفتح.", "A small piece put on the game server that talks to the site: the whitelist, and linking a player's account by a code. No port opens.", "רכיב קטן שמותקן בשרת המשחק ומדבר עם האתר: הרשימה הלבנה וקישור חשבון השחקן בקוד. שום פורט לא נפתח."),
  needs: () => ["status"],
  // Read by the server alone (the link asks for them).
  settings: () => [
    { key: "whitelistOn", kind: "toggle", label: LINK_W.whitelistOn, note: LINK_W.whitelistOnNote, group: NAME, default: false },
    { key: "whitelistMessage", kind: "words", label: LINK_W.whitelistMessage, group: NAME, long: true, default: LINK_W.whitelistText },
  ],
  panel: () => ({
    today: [{ kind: "link", key: "link", title: LINK_W.panel }],
    actions: [
      { key: "whitelistShow", label: LINK_W.whitelistShow, setting: "whitelistOn", value: true },
      { key: "whitelistHide", label: LINK_W.whitelistHide, setting: "whitelistOn", value: false },
    ],
  }),
};
