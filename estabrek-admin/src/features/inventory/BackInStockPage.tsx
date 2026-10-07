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

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

const STATUS: Record<StockAlertStatus, { label: string; variant: "success" | "warning" | "danger" | undefined }> = {
  WAITING: { label: "بتستنى", variant: "warning" },
  SENT: { label: "انبعتلها", variant: "success" },
  CANCELLED: { label: "انلغى", variant: undefined },
  FAILED: { label: "ما وصل", variant: "danger" },
};

export default function BackInStockPage() {
  const q = useQuery({ queryKey: ["stock-alerts"], queryFn: AlertsAPI.getStockAlerts });
  const d = q.data;

  return (
    <div dir="rtl" className="space-y-4" data-testid="back-in-stock-page">
      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}>
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : d ? (
        <>
          <AlertsSwitch view={d} />
          <section className="grid grid-cols-2 gap-3">
            <Fact label="بانتظار قطع" value={String(d.totals.waiting)} />
            <Fact label="انبعتلهن آخر 30 يوم" value={String(d.totals.sentLast30Days)} />
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
      toast.success(on ? "صار في «بلّغيني لما ترجع» على المقاسات اللي نفدت" : "انطفى التنبيه. اللي سجّلوا قبل بيضلّوا محفوظين");
      setConfirmOff(false);
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const missing = [
    !view.ready.email ? "إرسال الإيميل (Resend)" : null,
    !view.ready.storefrontUrl ? "عنوان المتجر STOREFRONT_URL" : null,
  ].filter(Boolean);

  return (
    <div className={box} data-testid="alerts-switch">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold">تنبيه «رجعت متوفرة»</h1>
            {enabled ? (
              <Badge size="sm" variant="success" dot>
                شغّال
              </Badge>
            ) : (
              <Badge size="sm" dot>
                مطفي
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {enabled
              ? "لما مقاس يخلص، الزبونة بتحط إيميلها تحت زر الشراء، وأول ما ترجع القطعة للمخزون بيوصلها إيميل واحد فيه رابط القطعة. ما بدها حساب."
              : "لما يشتغل، بيطلع تحت زر الشراء بالمقاسات اللي نفدت «بلّغيني لما ترجع». الزبونة بتحط إيميلها، وأول ما ترجع القطعة بيوصلها إيميل."}
          </p>
          {missing.length ? (
            <p className="mt-2 text-xs text-amber-200">
              الإيميلات ما رح تنبعت لحتى ينضبط بالسيرفر: {missing.join(" و")}. الطلبات بتنحفظ وبتستنى، وما بيضيع اشي.
            </p>
          ) : null}
          {!canChange ? <p className="mt-2 text-xs text-white/50">التشغيل والإطفاء بدّه صلاحية «تعديل الإعدادات».</p> : null}
        </div>
        {canChange ? (
          enabled ? (
            <Button variant="secondary" onClick={() => setConfirmOff(true)} isLoading={change.isPending}>
              إطفاء
            </Button>
          ) : (
            <Button variant="primary" onClick={() => change.mutate(true)} isLoading={change.isPending}>
              تشغيل
            </Button>
          )
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOff}
        title="إطفاء «رجعت متوفرة»"
        message="الخانة بتختفي من المتجر، وما بتنبعت إيميلات. اللي سجّلوا بيضلّوا محفوظين، ولما ترجّع تشغّله بيوصلهم الإيميل عادي."
        confirmText="إطفاء"
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
      toast.success(out.sent ? `انبعت ${out.sent} إيميل` : "ما في إيميلات لازم تنبعت هلّق");
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">القطع اللي بيستنوها</h2>
          <p className="mt-1 text-xs text-white/50">الأكثر طلباً أول. هاي إشارة شو ترجّعي للمخزون.</p>
        </div>
        {canWrite && due > 0 && ready ? (
          <Button variant="secondary" onClick={() => send.mutate()} isLoading={send.isPending}>
            إرسال الآن ({due})
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
                  {[p.colorName, p.sizeName ? `مقاس ${p.sizeName}` : ""].filter(Boolean).join(" · ")}
                  {p.since ? ` · أول طلب ${relativeTime(p.since)}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <span className="font-semibold">{p.waiting === 1 ? "زبونة وحدة" : `${p.waiting} زبونات`}</span>
                {p.stock > 0 ? (
                  <Badge size="sm" variant="success">
                    رجعت ({p.stock}){ready ? " · بينبعت قريباً" : ""}
                  </Badge>
                ) : (
                  <Badge size="sm">نفدت</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">{view.enabled ? "ما حدا بيستنى قطعة هلّق." : "ما في طلبات. التنبيه مطفي."}</p>
      )}
      {view.pieces.length ? (
        <p className="mt-3 text-xs text-white/50">
          لما ترجّعي مقاس للمخزون من <Link className="underline" to="/admin/inventory/stock">المخزون والباركود</Link>، الإيميلات بتنبعت لحالها خلال دقيقتين.
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
      toast.success("انلغى التنبيه");
      setCancelId(null);
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  if (!view.recent.length) return null;

  return (
    <div className={box}>
      <h2 className="font-semibold">آخر الطلبات</h2>
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
                إلغاء
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!cancelId}
        title="إلغاء التنبيه"
        message="ما رح يوصلها إيميل لما ترجع القطعة."
        confirmText="إلغاء التنبيه"
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
