// Protected digital products (scripts, Roblox, AutoCAD, 3D print files, programs):
// the on/off switch with its window and downloads, the master files (kept
// encrypted on the server), how each file type carries the buyer's mark, and
// "who leaked this?".
import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../components/ui/cn";
import { Modal } from "../../../components/ui/Modal";
import { useConfirm } from "../../../components/useConfirm";
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
import { tr } from "@/lib/words";

const DEFAULT_HOURS = 24;
const DEFAULT_DOWNLOADS = 3;
const DEFAULT_DEVICES = 1;
const timesText = (n: number) => (n === 1 ? tr("مرة واحدة", "once") : tr(n <= 10 ? `${n} مرات` : `${n} مرة`, "{0} times", [n]));
const devicesText = (n: number) => (n === 1 ? tr("جهاز واحد", "1 device") : tr(n <= 10 ? `${n} أجهزة` : `${n} جهاز`, "{0} devices", [n]));

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
      <Toggle checked={p.on} onChange={(on) => set({ on })} label={<b className="text-white">{tr("🔒 منتج محمي (سكربتات، برامج، موديلات)", "🔒 Protected product (scripts, software, models)")}</b>} />
      <p className="mt-2 text-xs leading-6 text-white/55">
        {tr("كل قطعة بتنباع بتاخد", "Each piece sold gets")} <b className="text-white/75">{tr("سيريال خاص فيها", "its own serial")}</b>{tr("، والزبون بينزّل نسخة مشفّرة (ملف ZIP، كلمة السر هي السيريال) فيها علامة طلبه. بتنفتح بـ", ", and the customer downloads an encrypted copy (a ZIP file, the password is the serial) carrying their order's mark. It opens with")} <bdi dir="ltr">7-Zip</bdi> {tr("أو WinRAR.", "or WinRAR.")}
      </p>
      {p.on ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">{tr("مدة التنزيل (ساعات)", "Download window (hours)")}</span>
              <input inputMode="numeric" dir="ltr" className={cn(fieldCls, "h-11 max-w-[8rem] text-center", hours == null && "border-red-500/50")} value={p.hours} onChange={(e) => set({ hours: e.target.value })} placeholder={String(DEFAULT_HOURS)} aria-label={tr("مدة التنزيل بالساعات", "Download window in hours")} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">{tr("كم مرة بينزّل بالسيريال", "Downloads per serial")}</span>
              <input inputMode="numeric" dir="ltr" className={cn(fieldCls, "h-11 max-w-[8rem] text-center", downloads == null && "border-red-500/50")} value={p.downloads} onChange={(e) => set({ downloads: e.target.value })} placeholder={String(DEFAULT_DOWNLOADS)} aria-label={tr("عدد التنزيلات", "Number of downloads")} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">{tr("على كم جهاز (برنامج التشغيل)", "On how many devices (the launcher)")}</span>
              <input inputMode="numeric" dir="ltr" className={cn(fieldCls, "h-11 max-w-[8rem] text-center", devices == null && "border-red-500/50")} value={p.devices ?? ""} onChange={(e) => set({ devices: e.target.value })} placeholder={String(DEFAULT_DEVICES)} aria-label={tr("عدد الأجهزة", "Number of devices")} />
            </label>
          </div>
          <p className={cn("mt-2 text-[11px]", hours == null || downloads == null || devices == null ? "text-red-400" : "text-white/45")} data-testid="protection-preview">
            {hours == null || downloads == null || devices == null
              ? tr("أرقام صحيحة: الساعات من 1 لـ 8760، والتنزيلات من 1 لـ 100، والأجهزة من 1 لـ 50", "Whole numbers: hours from 1 to 8760, downloads from 1 to 100, devices from 1 to 50")
              : tr(
                  `بعد الدفع أو قبول الطلب: الزبون بيقدر ينزّل خلال ${windowLength(hours)}، لحد ${timesText(downloads)}، وبرنامج التشغيل بيفعّلها على ${devicesText(devices)}. المدة بتتجدّد والجهاز بينتقل من صفحة الطلب.`,
                  "After payment or acceptance: the customer can download within {0}, up to {1}, and the launcher activates it on {2}. The window can be renewed and the device moved from the order page.",
                  [windowLength(hours), timesText(downloads), devicesText(devices)],
                )}
          </p>
          <p className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] leading-5 text-white/50">
            {tr("العلامة بتخلّي أي نسخة مسرّبة معروفة لأي طلب، بس حد شاطر بيقدر يمسحها. برنامج التشغيل بيربط النسخة بالجهاز، بس أي برنامج بيشتغل على جهاز الزبون ممكن ينكسر لو حد مصمّم.", "The mark ties any leaked copy to its order, but someone skilled can remove it. The launcher binds the copy to the device, but any program running on the customer's device can be cracked by someone determined.")}
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
        🔒 <b className="text-white/80">{tr("الملفات المحمية:", "Protected files:")}</b> {tr("لازم المنتج ينحفظ أول (مسودة بتكفي)، وبعدها الملفات بتنرفع هون.", "Save the product first (a draft is enough), then upload the files here.")}
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
        toast.error(tr(`«${f.name}» أكبر من ${q.data.maxUploadMb} MB`, "“{0}” is bigger than {1} MB", [f.name, q.data.maxUploadMb]), { description: tr("الأفضل ضغطه بملف ZIP أو تقسيمه.", "Compress it into a ZIP file or split it.") });
        continue;
      }
      setProgress({ name: f.name, pct: 0 });
      try {
        await ProtectedAPI.uploadProtectedFile(productId, f, (pct) => setProgress({ name: f.name, pct }));
        toast.success(tr(`انرفع «${f.name}» وانحفظ مشفّر`, "Uploaded “{0}” and saved encrypted", [f.name]));
      } catch (e) {
        toast.error(tr(`ما انرفع «${f.name}»`, "Couldn't upload “{0}”", [f.name]), { description: getApiErrorMessage(e) });
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    await refresh();
  };
  const remove = useMutation({
    mutationFn: (id: string) => ProtectedAPI.deleteProtectedFile(productId, id),
    onSuccess: () => { toast.success(tr("انحذف الملف", "File deleted")); void refresh(); },
    onError: (e) => toast.error(tr("ما انحذف", "Not deleted"), { description: getApiErrorMessage(e) }),
  });

  const files = q.data?.files ?? [];
  // With a vault, changing the files needs an open vault session.
  const locked = Boolean(q.data?.vault?.on && !q.data.vault.session);
  const [confirm, confirmDialog] = useConfirm();
  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="protected-files">
      {confirmDialog}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{tr("🔒 الملفات الأصلية (محفوظة مشفّرة عنا)", "🔒 The original files (kept encrypted with us)")}</span>
        <span className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setTypesOpen(true)} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10" data-testid="open-file-types">
            {tr("أنواع الملفات", "File types")}
          </button>
          <button type="button" onClick={() => setTraceOpen(true)} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10" data-testid="open-trace">
            {tr("🔎 مين سرّب ملف؟", "🔎 Who leaked a file?")}
          </button>
        </span>
      </div>
      {q.data ? (
        <p className="mb-2 text-[11px] text-white/45">
          {tr("لحد", "Up to")} {q.data.maxUploadMb} {tr("MB للملف · كل زبون بياخد نسخة فيها علامته", "MB per file · each customer gets a copy with their own mark")}{q.data.sold.active ? tr(` · انباع ${q.data.sold.active} سيريال`, " · {0} serials sold", [q.data.sold.active]) : ""}
        </p>
      ) : null}
      {locked ? (
        <p className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/65" data-testid="protected-locked">
          {tr("🔐 الملفات بالخزنة. للرفع أو الحذف", "🔐 The files are in the vault. To upload or delete,")} <Link to="/admin/system/vault" className="text-accent-300 hover:underline">{tr("لازم تنفتح الخزنة", "open the vault")}</Link> {tr("(20 دقيقة). البيع والتنزيل شغّالين بدونها.", "(20 minutes). Selling and downloads work without it.")}
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
                    onClick={async () => { if (await confirm({ title: tr(`حذف «${f.name}»؟`, "Delete “{0}”?", [f.name]), message: tr("اللي اشتروا ما رح يقدروا ينزّلوه.", "Those who bought it won't be able to download it."), confirmText: tr("حذف الملف", "Delete file") })) remove.mutate(f.id); }}
                    className="shrink-0 inline-flex h-9 items-center rounded-lg px-3 text-sm sm:h-7 sm:px-2 sm:text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {tr("حذف", "Delete")}
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 ps-7">
                  <span className="text-[11px] text-white/45">{[f.type, formatBytes(f.bytes)].filter(Boolean).join(" · ")}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", where.tone === "good" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-white/60")}>{where.text}</span>
                  {f.storedIn ? <span className="text-[11px] text-white/40">{f.storedIn === "vault" ? tr("🔐 بالخزنة", "🔐 In the vault") : tr("🗄️ بقاعدة البيانات", "🗄️ In the database")}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : q.isLoading ? (
        <p className="text-xs text-white/45">{tr("جارٍ التحميل…", "Loading…")}</p>
      ) : (
        <p className="text-xs text-amber-300/90">{tr("لسا ما في ملفات. الزبون بياخد السيريال، بس التنزيل بيستنى لحد ما تنرفع الملفات.", "No files yet. The customer gets the serial, but the download waits until files are uploaded.")}</p>
      )}

      {progress ? (
        <div className="mt-3 text-xs text-white/70" role="status">
          {tr(`جارٍ رفع «${progress.name}» ${progress.pct}%`, "Uploading “{0}” {1}%", [progress.name, progress.pct])}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent-500 transition-all" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      ) : null}
      <div className="mt-3">
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} data-testid="protected-file-input" />
        <button type="button" disabled={Boolean(progress) || locked} onClick={() => input.current?.click()} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30 disabled:opacity-50">
          {tr("+ رفع ملف", "+ Upload a file")}
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
    onSuccess: (types) => { set(types); setForm(null); toast.success(tr("انحفظ النوع", "Type saved")); },
    onError: (e) => toast.error(tr("ما انحفظ", "Not saved"), { description: getApiErrorMessage(e) }),
  });
  const reset = useMutation({
    mutationFn: (ext: string) => ProtectedAPI.deleteProtectedType(ext),
    onSuccess: (types) => { set(types); toast.success(tr("رجع متل ما كان", "Back to how it was")); },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  const list = useMemo(() => {
    const w = find.trim().toLowerCase().replace(/^\./, "");
    return (q.data ?? []).filter((t) => !w || t.ext.includes(w) || t.label.toLowerCase().includes(w));
  }, [q.data, find]);
  const formOk = form && cleanExt(form.ext) && form.label.trim() && (form.mode !== "comment" || form.commentStart.trim());
  const edit = (t: ProtectedFileType) => setForm({ ext: t.ext, label: t.label, mode: t.mode, commentStart: t.commentStart ?? "", commentEnd: t.commentEnd ?? "", existing: true });

  return (
    <Modal open title={tr("أنواع الملفات المحمية", "Protected file types")} onClose={onClose} widthClassName="max-w-3xl">
      <div className="space-y-3 text-sm" data-testid="file-types">
        <p className="text-xs leading-6 text-white/55">
          {tr("لكل نوع ملف: وين بتنحط علامة الطلب.", "For each file type: where the order mark goes.")} <b className="text-white/75">{tr("جوّا الملف", "Inside the file")}</b> {tr("(سطر ملاحظة بآخر السكربت، أو بعنوان ملف STL)، أو", "(a comment line at the end of the script, or in an STL file's header), or")} <b className="text-white/75">{tr("جنبه", "next to it")}</b> {tr("بملف LICENCE.txt داخل الـ ZIP (للبرامج والموديلات اللي أي تغيير بيخرّبها). نوع مش موجود؟ بينضاف من هون.", "in a LICENCE.txt file inside the ZIP (for software and models any change would break). A type missing? Add it.")}
        </p>
        <div className="flex flex-wrap gap-2">
          <input className={cn(fieldCls, "h-10 min-w-0 flex-1")} value={find} onChange={(e) => setFind(e.target.value)} placeholder={tr("بحث: py، lua، stl…", "Search: py, lua, stl…")} aria-label={tr("بحث بالأنواع", "Search types")} />
          <button type="button" onClick={() => setForm({ ext: "", label: "", mode: "comment", commentStart: "#", commentEnd: "", existing: false })} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30">
            {tr("+ نوع جديد", "+ New type")}
          </button>
        </div>

        {form ? (
          <div className="space-y-3 rounded-xl bg-white/[0.04] p-3" data-testid="type-form">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs text-white/55">{tr("الامتداد", "Extension")}</span>
                <input dir="ltr" disabled={form.existing} className={cn(fieldCls, "h-10 text-center disabled:opacity-60")} value={form.ext} onChange={(e) => setForm({ ...form, ext: e.target.value })} placeholder="nut" aria-label={tr("الامتداد", "Extension")} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/55">{tr("الاسم", "Name")}</span>
                <input className={cn(fieldCls, "h-10")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={tr("مثلاً: Squirrel script", "e.g. Squirrel script")} aria-label={tr("اسم النوع", "Type name")} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("وين العلامة", "Where the mark goes")}>
              {MODES.map((m) => (
                <Chip key={m} active={form.mode === m} onClick={() => setForm({ ...form, mode: m })}>
                  {MODE_LABEL[m]}
                </Chip>
              ))}
            </div>
            {form.mode === "comment" ? (
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">{tr("الملاحظة بتبلش بـ", "The comment starts with")}</span>
                  <input dir="ltr" className={cn(fieldCls, "h-10 text-center font-mono")} value={form.commentStart} onChange={(e) => setForm({ ...form, commentStart: e.target.value })} placeholder="#" aria-label={tr("بداية الملاحظة", "Comment start")} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">{tr("وبتخلص بـ (اختياري)", "and ends with (optional)")}</span>
                  <input dir="ltr" className={cn(fieldCls, "h-10 text-center font-mono")} value={form.commentEnd} onChange={(e) => setForm({ ...form, commentEnd: e.target.value })} placeholder="-->" aria-label={tr("نهاية الملاحظة", "Comment end")} />
                </label>
              </div>
            ) : null}
            <code dir="ltr" className="block truncate rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-white/70" data-testid="type-preview">
              {markPreview({ mode: form.mode, commentStart: form.commentStart, commentEnd: form.commentEnd })}
            </code>
            {form.mode === "comment" ? <p className="text-[11px] text-white/40">{tr("لازم يكون هيك بتبلش الملاحظة بهاللغة، وإلا السكربت ممكن ما يشتغل. بحال عدم التأكد، الأسلم «جنب الملف».", "Make sure this is how a comment starts in this language, or the script may not run. If unsure, choose “Next to the file”.")}</p> : null}
            <div className="flex gap-2">
              <button type="button" disabled={!formOk || save.isPending} onClick={() => form && save.mutate(form)} className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50">
                {tr("حفظ", "Save")}
              </button>
              <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">
                {tr("إلغاء", "Cancel")}
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
              {t.builtIn === false ? <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] text-accent-200">{tr("إلك", "Yours")}</span> : null}
              <span className="flex gap-1">
                <button type="button" onClick={() => edit(t)} className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/5">
                  {tr("تعديل", "Edit")}
                </button>
                {t.builtIn === false ? (
                  <button type="button" disabled={reset.isPending} onClick={() => reset.mutate(t.ext)} className="rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">
                    {tr("حذف", "Delete")}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {q.isLoading ? <p className="text-xs text-white/45">{tr("جارٍ التحميل…", "Loading…")}</p> : null}
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
    onError: (e) => toast.error(tr("ما زبط الفحص", "The check didn't work"), { description: getApiErrorMessage(e) }),
  });
  return (
    <Modal open title={tr("🔎 مين سرّب الملف؟", "🔎 Who leaked the file?")} onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-3 text-sm" data-testid="trace">
        <p className="text-xs leading-6 text-white/55">{tr("الملف اللي انلقى منشور بينرفع هون، أو نصّه بينلصق. إذا فيه علامة طلب (estb:…) منقول مين اشتراه.", "Upload the file you found posted, or paste its text. If it has an order mark (estb:…), we'll tell you who bought it.")}</p>
        <input type="file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} className="block w-full text-xs text-white/70 file:me-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" aria-label={tr("الملف المسرّب", "Leaked file")} data-testid="trace-file" />
        {!file ? (
          <textarea dir="ltr" rows={4} className={cn(fieldCls, "min-h-[96px] py-2 font-mono text-xs")} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="… estb:K7QM2XHPAB …" aria-label={tr("نص الملف", "File text")} />
        ) : null}
        <button type="button" disabled={(!file && !text.trim()) || run.isPending} onClick={() => run.mutate()} className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50">
          {run.isPending ? tr("جارٍ الفحص…", "Checking…") : tr("فحص", "Check")}
        </button>

        {result ? (
          result.found.length ? (
            <ul className="space-y-2" data-testid="trace-found">
              {result.found.map((r) => (
                <li key={r.markId} className="rounded-xl bg-white/[0.04] p-3 text-xs leading-6 text-white/75">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-sm text-white">{r.product.title}</b>
                    <Link to={`/admin/orders/${r.order.id}`} className="text-accent-300 hover:underline">
                      {tr("طلب", "Order")} {r.order.shortId} <span className="inline-block ltr:-scale-x-100">←</span>
                    </Link>
                  </div>
                  <div>
                    {r.order.customerName} · <span dir="ltr">{r.order.phone}</span>
                  </div>
                  <div className="text-white/50">
                    {tr("انباع", "Sold")} {dateTime(r.issuedAt)} {tr("· نزّلته", "· downloaded")} {r.downloads} {tr("مرات", "times")}{r.lastDownloadAt ? tr(` · آخر مرة ${dateTime(r.lastDownloadAt)}`, " · last time {0}", [dateTime(r.lastDownloadAt)]) : ""}
                    {r.status === "revoked" ? tr(" · السيريال موقوف", " · serial stopped") : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-white/[0.04] p-3 text-xs text-white/60" data-testid="trace-none">
              {result.marks.length ? tr("فيه علامة بس مش لطلب عنا (يمكن مزوّرة).", "There's a mark, but not from one of our orders (maybe forged).") : tr("ما لقينا علامة طلب بهالملف. يمكن انمسحت، أو الملف مش من عنا.", "No order mark found in this file. It may have been removed, or the file isn't ours.")}
            </p>
          )
        ) : null}
      </div>
    </Modal>
  );
}
