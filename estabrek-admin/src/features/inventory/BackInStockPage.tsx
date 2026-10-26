// بانتظار التوفّر: shoppers who left their email on a sold-out size, and the
// switch that shows that form on the storefront ("بلّغيني لما ترجع").
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as AlertsAPI from "../../api/stockAlerts.api";
import type { StockAlertStatus, StockAlertsView } from "../../api/stockAlerts.api";
import { relativeTime } from "../team/teamText";
import { tr } from "@/lib/words";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

const STATUS: Record<StockAlertStatus, { label: string; variant: "success" | "warning" | "danger" | undefined }> = {
  WAITING: { label: tr("بتستنى", "Waiting"), variant: "warning" },
  SENT: { label: tr("انبعت", "Sent"), variant: "success" },
  CANCELLED: { label: tr("انلغى", "Cancelled"), variant: undefined },
  FAILED: { label: tr("ما وصل", "Not delivered"), variant: "danger" },
};

export default function BackInStockPage() {
  const q = useQuery({ queryKey: ["stock-alerts"], queryFn: AlertsAPI.getStockAlerts });
  const d = q.data;

  return (
    <div className="space-y-4" data-testid="back-in-stock-page">
      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}>
          <Spinner /> {tr("جاري التحميل…", "Loading…")}
        </div>
      ) : q.isError ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : d ? (
        <>
          <AlertsSwitch view={d} />
          <section className="grid grid-cols-2 gap-3">
            <Fact label={tr("بانتظار قطع", "Waiting for pieces")} value={String(d.totals.waiting)} />
            <Fact label={tr("انبعت آخر 30 يوم", "Sent in the last 30 days")} value={String(d.totals.sentLast30Days)} />
          </section>
          <Pieces view={d} />
          <Recent view={d} />
        </>
      ) : null}
    </div>
  );
}

