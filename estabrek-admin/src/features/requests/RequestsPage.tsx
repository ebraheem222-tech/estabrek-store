// الطلبات الخاصة: what shoppers asked for («اطلبي قطعتكِ» — a size, a colour,
// a new piece, with photos) and Razan's «بدي حدا يحكيني». Work on each one,
// link the piece when it arrives and tell her; see what's asked for most;
// and the switch with its rules.
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { messageLang, waLink } from "../../lib/orders";
import { useAuth } from "../../hooks/useAuth";
import * as ReqAPI from "../../api/requests.api";
import * as CatalogAPI from "../../api/catalog.api";
import type { CustomerRequestRow, RequestKind, RequestStatus, RequestsFilter, RequestsSettings } from "../../api/requests.api";
import { relativeTime } from "../team/teamText";
import { KIND_LABELS, SOURCE_LABELS, STATUS_LABELS, STATUS_VARIANT, askText, wantLine } from "./requestsText";
import { useDelivery } from "../orders/useDelivery";
import { loc } from "@/lib/lang";
import { tr } from "@/lib/words";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

const TABS: Array<{ key: RequestStatus | "OPEN" | "ALL"; label: string }> = [
  { key: "OPEN", label: tr("مفتوحة", "Open") },
  { key: "FOUND", label: tr("لقيناها", "Found") },
  { key: "UNAVAILABLE", label: tr("مش متوفرة", "Not available") },
  { key: "DONE", label: tr("خلصت", "Done") },
  { key: "ALL", label: tr("الكل", "All") },
];

