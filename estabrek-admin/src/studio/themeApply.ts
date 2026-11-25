/**
 * Plan 3.9c of the themes library: a whole premium theme put on the store in one go. Its home, about and contact
 * pages go to the store's own pages ("/", "/about", "/contact", made when the store has none), and on a store with its
 * own header and footer (a design made in the editor) those two go to them too. Each goes into its page's draft:
 * the shop doesn't change until each page is published, and the draft's «تجاهل» takes a page back as it was (the
 * old sections wait in the draft's bin until then).
 */
import * as PagesAPI from "../api/pages.api";
import type { PageTreeNode } from "../api/pages.api";
import { getSettings } from "../api/settings.api";
import type { ThemeKit } from "./templates/catalog";
import type { W } from "./templates/words";
import { THEME_SLUGS, isPagePart, planTheme, replaceOps, type DesignHeader, type PagePart, type ThemePartKey, type ThemeTarget } from "./themePlan";

export { THEME_SLUGS, planTheme, replaceOps, type ThemePartKey, type ThemeTarget };

export async function readThemePlan(kit: ThemeKit): Promise<ThemeTarget[]> {
  const [pages, settings] = await Promise.all([PagesAPI.listPages(), getSettings()]);
  return planTheme(kit, pages, (settings as { header?: DesignHeader } | null)?.header);
}

/**
 * The chosen parts put into their pages' drafts, one after another; `build` makes a part's sections (fresh ids each
 * time). A page the store doesn't have is made as a draft page of the new editor. Returns what was put where, the
 * home's page first; on a failure, what was done before it stays done (each draft can be let go of on its own).
 */
export async function putTheme(targets: ThemeTarget[], chosen: ReadonlySet<ThemePartKey>, build: (template: string) => PageTreeNode[] | null, names: Record<PagePart, W>, lang: keyof W, step?: (part: ThemePartKey) => void): Promise<Array<{ part: ThemePartKey; pageId: string }>> {
  const done: Array<{ part: ThemePartKey; pageId: string }> = [];
  for (const t of targets) {
    if (!chosen.has(t.part) || t.skip) continue;
    step?.(t.part);
    const nodes = build(t.template);
    if (!nodes?.length) throw new Error(`No sections for ${t.part}`);
    let pageId = t.pageId;
    if (!pageId && isPagePart(t.part)) {
      const page = await PagesAPI.createPage({ name: names[t.part][lang] || names[t.part].en, slug: THEME_SLUGS[t.part] });
      await PagesAPI.setPageFormat(page.id, 2);
      pageId = page.id;
    }
    if (!pageId) continue;
    const { draft } = await PagesAPI.getPageDraft(pageId);
    // No draft yet: the page's tree is the one its first draft starts from.
    const tree = draft?.tree ?? (await PagesAPI.getPageTree(pageId)).tree;
    let rev = draft?.rev;
    for (const ops of replaceOps(tree.root.id, tree.root.children ?? [], nodes)) rev = (await PagesAPI.changePageDraft(pageId, ops, rev)).draft.rev;
    done.push({ part: t.part, pageId });
  }
  return done;
}