function AlertsSwitch({ view }: { view: StockAlertsView }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canChange = hasPermission("settings:write");
  const [confirmOff, setConfirmOff] = useState(false);
  const enabled = view.enabled;
  const change = useMutation({
    mutationFn: (on: boolean) => AlertsAPI.setStockAlerts(on),
    onSuccess: (_out, on) => {
      toast.success(on ? tr("صار في «بلّغيني لما ترجع» على المقاسات اللي نفدت", "Sold-out sizes now have “Tell me when it's back”") : tr("انطفى التنبيه. اللي سجّلوا قبل بيضلّوا محفوظين", "The alert is off. Those who signed up stay saved"));
      setConfirmOff(false);
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  const missing = [
    !view.ready.email ? tr("إرسال الإيميل (Resend)", "Email sending (Resend)") : null,
    !view.ready.storefrontUrl ? tr("عنوان المتجر STOREFRONT_URL", "The store address STOREFRONT_URL") : null,
  ].filter(Boolean);

  return (
    <div className={box} data-testid="alerts-switch">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold">{tr("تنبيه «رجعت متوفرة»", "“Back in stock” alert")}</h1>
            {enabled ? (
              <Badge size="sm" variant="success" dot>
                {tr("شغّال", "On")}
              </Badge>
            ) : (
              <Badge size="sm" dot>
                {tr("مطفي", "Off")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {enabled
              ? tr("لما مقاس يخلص، الزبون بيحط إيميله تحت زر الشراء، وأول ما ترجع القطعة للمخزون بيوصله إيميل واحد فيه رابط القطعة. ما بده حساب.", "When a size sells out, the customer leaves their email under the buy button, and as soon as the piece is back in stock they get one email with its link. No account needed.")
              : tr("لما يشتغل، بيطلع تحت زر الشراء بالمقاسات اللي نفدت «بلّغني لما ترجع». الزبون بيحط إيميله، وأول ما ترجع القطعة بيوصله إيميل.", "When on, “Tell me when it's back” shows under the buy button on sold-out sizes. The customer leaves their email and gets one as soon as the piece is back.")}
          </p>
          {missing.length ? (
            <p className="mt-2 text-xs text-amber-200">
              {tr("الإيميلات ما رح تنبعت لحتى ينضبط بالسيرفر:", "Emails won't be sent until this is set on the server:")} {missing.join(tr(" و", " and "))}{tr(". الطلبات بتنحفظ وبتستنى، وما بيضيع اشي.", ". Requests are saved and wait; nothing is lost.")}
            </p>
          ) : null}
          {!canChange ? <p className="mt-2 text-xs text-white/50">{tr("التشغيل والإطفاء بدّه صلاحية «تعديل الإعدادات».", "Turning it on or off needs the “Edit settings” permission.")}</p> : null}
        </div>
        {canChange ? (
          enabled ? (
            <Button variant="secondary" onClick={() => setConfirmOff(true)} isLoading={change.isPending}>
              {tr("إطفاء", "Turn off")}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => change.mutate(true)} isLoading={change.isPending}>
              {tr("تشغيل", "Turn on")}
            </Button>
          )
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOff}
        title={tr("إطفاء «رجعت متوفرة»", "Turn off “Back in stock”")}
        message={tr("الخانة بتختفي من المتجر، وما بتنبعت إيميلات. اللي سجّلوا بيضلّوا محفوظين، ولما يرجع يشتغل بيوصلهم الإيميل عادي.", "The box disappears from the store and no emails go out. Those who signed up stay saved, and when it's back on they get the email as usual.")}
        confirmText={tr("إطفاء", "Turn off")}
        isLoading={change.isPending}
        onConfirm={() => change.mutate(false)}
        onCancel={() => setConfirmOff(false)}
      />
    </div>
  );
}

function Pieces({ view }: { view: StockAlertsView }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("inventory:write");
  const due = view.pieces.filter((p) => p.stock > 0).reduce((n, p) => n + p.waiting, 0);
  const ready = view.enabled && view.ready.email && view.ready.storefrontUrl;
  const send = useMutation({
    mutationFn: AlertsAPI.sendStockAlertsNow,
    onSuccess: (out) => {
      toast.success(out.sent ? tr(`انبعت ${out.sent} إيميل`, "{0} emails sent", [out.sent]) : tr("ما في إيميلات لازم تنبعت هلّق", "No emails need sending now"));
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{tr("القطع اللي بيستنوها", "Pieces people are waiting for")}</h2>
          <p className="mt-1 text-xs text-white/50">{tr("الأكثر طلباً أول. هاي إشارة شو لازم يرجع للمخزون.", "Most wanted first. A sign of what to bring back into stock.")}</p>
        </div>
        {canWrite && due > 0 && ready ? (
          <Button variant="secondary" onClick={() => send.mutate()} isLoading={send.isPending}>
            {tr("إرسال الآن (", "Send now (")}{due})
          </Button>
        ) : null}
      </div>
      {view.pieces.length ? (
        <ul className="mt-3 divide-y divide-white/10" data-testid="waited-pieces">
          {view.pieces.map((p) => (
            <li key={p.variantId} className="flex items-center gap-3 py-3">
              {p.image ? <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.productTitle}</div>
                <div className="text-xs text-white/60">
                  {[p.colorName, p.sizeName ? tr(`مقاس ${p.sizeName}`, "size {0}", [p.sizeName]) : ""].filter(Boolean).join(" · ")}
                  {p.since ? tr(` · أول طلب ${relativeTime(p.since)}`, " · first request {0}", [relativeTime(p.since)]) : ""}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <span className="font-semibold">{p.waiting === 1 ? tr("زبون واحد", "1 customer") : tr(`${p.waiting} زبائن`, "{0} customers", [p.waiting])}</span>
                {p.stock > 0 ? (
                  <Badge size="sm" variant="success">
                    {tr("رجعت (", "Back (")}{p.stock}){ready ? tr(" · بينبعت قريباً", " · sending soon") : ""}
                  </Badge>
                ) : (
                  <Badge size="sm">{tr("نفدت", "Sold out")}</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">{view.enabled ? tr("ما حدا بيستنى قطعة هلّق.", "Nobody is waiting for a piece right now.") : tr("ما في طلبات. التنبيه مطفي.", "No requests. The alert is off.")}</p>
      )}
      {view.pieces.length ? (
        <p className="mt-3 text-xs text-white/50">
          {tr("لما يرجع مقاس للمخزون من", "When a size is put back in stock from")} <Link className="underline" to="/admin/inventory/stock">{tr("المخزون والباركود", "Stock and barcodes")}</Link>{tr("، الإيميلات بتنبعت لحالها خلال دقيقتين.", ", the emails go out by themselves within two minutes.")}
        </p>
      ) : null}
    </div>
  );
}

function Recent({ view }: { view: StockAlertsView }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("inventory:write");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: (id: string) => AlertsAPI.cancelStockAlert(id),
    onSuccess: () => {
      toast.success(tr("انلغى التنبيه", "Alert cancelled"));
      setCancelId(null);
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  if (!view.recent.length) return null;

  return (
    <div className={box}>
      <h2 className="font-semibold">{tr("آخر الطلبات", "Latest requests")}</h2>
      <ul className="mt-3 divide-y divide-white/10 text-sm" data-testid="recent-alerts">
        {view.recent.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate" dir="ltr">
                  {a.email}
                </span>
                <Badge size="sm" variant={STATUS[a.status].variant}>
                  {STATUS[a.status].label}
                </Badge>
              </div>
              <div className="text-xs text-white/60">
                {a.productTitle} · {[a.colorName, a.sizeName].filter(Boolean).join(" · ")} · {relativeTime(a.notifiedAt ?? a.createdAt)}
              </div>
            </div>
            {canWrite && a.status === "WAITING" ? (
              <Button size="sm" variant="ghost" onClick={() => setCancelId(a.id)}>
                {tr("إلغاء", "Cancel")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!cancelId}
        title={tr("إلغاء التنبيه", "Cancel the alert")}
        message={tr("ما رح يوصل إيميل لما ترجع القطعة.", "No email will be sent when the piece is back.")}
        confirmText={tr("إلغاء التنبيه", "Cancel the alert")}
        isLoading={cancel.isPending}
        onConfirm={() => {
          if (cancelId) cancel.mutate(cancelId);
        }}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
