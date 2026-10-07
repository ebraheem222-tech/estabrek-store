// الزبائن: shoppers with an account (signed in by email code on the storefront).
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { shekel, shortOrderId } from "../../lib/orders";
import { StatusPill } from "../orders/orderUi";
import * as CustomersAPI from "../../api/customers.api";
import type { CustomerRow } from "../../api/customers.api";
import { relativeTime } from "../team/teamText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const search = useDebounce(q, 300);

  const list = useInfiniteQuery({
    queryKey: ["customers", search, status],
    queryFn: ({ pageParam }) => CustomersAPI.listCustomers({ q: search.trim(), status, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.rows), [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;
  const first = list.data?.pages[0];

  return (
    <div dir="rtl" className="space-y-4" data-testid="customers-page">
      {first ? <AccountsSwitch enabled={first.accountsEnabled === true} emailReady={first.emailReady !== false} /> : null}
      <div className={box}>
        <h1 className="text-lg font-semibold">الزبائن</h1>
        <p className="mt-1 text-sm text-white/60">
          الزبونات اللي عملوا حساب بالمتجر (دخول بكود على الإيميل). الطلبات اللي بيعملوها وهنّ داخلات بتنحفظ بحسابهن. الشراء كضيفة بيضل شغّال.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label="بحث" placeholder="الاسم، الإيميل أو رقم الهاتف" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            label="الحالة"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "", label: "الكل" },
              { value: "ACTIVE", label: "فعّال" },
              { value: "SUSPENDED", label: "موقوف" },
            ]}
          />
          <div className="flex items-end text-sm text-white/60">{list.data ? `${total} حساب` : ""}</div>
        </div>
      </div>

      <div className={box}>
        {list.isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner /> جاري التحميل…
          </div>
        ) : list.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(list.error)}</div>
        ) : !rows.length ? (
          <div className="text-sm text-white/60">{search || status ? "ما في نتائج." : first?.accountsEnabled === false ? "ما في حسابات. الحسابات مطفية، والمتجر للزوار بس." : "ما في حسابات بعد. لما زبونة تعمل حساب من صفحة «حسابي» بالمتجر، بتبيّن هون."}</div>
        ) : (
          <>
            <ul className="divide-y divide-white/10" data-testid="customers-list">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" className="flex w-full flex-col gap-1 py-3 text-start sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpen(c.id)}>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.name || "بدون اسم"}</span>
                        {c.status === "SUSPENDED" ? (
                          <Badge size="sm" variant="danger" dot>
                            موقوف
                          </Badge>
                        ) : null}
                        {c.marketingOptIn ? <Badge size="sm">موافقة على العروض</Badge> : null}
                      </span>
                      <span className="block truncate text-xs text-white/60" dir="ltr" style={{ textAlign: "right" }}>
                        {c.email}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-x-4 text-xs text-white/50">
                      <span>{c.orders} طلب</span>
                      <span>{c.favourites} بالمفضلة</span>
                      <span>آخر دخول {relativeTime(c.lastLoginAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {list.hasNextPage ? (
              <div className="mt-4 text-center">
                <Button variant="secondary" onClick={() => list.fetchNextPage()} isLoading={list.isFetchingNextPage}>
                  عرض المزيد
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <CustomerModal id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** The one-click switch: shopper accounts on the storefront (off = visitors only). */
function AccountsSwitch({ enabled, emailReady }: { enabled: boolean; emailReady: boolean }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canChange = hasPermission("settings:write");
  const [confirmOff, setConfirmOff] = useState(false);
  const change = useMutation({
    mutationFn: (on: boolean) => CustomersAPI.setCustomerAccounts(on),
    onSuccess: (_out, on) => {
      toast.success(on ? "انفتحت حسابات الزبائن بالمتجر" : "انطفت حسابات الزبائن. المتجر للزوار بس");
      setConfirmOff(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });

  return (
    <div className={box} data-testid="accounts-switch">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">حسابات الزبائن بالمتجر</h2>
            {enabled ? (
              <Badge size="sm" variant="success" dot>
                شغّالة
              </Badge>
            ) : (
              <Badge size="sm" dot>
                مطفية
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {enabled
              ? "الزبونة بتقدر تفوت بكود على إيميلها، تشوف طلباتها، وتحفظ المفضلة وعناوينها. الشراء كضيفة بيضل شغّال."
              : "المتجر للزوار بس: الزبونة بتشتري كضيفة، وما في أيقونة حساب ولا صفحة «حسابي». لما تشغّلها، كل اشي جاهز."}
          </p>
          {!emailReady && !enabled ? (
            <p className="mt-2 text-xs text-amber-200">
              قبل ما تشغّلها: لازم يكون إرسال الإيميل (Resend) مضبوط بالسيرفر، حتى توصل أكواد الدخول للزبونات.
            </p>
          ) : null}
          {!canChange ? <p className="mt-2 text-xs text-white/50">تغيير هذا بدّه صلاحية «تعديل الإعدادات».</p> : null}
        </div>
        {canChange ? (
          enabled ? (
            <Button variant="secondary" onClick={() => setConfirmOff(true)} isLoading={change.isPending}>
              إطفاء الحسابات
            </Button>
          ) : (
            <Button variant="primary" onClick={() => change.mutate(true)} isLoading={change.isPending}>
              تشغيل الحسابات
            </Button>
          )
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOff}
        title="إطفاء حسابات الزبائن"
        message="الأيقونة وصفحة «حسابي» بيختفوا من المتجر، واللي داخلات ما بيقدروا يفوتوا على حسابهن. ما بينمسح اشي: الحسابات والطلبات والعناوين بتضل محفوظة، ولما ترجّع تشغّلها بيرجع كل اشي متل ما كان."
        confirmText="إطفاء"
        isLoading={change.isPending}
        onConfirm={() => change.mutate(false)}
        onCancel={() => setConfirmOff(false)}
      />
    </div>
  );
}

function CustomerModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("customers:write");
  const canOrders = hasPermission("orders:read");
  const q = useQuery({ queryKey: ["customers", "one", id], queryFn: () => CustomersAPI.getCustomer(id!), enabled: !!id });
  const [confirm, setConfirm] = useState<CustomerRow["status"] | null>(null);
  const change = useMutation({
    mutationFn: (status: CustomerRow["status"]) => CustomersAPI.setCustomerStatus(id!, status),
    onSuccess: (out) => {
      toast.success(out.status === "SUSPENDED" ? "انوقف الحساب وطلع من كل الأجهزة" : "رجع الحساب يشتغل");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const d = q.data;

  return (
    <Modal open={!!id} title={d?.customer.name || d?.customer.email || "الزبونة"} description={d?.customer.email} onClose={onClose} widthClassName="max-w-2xl">
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm">
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
      ) : d ? (
        <div dir="rtl" className="space-y-5 text-sm" data-testid="customer-details">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="الطلبات" value={String(d.orders.length)} />
            <Fact label="المفضلة" value={String(d.favouritesCount)} />
            <Fact label="أجهزة داخلة" value={String(d.activeSessions)} />
            <Fact label="من" value={new Date(d.customer.createdAt).toLocaleDateString("ar", { dateStyle: "medium" })} />
          </section>
          <section className="flex flex-wrap gap-2 text-xs">
            {d.customer.phone ? <Badge size="sm"><span dir="ltr">{d.customer.phone}</span></Badge> : null}
            {d.customer.preferredSize ? <Badge size="sm">مقاس {d.customer.preferredSize}</Badge> : null}
            {d.customer.favoriteColor ? (
              <Badge size="sm">
                <span className="inline-block h-3 w-3 rounded-full align-middle" style={{ background: d.customer.favoriteColor }} /> لونها المفضّل
              </Badge>
            ) : null}
            {d.customer.marketingOptIn ? <Badge size="sm" variant="success">موافقة على رسائل العروض</Badge> : <Badge size="sm">بدون رسائل عروض</Badge>}
          </section>

          <section>
            <h3 className="font-semibold">الطلبات</h3>
            {d.orders.length ? (
              <ul className="mt-2 divide-y divide-white/10">
                {d.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex items-center gap-2">
                      {canOrders ? (
                        <Link className="underline" to={`/admin/orders/${o.id}`} onClick={onClose}>
                          #{shortOrderId(o.id)}
                        </Link>
                      ) : (
                        <span>#{shortOrderId(o.id)}</span>
                      )}
                      <StatusPill status={o.status} />
                    </span>
                    <span className="text-xs text-white/60">
                      {o.items} قطعة · {o.total != null ? shekel(o.total) : ""} · {relativeTime(o.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-white/60">ما في طلبات بحسابها بعد.</p>
            )}
          </section>

          {d.favourites.length ? (
            <section>
              <h3 className="font-semibold">المفضلة</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {d.favourites.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-xl border border-white/10 px-2 py-1 text-xs">
                    {f.image ? <img src={f.image} alt="" className="h-8 w-8 rounded-lg object-cover" /> : null}
                    {f.title}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {d.addresses.length ? (
            <section>
              <h3 className="font-semibold">العناوين</h3>
              <ul className="mt-2 space-y-1 text-white/70">
                {d.addresses.map((a) => (
                  <li key={a.id}>
                    {a.isDefault ? <Badge size="sm">الأساسي</Badge> : null} {a.fullName} · {a.city}، {a.address}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canWrite ? (
            <section className="border-t border-white/10 pt-4">
              {d.customer.status === "SUSPENDED" ? (
                <Button variant="secondary" onClick={() => change.mutate("ACTIVE")} isLoading={change.isPending}>
                  تشغيل الحساب
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirm("SUSPENDED")}>
                  إيقاف الحساب
                </Button>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={confirm === "SUSPENDED"}
        title="إيقاف الحساب"
        message="الزبونة بتطلع من كل الأجهزة وما بتقدر تفوت على حسابها. طلباتها بتضل محفوظة، وبتقدر تشتري كضيفة. بتقدر ترجّع تشغّل الحساب أي وقت."
        confirmText="إيقاف"
        isLoading={change.isPending}
        onConfirm={() => change.mutate("SUSPENDED")}
        onCancel={() => setConfirm(null)}
      />
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
