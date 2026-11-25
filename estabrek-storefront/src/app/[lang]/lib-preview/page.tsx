/**
 * One piece of the theme library on its own (?item=<id>), over the whole window: the admin's library shows it
 * live, and its pictures are taken from it (scripts/library/thumbs.mjs). As the library made it, nothing of the
 * store's. Never indexed or cached.
 */
import { notFound } from "next/navigation";
import { LibBlock } from "@/library/LibBlock";
import { LIB_CSS_VERSION, libItem } from "@/library/meta";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type SP = Record<string, string | string[] | undefined>;

export default async function LibPreview(props: { searchParams?: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const id = searchParams?.item;
  const item = libItem(typeof id === "string" ? id : null);
  if (!item) notFound();
  return (
    <div className="lx-preview" data-lib-preview={item.id} style={{ position: "fixed", inset: 0, zIndex: 2147483647, overflow: "auto", background: "#fff" }}>
      {/* The store's own bars and floating helpers step aside: the piece alone. */}
      <style>{".atelier-announcement,.atelier-header,.atelier-footer,.rose-minibag,.rose-companion,.a11y-fab,.toast-container{display:none!important}"}</style>
      <LibBlock item={item.id} kind={item.kind} madeUp={item.brand || undefined} minH={item.minH} js={item.js} css={item.css} version={LIB_CSS_VERSION} />
    </div>
  );
}
