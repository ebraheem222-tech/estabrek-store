// Digital products: the files the shopper downloads (after paying online or when
// the order is accepted). Upload a file, or add a link for big ones (Google Drive…).
import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../components/ui/cn";
import { getApiErrorMessage } from "../../../api/http";
import * as FilesAPI from "../../../api/fulfillment.api";
import type { ProductFile } from "../../../api/fulfillment.api";
import { toast } from "../../../lib/toast";
import { fieldCls } from "./styles";

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
        ⬇️ <b className="text-white/80">الملفات:</b> احفظي المنتج أول (مسودة بتكفي)، وبعدها بتقدري ترفعي الملفات هون.
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
        toast.error(`«${f.name}» أكبر من ${q.data.maxUploadMb} MB`, { description: "ضيفيه كرابط (Google Drive، Dropbox…) بدل الرفع." });
        continue;
      }
      setProgress({ name: f.name, pct: 0 });
      try {
        await FilesAPI.uploadProductFile(productId, f, (pct) => setProgress({ name: f.name, pct }));
        toast.success(`انرفع «${f.name}»`);
      } catch (e) {
        toast.error(`ما انرفع «${f.name}»`, { description: getApiErrorMessage(e) });
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    await refresh();
  };

  const addLink = useMutation({
    mutationFn: (b: { name: string; url: string }) => FilesAPI.addProductFileLink(productId, b),
    onSuccess: () => { setLink(null); toast.success("انضاف الرابط"); void refresh(); },
    onError: (e) => toast.error("ما انضاف", { description: getApiErrorMessage(e) }),
  });
  const rename = useMutation({
    mutationFn: (b: { id: string; name: string }) => FilesAPI.updateProductFile(productId, b.id, { name: b.name }),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error("ما انحفظ الاسم", { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => FilesAPI.deleteProductFile(productId, id),
    onSuccess: () => { toast.success("انحذف الملف"); void refresh(); },
    onError: (e) => toast.error("ما انحذف", { description: getApiErrorMessage(e) }),
  });
  const open = async (f: ProductFile) => {
    try {
      window.open(await FilesAPI.productFileLink(productId, f.id), "_blank", "noopener");
    } catch (e) {
      toast.error("ما انفتح الملف", { description: getApiErrorMessage(e) });
    }
  };

  const files = q.data?.files ?? [];
  const linkOk = link && link.name.trim() && /^https:\/\/\S+$/i.test(link.url.trim());

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] p-3 sm:p-4" data-testid="product-files">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">⬇️ الملفات اللي بتنزّلها الزبونة</span>
        {q.data ? <span className="text-[11px] text-white/45">لحد {q.data.maxUploadMb} MB للملف · كل طلب بنزّل كل ملف {q.data.maxDownloads} مرات</span> : null}
      </div>
      {q.data && !q.data.storageReady ? <p className="mb-2 text-xs text-amber-300">تخزين الملفات (Cloudinary) مش مضبوط بالسيرفر، فبس الروابط بتشتغل.</p> : null}

      {files.length ? (
        <ul className="divide-y divide-white/[0.06]">
          {files.map((f) => (
            <FileRow key={f.id} f={f} onRename={(name) => rename.mutate({ id: f.id, name })} onOpen={() => void open(f)} onRemove={() => { if (window.confirm(`حذف «${f.name}»؟ الزبونات اللي اشترين ما رح يقدرن ينزّلنه.`)) remove.mutate(f.id); }} />
          ))}
        </ul>
      ) : q.isLoading ? (
        <p className="text-xs text-white/45">جارٍ التحميل…</p>
      ) : (
        <p className="text-xs text-amber-300/90">لسا ما في ملفات. الزبونة ما رح تلاقي إشي تنزّله.</p>
      )}

      {progress ? (
        <div className="mt-3 text-xs text-white/70" role="status">
          جارٍ رفع «{progress.name}» {progress.pct}%
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent-500 transition-all" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      ) : null}

      {link ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <input className={cn(fieldCls, "h-10")} value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder="الاسم: مثلاً فيديو الشرح" aria-label="اسم الرابط" />
          <input className={cn(fieldCls, "h-10")} dir="ltr" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://drive.google.com/…" aria-label="الرابط" />
          <div className="flex gap-2">
            <button type="button" disabled={!linkOk || addLink.isPending} onClick={() => link && addLink.mutate({ name: link.name.trim(), url: link.url.trim() })} className="h-10 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-50">إضافة</button>
            <button type="button" onClick={() => setLink(null)} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">إلغاء</button>
          </div>
          <p className="text-[11px] text-white/40 sm:col-span-3">تأكدي إنه الرابط مفتوح لأي حد معه الرابط. الزبونة بتشوفه بس بعد الدفع/القبول.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} data-testid="product-file-input" />
          <button type="button" disabled={Boolean(progress) || q.data?.storageReady === false} onClick={() => input.current?.click()} className="h-10 rounded-xl bg-accent-500/20 px-4 text-sm text-white hover:bg-accent-500/30 disabled:opacity-50">+ رفع ملف</button>
          <button type="button" onClick={() => setLink({ name: "", url: "" })} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06]">+ رابط (لملف كبير)</button>
        </div>
      )}
    </div>
  );
}

function FileRow({ f, onRename, onOpen, onRemove }: { f: ProductFile; onRename: (name: string) => void; onOpen: () => void; onRemove: () => void }) {
  const [name, setName] = useState(f.name);
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-lg" aria-hidden>{f.kind === "link" ? "🔗" : "📄"}</span>
      <input
        className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm text-white hover:border-white/10 focus:border-white/20 focus:outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => { const v = name.trim(); if (v && v !== f.name) onRename(v); else setName(f.name); }}
        aria-label="اسم الملف"
      />
      <span className="text-[11px] text-white/40">{[f.format?.toUpperCase(), formatBytes(f.bytes), f.orders ? `${f.orders} طلب نزّلوه` : ""].filter(Boolean).join(" · ")}</span>
      <button type="button" onClick={onOpen} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">فتح</button>
      <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">حذف</button>
    </li>
  );
}
