/**
 * The part of a design named "Store logo" (a template's header: storeThemes/kits/importDesign.ts markLogo, filled by
 * the admin's setup with the owner's logo) shows the store's logo as it is now. The setup copied the logo's address
 * into the header, so a logo changed later in Settings never reached it (a client's shop kept its first one).
 * Drawn here, the saved design is left as it is. Pure (tested).
 */
import type { PageTree, TreeNode } from "./tree";

export const STORE_LOGO = "Store logo";
/** The size the setup gives a logo put in a header (admin features/setup/buildSetup.ts). */
const LOGO_STYLE = { base: { width: "150px", maxWidth: "100%", height: "64px", fit: "contain" } };

/** A logo address the page may draw: https, or the server's own path. */
export function usableLogo(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const src = url.trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(src) || /^\/[^\s"'<>]+$/.test(src) ? src : null;
}

/**
 * The tree with every "Store logo" showing `logoUrl`: a picture takes its address (its own size and look stay); a
 * name written as words (no logo when the store was set up) becomes the logo, linked to the home page. No logo
 * (or none usable): the tree as it is.
 */
export function withStoreLogo(tree: PageTree, logoUrl: unknown, storeName: string): PageTree {
  const src = usableLogo(logoUrl);
  if (!src) return tree;
  const alt = { ar: storeName, en: storeName, he: storeName };
  let changed = false;
  const walk = (n: TreeNode): TreeNode => {
    if (n.name === STORE_LOGO) {
      const props = (n.props ?? {}) as Record<string, unknown>;
      if (n.type === "image") {
        if (props.src === src) return n;
        changed = true;
        return { ...n, props: { ...props, src } };
      }
      if (n.type === "button" || n.type === "heading" || n.type === "text") {
        changed = true;
        return { ...n, type: "image", props: { src, alt, href: "/" }, style: LOGO_STYLE } as TreeNode;
      }
    }
    if (!n.children?.length) return n;
    const children = n.children.map(walk);
    return children.some((c, i) => c !== n.children![i]) ? { ...n, children } : n;
  };
  const root = walk(tree.root);
  return changed ? { ...tree, root } : tree;
}
