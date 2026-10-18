// Protected digital products (scripts, Roblox, AutoCAD, 3D print files, programs):
// the on/off switch with its window and downloads, the master files (kept
// encrypted on the server), how each file type carries the buyer's mark, and
// "who leaked this?".
import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../components/ui/cn";
import { Modal } from "../../../components/ui/Modal";
import { getApiErrorMessage } from "../../../api/http";
import * as ProtectedAPI from "../../../api/protected.api";
import type { MarkMode, ProtectedFileType, TraceResult } from "../../../api/protected.api";
import { toast } from "../../../lib/toast";
import { dateTime } from "../../../lib/orders";
import type { ComposerDraft } from "./composerModel";
import { protectionForSave } from "./composerModel";
import { Chip, Toggle } from "./ui";
import { fieldCls } from "./styles";
import { MODE_LABEL, cleanExt, formatBytes, markPreview, placementText, windowLength } from "./protectedText";

const DEFAULT_HOURS = 24;
const DEFAULT_DOWNLOADS = 3;
const DEFAULT_DEVICES = 1;

/** The switch and its numbers (in the product form, saved with the product). */
export function ProtectionSettings({ draft, update }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void }) {
  const p = draft.protection ?? { on: false, hours: "", downloads: "" };
  const set = (patch: Partial<typeof p>) => update((d) => ({ ...d, protection: { ...(d.protection ?? { on: false, hours: "", downloads: "" }), ...patch } }));
  const v = protectionForSave({ protection: p });
  const hours = Number.isNaN(v.licenceHours) ? null : v.licenceHours ?? DEFAULT_HOURS;
  const downloads = Number.isNaN(v.licenceDownloads) ? null : v.licenceDownloads ?? DEFAULT_DOWNLOADS;
  const devices = Number.isNaN(v.licenceDevices) ? null : v.licenceDevices ?? DEFAULT_DEVICES;
  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="protection-settings">
      <Toggle checked={p.on} onChange={(on) => set({ on })} label={<b className="text-white">🔒 منتج محمي (سكربتات، برامج، موديلات)</b>} />
      <p className="mt-2 text-xs leading-6 text-white/55">
        كل قطعة بتنباع بتاخد <b className="text-white/75">سيريال خاص فيها</b>، والزبونة بتنزّل نسخة مشفّرة (ملف ZIP، كلمة السر هي السيريال) فيها علامة طلبها. بتفتحها بـ <bdi dir="ltr">7-Zip</bdi> أو WinRAR.
      </p>
      {p.on ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">مدة التنزيل (ساعات)</span>
              <input inputMode="numeric" dir="ltr" className={cn(fieldCls, "h-11 max-w-[8rem] text-center", hours == null && "border-red-500/50")} value={p.hours} onChange={(e) => set({ hours: e.target.value })} placeholder={String(DEFAULT_HOURS)} aria-label="مدة التنزيل بالساعات" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">كم مرة بتنزّل بالسيريال</span>
              <input inputMode="numeric" dir="ltr" className={cn(fieldCls, "h-11 max-w-[8rem] text-center", downloads == null && "border-red-500/50")} value={p.downloads} onChange={(e) => set({ downloads: e.target.value })} placeholder={String(DEFAULT_DOWNLOADS)} aria-label="عدد التنزيلات" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">على كم جهاز (برنامج التشغيل)</span>
              <input inputMode="numeric" dir="ltr" className={cn(fieldCls, "h-11 max-w-[8rem] text-center", devices == null && "border-red-500/50")} value={p.devices ?? ""} onChange={(e) => set({ devices: e.target.value })} placeholder={String(DEFAULT_DEVICES)} aria-label="عدد الأجهزة" />
            </label>
          </div>
          <p className={cn("mt-2 text-[11px]", hours == null || downloads == null || devices == null ? "text-red-400" : "text-white/45")} data-testid="protection-preview">
            {hours == null || downloads == null || devices == null
              ? "أرقام صحيحة: الساعات من 1 لـ 8760، والتنزيلات من 1 لـ 100، والأجهزة من 1 لـ 50"
              : `بعد الدفع أو قبول الطلب: الزبونة بتقدر تنزّل خلال ${windowLength(hours)}، لحد ${downloads} ${downloads === 1 ? "مرة" : "مرات"}، وبرنامج التشغيل بيفعّلها على ${devices === 1 ? "جهاز واحد" : `${devices} أجهزة`}. بتقدري تجدّدي المدة أو تنقلي الجهاز من صفحة الطلب.`}
          </p>
          <p className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] leading-5 text-white/50">
            العلامة بتخلّي أي نسخة مسرّبة معروفة لأي طلب، بس حد شاطر بيقدر يمسحها. برنامج التشغيل بيربط النسخة بالجهاز، بس أي برنامج بيشتغل على جهاز الزبونة ممكن ينكسر لو حد مصمّم.
          </p>
        </>
      ) : null}
    </div>
  );
}

