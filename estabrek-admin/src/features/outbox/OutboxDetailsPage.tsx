// src/features/outbox/OutboxDetailsPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOutboxActions, useOutboxDetails } from "../../hooks/useOutbox";

import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";

import type { OutboxStatus } from "../../api/outbox.api";
import { formatDateTime } from "../../lib/format";
import CancelOutboxModal from "./CancelOutboxModal";

function statusVariant(status?: OutboxStatus) {
    switch (status) {
      case "QUEUED":
        return "warning";
      case "SENT":
        return "success";
      case "FAILED":
        return "danger";
      default:
        return "default";
    }
  }

export default function OutboxDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const q = useOutboxDetails(id ?? null);
  const msg: any = q.data;

  const { retry } = useOutboxActions();

  const [openCancel, setOpenCancel] = useState(false);

  const canRetry = useMemo(() => msg?.status === "FAILED" || msg?.status === "QUEUED", [msg]);
  const canCancel = useMemo(() => msg?.status === "QUEUED" || msg?.status === "FAILED", [msg]);

  const onRetry = async () => {
    if (!id) return;
    await retry.mutateAsync(id);
    await q.refetch();
  };

  if (q.isLoading) {
    return (
      <div dir="rtl" className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2">
          <Spinner />
          <div className="text-sm opacity-80">جاري التحميل…</div>
        </div>
      </div>
    );
  }

  if (q.isError || !msg) {
    return (
      <div dir="rtl" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        فشل تحميل الرسالة.
        <div className="mt-4">
          <Button variant="ghost" onClick={() => nav("/admin/outbox")}>
            رجوع
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold">تفاصيل الرسالة</div>
            <div className="mt-1 text-xs opacity-70">
              ID: <span className="opacity-100">{msg.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav("/admin/outbox")}>
              رجوع
            </Button>

            <Button variant="secondary" onClick={onRetry} disabled={!canRetry} isLoading={retry.isPending}>
              Retry
            </Button>

            <Button variant="danger" onClick={() => setOpenCancel(true)} disabled={!canCancel}>
              Cancel
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">الحالة</div>
            <div className="mt-2">
              <Badge variant={statusVariant(msg.status) as any}>{msg.status}</Badge>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">القناة</div>
            <div className="mt-2 font-semibold">{msg.channel}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">إلى</div>
            <div className="mt-2 font-semibold" dir="ltr">
              {msg.to}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">Attempts</div>
            <div className="mt-2 text-sm">{msg.attempts ?? 0}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">Created</div>
            <div className="mt-2 text-sm">{formatDateTime(msg.createdAt)}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">Updated</div>
            <div className="mt-2 text-sm">{formatDateTime(msg.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Payload / Error details */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 text-lg font-semibold">المحتوى</div>

        <Table>
          <THead>
            <TR>
              <TH>حقل</TH>
              <TH>قيمة</TH>
            </TR>
          </THead>
          <TBody>
            <TR>
              <TD className="opacity-70">Template</TD>
              <TD dir="ltr" className="text-left">
                {msg.template ?? "-"}
              </TD>
            </TR>

            <TR>
              <TD className="opacity-70">Payload</TD>
              <TD>
                <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs" dir="ltr">
                  {JSON.stringify(msg.payloadJson ?? msg.payload ?? {}, null, 2)}
                </pre>
              </TD>
            </TR>

            <TR>
              <TD className="opacity-70">Last Error</TD>
              <TD>
                <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs" dir="ltr">
                  {msg.lastError ?? msg.error ?? "-"}
                </pre>
              </TD>
            </TR>
          </TBody>
        </Table>
      </div>

      <CancelOutboxModal open={openCancel} messageId={msg.id} onClose={() => setOpenCancel(false)} />
    </div>
  );
}
