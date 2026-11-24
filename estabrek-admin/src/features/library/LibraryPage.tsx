/**
 * The theme library's page in the admin (docs/themes-library-plan.ar.md, phase 2): every whole website and section
 * of the owner's library to browse and see live, and a page made of any of them in one step (a new page in the new
 * editor, the piece on it, its words and colours the owner's from there).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../../api/pages.api";
import { getApiErrorMessage } from "../../api/http";
import { Modal } from "../../components/ui/Modal";
import { toast } from "../../lib/toast";
import { LIB_ITEMS, libItemOf, libName, type LibItem } from "../../studio/library";
import { LibraryPreview, LibraryShelf } from "../../studio/LibraryBrowser";
import { say } from "../../studio/say";

/** A page's address from a name ("Maison Lune" → /maison-lune); the shop's own addresses are taken. */
export function libSlug(name: string): string {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "page";
  return `/${["shop", "p", "c", "cart", "checkout", "account", "search", "about", "contact", "wishlist", "order", "policies", "request", "pay", "track"].includes(s) ? `${s}-page` : s}`;
}

/** A new page with the piece on it, in the new editor, as a draft (nothing shows in the shop until it's published). */
export async function pageOfPiece(item: LibItem, name: string, slug: string): Promise<string> {
  const page = await PagesAPI.createPage({ name, slug });
  await PagesAPI.setPageFormat(page.id, 2);
  const { tree } = await PagesAPI.getPageTree(page.id);
  const node: PagesAPI.PageTreeNode = { id: `lib-${Math.random().toString(36).slice(2, 8)}`, type: "lib", name: libName(item).slice(0, 40), props: { item: item.id } };
  await PagesAPI.changePageDraft(page.id, [{ op: "insert", parentId: tree.root.id, index: 0, node }]);
  return page.id;
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const [making, setMaking] = useState<LibItem | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const sites = LIB_ITEMS.filter((i) => i.kind === "site").length;
  const ask = (id: string) => {
    const item = libItemOf(id);
    if (!item) return;
    setPreview(null);
    setMaking(item);
    setName(item.name);
    setSlug(libSlug(item.name));
  };
  const make = async () => {
    if (!making || busy) return;
    const s = libSlug(slug.replace(/^\//, "") || name);
    setBusy(true);
    try {
      const id = await pageOfPiece(making, name.trim() || making.name, s);
      await qc.invalidateQueries({ queryKey: ["pages"] });
      toast.success(say("انعملت الصفحة: عدّل كلامها وألوانها وانشرها|The page is made: change its words and colours, then publish it|העמוד נוצר: שנו מילים וצבעים ופרסמו"));
      navigate(`/studio/${id}`);
    } catch (e) {
      toast.error(say("ما انعملت الصفحة|The page wasn't made|העמוד לא נוצר"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  const pickLabel = say("اعمل صفحة منه|Make a page of it|צרו עמוד ממנו");
  return (
    <div className="space-y-5" data-testid="library-page">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{say("مكتبة الثيمات|The theme library|ספריית העיצובים")}</h1>
        <p className="text-sm text-white/55">
          {say(`${sites} موقع كامل و${LIB_ITEMS.length - sites} قسم: شوفها حيّة، واعمل منها صفحة، وكل كلمة ولون فيها إلك تغيّرها من المحرر.|${sites} whole websites and ${LIB_ITEMS.length - sites} sections: see them live, make a page of one, and change every word and colour in it from the editor.|${sites} אתרים שלמים ו-${LIB_ITEMS.length - sites} מקטעים: צפו בהם חיים, צרו מהם עמוד, ושנו כל מילה וצבע מהעורך.`)}
        </p>
      </header>
      <LibraryShelf busy={busy} onPick={ask} pickLabel={pickLabel} onPreview={setPreview} />
      <LibraryPreview id={preview} busy={busy} pickLabel={pickLabel} onPick={ask} onClose={() => setPreview(null)} />
      <Modal
        open={Boolean(making)}
        onClose={() => !busy && setMaking(null)}
        title={say("صفحة جديدة من المكتبة|A new page from the library|עמוד חדש מהספרייה")}
        description={making ? libName(making) : undefined}
        footer={
          <button type="button" disabled={busy || !name.trim()} onClick={() => void make()} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40" data-testid="library-make">
            {busy ? say("عم تنعمل…|Making…|נוצר…") : say("اعمل الصفحة وافتحها بالمحرر|Make the page and open it in the editor|צרו את העמוד ופתחו בעורך")}
          </button>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs text-white/60">
            {say("اسم الصفحة|The page's name|שם העמוד")}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-3 py-2 text-sm text-white" data-testid="library-name" />
          </label>
          <label className="block text-xs text-white/60">
            {say("عنوانها بالمتجر|Its address in the shop|הכתובת שלו בחנות")}
            <input value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={() => setSlug(libSlug(slug.replace(/^\//, "") || name))} dir="ltr" className="mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-3 py-2 text-sm text-white" data-testid="library-slug" />
          </label>
          <p className="text-[11px] leading-5 text-white/45">{say("بتنعمل مسودة: ما بتبيّن بالمتجر لحد ما تنشرها من المحرر.|It's made as a draft: it doesn't show in the shop until you publish it from the editor.|נוצר כטיוטה: לא מופיע בחנות עד שתפרסמו מהעורך.")}</p>
        </div>
      </Modal>
    </div>
  );
}
