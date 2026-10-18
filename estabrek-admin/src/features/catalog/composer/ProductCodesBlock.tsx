// Digital products that sell codes one per piece (game keys, gift cards,
// licences): paste the list or upload a CSV for a size; each paid/accepted order
// takes one per piece and shows it on her private order page. Optional: a
// product with no codes stays files only.
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../components/ui/cn";
import { getApiErrorMessage } from "../../../api/http";
import * as CodesAPI from "../../../api/fulfillment.api";
import type { CodeStatus, ProductCode } from "../../../api/fulfillment.api";
import { toast } from "../../../lib/toast";
import { Chip } from "./ui";
import { fieldCls } from "./styles";
import { RevealedCode } from "./RevealedCode";
import { useReveal } from "./useReveal";
import { CODE_STATUS, MAX_CODES, MAX_TEXT, codeNote, codesCount, importMessage, masked, previewCodes, variantLabel } from "./codesText";

const PAGE = 30;

export function ProductCodesBlock({ productId }: { productId: string | null }) {
  if (!productId) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60" data-testid="product-codes-later">
        🔑 <b className="text-white/80">الأكواد:</b> إذا بتبيعي أكواد (ألعاب، بطاقات هدايا، تراخيص)، احفظي المنتج أول وبعدها بتضيفي الأكواد هون.
      </div>
    );
  }
  return <CodesEditor productId={productId} />;
}

