// ميزاتي → a whole site → «خلّيه الرئيسية»: the menus its pages make (SiteHome.tsx sends them).
import type { Feature, SiteLink } from "../../api/myFeatures.api";
import { say } from "../../studio/say";
import { shellOf, siteByKey, withChoices } from "../../studio/templates/sites";

/** The site's menus: from its blueprint as it was chosen when it is one of ours, else from its pages' own names (after "Site: "). */
export function siteLinks(f: Feature): { header: SiteLink[]; footer: SiteLink[] } {
  const bp = f.template ? siteByKey(f.template.key) : null;
  if (bp) return shellOf(withChoices(bp, f.template?.site ?? null));
  const links = f.pages.flatMap((p) => {
    if (!p.key) return [];
    const name = p.key === "home" ? say("الرئيسية|Home|דף הבית") : p.name.includes(": ") ? p.name.slice(p.name.indexOf(": ") + 2) : p.name;
    const label = name.slice(0, 60);
    return [{ page: p.key, label: { ar: label, en: label, he: label } }];
  });
  return { header: links, footer: links };
}