export default function RequestsPage() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("OPEN");
  const [kind, setKind] = useState<RequestKind | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  // The open request stays on screen even after it leaves this tab (e.g. «لقيناها»), so its WhatsApp button is still there.
  const [openRow, setOpenRow] = useState<CustomerRequestRow | null>(null);
  const openId = openRow?.id ?? null;
  const filter: RequestsFilter = { status: tab === "ALL" ? undefined : tab, kind: kind || undefined, q: q.trim() || undefined, page };
  const list = useQuery({ queryKey: ["requests", filter], queryFn: () => ReqAPI.listRequests(filter) });
  const summary = useQuery({ queryKey: ["requests-summary"], queryFn: ReqAPI.getSummary });
  const rows = list.data?.requests ?? [];
  const shown = openRow && !rows.some((r) => r.id === openRow.id) ? [openRow, ...rows] : rows;
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="space-y-4 pb-10" data-testid="requests-page">
      <div className={box}>
        <h1 className="text-lg font-semibold">{tr("الطلبات الخاصة", "Special requests")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {tr("زبائن طلبوا مقاس أو لون مش موجود، أو قطعة جديدة (مع صور)، وطلبات «احكوني» من رزان. البحث، ربط القطعة لما توصل، والتبليغ بكبسة.", "Customers who asked for a size or colour that isn't there, or a new piece (with photos), and “Call me” requests from Razan. Look for it, link the piece when it arrives, and tell them in one click.")}
        </p>
      </div>

      {hasPermission("settings:read") ? <SettingsCard /> : null}
      {summary.data ? <Demand s={summary.data} /> : null}

      <section className={box}>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={tr("حالة الطلبات", "Request status")}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => { setTab(t.key); setPage(1); setOpenRow(null); }}
              className={`rounded-full border px-3 py-1.5 text-sm ${tab === t.key ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"}`}
            >
              {t.label}
              {t.key === "OPEN" && summary.data ? ` (${(summary.data.status.NEW ?? 0) + (summary.data.status.SEARCHING ?? 0)})` : ""}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_200px]">
          <input className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={tr("بحث بالاسم، الرقم، المقاس، اللون…", "Search by name, number, size, colour…")} aria-label={tr("بحث بالطلبات", "Search requests")} />
          <select className={field} value={kind} onChange={(e) => { setKind(e.target.value as RequestKind | ""); setPage(1); }} aria-label={tr("نوع الطلب", "Request type")}>
            <option value="">{tr("كل الأنواع", "All types")}</option>
            {(Object.keys(KIND_LABELS) as RequestKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </select>
        </div>

        <div className="mt-4">
          {list.isLoading ? (
            <div className="flex items-center gap-2 text-sm"><Spinner /> {tr("جاري التحميل…", "Loading…")}</div>
          ) : list.isError ? (
            <div className="text-sm text-red-200">{getApiErrorMessage(list.error)}</div>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/50">{tr("ما في طلبات هون.", "No requests here.")}</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]" data-testid="requests-list">
              {shown.map((r) => (
                <li key={r.id}>
                  <RequestRow r={r} open={openId === r.id} onToggle={() => setOpenRow((x) => (x?.id === r.id ? null : r))} />
                  {openId === r.id ? <RequestDetails id={r.id} onGone={() => setOpenRow(null)} /> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        {pages > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{tr("السابق", "Previous")}</Button>
            <span className="text-white/60">{page} / {pages}</span>
            <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{tr("التالي", "Next")}</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function RequestRow({ r, open, onToggle }: { r: CustomerRequestRow; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-3 text-start hover:bg-white/[0.03]">
      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{wantLine(r)}</span>
        <span className="block text-xs text-white/50">
          {KIND_LABELS[r.kind]} · {r.name} · <span dir="ltr">{r.phone}</span>
          {r.photoCount ? ` · 📷 ${r.photoCount}` : ""}
        </span>
      </span>
      <span className="text-xs text-white/45">{relativeTime(r.createdAt)}</span>
    </button>
  );
}

function RequestDetails({ id, onGone }: { id: string; onGone: () => void }) {
  const { storeNameIn, audience } = useDelivery();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("orders:write");
  const d = useQuery({ queryKey: ["request", id], queryFn: () => ReqAPI.getRequest(id) });
  const [note, setNote] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [told, setTold] = useState<{ wa: string | null; emailed: boolean } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["requests"] });
    qc.invalidateQueries({ queryKey: ["requests-summary"] });
    qc.invalidateQueries({ queryKey: ["request", id] });
  };
  const patch = useMutation({
    mutationFn: (p: Parameters<typeof ReqAPI.updateRequest>[1]) => ReqAPI.updateRequest(id, p),
    onSuccess: () => { toast.success(tr("انحفظ", "Saved")); refresh(); },
    onError: (e) => toast.error(tr("ما انحفظ", "Not saved"), { description: getApiErrorMessage(e) }),
  });
  const notify = useMutation({
    mutationFn: () => ReqAPI.notifyRequest(id),
    onSuccess: (out) => {
      setTold({ wa: waLink(out.phone, out.whatsappText), emailed: out.emailed });
      toast.success(out.emailed ? tr("انبعت إيميل — وهاي رسالة واتساب جاهزة", "An email was sent — and here's a ready WhatsApp message") : tr("رسالة الواتساب جاهزة", "The WhatsApp message is ready"));
      refresh();
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  const del = useMutation({
    mutationFn: () => ReqAPI.deleteRequest(id),
    onSuccess: () => { toast.success(tr("انحذف الطلب وصوره", "The request and its photos were deleted")); setConfirmDelete(false); onGone(); refresh(); },
    onError: (e) => toast.error(tr("ما انحذف", "Not deleted"), { description: getApiErrorMessage(e) }),
  });

  if (d.isLoading) return <div className="flex items-center gap-2 pb-4 text-sm"><Spinner /> …</div>;
  if (d.isError || !d.data) return <div className="pb-4 text-sm text-red-200">{getApiErrorMessage(d.error)}</div>;
  const r = d.data;
  const noteValue = note ?? r.adminNote ?? "";
  const wa = waLink(r.phone, askText(r.name, r.kind, { storeName: storeNameIn(messageLang(r)), audience, lang: messageLang(r) }));

  return (
    <div className="mb-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="request-details">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Info label={tr("الزبون", "Customer")} value={<>{r.name} · <span dir="ltr">{r.phone}</span>{r.email ? <> · <span dir="ltr">{r.email}</span></> : null}</>} />
        <Info label={tr("النوع", "Type")} value={`${KIND_LABELS[r.kind]}${r.source ? ` — ${SOURCE_LABELS[r.source] ?? r.source}` : ""}`} />
        {r.wantedSize ? <Info label={tr("المقاس المطلوب", "Size wanted")} value={r.wantedSize} /> : null}
        {r.wantedColor ? <Info label={tr("اللون المطلوب", "Colour wanted")} value={r.wantedColor} /> : null}
        {r.product ? <Info label={tr("عن القطعة", "About the piece")} value={r.productUrl ? <a className="underline" href={r.productUrl} target="_blank" rel="noreferrer">{r.product.title}</a> : r.product.title} /> : null}
        <Info label={tr("وصل", "Came in")} value={new Date(r.createdAt).toLocaleString(loc("ar"), { dateStyle: "medium", timeStyle: "short" })} />
      </div>
      {r.details ? <p className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-3 text-sm leading-7">{r.details}</p> : null}

      {r.photos.length ? (
        <div className="flex flex-wrap gap-2" data-testid="request-photos">
          {r.photos.map((p, i) => p.url ? (
            <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block h-28 w-24 overflow-hidden rounded-xl border border-white/10">
              <img src={p.url} alt={tr(`صورة ${i + 1}`, "Photo {0}", [i + 1])} className="h-full w-full object-cover" loading="lazy" />
            </a>
          ) : null)}
        </div>
      ) : r.photosDeletedAt ? (
        <p className="text-xs text-white/45">{tr("الصور انمسحت لحالها (", "The photos were cleared by themselves (")}{new Date(r.photosDeletedAt).toLocaleDateString(loc("ar"))}).</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/55">{tr("الحالة:", "Status:")}</span>
        {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((s) => (
          <button key={s} type="button" disabled={!canWrite || patch.isPending} onClick={() => s !== r.status && patch.mutate({ status: s })} aria-pressed={r.status === s} className={`rounded-full border px-3 py-1 text-xs ${r.status === s ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"} disabled:opacity-60`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-white/55">{tr("ملاحظة للفريق (ما بيشوفها الزبون)", "Note for the team (the customer doesn't see it)")}</span>
        <textarea className={`${field} h-auto min-h-[70px] py-2`} value={noteValue} disabled={!canWrite} maxLength={1000} onChange={(e) => setNote(e.target.value)} aria-label={tr("ملاحظة للفريق", "Note for the team")} />
        {note !== null && note !== (r.adminNote ?? "") ? (
          <Button size="sm" variant="secondary" className="mt-2" isLoading={patch.isPending} onClick={() => patch.mutate({ adminNote: note.trim() || null }, { onSuccess: () => setNote(null) })}>{tr("حفظ الملاحظة", "Save note")}</Button>
        ) : null}
      </label>

      {r.kind !== "CALLBACK" ? (
        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/60">{tr("القطعة اللي لقيناها:", "The piece we found:")}</span>
            {r.linkedProduct ? (
              <>{r.linkedUrl ? <a className="font-medium underline" href={r.linkedUrl} target="_blank" rel="noreferrer">{r.linkedProduct.title}</a> : <b>{r.linkedProduct.title}</b>}</>
            ) : <span className="text-white/40">{tr("لسا ما انربطت قطعة", "No piece linked yet")}</span>}
            {canWrite ? <Button size="sm" variant="ghost" onClick={() => setPicking((v) => !v)}>{r.linkedProduct ? tr("تغيير", "Change") : tr("ربط قطعة", "Link a piece")}</Button> : null}
            {canWrite && r.linkedProduct ? <Button size="sm" variant="ghost" onClick={() => patch.mutate({ linkedProductId: null })}>{tr("شيل الربط", "Unlink")}</Button> : null}
          </div>
          {picking ? <ProductPicker onPick={(pid) => { setPicking(false); patch.mutate({ linkedProductId: pid }); }} /> : null}
          {canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" disabled={!r.linkedProduct} isLoading={notify.isPending} onClick={() => notify.mutate()}>
                {tr("🎉 تبليغ إنها وصلت", "🎉 Tell them it arrived")}
              </Button>
              <span className="text-xs text-white/50">
                {r.email ? (r.emailReady ? tr("بيوصل إيميل للزبون، وبتطلع رسالة واتساب جاهزة.", "They get an email, and a ready WhatsApp message comes up.") : tr("الإيميل مش مفعّل (Resend) — بتطلع رسالة واتساب جاهزة.", "Email isn't on (Resend) — a ready WhatsApp message comes up.")) : tr("ما في إيميل — بتطلع رسالة واتساب جاهزة.", "No email left — a ready WhatsApp message comes up.")}
                {r.notifiedAt ? tr(` بلّغناه ${relativeTime(r.notifiedAt)}.`, " We told them {0}.", [relativeTime(r.notifiedAt)]) : ""}
              </span>
            </div>
          ) : null}
          {told?.wa ? (
            <a href={told.wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/80 px-3 py-2 text-sm font-medium text-white" data-testid="request-found-wa">
              {tr("فتح واتساب وبعت الرسالة 💬", "Open WhatsApp and send 💬")}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {wa ? <a href={wa} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-white/25">{tr("واتساب 💬", "WhatsApp 💬")}</a> : null}
        <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-white/25">{tr("اتصال 📞", "Call 📞")}</a>
        {canWrite ? <Button size="sm" variant="ghost" className="ms-auto text-red-300" onClick={() => setConfirmDelete(true)}>{tr("حذف", "Delete")}</Button> : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={tr("حذف الطلب", "Delete request")}
        message={tr("بينحذف الطلب وصوره نهائياً. للسبام أو الطلبات المكررة.", "The request and its photos are deleted for good. For spam or repeated requests.")}
        confirmText={tr("حذف", "Delete")}
        isLoading={del.isPending}
        onConfirm={() => del.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs text-white/50">{label}</span>
      <span className="block break-words">{value}</span>
    </div>
  );
}

function ProductPicker({ onPick }: { onPick: (id: string) => void }) {
  const [text, setText] = useState("");
  const products = useQuery({ queryKey: ["products-pick"], queryFn: () => CatalogAPI.listProducts("all"), staleTime: 60_000 });
  const found = useMemo(() => {
    const t = text.trim().toLowerCase();
    const all = products.data ?? [];
    return (t ? all.filter((p) => p.title.toLowerCase().includes(t) || p.slug.toLowerCase().includes(t)) : all).slice(0, 8);
  }, [products.data, text]);
  return (
    <div className="space-y-2" data-testid="product-picker">
      <input className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("اسم القطعة…", "Type the piece's name…")} aria-label={tr("بحث عن قطعة", "Look for a piece")} autoFocus />
      {products.isLoading ? <div className="flex items-center gap-2 text-xs"><Spinner /> …</div> : (
        <ul className="max-h-60 overflow-auto rounded-xl border border-white/10">
          {found.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.id)} className="block w-full px-3 py-2 text-start text-sm hover:bg-white/[0.05]">
                {p.title}{p.isActive ? "" : <span className="ms-2 text-xs text-white/40">{tr("(مسودة)", "(draft)")}</span>}
              </button>
            </li>
          ))}
          {!found.length ? <li className="px-3 py-2 text-xs text-white/45">{tr("ما في قطعة بهالاسم.", "No piece with this name.")}</li> : null}
        </ul>
      )}
    </div>
  );
}

function Block({ title, rows }: { title: string; rows: Array<{ key: string; label: React.ReactNode; count: number }> }) {
  if (!rows.length) return null;
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs text-white/55">{title}</h3>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <Badge variant="accent" size="sm">{r.count}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Demand({ s }: { s: ReqAPI.RequestsSummary }) {
  const empty = !s.sizes.length && !s.colors.length && !s.products.length;
  if (empty) return null;
  return (
    <section className={box} data-testid="requests-demand">
      <h2 className="font-semibold">{tr("شو بيطلبوا أكثر (آخر 30 يوم)", "What they ask for most (last 30 days)")}</h2>
      <p className="mt-1 text-xs text-white/50">{tr("بيساعد بقرار شو ييجي بالطلبية الجاية من المورّد.", "Helps decide what to get in the next supplier order.")}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Block title={tr("مقاسات", "Sizes")} rows={s.sizes.map((x) => ({ key: x.value, label: x.value, count: x.count }))} />
        <Block title={tr("ألوان", "Colours")} rows={s.colors.map((x) => ({ key: x.value, label: x.value, count: x.count }))} />
        <Block title={tr("قطع", "Pieces")} rows={s.products.map((x) => ({ key: x.id, label: <Link className="underline" to={`/admin/catalog/products/${x.id}`}>{x.title}</Link>, count: x.count }))} />
      </div>
    </section>
  );
}

function SettingsCard() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const q = useQuery({ queryKey: ["requests-settings"], queryFn: ReqAPI.getRequestsSettings });
  if (q.isLoading) return <div className={`${box} flex items-center gap-2 text-sm`}><Spinner /> …</div>;
  if (q.isError || !q.data) return <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>;
  return <SettingsEditor key={JSON.stringify(q.data.settings)} saved={q.data.settings} photosReady={q.data.photosReady} canWrite={canWrite} onSaved={() => { qc.invalidateQueries({ queryKey: ["requests-settings"] }); qc.invalidateQueries({ queryKey: ["requests-summary"] }); qc.invalidateQueries({ queryKey: ["features"] }); }} />;
}

function SettingsEditor({ saved, photosReady, canWrite, onSaved }: { saved: RequestsSettings; photosReady: boolean; canWrite: boolean; onSaved: () => void }) {
  const [s, setS] = useState(saved);
  const [open, setOpen] = useState(!saved.enabled);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const save = useMutation({
    mutationFn: (next: RequestsSettings) => ReqAPI.saveRequestsSettings(next),
    onSuccess: (_o, next) => { toast.success(next.enabled ? tr("«طلب قطعة» شغّال بالمتجر", "“Request a piece” is on in the store") : tr("انحفظ", "Saved")); onSaved(); },
    onError: (e) => toast.error(tr("ما انحفظ", "Not saved"), { description: getApiErrorMessage(e) }),
  });
  const set = (patch: Partial<RequestsSettings>) => setS((x) => ({ ...x, ...patch }));
  return (
    <section className={box} data-testid="requests-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{tr("«طلب قطعة» بالمتجر", "“Request a piece” in the store")}</h2>
          <p className="mt-1 text-xs text-white/55">
            {tr("بيطلع زر «المقاس مش موجود؟» بصفحة القطعة، و«اطلبها منّا» بالبحث، وصفحة /request. طلبات «احكوني» من رزان بتوصل هون دايماً (من", "A “Your size isn't there?” button shows on the product page, “Ask us for it” in search, and the /request page. “Call me” requests from Razan always arrive here (from")} <Link className="underline" to="/admin/razan">{tr("صفحة رزان", "Razan's page")}</Link>).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70">{s.enabled ? tr("شغّالة", "On") : tr("مطفية", "Off")}</span>
          <ToggleSwitch checked={s.enabled} label={tr("«طلب قطعة» شغّال", "“Request a piece” on")} disabled={!canWrite} onChange={(v) => set({ enabled: v })} />
        </div>
      </div>
      {!photosReady && s.maxPhotos > 0 ? (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          {tr("رفع الصور محتاج Cloudinary (مش مضبوط على السيرفر). الطلبات بتوصل، بس الطلبات اللي فيها صور رح تفشل لحد ما ينضبط — أو «عدد الصور» بيصير 0.", "Photo uploads need Cloudinary (not set up on the server). Requests arrive, but ones with photos will fail until it's set — or set “Number of photos” to 0.")}
        </p>
      ) : null}
      <button type="button" className="mt-3 text-xs text-white/60 underline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? tr("إخفاء القواعد", "Hide rules") : tr("القواعد", "Rules")}</button>
      {open ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs text-white/55">{tr("شو بيقدروا يطلبوا", "What they can ask for")}</legend>
            {([["size", tr("مقاس مش موجود", "A size that isn't there")], ["color", tr("لون مش موجود", "A colour that isn't there")], ["newPiece", tr("قطعة جديدة (مع صورة)", "A new piece (with a photo)")]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.kinds[k]} disabled={!canWrite} onChange={(e) => set({ kinds: { ...s.kinds, [k]: e.target.checked } })} />
                {l}
              </label>
            ))}
          </fieldset>
          <div className="space-y-3">
            <NumberField label={tr("عدد الصور بالطلب (0 = بدون صور)", "Photos per request (0 = no photos)")} value={s.maxPhotos} min={0} max={5} disabled={!canWrite} onChange={(v) => set({ maxPhotos: v })} />
            <NumberField label={tr("الصور بتنمسح بعد (يوم) — الطلب بيضل", "Photos clear after (days) — the request stays")} value={s.photoDays} min={7} max={365} disabled={!canWrite} onChange={(v) => set({ photoDays: v })} />
            <NumberField label={tr("أكثر عدد طلبات من نفس الرقم باليوم", "Most requests from one number a day")} value={s.perPhoneDay} min={1} max={20} disabled={!canWrite} onChange={(v) => set({ perPhoneDay: v })} />
          </div>
        </div>
      ) : null}
      {canWrite && dirty ? (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" isLoading={save.isPending} disabled={!s.kinds.size && !s.kinds.color && !s.kinds.newPiece} onClick={() => save.mutate(s)}>{tr("حفظ", "Save")}</Button>
        </div>
      ) : null}
    </section>
  );
}

function NumberField({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/55">{label}</span>
      <input type="number" dir="ltr" min={min} max={max} className={`${field} w-28`} value={value} disabled={disabled} onChange={(e) => onChange(Math.max(min, Math.min(max, Math.round(Number(e.target.value) || min))))} aria-label={label} />
    </label>
  );
}
