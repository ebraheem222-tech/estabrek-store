import React, { useEffect, useMemo, useState } from "react";
import { deleteReview, listReviews, setReviewStatus, type UGCStatus } from "@/api/ugc.api";
import { toast } from "@/lib/toast";
import { tr } from "@/lib/words";

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80">{children}</span>;
}

export default function ReviewsPage() {
  const [status, setStatus] = useState<UGCStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ total: number; page: number; pageSize: number; data: any[] }>({
    total: 0,
    page: 1,
    pageSize: 20,
    data: [],
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return data.data;
    const t = q.trim().toLowerCase();
    return data.data.filter((r) => {
      const s = `${r?.title ?? ""} ${r?.content ?? ""} ${r?.product?.title ?? ""}`.toLowerCase();
      return s.includes(t);
    });
  }, [data.data, q]);

  async function load() {
    setLoading(true);
    try {
      const res = await listReviews({ status, page, pageSize: 20 });
      setData(res);
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل تحميل التقييمات", "The reviews couldn't load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  async function changeStatus(id: string, to: UGCStatus) {
    try {
      await setReviewStatus(id, to);
      toast.success(tr("تم التحديث", "Updated"));
      load();
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل التحديث", "The update failed"));
    }
  }

  async function remove(id: string) {
    if (!confirm(tr("حذف هذا التقييم؟", "Delete this review?"))) return;
    try {
      await deleteReview(id);
      toast.success(tr("تم الحذف", "Deleted"));
      load();
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل الحذف", "Deleting failed"));
    }
  }

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? 20)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">{tr("التقييمات", "Reviews")}</div>
          <div className="text-sm text-white/60">{tr("إدارة تقييمات المنتجات (مراجعة قبل النشر)", "Manage product reviews (review before publishing)")}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-xl border border-white/10 bg-surface-900 px-3 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as UGCStatus);
            }}
          >
            <option value="PENDING">{tr("قيد المراجعة", "In review")}</option>
            <option value="APPROVED">{tr("مقبولة", "Approved")}</option>
            <option value="REJECTED">{tr("مرفوضة", "Rejected")}</option>
          </select>

          <input
            className="h-10 w-64 max-w-full rounded-xl border border-white/10 bg-surface-900 px-3 text-sm"
            placeholder={tr("بحث داخل النتائج...", "Search the results...")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface-900/30 p-4">
        {loading ? (
          <div className="text-sm text-white/60">{tr("جار التحميل...", "Loading...")}</div>
        ) : filtered.length ? (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-surface-900/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{r?.title || tr("(بدون عنوان)", "(no title)")}</div>
                      <Badge>{r?.status}</Badge>
                      <Badge>⭐ {r?.rating ?? "-"}</Badge>
                    </div>
                    <div className="text-sm text-white/70">{r?.content || ""}</div>
                    {r?.product ? (
                      <div className="text-xs text-white/50">
                        {tr("المنتج:", "Product:")} {r.product?.title} ({r.product?.id})
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {r.status !== "APPROVED" ? (
                      <button
                        className="h-9 rounded-xl bg-emerald-500/15 px-3 text-sm text-emerald-200 hover:bg-emerald-500/20"
                        onClick={() => changeStatus(r.id, "APPROVED")}
                      >
                        {tr("قبول", "Approve")}
                      </button>
                    ) : null}
                    {r.status !== "REJECTED" ? (
                      <button
                        className="h-9 rounded-xl bg-rose-500/15 px-3 text-sm text-rose-200 hover:bg-rose-500/20"
                        onClick={() => changeStatus(r.id, "REJECTED")}
                      >
                        {tr("رفض", "Reject")}
                      </button>
                    ) : null}
                    <button
                      className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm hover:bg-white/10"
                      onClick={() => remove(r.id)}
                    >
                      {tr("حذف", "Delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/60">{tr("لا يوجد نتائج", "No results")}</div>
        )}

        {/* pagination */}
        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {tr("السابق", "Previous")}
            </button>
            <div className="text-sm text-white/60">
              {tr("صفحة", "Page")} {page} {tr("من", "of")} {totalPages}
            </div>
            <button
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {tr("التالي", "Next")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
