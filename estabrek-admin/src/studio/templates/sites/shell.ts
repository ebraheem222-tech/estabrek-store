/**
 * A site's shell when it is made the store's home (admin → ميزاتي → a site → «خلّيه الرئيسية»; backend
 * modules/admin/siteHome.ts): the store's menu above and the one below become the site's pages, in the
 * site's order, under their names in the three languages. Sent by page key: the server puts each page's
 * address in, so a page given another address keeps its link.
 */
import type { W } from "../words";
import type { SiteBlueprint } from "./blueprint";
import { pagesOf } from "./compile";
import { SW } from "./siteWords";

export type ShellLink = { page: string; label: W };
export type Shell = { header: ShellLink[]; footer: ShellLink[] };

/** The menus a site brings: every page, its first one as «الرئيسية». */
export function shellOf(bp: SiteBlueprint): Shell {
  const links = pagesOf(bp).map((p) => ({ page: p.key, label: p.key === "home" ? SW.homeLink : p.name }));
  return { header: links, footer: links };
}
