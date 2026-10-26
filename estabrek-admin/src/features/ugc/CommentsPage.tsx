import React, { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useComments, useUGCActions } from "../../hooks/useUGC";
import type { UGCStatus } from "../../api/ugc.api";
import { formatDateTime } from "../../lib/format";
import { tr } from "@/lib/words";

const STATUS_OPTIONS = [
  { value: "PENDING", label: tr("قيد المراجعة", "In review") },
  { value: "APPROVED", label: tr("مقبولة", "Approved") },
  { value: "REJECTED", label: tr("مرفوضة", "Rejected") },
];

function statusVariant(status?: string) {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "default";
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "PENDING":
      return tr("قيد المراجعة", "In review");
    case "APPROVED":
      return tr("مقبول", "Approved");
    case "REJECTED":
      return tr("مرفوض", "Rejected");
    default:
      return status ?? "-";
  }
}

function commentText(comment: any) {
  return String(comment?.content ?? comment?.body ?? comment?.message ?? comment?.text ?? "");
}

function authorText(comment: any) {
  return comment?.user?.name ?? comment?.user?.email ?? comment?.authorName ?? comment?.name ?? "-";
}

export default function CommentsPage() {
  const [status, setStatus] = useState<UGCStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const commentsQ = useComments({ status, page, pageSize: 20 });
  const actions = useUGCActions();

  const rows = commentsQ.data?.data ?? [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((comment: any) => {
      const haystack = [
        commentText(comment),
        authorText(comment),
        comment?.product?.title,
        comment?.product?.slug,
        comment?.product?.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [q, rows]);

  const total = commentsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (commentsQ.data?.pageSize ?? 20)));

  const setStatusFor = (id: string, toStatus: UGCStatus) => {
    actions.setCommentStatus.mutate({ id, toStatus });
  };

  const deleteSelected = async () => {
    if (!deleteId) return;
    try {
      await actions.deleteComment.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-white">{tr("تعليقات المنتجات", "Product comments")}</div>
            <div className="mt-1 text-xs text-white/50">{tr("الإجمالي:", "Total:")} {total}</div>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[180px_260px_auto]">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as UGCStatus);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("بحث داخل النتائج", "Search the results")} />
            <Button variant="ghost" onClick={() => commentsQ.refetch()} className="w-full sm:w-auto">
              {tr("تحديث", "Refresh")}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {commentsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Spinner />
            {tr("جاري التحميل...", "Loading...")}
          </div>
        ) : commentsQ.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {tr("فشل تحميل التعليقات.", "The comments couldn't load.")}
          </div>
        ) : filtered.length ? (
          <div className="space-y-3">
            {filtered.map((comment: any) => (
              <div key={comment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(comment.status) as any} dot>
                        {statusLabel(comment.status)}
                      </Badge>
                      <span className="text-sm font-semibold text-white">{authorText(comment)}</span>
                      <span className="text-xs text-white/40">{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
                      {commentText(comment) || "-"}
                    </div>
                    {comment.product ? (
                      <div className="mt-3 text-xs text-white/50">
                        {tr("المنتج:", "Product:")} {comment.product.title ?? comment.product.id}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {comment.status !== "APPROVED" ? (
                      <Button size="sm" variant="success" onClick={() => setStatusFor(comment.id, "APPROVED")} isLoading={actions.setCommentStatus.isPending}>
                        {tr("قبول", "Approve")}
                      </Button>
                    ) : null}
                    {comment.status !== "REJECTED" ? (
                      <Button size="sm" variant="danger" onClick={() => setStatusFor(comment.id, "REJECTED")} isLoading={actions.setCommentStatus.isPending}>
                        {tr("رفض", "Reject")}
                      </Button>
                    ) : null}
                    {comment.status !== "PENDING" ? (
                      <Button size="sm" variant="secondary" onClick={() => setStatusFor(comment.id, "PENDING")} isLoading={actions.setCommentStatus.isPending}>
                        {tr("إرجاع للمراجعة", "Back to review")}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(comment.id)}>
                      {tr("حذف", "Delete")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-white/60">{tr("لا يوجد نتائج", "No results")}</div>
        )}

        {totalPages > 1 ? (
          <Pagination className="mt-4" page={page} totalPages={totalPages} onChange={setPage} />
        ) : null}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title={tr("حذف التعليق", "Delete comment")}
        message={tr("حذف هالتعليق أكيد؟", "Delete this comment for sure?")}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={deleteSelected}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
