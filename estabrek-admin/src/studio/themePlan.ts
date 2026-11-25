/**
 * Plan 3.9c of the themes library: where a whole premium theme's parts go on a store, and the draft changes that put
 * a part in place of what a page holds. Pure (themeApply.ts does the calls; the backend's test runs these changes
 * through its real drafts).
 */
import type { Page, PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { ThemeKit } from "./templates/catalog";

export type ThemePartKey = ThemeKit["parts"][number]["part"];
export type ThemeTarget = {
  part: ThemePartKey;
  /** The part's template (catalog.ts). */
  template: string;
  /** The store's page it goes into; null: a new one is made (a page), or it can't go (a header or footer). */
  pageId: string | null;
  slug: string | null;
  /** A header or footer on a store whose header and footer come with its theme (no design of its own to put them in). */
  skip?: "no-design";
};

export const THEME_SLUGS = { home: "/", about: "/about", contact: "/contact" } as const;
export type PagePart = keyof typeof THEME_SLUGS;
export const isPagePart = (p: ThemePartKey): p is PagePart => p in THEME_SLUGS;

export type DesignHeader = { storeDesign?: { mode?: string; headerId?: string; footerId?: string } } | null | undefined;

/** Where each of the theme's parts would go on this store (its pages and its own header and footer, if it has them). */
export function planTheme(kit: ThemeKit, pages: Array<Pick<Page, "id" | "slug" | "kind">>, header: DesignHeader): ThemeTarget[] {
  const design = header?.storeDesign;
  return kit.parts.map(({ part, id }) => {
    if (isPagePart(part)) {
      const slug = THEME_SLUGS[part];
      const page = pages.find((p) => p.slug === slug && (p.kind ?? "page") === "page");
      return { part, template: id, pageId: page?.id ?? null, slug };
    }
    const pageId = design?.mode === "cms" ? design[`${part}Id`] ?? null : null;
    return { part, template: id, pageId, slug: null, ...(pageId ? {} : { skip: "no-design" as const }) };
  });
}

/** A draft's changes for putting `nodes` in place of everything on a page (at most 50 changes a call). */
export function replaceOps(rootId: string, present: Array<Pick<PageTreeNode, "id">>, nodes: PageTreeNode[]): PageDraftOp[][] {
  const ops: PageDraftOp[] = [
    ...present.map((n): PageDraftOp => ({ op: "remove", nodeId: n.id })),
    ...nodes.map((node, index): PageDraftOp => ({ op: "insert", parentId: rootId, index, node })),
  ];
  const calls: PageDraftOp[][] = [];
  for (let i = 0; i < ops.length; i += 50) calls.push(ops.slice(i, i + 50));
  return calls;
}
