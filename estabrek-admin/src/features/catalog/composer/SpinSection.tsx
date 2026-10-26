/**
 * A product's 360° views, in the product composer: the scans linked to it (each for every
 * colour or for one), made here from a plain video (scan3d/PlainSpin.tsx), or picked from
 * the saved ones (the 3D scan's too). The shop's product page shows them (backend
 * lib/productSpins.ts). Only for a product that's been saved.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../../api/http";
import { linkScan, listScans, type Scan } from "../../../api/scans.api";
import { toast } from "../../../lib/toast";
import { tr } from "../../../lib/words";
import { PlainSpin } from "../../scan3d/PlainSpin";
import { Spin360 } from "../../scan3d/Spin360";
import type { ComposerDraft } from "./composerModel";
import { Section } from "./ui";

const btn = "rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.1] disabled:opacity-30";
const showable = (s: Scan) => Boolean(s.manifest?.frames?.length && s.manifest.cols && s.manifest.cellW && s.manifest.cellH);

export function SpinSection({ draft, step }: { draft: ComposerDraft; step: number }) {
  const qc = useQueryClient();
  const productId = draft.edit?.productId;
  const colours = draft.groups.filter((g) => g.itemId).map((g) => ({ id: g.itemId!, name: g.name }));
  const linked = useQuery({ queryKey: ["media", "scans", "product", productId], queryFn: () => listScans(productId), enabled: Boolean(productId) });
  const [making, setMaking] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const all = useQuery({ queryKey: ["media", "scans"], queryFn: () => listScans(), enabled: choosing });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["media", "scans"] });
  const link = async (scan: Scan, body: { productId: string | null; itemId?: string | null }, done: string) => {
    setBusy(true);
    try {
      await linkScan(scan.id, body);
      await refresh();
      toast.success(done);
    } catch (e) {
      toast.error(tr("ما تغيّر الربط", "The link didn't change"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  const colourName = (itemId?: string | null) => (itemId ? colours.find((c) => c.id === itemId)?.name ?? tr("لون انحذف", "A removed colour") : tr("كل الألوان", "Every colour"));
  const mine = (linked.data?.items ?? []).filter(showable);

  return (
    <Section id="spin" step={step} title={tr("عرض 360°", "360° view")} hint={tr("الزبون بيلف القطعة بإيده بصفحة المنتج.", "Shoppers turn the product with their hand on its page.")}>
      {!productId ? (
        <p className="text-xs leading-6 text-white/50" data-testid="spin-unsaved">{tr("احفظ المنتج أول، وبعدين بتعمله عرض 360° من فيديو.", "Save the product first, then make its 360° view from a video.")}</p>
      ) : (
        <div className="space-y-3" data-testid="spin-section">
          {mine.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {mine.map((s) => (
                <li key={s.id} className="space-y-2 rounded-xl border border-white/[0.08] p-2" data-testid="spin-linked" data-scan={s.id}>
                  <Spin360 source={{ kind: "sheet", url: s.url, cols: s.manifest.cols, cellW: s.manifest.cellW, cellH: s.manifest.cellH, count: s.manifest.frames.length }} height={160} />
                  <div className="truncate text-xs text-white/80">{s.displayName ?? tr("عرض 360°", "360° view")}</div>
                  {colours.length > 1 ? (
                    <select className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white" disabled={busy} value={s.manifest.product?.itemId ?? ""} onChange={(e) => void link(s, { productId: productId, itemId: e.target.value || null }, tr("تغيّر اللون", "The colour changed"))} aria-label={tr("لأي لون", "For which colour")}>
                      <option value="">{tr("كل الألوان", "Every colour")}</option>
                      {colours.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : <div className="text-[11px] text-white/45">{colourName(s.manifest.product?.itemId)}</div>}
                  <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => void link(s, { productId: null }, tr("انشال من المنتج (لسا بالوسائط)", "Taken off the product (still in the media library)"))} data-testid="spin-unlink">
                    {tr("شيله من المنتج", "Take it off the product")}
                  </button>
                </li>
              ))}
            </ul>
          ) : linked.isLoading ? null : <p className="text-xs text-white/50">{tr("ما في عرض 360° لهالمنتج لسا.", "This product has no 360° view yet.")}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} aria-pressed={making} onClick={() => { setMaking((v) => !v); setChoosing(false); }} data-testid="spin-make">{tr("اعمل واحد من فيديو", "Make one from a video")}</button>
            <button type="button" className={btn} aria-pressed={choosing} onClick={() => { setChoosing((v) => !v); setMaking(false); }} data-testid="spin-choose">{tr("اختار واحد محفوظ", "Choose a saved one")}</button>
            <Link to="/admin/media/scan" className={btn}>{tr("مسح 3D بالحصيرة", "3D scan with the mat")}</Link>
          </div>

          {making ? (
            <PlainSpin product={{ id: productId, name: draft.title || tr("المنتج", "the product"), colours }} onSaved={() => { setMaking(false); void refresh(); }} />
          ) : null}

          {choosing ? (
            <ul className="grid gap-2 sm:grid-cols-3" data-testid="spin-saved">
              {(all.data?.items ?? []).filter((s) => showable(s) && s.manifest.product?.id !== productId).map((s) => (
                <li key={s.id}>
                  <button type="button" disabled={busy} onClick={() => void link(s, { productId, itemId: null }, tr("انربط بالمنتج", "Linked to the product")).then(() => setChoosing(false))} className="w-full space-y-1 rounded-xl border border-white/[0.08] p-2 text-start hover:bg-white/[0.04] disabled:opacity-40" data-scan={s.id}>
                    <img src={s.url} alt="" className="h-16 w-full rounded object-cover object-left-top" />
                    <span className="block truncate text-[11px] text-white/75">{s.displayName ?? tr("عرض 360°", "360° view")}</span>
                    {s.manifest.product ? <span className="block text-[10px] text-amber-200/70">{tr("مربوط بمنتج تاني: بينتقل لهون", "Linked to another product: it moves here")}</span> : null}
                  </button>
                </li>
              ))}
              {all.data && !all.data.items.some((s) => showable(s) && s.manifest.product?.id !== productId) ? <li className="text-xs text-white/50">{tr("ما في عروض محفوظة غيرها.", "No other saved views.")}</li> : null}
            </ul>
          ) : null}
        </div>
      )}
    </Section>
  );
}