export function ProtectedFilesBlock({ productId }: { productId: string | null }) {
  if (!productId) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60" data-testid="protected-files-later">
        🔒 <b className="text-white/80">الملفات المحمية:</b> احفظي المنتج أول (مسودة بتكفي)، وبعدها بترفعي الملفات هون.
      </div>
    );
  }
  return <MasterFiles productId={productId} />;
}

function MasterFiles({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const key = ["product-protected", productId];
  const q = useQuery({ queryKey: key, queryFn: () => ProtectedAPI.getProtected(productId) });
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const upload = async (list: FileList | null) => {
    for (const f of Array.from(list ?? [])) {
      if (q.data && f.size > q.data.maxUploadMb * 1024 * 1024) {
        toast.error(`«${f.name}» أكبر من ${q.data.maxUploadMb} MB`, { description: "اضغطيه بملف ZIP أو قسّميه." });
        continue;
      }
      setProgress({ name: f.name, pct: 0 });
      try {
        await ProtectedAPI.uploadProtectedFile(productId, f, (pct) => setProgress({ name: f.name, pct }));
        toast.success(`انرفع «${f.name}» وانحفظ مشفّر`);
      } catch (e) {
        toast.error(`ما انرفع «${f.name}»`, { description: getApiErrorMessage(e) });
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    await refresh();
  };
  const remove = useMutation({
    mutationFn: (id: string) => ProtectedAPI.deleteProtectedFile(productId, id),
    onSuccess: () => { toast.success("انحذف الملف"); void refresh(); },
    onError: (e) => toast.error("ما انحذف", { description: getApiErrorMessage(e) }),
  });

  const files = q.data?.files ?? [];
  // With a vault, changing the files needs an open vault session.
  const locked = Boolean(q.data?.vault?.on && !q.data.vault.session);
  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="protected-files">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">🔒 الملفات الأصلية (محفوظة مشفّرة عنا)</span>
        <span className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setTypesOpen(true)} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10" data-testid="open-file-types">
            أنواع الملفات
          </button>
          <button type="button" onClick={() => setTraceOpen(true)} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10" data-testid="open-trace">
            🔎 مين سرّب ملف؟
          </button>
        </span>
      </div>
      {q.data ? (
        <p className="mb-2 text-[11px] text-white/45">
          لحد {q.data.maxUploadMb} MB للملف · كل زبونة بتاخد نسخة فيها علامتها{q.data.sold.active ? ` · انباع ${q.data.sold.active} سيريال` : ""}
        </p>
      ) : null}
      {locked ? (
        <p className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/65" data-testid="protected-locked">
          🔐 الملفات بالخزنة. للرفع أو الحذف <Link to="/admin/system/vault" className="text-accent-300 hover:underline">افتحي الخزنة</Link> (20 دقيقة). البيع والتنزيل شغّالين بدونها.
        </p>
      ) : null}

      {files.length ? (
        <ul className="divide-y divide-white/[0.06]" data-testid="protected-list">
          {files.map((f) => {
            const where = placementText(f);
            return (
              <li key={f.id} className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>📄</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white" dir="auto" title={f.name}>{f.name}</span>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => { if (window.confirm(`حذف «${f.name}»؟ اللي اشترين ما رح يقدرن ينزّلنه.`)) remove.mutate(f.id); }}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    حذف
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 ps-7">
                  <span className="text-[11px] text-white/45">{[f.type, formatBytes(f.bytes)].filter(Boolean).join(" · ")}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", where.tone === "good" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-white/60")}>{where.text}</span>
                  {f.storedIn ? <span className="text-[11px] text-white/40">{f.storedIn === "vault" ? "🔐 بالخزنة" : "🗄️ بقاعدة البيانات"}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : q.isLoading ? (
        <p className="text-xs text-white/45">جارٍ التحميل…</p>
      ) : (
        <p className="text-xs text-amber-300/90">لسا ما في ملفات. الزبونة بتاخد السيريال، بس التنزيل بستنى لحد ما ترفعي.</p>
      )}

      {progress ? (
        <div className="mt-3 text-xs text-white/70" role="status">
          جارٍ رفع «{progress.name}» {progress.pct}%
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent-500 transition-all" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      ) : null}
      <div className="mt-3">
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} data-testid="protected-file-input" />
        <button type="button" disabled={Boolean(progress) || locked} onClick={() => input.current?.click()} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30 disabled:opacity-50">
          + رفع ملف
        </button>
      </div>

      {typesOpen ? <FileTypesModal onClose={() => { setTypesOpen(false); void refresh(); }} /> : null}
      {traceOpen ? <TraceModal onClose={() => setTraceOpen(false)} /> : null}
    </div>
  );
}

const MODES: MarkMode[] = ["comment", "stl", "package"];
type TypeForm = { ext: string; label: string; mode: MarkMode; commentStart: string; commentEnd: string; existing: boolean };

/** How each kind of file carries the buyer's mark; the owner adds her own kinds. */
function FileTypesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["protected-types"], queryFn: ProtectedAPI.listProtectedTypes });
  const [find, setFind] = useState("");
  const [form, setForm] = useState<TypeForm | null>(null);
  const set = (types: ProtectedFileType[]) => qc.setQueryData(["protected-types"], types);
  const save = useMutation({
    mutationFn: (f: TypeForm) => ProtectedAPI.saveProtectedType(cleanExt(f.ext)!, { label: f.label.trim(), mode: f.mode, commentStart: f.mode === "comment" ? f.commentStart.trim() : null, commentEnd: f.mode === "comment" ? f.commentEnd.trim() || null : null }),
    onSuccess: (types) => { set(types); setForm(null); toast.success("انحفظ النوع"); },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });
  const reset = useMutation({
    mutationFn: (ext: string) => ProtectedAPI.deleteProtectedType(ext),
    onSuccess: (types) => { set(types); toast.success("رجع متل ما كان"); },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const list = useMemo(() => {
    const w = find.trim().toLowerCase().replace(/^\./, "");
    return (q.data ?? []).filter((t) => !w || t.ext.includes(w) || t.label.toLowerCase().includes(w));
  }, [q.data, find]);
  const formOk = form && cleanExt(form.ext) && form.label.trim() && (form.mode !== "comment" || form.commentStart.trim());
  const edit = (t: ProtectedFileType) => setForm({ ext: t.ext, label: t.label, mode: t.mode, commentStart: t.commentStart ?? "", commentEnd: t.commentEnd ?? "", existing: true });

  return (
    <Modal open title="أنواع الملفات المحمية" onClose={onClose} widthClassName="max-w-3xl">
      <div dir="rtl" className="space-y-3 text-sm" data-testid="file-types">
        <p className="text-xs leading-6 text-white/55">
          لكل نوع ملف: وين بتنحط علامة الطلب. <b className="text-white/75">جوّا الملف</b> (سطر ملاحظة بآخر السكربت، أو بعنوان ملف STL)، أو <b className="text-white/75">جنبه</b> بملف LICENCE.txt داخل الـ ZIP (للبرامج والموديلات اللي أي تغيير بيخرّبها). نوع مش موجود؟ ضيفيه.
        </p>
        <div className="flex flex-wrap gap-2">
          <input className={cn(fieldCls, "h-10 min-w-0 flex-1")} value={find} onChange={(e) => setFind(e.target.value)} placeholder="دوّري: py، lua، stl…" aria-label="بحث بالأنواع" />
          <button type="button" onClick={() => setForm({ ext: "", label: "", mode: "comment", commentStart: "#", commentEnd: "", existing: false })} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30">
            + نوع جديد
          </button>
        </div>

        {form ? (
          <div className="space-y-3 rounded-xl bg-white/[0.04] p-3" data-testid="type-form">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs text-white/55">الامتداد</span>
                <input dir="ltr" disabled={form.existing} className={cn(fieldCls, "h-10 text-center disabled:opacity-60")} value={form.ext} onChange={(e) => setForm({ ...form, ext: e.target.value })} placeholder="nut" aria-label="الامتداد" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/55">الاسم</span>
                <input className={cn(fieldCls, "h-10")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثلاً: Squirrel script" aria-label="اسم النوع" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="وين العلامة">
              {MODES.map((m) => (
                <Chip key={m} active={form.mode === m} onClick={() => setForm({ ...form, mode: m })}>
                  {MODE_LABEL[m]}
                </Chip>
              ))}
            </div>
            {form.mode === "comment" ? (
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">الملاحظة بتبلش بـ</span>
                  <input dir="ltr" className={cn(fieldCls, "h-10 text-center font-mono")} value={form.commentStart} onChange={(e) => setForm({ ...form, commentStart: e.target.value })} placeholder="#" aria-label="بداية الملاحظة" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">وبتخلص بـ (اختياري)</span>
                  <input dir="ltr" className={cn(fieldCls, "h-10 text-center font-mono")} value={form.commentEnd} onChange={(e) => setForm({ ...form, commentEnd: e.target.value })} placeholder="-->" aria-label="نهاية الملاحظة" />
                </label>
              </div>
            ) : null}
            <code dir="ltr" className="block truncate rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-white/70" data-testid="type-preview">
              {markPreview({ mode: form.mode, commentStart: form.commentStart, commentEnd: form.commentEnd })}
            </code>
            {form.mode === "comment" ? <p className="text-[11px] text-white/40">تأكدي إنه هيك بتبلش الملاحظة بهاللغة، وإلا السكربت ممكن ما يشتغل. إذا مش متأكدة، اختاري «جنب الملف».</p> : null}
            <div className="flex gap-2">
              <button type="button" disabled={!formOk || save.isPending} onClick={() => form && save.mutate(form)} className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50">
                حفظ
              </button>
              <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">
                إلغاء
              </button>
            </div>
          </div>
        ) : null}

        <ul className="max-h-[50vh] divide-y divide-white/[0.06] overflow-auto" data-testid="types-list">
          {list.map((t) => (
            <li key={t.ext} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span dir="ltr" className="w-16 shrink-0 font-mono text-xs text-white">.{t.ext}</span>
              <span className="min-w-0 flex-1 text-xs text-white/80">{t.label}</span>
              <span className="text-[11px] text-white/45">{MODE_LABEL[t.mode]}</span>
              {t.builtIn === false ? <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] text-accent-200">إلك</span> : null}
              <span className="flex gap-1">
                <button type="button" onClick={() => edit(t)} className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/5">
                  تعديل
                </button>
                {t.builtIn === false ? (
                  <button type="button" disabled={reset.isPending} onClick={() => reset.mutate(t.ext)} className="rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">
                    حذف
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {q.isLoading ? <p className="text-xs text-white/45">جارٍ التحميل…</p> : null}
      </div>
    </Modal>
  );
}

/** A leaked file (or its text) → the order it came from. */
function TraceModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);
  const run = useMutation({
    mutationFn: () => ProtectedAPI.traceLeak(file ? { file } : { text }),
    onSuccess: setResult,
    onError: (e) => toast.error("ما زبط الفحص", { description: getApiErrorMessage(e) }),
  });
  return (
    <Modal open title="🔎 مين سرّب الملف؟" onClose={onClose} widthClassName="max-w-2xl">
      <div dir="rtl" className="space-y-3 text-sm" data-testid="trace">
        <p className="text-xs leading-6 text-white/55">ارفعي الملف اللي لقيتيه منشور، أو الصقي نصّه. إذا فيه علامة طلب (estb:…) بنقلك مين اشتراه.</p>
        <input type="file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} className="block w-full text-xs text-white/70 file:me-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" aria-label="الملف المسرّب" data-testid="trace-file" />
        {!file ? (
          <textarea dir="ltr" rows={4} className={cn(fieldCls, "min-h-[96px] py-2 font-mono text-xs")} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="… estb:K7QM2XHPAB …" aria-label="نص الملف" />
        ) : null}
        <button type="button" disabled={(!file && !text.trim()) || run.isPending} onClick={() => run.mutate()} className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50">
          {run.isPending ? "جارٍ الفحص…" : "افحصي"}
        </button>

        {result ? (
          result.found.length ? (
            <ul className="space-y-2" data-testid="trace-found">
              {result.found.map((r) => (
                <li key={r.markId} className="rounded-xl bg-white/[0.04] p-3 text-xs leading-6 text-white/75">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-sm text-white">{r.product.title}</b>
                    <Link to={`/admin/orders/${r.order.id}`} className="text-accent-300 hover:underline">
                      طلب {r.order.shortId} ←
                    </Link>
                  </div>
                  <div>
                    {r.order.customerName} · <span dir="ltr">{r.order.phone}</span>
                  </div>
                  <div className="text-white/50">
                    انباع {dateTime(r.issuedAt)} · نزّلته {r.downloads} مرات{r.lastDownloadAt ? ` · آخر مرة ${dateTime(r.lastDownloadAt)}` : ""}
                    {r.status === "revoked" ? " · السيريال موقوف" : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-white/[0.04] p-3 text-xs text-white/60" data-testid="trace-none">
              {result.marks.length ? "فيه علامة بس مش لطلب عنا (يمكن مزوّرة)." : "ما لقينا علامة طلب بهالملف. يمكن انمسحت، أو الملف مش من عنا."}
            </p>
          )
        ) : null}
      </div>
    </Modal>
  );
}
