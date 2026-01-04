// src/features/outbox/OutboxPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutboxActions, useOutboxList } from "../../hooks/useOutbox";

import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/EmptyState";

import { OUTBOX_CHANNELS, OUTBOX_STATUSES } from "./outbox.schema";
import type { OutboxChannel, OutboxStatus } from "../../api/outbox.api";
import { formatDateTime } from "../../lib/format";

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

export default function OutboxPage() {
  const nav = useNavigate();
  const { processOnce } = useOutboxActions();

  const [status, setStatus] = useState<OutboxStatus | "">("");
  const [channel, setChannel] = useState<OutboxChannel | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const params = useMemo(
    () => ({
      status: status || undefined,
      channel: channel || undefined,
      page,
      pageSize,
    }),
    [status, channel, page, pageSize]
  );

  const q = useOutboxList(params);

  const data = q.data;
  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-lg font-semibold">الرسائل (Outbox)</div>
            <div className="mt-1 text-xs opacity-70">Queued / Failed / Sent …</div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-60">
              <Select
                label="الحالة"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(1);
                }}
                placeholder="الكل"
                options={OUTBOX_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>

            <div className="w-full sm:w-60">
              <Select
                label="القناة"
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as any);
                  setPage(1);
                }}
                placeholder="الكل"
                options={OUTBOX_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => processOnce.mutate()}
                isLoading={processOnce.isPending}
                title="يشغل معالجة مرة واحدة (للتجربة/الديبغ)"
              >
                Process Once
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري التحميل…</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            فشل تحميل الرسائل.
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="لا يوجد رسائل" description="جرّب تغيير الفلاتر." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>الحالة</TH>
                  <TH>القناة</TH>
                  <TH>إلى</TH>
                  <TH>محاولات</TH>
                  <TH>تاريخ</TH>
                </TR>
              </THead>

              <TBody>
                {rows.map((m: any) => (
                  <TR key={m.id} className="cursor-pointer" onClick={() => nav(`/admin/outbox/${m.id}`)}>
                    <TD>
                      <Badge variant={statusVariant(m.status) as any}>{m.status}</Badge>
                    </TD>
                    <TD>{m.channel}</TD>
                    <TD dir="ltr" className="text-left">
                      {m.to}
                    </TD>
                    <TD>{m.attempts ?? 0}</TD>
                    <TD>{formatDateTime(m.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
