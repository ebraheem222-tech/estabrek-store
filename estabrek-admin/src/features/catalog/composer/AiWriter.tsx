// «اكتبيلي من الصور»: the AI reads the uploaded photos and suggests the title,
// description, Google text and the type's fields. Nothing changes until the
// owner taps «استعملي».
import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as AiAPI from "../../../api/ai.api";
import { getApiErrorMessage } from "../../../api/http";
import { toast } from "../../../lib/toast";
import type { ProductType } from "../../../api/productTypes.api";
import type { ComposerDraft } from "./composerModel";
import { fieldCls } from "./styles";
import { cn } from "../../../components/ui/cn";

type Props = {
  draft: ComposerDraft;
  update: (fn: (d: ComposerDraft) => ComposerDraft) => void;
  type: ProductType | null;
  categoryName: string;
};

export function AiWriter({ draft, update, type, categoryName }: Props) {
  const status = useQuery({ queryKey: ["ai-catalog-status"], queryFn: AiAPI.catalogAiStatus, staleTime: 60_000, retry: false });
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<AiAPI.WriterResult | null>(null);
  // Uploaded photos, main photo of each colour first.
  const images = draft.groups.flatMap((g) => g.photoKeys).map((k) => draft.photos[k]?.url).filter((u): u is string => Boolean(u)).slice(0, 4);
  const fields = (type?.fields ?? []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options }));
  const write = useMutation({
    mutationFn: () => AiAPI.writeProduct({ images, title: draft.title || undefined, category: categoryName || undefined, type: type?.name, notes: notes.trim() || undefined, fields }),
    onSuccess: (r) => setResult(r),
    onError: (e) => toast.error("ما زبطت الكتابة", { description: getApiErrorMessage(e) }),
  });
  if (!status.data?.productWriter) return null;

  const label = (key: string) => fields.find((f) => f.key === key)?.label ?? key;
  const useAll = () => {
    if (!result) return;
    update((d) => ({
      ...d,
      title: result.title || d.title,
      description: result.description || d.description,
      seoTitle: result.seoTitle || d.seoTitle,
      seoDescription: result.seoDescription || d.seoDescription,
      attributes: { ...(d.attributes ?? {}), ...result.attributes },
    }));
    setResult(null);
    toast.success("انكتبت — راجعيها قبل الحفظ");
  };
  const applyOne = (patch: (d: ComposerDraft) => ComposerDraft) => update(patch);

  return (
    <div className="mb-4 rounded-2xl border border-accent-400/25 bg-accent-500/[0.06] p-3" data-testid="ai-writer">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!images.length || write.isPending}
          onClick={() => write.mutate()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {write.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "✨"}
          {write.isPending ? "عم نكتب من الصور…" : "اكتبيلي من الصور"}
        </button>
        <span className="text-xs text-white/55">{images.length ? `من ${images.length} صور — إنتِ بتراجعي قبل ما يتغيّر إشي.` : "ارفعي صورة وحدة على الأقل أول."}</span>
      </div>
      <input className={cn(fieldCls, "mt-2 h-10 text-sm")} value={notes} maxLength={600} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظة للكتابة (اختياري): القماش، الطول، لمين مناسبة…" aria-label="ملاحظة للكتابة" />

      {result ? (
        <div className="mt-3 space-y-2 text-sm" data-testid="ai-writer-result">
          <Suggestion label="الاسم" value={result.title} onUse={() => applyOne((d) => ({ ...d, title: result.title }))} />
          <Suggestion label="الوصف" value={result.description} multiline onUse={() => applyOne((d) => ({ ...d, description: result.description }))} />
          <Suggestion label="العنوان بجوجل" value={result.seoTitle} onUse={() => applyOne((d) => ({ ...d, seoTitle: result.seoTitle }))} />
          <Suggestion label="الوصف بجوجل" value={result.seoDescription} onUse={() => applyOne((d) => ({ ...d, seoDescription: result.seoDescription }))} />
          {Object.entries(result.attributes).map(([k, v]) => (
            <Suggestion key={k} label={label(k)} value={Array.isArray(v) ? v.join("، ") : String(v)} onUse={() => applyOne((d) => ({ ...d, attributes: { ...(d.attributes ?? {}), [k]: v } }))} />
          ))}
          {result.colors.length ? <p className="text-xs text-white/50">الألوان اللي شافتها: {result.colors.join("، ")}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={useAll} className="h-9 rounded-xl bg-accent-500 px-4 text-sm text-white">استعملي الكل</button>
            <button type="button" onClick={() => setResult(null)} className="h-9 rounded-xl border border-white/[0.12] px-4 text-sm text-white/75">تجاهلي</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Suggestion({ label, value, onUse, multiline }: { label: string; value: string; onUse: () => void; multiline?: boolean }) {
  const [used, setUsed] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-black/10 p-2">
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] text-white/45">{label}</span>
        <span className={cn("block text-white/90", multiline ? "whitespace-pre-wrap leading-6" : "truncate")}>{value}</span>
      </div>
      <button type="button" onClick={() => { onUse(); setUsed(true); }} className="shrink-0 rounded-lg border border-white/[0.12] px-2 py-1 text-xs text-white/80 hover:border-white/25">{used ? "✓" : "استعملي"}</button>
    </div>
  );
}
