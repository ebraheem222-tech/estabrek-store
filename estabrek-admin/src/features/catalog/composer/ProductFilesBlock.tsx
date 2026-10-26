// Digital products: the files the shopper downloads (after paying online or when
// the order is accepted). Upload a file, or add a link for big ones (Google Drive…).
import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../components/ui/cn";
import { useConfirm } from "../../../components/useConfirm";
import { getApiErrorMessage } from "../../../api/http";
import * as FilesAPI from "../../../api/fulfillment.api";
import type { ProductFile } from "../../../api/fulfillment.api";
import { toast } from "../../../lib/toast";
import { fieldCls } from "./styles";
import { tr } from "@/lib/words";

function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ProductFilesBlock({ productId }: { productId: string | null }) {
  if (!productId) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60" data-testid="product-files-later">
        ⬇️ <b className="text-white/80">{tr("الملفات:", "Files:")}</b> {tr("لازم المنتج ينحفظ أول (مسودة بتكفي)، وبعدها الملفات بتنرفع هون.", "Save the product first (a draft is enough), then upload the files here.")}
      </div>
    );
  }
  return <FilesEditor productId={productId} />;
}

function FilesEditor({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const key = ["product-files", productId];
  const q = useQuery({ queryKey: key, queryFn: () => FilesAPI.listProductFiles(productId) });
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    for (const f of list) {
      if (q.data && f.size > q.data.maxUploadMb * 1024 * 1024) {
        toast.error(tr(`«${f.name}» أكبر من ${q.data.maxUploadMb} MB`, "“{0}” is bigger than {1} MB", [f.name, q.data.maxUploadMb]), { description: tr("الأفضل إضافته كرابط (Google Drive، Dropbox…) بدل الرفع.", "Add it as a link (Google Drive, Dropbox…) instead of uploading.") });
        continue;
      }
      setProgress({ name: f.name, pct: 0 });
      try {
        await FilesAPI.uploadProductFile(productId, f, (pct) => setProgress({ name: f.name, pct }));
        toast.success(tr(`انرفع «${f.name}»`, "Uploaded “{0}”", [f.name]));
      } catch (e) {
        toast.error(tr(`ما انرفع «${f.name}»`, "Couldn't upload “{0}”", [f.name]), { description: getApiErrorMessage(e) });
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    await refresh();
  };

  const addLink = useMutation({
    mutationFn: (b: { name: string; url: string }) => FilesAPI.addProductFileLink(productId, b),
    onSuccess: () => { setLink(null); toast.success(tr("انضاف الرابط", "Link added")); void refresh(); },
    onError: (e) => toast.error(tr("ما انضاف", "Not added"), { description: getApiErrorMessage(e) }),
  });
  const rename = useMutation({
    mutationFn: (b: { id: string; name: string }) => FilesAPI.updateProductFile(productId, b.id, { name: b.name }),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(tr("ما انحفظ الاسم", "The name wasn't saved"), { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => FilesAPI.deleteProductFile(productId, id),
    onSuccess: () => { toast.success(tr("انحذف الملف", "File deleted")); void refresh(); },
    onError: (e) => toast.error(tr("ما انحذف", "Not deleted"), { description: getApiErrorMessage(e) }),
  });
  const open = async (f: ProductFile) => {
    try {
      window.open(await FilesAPI.productFileLink(productId, f.id), "_blank", "noopener");
    } catch (e) {
      toast.error(tr("ما انفتح الملف", "The file didn't open"), { description: getApiErrorMessage(e) });
    }
  };

  const files = q.data?.files ?? [];
  const linkOk = link && link.name.trim() && /^https:\/\/\S+$/i.test(link.url.trim());

  const [confirm, confirmDialog] = useConfirm();
  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="product-files">
      {confirmDialog}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{tr("⬇️ الملفات اللي بينزّلها الزبون", "⬇️ Files the customer downloads")}</span>
        {q.data ? <span className="text-[11px] text-white/45">{tr("لحد", "Up to")} {q.data.maxUploadMb} {tr("MB للملف · كل طلب بينزّل كل ملف", "MB per file · each order downloads each file")} {q.data.maxDownloads} {tr("مرات", "times")}</span> : null}
      </div>
      {q.data && !q.data.storageReady ? <p className="mb-2 text-xs text-amber-300">{tr("تخزين الملفات (Cloudinary) مش مضبوط بالسيرفر، فبس الروابط بتشتغل.", "File storage (Cloudinary) isn't set up on the server, so only links work.")}</p> : null}

      {files.length ? (
        <ul className="divide-y divide-white/[0.06]">
          {files.map((f) => (
            <FileRow key={f.id} f={f} onRename={(name) => rename.mutate({ id: f.id, name })} onOpen={() => void open(f)} onRemove={async () => { if (await confirm({ title: tr(`حذف «${f.name}»؟`, "Delete “{0}”?", [f.name]), message: tr("الزبائن اللي اشتروا ما رح يقدروا ينزّلوه.", "Customers who bought it won't be able to download it."), confirmText: tr("حذف الملف", "Delete file") })) remove.mutate(f.id); }} />
          ))}
        </ul>
      ) : q.isLoading ? (
        <p className="text-xs text-white/45">{tr("جارٍ التحميل…", "Loading…")}</p>
      ) : (
        <p className="text-xs text-amber-300/90">{tr("لسا ما في ملفات. الزبون ما رح يلاقي إشي ينزّله.", "No files yet. The customer won't find anything to download.")}</p>
      )}

      {progress ? (
        <div className="mt-3 text-xs text-white/70" role="status">
          {tr(`جارٍ رفع «${progress.name}» ${progress.pct}%`, "Uploading “{0}” {1}%", [progress.name, progress.pct])}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent-500 transition-all" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      ) : null}

      {link ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <input className={cn(fieldCls, "h-10")} value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder={tr("الاسم: مثلاً فيديو الشرح", "Name: e.g. the how-to video")} aria-label={tr("اسم الرابط", "Link name")} />
          <input className={cn(fieldCls, "h-10")} dir="ltr" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://drive.google.com/…" aria-label={tr("الرابط", "Link")} />
          <div className="flex gap-2">
            <button type="button" disabled={!linkOk || addLink.isPending} onClick={() => link && addLink.mutate({ name: link.name.trim(), url: link.url.trim() })} className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50">{tr("إضافة", "Add")}</button>
            <button type="button" onClick={() => setLink(null)} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">{tr("إلغاء", "Cancel")}</button>
          </div>
          <p className="text-[11px] text-white/40 sm:col-span-3">{tr("لازم الرابط يكون مفتوح لأي حد معه الرابط. الزبون بيشوفه بس بعد الدفع/القبول.", "Make sure the link opens for anyone who has it. The customer only sees it after paying or acceptance.")}</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} data-testid="product-file-input" />
          <button type="button" disabled={Boolean(progress) || q.data?.storageReady === false} onClick={() => input.current?.click()} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30 disabled:opacity-50">{tr("+ رفع ملف", "+ Upload a file")}</button>
          <button type="button" onClick={() => setLink({ name: "", url: "" })} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06]">{tr("+ رابط (لملف كبير)", "+ Link (for a big file)")}</button>
        </div>
      )}
    </div>
  );
}

function FileRow({ f, onRename, onOpen, onRemove }: { f: ProductFile; onRename: (name: string) => void; onOpen: () => void; onRemove: () => void | Promise<void> }) {
  const [name, setName] = useState(f.name);
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-lg" aria-hidden>{f.kind === "link" ? "🔗" : "📄"}</span>
      <input
        className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm text-white hover:border-white/10 focus:border-white/20 focus:outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => { const v = name.trim(); if (v && v !== f.name) onRename(v); else setName(f.name); }}
        aria-label={tr("اسم الملف", "File name")}
      />
      <span className="text-[11px] text-white/40">{[f.format?.toUpperCase(), formatBytes(f.bytes), f.orders ? tr(`${f.orders} طلب نزّلوه`, "Downloaded by {0} orders", [f.orders]) : ""].filter(Boolean).join(" · ")}</span>
      <button type="button" onClick={onOpen} className="inline-flex h-9 items-center rounded-lg px-3 text-sm sm:h-7 sm:px-2 sm:text-xs text-accent-300 hover:bg-accent-500/10">{tr("فتح", "Open")}</button>
      <button type="button" onClick={() => void onRemove()} className="inline-flex h-9 items-center rounded-lg px-3 text-sm sm:h-7 sm:px-2 sm:text-xs text-red-300 hover:bg-red-500/10">{tr("حذف", "Delete")}</button>
    </li>
  );
}
