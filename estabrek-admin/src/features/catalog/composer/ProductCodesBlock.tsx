// Digital products that sell codes one per piece (game keys, gift cards,
// licences): paste the list or upload a CSV for a size; each paid/accepted order
// takes one per piece and shows it on her private order page. Optional: a
// product with no codes stays files only.
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../components/ui/cn";
import { useConfirm } from "../../../components/useConfirm";
import { getApiErrorMessage } from "../../../api/http";
import * as CodesAPI from "../../../api/fulfillment.api";
import type { CodeStatus, ProductCode } from "../../../api/fulfillment.api";
import { toast } from "../../../lib/toast";
import { Chip } from "./ui";
import { fieldCls } from "./styles";
import { RevealedCode } from "./RevealedCode";
import { useReveal } from "./useReveal";
import { CODE_STATUS, MAX_CODES, MAX_TEXT, codeNote, codesCount, importMessage, masked, previewCodes, variantLabel } from "./codesText";
import { tr } from "@/lib/words";

const PAGE = 30;

export function ProductCodesBlock({ productId }: { productId: string | null }) {
  if (!productId) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60" data-testid="product-codes-later">
        🔑 <b className="text-white/80">{tr("الأكواد:", "Codes:")}</b> {tr("لبيع أكواد (ألعاب، بطاقات هدايا، تراخيص)، لازم المنتج ينحفظ أول، وبعدها الأكواد بتنضاف هون.", "To sell codes (games, gift cards, licences), save the product first, then add the codes here.")}
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
    onError: (e) => toast.error(tr("ما انضافت الأكواد", "The codes weren't added"), { description: getApiErrorMessage(e) }),
  });
  const voidIt = useMutation({
    mutationFn: (id: string) => CodesAPI.voidProductCode(productId, id),
    onSuccess: () => { toast.success(tr("انلغى الكود", "Code cancelled")); void refresh(); },
    onError: (e) => toast.error(tr("ما انلغى", "Not cancelled"), { description: getApiErrorMessage(e) }),
  });

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_TEXT) {
      toast.error(tr("الملف كبير كثير", "The file is too big"), { description: tr(`لحد ${MAX_CODES} كود بالمرة. يرجى تقسيمه على أكثر من ملف.`, "Up to {0} codes at a time. Split it into more than one file.", [MAX_CODES]) });
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
  const [confirm, confirmDialog] = useConfirm();

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="product-codes">
      {confirmDialog}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{tr("🔑 أكواد بتنباع وحدة وحدة", "🔑 Codes sold one by one")}</span>
        <span className="text-[11px] text-white/45">{tr("ألعاب، بطاقات هدايا، تراخيص — كل قطعة بالطلب بتاخد كود", "Games, gift cards, licences — each piece in an order gets a code")}</span>
      </div>

      {q.data?.keyFromJwt ? (
        <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200" data-testid="codes-key-warning">
          {tr("⚠️ الأكواد بتنحفظ مشفّرة بمفتاح جاي من", "⚠️ Codes are saved encrypted with a key that comes from")} <span dir="ltr">JWT_SECRET</span>{tr(". قبل رفع أكواد حقيقية، لازم ينضاف", ". Before uploading real codes, add")} <span dir="ltr">CODES_ENCRYPTION_KEY</span> {tr("بإعدادات السيرفر (Railway) وما يتغيّر بعدها — الأكواد المشفّرة بمفتاح قديم ما بتنفتح.", "to the server settings (Railway) and don't change it afterwards — codes encrypted with an old key can't be opened.")}
        </p>
      ) : null}

      {hasAny ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-3" data-testid="codes-counts">
          {variants.filter((v) => v.available + v.delivered + v.void > 0 || variants.length === 1).map((v) => (
            <div key={v.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
              {variants.length > 1 ? <div className="mb-0.5 truncate text-xs text-white/60">{variantLabel(v)}</div> : null}
              <div className={cn("text-lg font-semibold", v.available ? "text-white" : "text-red-300")}>{v.available} <span className="text-xs font-normal text-white/50">{tr("متاح", "available")}</span></div>
              <div className="text-[11px] text-white/45">{v.delivered} {tr("انباع", "sold")}{v.void ? tr(` · ${v.void} ملغي`, " · {0} cancelled", [v.void]) : ""}</div>
            </div>
          ))}
        </div>
      ) : q.isLoading ? (
        <p className="text-xs text-white/45">{tr("جارٍ التحميل…", "Loading…")}</p>
      ) : (
        <p className="text-xs text-white/55">{tr("ما في أكواد. إذا المنتج ملفات بس، ما في داعي لإضافة إشي هون.", "No codes. If the product is files only, nothing needs adding here.")}</p>
      )}

      {open ? (
        <div className="mt-3 space-y-3 rounded-xl bg-white/[0.03] p-3" data-testid="codes-add">
          {variants.length > 1 ? (
            <div>
              <span className="mb-1.5 block text-xs text-white/55">{tr("لأي مقاس؟", "For which size?")}</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("المقاس", "Size")}>
                {variants.map((v) => (
                  <Chip key={v.id} active={chosen?.id === v.id} onClick={() => setVariantId(v.id)}>
                    {variantLabel(v)}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-xs text-white/55">{tr("الأكواد — كل كود بسطر (أو ملف CSV: العمود الأول)", "Codes — one per line (or a CSV file: the first column)")}</span>
            <textarea
              dir="ltr"
              rows={6}
              className={cn(fieldCls, "min-h-[140px] py-2 font-mono text-xs", tooMany && "border-red-500/50")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY"}
              aria-label={tr("الأكواد", "Codes")}
              spellCheck={false}
              autoComplete="off"
            />
            <span className={cn("mt-1 block text-[11px]", tooMany ? "text-red-400" : "text-white/45")} data-testid="codes-preview">
              {tooMany
                ? tr(`أكثر من ${MAX_CODES} كود بالمرة — لازم ينقسموا`, "More than {0} codes at a time — split them", [MAX_CODES])
                : [codesCount(preview.count), preview.repeated ? tr(`${preview.repeated} مكرر`, "{0} repeated", [preview.repeated]) : "", preview.invalid ? tr(`${preview.invalid} مش مزبوط (أقصر من 4 أحرف)`, "{0} not right (shorter than 4 characters)", [preview.invalid]) : ""].filter(Boolean).join(" · ")}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-white/55">{tr("ملاحظة للدفعة (اختياري)", "Note for this batch (optional)")}</span>
            <input className={cn(fieldCls, "h-10")} value={batch} maxLength={80} onChange={(e) => setBatch(e.target.value)} placeholder={tr("مثلاً: فاتورة المورّد 17", "e.g. Supplier invoice 17")} aria-label={tr("ملاحظة للدفعة", "Batch note")} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!chosen || !preview.count || tooMany || add.isPending}
              onClick={() => add.mutate()}
              className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50"
            >
              {add.isPending ? tr("جارٍ الإضافة…", "Adding…") : preview.count ? tr(`إضافة ${codesCount(preview.count)}`, "Add {0}", [codesCount(preview.count)]) : tr("إضافة", "Add")}
            </button>
            <button type="button" onClick={() => file.current?.click()} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06]">
              {tr("من ملف…", "From a file…")}
            </button>
            <button type="button" onClick={() => { setOpen(false); setText(""); }} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">
              {tr("إلغاء", "Cancel")}
            </button>
          </div>
          <p className="text-[11px] leading-5 text-white/40">{tr("الأكواد بتنحفظ مشفّرة، وما بتنبعت بالإيميل. الزبون بيشوفها بصفحة طلبه الخاصة بعد الدفع أونلاين أو لما ينقبل الطلب. الكود اللي انضاف قبل (بأي منتج) ما بينضاف مرة ثانية.", "Codes are saved encrypted and never sent by email. The customer sees them on their own order page after paying online or once the order is accepted. A code added before (to any product) isn't added again.")}</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!variants.length} onClick={() => setOpen(true)} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30 disabled:opacity-50">
            {tr("+ إضافة أكواد", "+ Add codes")}
          </button>
          <button type="button" disabled={!variants.length} onClick={() => file.current?.click()} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06] disabled:opacity-50">
            {tr("+ من ملف CSV", "+ From a CSV file")}
          </button>
        </div>
      )}
      <input ref={file} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} data-testid="codes-file-input" />

      {hasAny ? (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap gap-2" role="radiogroup" aria-label={tr("عرض", "Show")}>
            {([null, "available", "delivered", "void"] as const).map((s) => (
              <Chip key={s ?? "all"} active={status === s} onClick={() => { setStatus(s); setTake(PAGE); }}>
                {s ? CODE_STATUS[s].label : tr("الكل", "All")}
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
                  onVoid={async () => {
                    const msg = c.status === "delivered" ? tr("الزبون ما رح يشوفه بعد هيك. (التبديل بكود جديد من صفحة الطلب.)", "The customer won't see it after this. (To swap it for a new code, go to the order.)") : tr("ما رح ينباع.", "It won't be sold.");
                    if (await confirm({ title: tr(`إلغاء الكود ${masked(c.last4)}؟`, "Cancel the code {0}?", [masked(c.last4)]), message: msg, confirmText: tr("إلغاء الكود", "Cancel code"), cancelText: tr("رجوع", "Back") })) voidIt.mutate(c.id);
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/45">{tr("ما في أكواد هيك.", "No codes like this.")}</p>
          )}
          {q.data && q.data.total > q.data.codes.length ? (
            <button type="button" onClick={() => setTake((t) => t + PAGE)} className="mt-2 rounded-lg px-3 py-1.5 text-xs text-accent-300 hover:bg-accent-500/10">
              {tr("عرض المزيد (", "Show more (")}{q.data.total - q.data.codes.length})
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CodeRow({ c, size, reveal, onVoid }: { c: ProductCode; size: string | null; reveal: () => Promise<string>; onVoid: () => void | Promise<void> }) {
  const [shown, setShown] = useReveal();
  const [busy, setBusy] = useState(false);
  const show = async () => {
    setBusy(true);
    try {
      setShown(await reveal());
    } catch (e) {
      toast.error(tr("ما انفتح الكود", "The code didn't open"), { description: getApiErrorMessage(e) });
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
          <Link to={`/admin/orders/${c.orderRequestId}`} className="inline-flex h-9 items-center rounded-lg px-3 text-sm sm:h-7 sm:px-2 sm:text-xs text-accent-300 hover:bg-accent-500/10">
            {tr("الطلب", "Order")}
          </Link>
        ) : null}
        {!shown ? (
          <button type="button" disabled={busy} onClick={() => void show()} className="inline-flex h-9 items-center rounded-lg px-3 text-sm sm:h-7 sm:px-2 sm:text-xs text-white/70 hover:bg-white/5 disabled:opacity-50">
            {tr("إظهار", "Show")}
          </button>
        ) : null}
        {c.status !== "void" ? (
          <button type="button" onClick={() => void onVoid()} className="inline-flex h-9 items-center rounded-lg px-3 text-sm sm:h-7 sm:px-2 sm:text-xs text-red-300 hover:bg-red-500/10">
            {tr("إلغاء", "Cancel")}
          </button>
        ) : null}
      </span>
    </li>
  );
}
