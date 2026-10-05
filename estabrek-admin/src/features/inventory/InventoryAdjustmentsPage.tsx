// src/features/inventory/InventoryAdjustmentsPage.tsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAdjustments } from "../../hooks/useInventory";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { useDebounce } from "../../hooks/useDebounce";

function useQueryParam(name: string) {
  const loc = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return sp.get(name);
  }, [loc.search, name]);
}

export default function InventoryAdjustmentsPage() {
  const nav = useNavigate();
  const variantIdFromUrl = useQueryParam("variantId") || "";
  const productId = useQueryParam("productId") || "";

  const [variantId, setVariantId] = useState(variantIdFromUrl);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const take = 30;
  const skip = (page - 1) * take;

  const q = useAdjustments({ variantId: variantId.trim() || undefined, productId: productId || undefined, q: debounced || undefined, take, skip });

  const total = q.data?.total ?? 0;
  const rows = q.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="سجل تغييرات المخزون"
        subtitle={<span>إجمالي: <span className="font-semibold">{total}</span></span>}
        right={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => nav("/admin/inventory/stock")}>المخزون</Button>
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => nav("/admin/inventory/low-stock")}>تنبيهات المخزون</Button>
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => q.refetch()}>تحديث</Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-7">
            <div className="text-xs opacity-70 mb-1">بحث</div>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="اسم المنتج، كود SKU أو السبب"
              aria-label="بحث في سجل المخزون"
            />
            {productId || variantId ? <div className="mt-1 text-xs text-white/55">{productId ? "منتج واحد" : "مقاس واحد"} فقط</div> : null}
          </div>
          <div className="md:col-span-5 flex w-full justify-start md:justify-end gap-2">
            {productId ? <Button className="w-full md:w-auto" variant="ghost" onClick={() => nav(`/admin/catalog/products/${productId}`)}>صفحة المنتج</Button> : null}
            <Button className="w-full md:w-auto" variant="secondary" onClick={() => { setVariantId(""); setSearch(""); setPage(1); if (productId || variantIdFromUrl) nav("/admin/inventory/adjustments", { replace: true }); }}>
              مسح الفلتر
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="none">
        {q.isLoading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <>
            <div className="p-4 md:hidden">
              {rows.length ? (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs opacity-70">{new Date(r.createdAt).toLocaleString()}</div>
                        {r.delta >= 0 ? (
                          <Badge variant="success">+{r.delta}</Badge>
                        ) : (
                          <Badge variant="danger">{r.delta}</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-semibold">{r.productTitle ?? "-"}</div>
                      <div className="text-xs opacity-60">{[r.colorName, r.size].filter(Boolean).join(" · ")}</div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <div>
                          <span className="opacity-60">SKU:</span>{" "}
                          <span className="font-mono">{r.sku ?? "-"}</span>
                        </div>
                        <div>
                          <span className="opacity-60">الحجم:</span> {r.size ?? "-"}
                        </div>
                        <div>
                          <span className="opacity-60">قبل / بعد:</span>{" "}
                          <span className="font-semibold">{r.beforeStock} → {r.afterStock}</span>
                        </div>
                        <div>
                          <span className="opacity-60">السبب:</span> {r.reason ?? "-"}
                        </div>
                        <div className="sm:col-span-2">
                          <span className="opacity-60">المسؤول:</span>{" "}
                          {r.adminUser?.name ?? r.adminUser?.email ?? "-"}
                          {r.adminUser?.email ? <span className="ms-2 text-[11px] opacity-60">{r.adminUser.email}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-white/60">لا توجد نتائج</div>
              )}
            </div>
            <div className="hidden md:block">
              <Table>
              <THead>
                <TR>
                  <TH>الوقت</TH>
                  <TH>المنتج</TH>
                  <TH>SKU / مقاس</TH>
                  <TH>التغيير</TH>
                  <TH>قبل → بعد</TH>
                  <TH>السبب</TH>
                  <TH>المدير</TH>
                </TR>
              </THead>
              <TBody>
                {rows.length ? (
                  rows.map((r) => (
                    <TR key={r.id}>
                      <TD className="text-xs opacity-70">{new Date(r.createdAt).toLocaleString()}</TD>
                      <TD>
                        <div className="font-medium">{r.productTitle ?? "—"}</div>
                        <div className="text-xs opacity-60">{r.colorName ?? ""}</div>
                      </TD>
                      <TD>
                        <div className="font-mono text-xs">{r.sku ?? "—"}</div>
                        <div className="text-xs opacity-60">{r.size ?? "—"}</div>
                      </TD>
                      <TD>
                        {r.delta >= 0 ? (
                          <Badge variant="success">+{r.delta}</Badge>
                        ) : (
                          <Badge variant="danger">{r.delta}</Badge>
                        )}
                      </TD>
                      <TD className="font-semibold">{r.beforeStock} → {r.afterStock}</TD>
                      <TD className="text-sm">{r.reason ?? "—"}</TD>
                      <TD>
                        <div className="text-sm">{r.adminUser?.name ?? r.adminUser?.email ?? "—"}</div>
                        {r.adminUser?.email ? <div className="text-xs opacity-60">{r.adminUser.email}</div> : null}
                      </TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD colSpan={7} className="p-6 text-center text-white/60">لا يوجد سجلات</TD>
                  </TR>
                )}
              </TBody>
            </Table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} className="p-4" />
          </>
        )}
      </Card>
    </div>
  );
}



