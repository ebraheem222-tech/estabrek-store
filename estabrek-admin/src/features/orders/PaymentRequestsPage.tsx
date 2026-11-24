// الدفعات المطلوبة: the payments the owner's functions asked for (their «اطلب دفع» step): a booking, a
// membership, a deposit. Who was asked, how much, whether it was paid (and through what), the link to send
// again, and closing one that shouldn't be paid any more.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import * as PayAPI from "../../api/paymentRequests.api";
import type { PayRow, PayStatus } from "../../api/paymentRequests.api";
import { PAY_STATUS_NAME, PAY_STATUS_TONE, moneyText, payWhen } from "./paymentsText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/8 bg-white/3 px-3 text-sm";
const TABS: Array<PayStatus | "ALL"> = ["PENDING", "PAID", "EXPIRED", "CANCELLED", "ALL"];

export default function PaymentRequestsPage() {
  const { hasPermission } = useAuth();
  const lang = adminLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<PayStatus | "ALL">("PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, dialog] = useConfirm();
  const filter = { status: tab === "ALL" ? undefined : tab, q: q.trim() || undefined, page };
  const list = useQuery({ queryKey: ["payment-requests", filter], queryFn: () => PayAPI.listPayments(filter) });
  const cancel = useMutation({
    mutationFn: (id: string) => PayAPI.cancelPayment(id),
    onSuccess: () => {
      toast.success(say("تسكّرت: رابطها ما عاد بينفع للدفع|Closed: its link can't be paid any more|נסגר: אי אפשר לשלם יותר בקישור"));
      void qc.invalidateQueries({ queryKey: ["payment-requests"] });
    },
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const rows = list.data?.rows ?? [];
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(say("انسخ الرابط|The link is copied|הקישור הועתק"));
    } catch {
      toast.info(link);
    }
  };
  const close = async (r: PayRow) => {
    const yes = await confirm({
      title: say("تسكير الدفعة|Close the payment|סגירת התשלום"),
      message: say("رابطها ما عاد بينفع للدفع، والـ function ما بتشتغل عليها. الدفعات اللي اندفعت ما بتتسكّر.|Its link can't be paid any more, and no function starts for it. A paid one can't be closed.|אי אפשר לשלם יותר בקישור, ושום פונקציה לא תופעל בשבילו. תשלום ששולם לא נסגר."),
      confirmText: say("سكّرها|Close it|סגירה"),
      variant: "warning",
    });
    if (yes) cancel.mutate(r.id);
  };

  return (
    <div className="space-y-4 pb-10" data-testid="payments-page">
      {dialog}
      <div className={box}>
        <h1 className="text-lg font-semibold">{say("الدفعات المطلوبة|Payments asked for|תשלומים שהתבקשו")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say("دفعات طلبتها الـ functions بخطوة «اطلب دفع» (حجز، اشتراك، عربون). كل وحدة إلها رابط بصفحة بالمتجر، بيدفع منها الزبون بـ Stripe أو PayPal. لما تندفع بيشتغل مشغّل «انقبضت دفعة».|Payments the functions asked for with their “Ask for a payment” step (a booking, a membership, a deposit). Each has a link to a page in the shop where the customer pays with Stripe or PayPal. Once paid, the “A payment came in” trigger starts.|תשלומים שהפונקציות ביקשו בשלב «בקשת תשלום» (הזמנה, מנוי, מקדמה). לכל אחד קישור לעמוד בחנות שבו הלקוח משלם ב-Stripe או PayPal. כשמשלמים, מופעל הטריגר «התקבל תשלום».")}{" "}
          <Link to="/admin/functions" className="underline">
            {say("الـ Functions|Functions|הפונקציות")}
          </Link>
        </p>
        {list.data?.paid.length ? (
          <p className="mt-2 text-sm" data-testid="payments-paid">
            {say("اللي وصل لهلأ:|Paid so far:|שולם עד עכשיו:")} {list.data.paid.map((p) => `${moneyText(p.amount, p.currency, lang)} (${p.count})`).join(" · ")}
          </p>
        ) : null}
      </div>

      <section className={box}>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={say("حالة الدفعات|Payment status|מצב התשלומים")}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`rounded-full border px-3 py-1.5 text-sm ${tab === t ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"}`}
              data-testid={`payments-tab-${t}`}
            >
              {t === "ALL" ? say("الكل|All|הכול") : say(PAY_STATUS_NAME[t])}
            </button>
          ))}
        </div>
        <input className={`${field} mt-3`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={say("بحث بالعنوان، المرجع، الإيميل أو التلفون…|Search by title, reference, email or phone…|חיפוש לפי כותרת, אסמכתה, אימייל או טלפון…")} aria-label={say("بحث بالدفعات|Search payments|חיפוש תשלומים")} data-testid="payments-search" />

        <div className="mt-4">
          {list.isLoading ? (
            <div className="flex items-center gap-2 text-sm"><Spinner /> {say("عم يحمّل…|Loading…|טוען…")}</div>
          ) : list.isError ? (
            <div className="text-sm text-red-200">{getApiErrorMessage(list.error)}</div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/60" data-testid="payments-empty">{say("ما في دفعات هون.|No payments here.|אין כאן תשלומים.")}</p>
          ) : (
            <ul className="divide-y divide-white/6" data-testid="payments-list">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-3 py-3" data-testid={`payment-${r.id}`} data-status={r.status}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${PAY_STATUS_TONE[r.status]}`}>{say(PAY_STATUS_NAME[r.status])}</span>
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      <bdi dir="ltr">{moneyText(r.amount, r.currency, lang)}</bdi>
                      {r.ref ? <> · {say("المرجع|Reference|אסמכתה")} <bdi dir="ltr">{r.ref}</bdi></> : null}
                      {r.email || r.phone ? <> · <bdi dir="ltr">{[r.email, r.phone].filter(Boolean).join(" · ")}</bdi></> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-white/60">{payWhen(r, lang)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.status === "PENDING" ? (
                      <Button size="sm" variant="ghost" onClick={() => void copy(r.link)} data-testid={`payment-${r.id}-copy`}>
                        {say("انسخ الرابط|Copy the link|העתקת הקישור")}
                      </Button>
                    ) : null}
                    {r.status === "PENDING" && hasPermission("orders:write") ? (
                      <Button size="sm" variant="ghost" onClick={() => void close(r)} isLoading={cancel.isPending && cancel.variables === r.id} data-testid={`payment-${r.id}-cancel`}>
                        {say("سكّرها|Close it|סגירה")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {pages > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{say("السابق|Previous|הקודם")}</Button>
            <span className="text-white/60">{page} / {pages}</span>
            <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{say("التالي|Next|הבא")}</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
