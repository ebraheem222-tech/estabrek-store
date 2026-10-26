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
import { moneyText, shortOrderId } from "../../lib/orders";
import { StatusPill } from "../orders/orderUi";
import * as CustomersAPI from "../../api/customers.api";
import type { CustomerRow } from "../../api/customers.api";
import { relativeTime } from "../team/teamText";
import { loc } from "@/lib/lang";
import { tr } from "@/lib/words";

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
    <div className="space-y-4" data-testid="customers-page">
      {first ? <AccountsSwitch enabled={first.accountsEnabled === true} emailReady={first.emailReady !== false} /> : null}
      <div className={box}>
        <h1 className="text-lg font-semibold">{tr("الزبائن", "Customers")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {tr("الزبائن اللي عملوا حساب بالمتجر (دخول بكود على الإيميل). الطلبات اللي بيعملوها وهنّي داخلين بتنحفظ بحسابهم. الشراء كضيف بيضل شغّال.", "Customers who made an account in the store (sign in with an email code). Orders they place while signed in are saved to their account. Guest checkout keeps working.")}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label={tr("بحث", "Search")} placeholder={tr("الاسم، الإيميل أو رقم الهاتف", "Name, email or phone number")} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            label={tr("الحالة", "Status")}
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "", label: tr("الكل", "All") },
              { value: "ACTIVE", label: tr("فعّال", "Active") },
              { value: "SUSPENDED", label: tr("موقوف", "Stopped") },
            ]}
          />
          <div className="flex items-end text-sm text-white/60">{list.data ? tr(`${total} حساب`, "{0} accounts", [total]) : ""}</div>
        </div>
      </div>

      <div className={box}>
        {list.isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner /> {tr("جاري التحميل…", "Loading…")}
          </div>
        ) : list.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(list.error)}</div>
        ) : !rows.length ? (
          <div className="text-sm text-white/60">{search || status ? tr("ما في نتائج.", "No results.") : first?.accountsEnabled === false ? tr("ما في حسابات. الحسابات مطفية، والمتجر للزوار بس.", "No accounts. Accounts are off, and the store is for guests only.") : tr("ما في حسابات بعد. لما زبون يعمل حساب من صفحة «حسابي» بالمتجر، بيبيّن هون.", "No accounts yet. When a customer makes one from the “My account” page in the store, it shows here.")}</div>
        ) : (
          <>
            <ul className="divide-y divide-white/10" data-testid="customers-list">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" className="flex w-full flex-col gap-1 py-3 text-start sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpen(c.id)}>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.name || tr("بدون اسم", "No name")}</span>
                        {c.status === "SUSPENDED" ? (
                          <Badge size="sm" variant="danger" dot>
                            {tr("موقوف", "Stopped")}
                          </Badge>
                        ) : null}
                        {c.marketingOptIn ? <Badge size="sm">{tr("موافقة على العروض", "Accepts offers")}</Badge> : null}
                      </span>
                      <span className="block truncate text-xs text-white/60" dir="ltr" style={{ textAlign: "right" }}>
                        {c.email}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-x-4 text-xs text-white/50">
                      <span>{c.orders} {tr("طلب", "orders")}</span>
                      <span>{c.favourites} {tr("بالمفضلة", "in favourites")}</span>
                      <span>{tr("آخر دخول", "Last sign-in")} {relativeTime(c.lastLoginAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {list.hasNextPage ? (
              <div className="mt-4 text-center">
                <Button variant="secondary" onClick={() => list.fetchNextPage()} isLoading={list.isFetchingNextPage}>
                  {tr("عرض المزيد", "Show more")}
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
      toast.success(on ? tr("انفتحت حسابات الزبائن بالمتجر", "Customer accounts are on in the store") : tr("انطفت حسابات الزبائن. المتجر للزوار بس", "Customer accounts are off. The store is for guests only"));
      setConfirmOff(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });

  return (
    <div className={box} data-testid="accounts-switch">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{tr("حسابات الزبائن بالمتجر", "Customer accounts in the store")}</h2>
            {enabled ? (
              <Badge size="sm" variant="success" dot>
                {tr("شغّالة", "On")}
              </Badge>
            ) : (
              <Badge size="sm" dot>
                {tr("مطفية", "Off")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {enabled
              ? tr("الزبون بيقدر يفوت بكود على إيميله، يشوف طلباته، ويحفظ المفضلة وعناوينه. الشراء كضيف بيضل شغّال.", "Customers can sign in with a code to their email, see their orders, and save favourites and addresses. Guest checkout keeps working.")
              : tr("المتجر للزوار بس: الزبون بيشتري كضيف، وما في أيقونة حساب ولا صفحة «حسابي». لما تشتغل، كل اشي جاهز.", "The store is for guests only: customers buy as guests, with no account icon or “My account” page. Turn it on and everything is ready.")}
          </p>
          {!emailReady && !enabled ? (
            <p className="mt-2 text-xs text-amber-200">
              {tr("قبل التشغيل: لازم يكون إرسال الإيميل (Resend) مضبوط بالسيرفر، حتى توصل أكواد الدخول للزبائن.", "Before turning it on: email sending (Resend) has to be set up on the server so sign-in codes reach customers.")}
            </p>
          ) : null}
          {!canChange ? <p className="mt-2 text-xs text-white/50">{tr("تغيير هذا بدّه صلاحية «تعديل الإعدادات».", "Changing this needs the “Edit settings” permission.")}</p> : null}
        </div>
        {canChange ? (
          enabled ? (
            <Button variant="secondary" onClick={() => setConfirmOff(true)} isLoading={change.isPending}>
              {tr("إطفاء الحسابات", "Turn accounts off")}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => change.mutate(true)} isLoading={change.isPending}>
              {tr("تشغيل الحسابات", "Turn accounts on")}
            </Button>
          )
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOff}
        title={tr("إطفاء حسابات الزبائن", "Turn customer accounts off")}
        message={tr("الأيقونة وصفحة «حسابي» بيختفوا من المتجر، واللي داخلين ما بيقدروا يفوتوا على حسابهم. ما بينمسح اشي: الحسابات والطلبات والعناوين بتضل محفوظة، ولما ترجع تشتغل بيرجع كل اشي متل ما كان.", "The icon and the “My account” page disappear from the store, and signed-in customers can't reach their accounts. Nothing is deleted: accounts, orders and addresses stay saved, and when it's back on everything returns as it was.")}
        confirmText={tr("إطفاء", "Turn off")}
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
      toast.success(out.status === "SUSPENDED" ? tr("انوقف الحساب وطلع من كل الأجهزة", "The account was stopped and signed out of every device") : tr("رجع الحساب يشتغل", "The account works again"));
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  const d = q.data;

  return (
    <Modal open={!!id} title={d?.customer.name || d?.customer.email || tr("الزبون", "Customer")} description={d?.customer.email} onClose={onClose} widthClassName="max-w-2xl">
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm">
          <Spinner /> {tr("جاري التحميل…", "Loading…")}
        </div>
      ) : q.isError ? (
        <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
      ) : d ? (
        <div className="space-y-5 text-sm" data-testid="customer-details">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label={tr("الطلبات", "Orders")} value={String(d.orders.length)} />
            <Fact label={tr("المفضلة", "Favourites")} value={String(d.favouritesCount)} />
            <Fact label={tr("أجهزة داخلة", "Signed-in devices")} value={String(d.activeSessions)} />
            <Fact label={tr("من", "Since")} value={new Date(d.customer.createdAt).toLocaleDateString(loc("ar"), { dateStyle: "medium" })} />
          </section>
          <section className="flex flex-wrap gap-2 text-xs">
            {d.customer.phone ? <Badge size="sm"><span dir="ltr">{d.customer.phone}</span></Badge> : null}
            {d.customer.preferredSize ? <Badge size="sm">{tr("مقاس", "Size")} {d.customer.preferredSize}</Badge> : null}
            {d.customer.favoriteColor ? (
              <Badge size="sm">
                <span className="inline-block h-3 w-3 rounded-full align-middle" style={{ background: d.customer.favoriteColor }} /> {tr("اللون المفضّل", "Favourite colour")}
              </Badge>
            ) : null}
            {d.customer.marketingOptIn ? <Badge size="sm" variant="success">{tr("موافقة على رسائل العروض", "Accepts offer messages")}</Badge> : <Badge size="sm">{tr("بدون رسائل عروض", "No offer messages")}</Badge>}
          </section>

          <section>
            <h3 className="font-semibold">{tr("الطلبات", "Orders")}</h3>
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
                      {o.items} {tr("قطعة ·", "pieces ·")} {o.total != null ? moneyText(o.total) : ""} · {relativeTime(o.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-white/60">{tr("ما في طلبات بالحساب بعد.", "No orders on the account yet.")}</p>
            )}
          </section>

          {d.favourites.length ? (
            <section>
              <h3 className="font-semibold">{tr("المفضلة", "Favourites")}</h3>
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
              <h3 className="font-semibold">{tr("العناوين", "Addresses")}</h3>
              <ul className="mt-2 space-y-1 text-white/70">
                {d.addresses.map((a) => (
                  <li key={a.id}>
                    {a.isDefault ? <Badge size="sm">{tr("الأساسي", "Main")}</Badge> : null} {a.fullName} · {a.city}{tr("،", ",")} {a.address}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canWrite ? (
            <section className="border-t border-white/10 pt-4">
              {d.customer.status === "SUSPENDED" ? (
                <Button variant="secondary" onClick={() => change.mutate("ACTIVE")} isLoading={change.isPending}>
                  {tr("تشغيل الحساب", "Turn the account on")}
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirm("SUSPENDED")}>
                  {tr("إيقاف الحساب", "Stop the account")}
                </Button>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={confirm === "SUSPENDED"}
        title={tr("إيقاف الحساب", "Stop the account")}
        message={tr("الزبون بيطلع من كل الأجهزة وما بيقدر يفوت على حسابه. طلباته بتضل محفوظة، وبيقدر يشتري كضيف. الحساب بيرجع يشتغل أي وقت.", "The customer is signed out of every device and can't reach their account. Their orders stay saved, and they can buy as a guest. The account can be turned back on any time.")}
        confirmText={tr("إيقاف", "Stop")}
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
