import React, { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatDateTime, formatPrice } from "../../lib/format";
import { useCouponsList, useCouponActions } from "../../hooks/useCoupons";
import type { Coupon } from "../../api/coupons.api";

function usageText(c: Coupon) {
  const used = Number(c.usedCount ?? 0);
  const lim = c.usageLimit;
  if (lim === null || lim === undefined) return `${used} / ∞`;
  return `${used} / ${lim}`;
}

function discountText(c: Coupon) {
  if (!c.discountType || c.discountValue == null) return "—";
  const v = Number(c.discountValue);
  if (!Number.isFinite(v)) return "—";
  if (c.discountType === "PERCENT") {
    return `${v}%${c.maxDiscount != null ? ` (سقف ${formatPrice(Number(c.maxDiscount))})` : ""}`;
  }
  return `${formatPrice(v)}`;
}

export default function CouponsPage() {
  // List filters
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    return {
      page,
      pageSize: 20,
      q: q.trim() || undefined,
      active: active === "" ? undefined : active === "true",
    };
  }, [page, q, active]);

  const couponsQ = useCouponsList(queryParams);
  const actions = useCouponActions();

  const rows = couponsQ.data?.rows ?? [];
  const meta = couponsQ.data?.meta;

  // Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [maxDiscount, setMaxDiscount] = useState<string>("");
  const [usageLimit, setUsageLimit] = useState<string>("");
  const [minCart, setMinCart] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<{
    code?: string;
    discountType?: string;
    discountValue?: string;
    maxDiscount?: string;
    usageLimit?: string;
    minCart?: string;
  }>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setCode("");
    setDiscountType("PERCENT");
    setDiscountValue("10");
    setMaxDiscount("");
    setUsageLimit("");
    setMinCart("");
    setIsActive(true);
    setErrors({});
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setCode(c.code ?? "");
    setDiscountType((c.discountType as any) === "FIXED" ? "FIXED" : "PERCENT");
    setDiscountValue(c.discountValue == null ? "" : String(c.discountValue));
    setMaxDiscount(c.maxDiscount == null ? "" : String(c.maxDiscount));
    setUsageLimit(c.usageLimit == null ? "" : String(c.usageLimit));
    setMinCart(c.minCart == null ? "" : String(c.minCart));
    setIsActive(!!c.isActive);
    setErrors({});
    setOpen(true);
  };

  const validateForm = () => {
    const next: typeof errors = {};
    if (!code.trim()) next.code = "الكود مطلوب";

    const dv = discountValue.trim();
    if (!dv) next.discountValue = "قيمة الخصم مطلوبة";
    else {
      const n = Number(dv);
      if (!Number.isFinite(n) || n <= 0) next.discountValue = "لازم يكون رقم > 0";
      if (discountType === "PERCENT" && Number.isFinite(n) && n > 100) next.discountValue = "النسبة لازم تكون <= 100";
    }

    if (maxDiscount.trim()) {
      const n = Number(maxDiscount);
      if (!Number.isFinite(n) || n < 0) next.maxDiscount = "لازم يكون رقم >= 0";
    }

    if (usageLimit.trim()) {
      const n = Number(usageLimit);
      if (!Number.isFinite(n) || n < 1) next.usageLimit = "لازم يكون رقم >= 1";
    }

    if (minCart.trim()) {
      const n = Number(minCart);
      if (!Number.isFinite(n) || n < 0) next.minCart = "لازم يكون رقم >= 0";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!validateForm()) return;

    const body = {
      code: code.trim(),
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount.trim() ? Number(maxDiscount) : null,
      usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
      minCart: minCart.trim() ? Number(minCart) : null,
      isActive,
    };

    try {
      if (editing?.id) {
        await actions.updateCoupon.mutateAsync({ id: editing.id, body });
      } else {
        await actions.createCoupon.mutateAsync(body);
      }
      setOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await actions.deleteCoupon.mutateAsync(confirmId);
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">الكوبونات</div>
            <div className="mt-1 text-xs opacity-70">Coupons</div>
          </div>
          <Button variant="primary" onClick={openCreate} className="w-full sm:w-auto">
            إضافة كوبون
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="بحث بالكود"
            placeholder="مثال: WELCOME10"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />

          <Select
            label="الحالة"
            value={active}
            onChange={(e) => {
              setActive(e.target.value as any);
              setPage(1);
            }}
            options={[
              { value: "", label: "الكل" },
              { value: "true", label: "مفعل" },
              { value: "false", label: "غير مفعل" },
            ]}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setQ("");
                setActive("");
                setPage(1);
              }}
            >
              مسح الفلاتر
            </Button>
            <div className="text-xs text-white/50">{meta ? `الإجمالي: ${meta.total}` : ""}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {couponsQ.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري التحميل…</div>
          </div>
        ) : couponsQ.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">فشل تحميل الكوبونات.</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-white/60">ما في كوبونات.</div>
        ) : (
          <>
                        <div className="space-y-3 sm:hidden">
              {rows.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-sm font-semibold tracking-wider">{c.code}</div>
                    {c.isActive ? (
                      <Badge variant="success" dot>
                        فعال
                      </Badge>
                    ) : (
                      <Badge variant="danger">غير فعال</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-sm opacity-80">{discountText(c)}</div>
                  <div className="mt-1 text-xs opacity-70">{usageText(c)}</div>
                  <div className="mt-1 text-xs opacity-70">{c.minCart != null ? formatPrice(c.minCart) : "-"}</div>
                  <div className="mt-1 text-xs opacity-70">{formatDateTime(c.createdAt)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(c)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmId(c.id)}>
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR>
                    <TH>الكود</TH>
                    <TH>الحالة</TH>
                    <TH>الخصم</TH>
                    <TH>الاستخدام</TH>
                    <TH>الحد الأدنى</TH>
                    <TH>تاريخ الإنشاء</TH>
                    <TH className="w-44">الإجراءات</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-mono font-semibold tracking-wider">{c.code}</TD>
                      <TD>
                        {c.isActive ? (
                          <Badge variant="success" dot>
                            فعال
                          </Badge>
                        ) : (
                          <Badge variant="danger">غير فعال</Badge>
                        )}
                      </TD>
                      <TD className="opacity-80">{discountText(c)}</TD>
                      <TD className="opacity-80">{usageText(c)}</TD>
                      <TD className="opacity-80">{c.minCart != null ? formatPrice(c.minCart) : "-"}</TD>
                      <TD className="opacity-70">{formatDateTime(c.createdAt)}</TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => openEdit(c)}>
                            تعديل
                          </Button>
                          <Button variant="danger" onClick={() => setConfirmId(c.id)}>
                            حذف
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <Pagination
              className="mt-4"
              page={meta?.page ?? 1}
              totalPages={meta?.totalPages ?? 1}
              onChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      <Modal
        open={open}
        title={editing ? "تعديل كوبون" : "إضافة كوبون"}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={onSave}
              isLoading={actions.createCoupon.isPending || actions.updateCoupon.isPending}
            >
              حفظ
            </Button>
          </div>
        }
      >
        <div dir="rtl" className="space-y-4">
          <Input
            label="كود الكوبون"
            placeholder="WELCOME10"
            value={code}
            error={errors.code}
            onChange={(e) => {
              setCode(e.target.value);
              setErrors((prev) => ({ ...prev, code: undefined }));
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="نوع الخصم"
              value={discountType}
              error={errors.discountType}
              onChange={(e) => {
                setDiscountType(e.target.value as any);
                setErrors((prev) => ({ ...prev, discountValue: undefined, maxDiscount: undefined }));
              }}
              options={[
                { value: "PERCENT", label: "نسبة %" },
                { value: "FIXED", label: "قيمة ثابتة" },
              ]}
            />

            <Input
              label={discountType === "PERCENT" ? "قيمة الخصم (%)" : "قيمة الخصم"}
              placeholder={discountType === "PERCENT" ? "مثال: 10" : "مثال: 20"}
              type="number"
              value={discountValue}
              error={errors.discountValue}
              hint={discountType === "PERCENT" ? "10 يعني خصم 10%" : "قيمة ثابتة تُخصم من الإجمالي"}
              onChange={(e) => {
                setDiscountValue(e.target.value);
                setErrors((prev) => ({ ...prev, discountValue: undefined }));
              }}
            />

            <Input
              label="سقف الخصم (اختياري)"
              placeholder="مثال: 50"
              type="number"
              value={maxDiscount}
              error={errors.maxDiscount}
              hint="مفيد مع خصم النسبة حتى لا يتجاوز حد معين"
              onChange={(e) => {
                setMaxDiscount(e.target.value);
                setErrors((prev) => ({ ...prev, maxDiscount: undefined }));
              }}
            />
          </div>

          <Input
            label="حد الاستخدام (اختياري)"
            placeholder="مثال: 100"
            type="number"
            value={usageLimit}
            error={errors.usageLimit}
            onChange={(e) => {
              setUsageLimit(e.target.value);
              setErrors((prev) => ({ ...prev, usageLimit: undefined }));
            }}
          />

          <Input
            label="حد أدنى للسلة (اختياري)"
            placeholder="مثال: 200"
            type="number"
            value={minCart}
            error={errors.minCart}
            onChange={(e) => {
              setMinCart(e.target.value);
              setErrors((prev) => ({ ...prev, minCart: undefined }));
            }}
          />

          <Select
            label="الحالة"
            value={isActive ? "true" : "false"}
            onChange={(e) => setIsActive(e.target.value === "true")}
            options={[
              { value: "true", label: "مفعل" },
              { value: "false", label: "غير مفعل" },
            ]}
          />

          {editing ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
              <div>الاستخدام الحالي: {usageText(editing)}</div>
              <div className="mt-1">آخر تحديث: {formatDateTime(editing.updatedAt)}</div>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="حذف الكوبون"
        description="متأكد؟ ما رح تقدر ترجع الكوبون بعد الحذف."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}