function CodesEditor({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<CodeStatus | null>(null);
  const [take, setTake] = useState(PAGE);
  const key = ["product-codes", productId, status, take];
  const q = useQuery({ queryKey: key, queryFn: () => CodesAPI.getProductCodes(productId, { status, take }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["product-codes", productId] });

  const variants = q.data?.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(null);
  const chosen = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const [text, setText] = useState("");
  const [batch, setBatch] = useState("");
  const [open, setOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const preview = previewCodes(text);

  const add = useMutation({
    mutationFn: () => CodesAPI.importProductCodes(productId, { variantId: chosen!.id, text, batch: batch.trim() || null }),
    onSuccess: (r) => {
      const m = importMessage(r);
      (r.added ? toast.success : toast.error)(m.title, m.description ? { description: m.description } : undefined);
      if (r.added) {
        setText("");
        setBatch("");
        setOpen(false);
      }
      void refresh();
      void qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e) => toast.error("ما انضافت الأكواد", { description: getApiErrorMessage(e) }),
  });
  const voidIt = useMutation({
    mutationFn: (id: string) => CodesAPI.voidProductCode(productId, id),
    onSuccess: () => { toast.success("انلغى الكود"); void refresh(); },
    onError: (e) => toast.error("ما انلغى", { description: getApiErrorMessage(e) }),
  });

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_TEXT) {
      toast.error("الملف كبير كثير", { description: `لحد ${MAX_CODES} كود بالمرة. قسّميه على أكثر من ملف.` });
    } else {
      const t = await f.text();
      setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${t}` : t));
      setOpen(true);
    }
    if (file.current) file.current.value = "";
  };

  const totals = variants.reduce((a, v) => ({ available: a.available + v.available, delivered: a.delivered + v.delivered, void: a.void + v.void }), { available: 0, delivered: 0, void: 0 });
  const hasAny = totals.available + totals.delivered + totals.void > 0;
  const tooMany = preview.count > MAX_CODES || text.length > MAX_TEXT;

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="product-codes">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">🔑 أكواد بتنباع وحدة وحدة</span>
        <span className="text-[11px] text-white/45">ألعاب، بطاقات هدايا، تراخيص — كل قطعة بالطلب بتاخد كود</span>
      </div>

      {q.data?.keyFromJwt ? (
        <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200" data-testid="codes-key-warning">
          ⚠️ الأكواد بتنحفظ مشفّرة بمفتاح جاي من <span dir="ltr">JWT_SECRET</span>. قبل ما ترفعي أكواد حقيقية، ضيفي <span dir="ltr">CODES_ENCRYPTION_KEY</span> بإعدادات السيرفر (Railway) وما تغيّريه بعدها — الأكواد المشفّرة بمفتاح قديم ما بتنفتح.
        </p>
      ) : null}

      {hasAny ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-3" data-testid="codes-counts">
          {variants.filter((v) => v.available + v.delivered + v.void > 0 || variants.length === 1).map((v) => (
            <div key={v.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
              {variants.length > 1 ? <div className="mb-0.5 truncate text-xs text-white/60">{variantLabel(v)}</div> : null}
              <div className={cn("text-lg font-semibold", v.available ? "text-white" : "text-red-300")}>{v.available} <span className="text-xs font-normal text-white/50">متاح</span></div>
              <div className="text-[11px] text-white/45">{v.delivered} انباع{v.void ? ` · ${v.void} ملغي` : ""}</div>
            </div>
          ))}
        </div>
      ) : q.isLoading ? (
        <p className="text-xs text-white/45">جارٍ التحميل…</p>
      ) : (
        <p className="text-xs text-white/55">ما في أكواد. إذا المنتج ملفات بس، ما في داعي تضيفي إشي هون.</p>
      )}

      {open ? (
        <div className="mt-3 space-y-3 rounded-xl bg-white/[0.03] p-3" data-testid="codes-add">
          {variants.length > 1 ? (
            <div>
              <span className="mb-1.5 block text-xs text-white/55">لأي مقاس؟</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المقاس">
                {variants.map((v) => (
                  <Chip key={v.id} active={chosen?.id === v.id} onClick={() => setVariantId(v.id)}>
                    {variantLabel(v)}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-xs text-white/55">الأكواد — كل كود بسطر (أو ملف CSV: العمود الأول)</span>
            <textarea
              dir="ltr"
              rows={6}
              className={cn(fieldCls, "min-h-[140px] py-2 font-mono text-xs", tooMany && "border-red-500/50")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY"}
              aria-label="الأكواد"
              spellCheck={false}
              autoComplete="off"
            />
            <span className={cn("mt-1 block text-[11px]", tooMany ? "text-red-400" : "text-white/45")} data-testid="codes-preview">
              {tooMany
                ? `أكثر من ${MAX_CODES} كود بالمرة — قسّميهن`
                : [codesCount(preview.count), preview.repeated ? `${preview.repeated} مكرر` : "", preview.invalid ? `${preview.invalid} مش مزبوط (أقصر من 4 أحرف)` : ""].filter(Boolean).join(" · ")}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-white/55">ملاحظة للدفعة (اختياري)</span>
            <input className={cn(fieldCls, "h-10")} value={batch} maxLength={80} onChange={(e) => setBatch(e.target.value)} placeholder="مثلاً: فاتورة المورّد 17" aria-label="ملاحظة للدفعة" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!chosen || !preview.count || tooMany || add.isPending}
              onClick={() => add.mutate()}
              className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50"
            >
              {add.isPending ? "جارٍ الإضافة…" : preview.count ? `إضافة ${codesCount(preview.count)}` : "إضافة"}
            </button>
            <button type="button" onClick={() => file.current?.click()} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06]">
              من ملف…
            </button>
            <button type="button" onClick={() => { setOpen(false); setText(""); }} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">
              إلغاء
            </button>
          </div>
          <p className="text-[11px] leading-5 text-white/40">الأكواد بتنحفظ مشفّرة، وما بتنبعت بالإيميل. الزبونة بتشوفها بصفحة طلبها الخاصة بعد الدفع أونلاين أو لما تقبلي الطلب. الكود اللي انضاف قبل (بأي منتج) ما بنضاف مرة ثانية.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!variants.length} onClick={() => setOpen(true)} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30 disabled:opacity-50">
            + إضافة أكواد
          </button>
          <button type="button" disabled={!variants.length} onClick={() => file.current?.click()} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06] disabled:opacity-50">
            + من ملف CSV
          </button>
        </div>
      )}
      <input ref={file} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} data-testid="codes-file-input" />

      {hasAny ? (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap gap-2" role="radiogroup" aria-label="عرض">
            {([null, "available", "delivered", "void"] as const).map((s) => (
              <Chip key={s ?? "all"} active={status === s} onClick={() => { setStatus(s); setTake(PAGE); }}>
                {s ? CODE_STATUS[s].label : "الكل"}
              </Chip>
            ))}
          </div>
          {q.data?.codes.length ? (
            <ul className="divide-y divide-white/[0.06]" data-testid="codes-list">
              {q.data.codes.map((c) => (
                <CodeRow
                  key={c.id}
                  c={c}
                  size={variants.length > 1 ? variantLabel(variants.find((v) => v.id === c.variantId) ?? variants[0]) : null}
                  reveal={() => CodesAPI.revealProductCode(productId, c.id)}
                  onVoid={() => {
                    const msg = c.status === "delivered" ? `إلغاء الكود ${masked(c.last4)}؟ الزبونة ما رح تشوفه بعد هيك. (لتبديله بكود جديد، روحي على الطلب.)` : `إلغاء الكود ${masked(c.last4)}؟ ما رح ينباع.`;
                    if (window.confirm(msg)) voidIt.mutate(c.id);
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/45">ما في أكواد هيك.</p>
          )}
          {q.data && q.data.total > q.data.codes.length ? (
            <button type="button" onClick={() => setTake((t) => t + PAGE)} className="mt-2 rounded-lg px-3 py-1.5 text-xs text-accent-300 hover:bg-accent-500/10">
              عرض المزيد ({q.data.total - q.data.codes.length})
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CodeRow({ c, size, reveal, onVoid }: { c: ProductCode; size: string | null; reveal: () => Promise<string>; onVoid: () => void }) {
  const [shown, setShown] = useReveal();
  const [busy, setBusy] = useState(false);
  const show = async () => {
    setBusy(true);
    try {
      setShown(await reveal());
    } catch (e) {
      toast.error("ما انفتح الكود", { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2" data-testid="code-row">
      {shown ? <RevealedCode code={shown} onHide={() => setShown(null)} /> : <span dir="ltr" className="font-mono text-sm text-white/80">{masked(c.last4)}</span>}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", CODE_STATUS[c.status].cls)}>{CODE_STATUS[c.status].label}</span>
      {size ? <span className="text-[11px] text-white/50">{size}</span> : null}
      {/* Phones: the story on its own line under the code; wider: in the middle. */}
      <span className="order-last basis-full text-[11px] text-white/40 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto sm:truncate">{codeNote(c)}</span>
      <span className="ms-auto flex items-center gap-1 sm:ms-0">
        {c.orderRequestId ? (
          <Link to={`/admin/orders/${c.orderRequestId}`} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">
            الطلب
          </Link>
        ) : null}
        {!shown ? (
          <button type="button" disabled={busy} onClick={() => void show()} className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50">
            إظهار
          </button>
        ) : null}
        {c.status !== "void" ? (
          <button type="button" onClick={onVoid} className="rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">
            إلغاء
          </button>
        ) : null}
      </span>
    </li>
  );
}
