// AI on an order (admin → الذكاء الاصطناعي): «طلبات بدها انتباه» (plain rules)
// and three WhatsApp reply ideas for her. Shows nothing while both are off.
import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as AiAPI from "../../api/ai.api";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { waLink } from "../../lib/orders";

export function AiOrderCard({ orderId, phone }: { orderId: string; phone: string }) {
  const status = useQuery({ queryKey: ["ai-orders-status"], queryFn: AiAPI.ordersAiStatus, staleTime: 60_000, retry: false });
  const flags = useQuery({ queryKey: ["ai-flags", orderId], queryFn: () => AiAPI.orderFlags(orderId), enabled: Boolean(status.data?.orderFlags), retry: false });
  const [message, setMessage] = useState("");
  const ideas = useMutation({ mutationFn: () => AiAPI.replyIdeas(orderId, message.trim()), onError: (e) => toast.error("ما زبطت الاقتراحات", { description: getApiErrorMessage(e) }) });
  if (!status.data?.orderFlags && !status.data?.replySuggest) return null;
  const f = flags.data;

  return (
    <div className="glass space-y-3 rounded-2xl p-4" data-testid="ai-order-card">
      {f && f.level !== "ok" ? (
        <div className={`rounded-xl border p-3 text-sm ${f.level === "risky" ? "border-red-400/40 bg-red-500/10 text-red-100" : "border-amber-400/40 bg-amber-500/10 text-amber-100"}`} data-testid="order-flags">
          <b>{f.level === "risky" ? "⚠️ انتبه لهالطلب" : "👀 بدّه نظرة"}</b>
          <ul className="mt-1 list-disc ps-5 text-xs leading-6">{f.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-1 text-[11px] opacity-75">{f.paid ? "الطلب مدفوع." : "اتصلي وتأكدي قبل ما تبعتي."} قواعد بسيطة، مش حكم نهائي.</p>
        </div>
      ) : f ? (
        <p className="text-xs text-white/45" data-testid="order-flags">✓ ما في إشي غريب بهالطلب</p>
      ) : null}

      {status.data?.replySuggest ? (
        <div data-testid="reply-ideas">
          <span className="block text-sm font-medium">✨ اقتراحات رد على واتساب</span>
          <textarea className="mt-2 h-20 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-sm" value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} placeholder="الصقي رسالتها هون (اختياري) — أو خليه فاضي لرد حسب حالة الطلب" aria-label="رسالة الزبونة" />
          <button type="button" disabled={ideas.isPending} onClick={() => ideas.mutate()} className="mt-2 h-9 rounded-xl bg-accent-500 px-4 text-sm text-white disabled:opacity-60">
            {ideas.isPending ? "عم نكتب…" : "اقترحلي ردود"}
          </button>
          {ideas.data?.replies.length ? (
            <ul className="mt-3 space-y-2">
              {ideas.data.replies.map((r, i) => {
                const href = waLink(phone, r.text);
                return (
                  <li key={i} className="rounded-xl border border-white/[0.08] bg-black/10 p-2 text-sm">
                    {r.label ? <span className="block text-[11px] text-white/45">{r.label}</span> : null}
                    <p className="whitespace-pre-wrap leading-6">{r.text}</p>
                    <div className="mt-1 flex gap-2">
                      {href ? <a href={href} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs text-white">افتحي واتساب</a> : null}
                      <button type="button" onClick={() => { void navigator.clipboard?.writeText(r.text).then(() => toast.success("انتسخ")).catch(() => undefined); }} className="rounded-lg border border-white/[0.12] px-2 py-1 text-xs">نسخ</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
