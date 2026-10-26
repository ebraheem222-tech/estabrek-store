import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { toast } from "../../lib/toast";
import { http } from "../../api/http";
import { tr } from "@/lib/words";

type QuoteResponse = {
  variantId: string;
  quantity: number;
  currencyCode: string;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  coupon?: null | {
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    maxDiscount: number | null;
  };
};

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("he-IL", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

export default function CouponTesterPage() {
  const [variantId, setVariantId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [catalog, setCatalog] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [couponCode, setCouponCode] = useState("");
  const [customerName, setCustomerName] = useState("Test User");
  const [phone, setPhone] = useState("0500000000");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  // Search products to pick a valid variant without copying IDs
  useEffect(() => {
    let alive = true;
    const q = productQuery.trim();
    if (!q) {
      setCatalog(null);
      return;
    }
    setPickerLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await http.get("/catalog/products", { params: { q, page: 1, pageSize: 8 } });
        if (!alive) return;
        setCatalog(data);
      } catch {
        if (!alive) return;
        setCatalog(null);
      } finally {
        if (alive) setPickerLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [productQuery]);

  const variantOptions = useMemo(() => {
    const out: Array<{ value: string; label: string }> = [];
    const products = catalog?.items ?? [];
    for (const p of products) {
      for (const it of p.items ?? []) {
        for (const v of it.variants ?? []) {
          const colorLabel = [it.colorName, it.boxLabel].filter(Boolean).join(" — ");
          const color = colorLabel ? ` — ${colorLabel}` : "";
          const size = v.size?.name ? ` — ${v.size.name}` : "";
          const price = Number(v.price);
          out.push({
            value: v.id,
            label: `${p.title}${color}${size} — ${formatMoney(price, "ILS")}`,
          });
        }
      }
    }
    // dedupe
    const seen = new Set<string>();
    return out.filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
  }, [catalog]);

  async function runQuote() {
    if (!variantId.trim()) return toast.error(tr("يرجى إدخال Variant ID", "Enter a variant ID"));
    setLoading(true);
    try {
      const { data } = await http.post<QuoteResponse>("/catalog/quote", {
        variantId: variantId.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        couponCode: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
      });
      setQuote(data);
      toast.success(tr("تم حساب السعر", "Price worked out"));
    } catch (e: any) {
      setQuote(null);
      toast.error(tr("فشل حساب السعر", "Working out the price failed"), { description: e?.response?.data?.message ?? e?.message });
    } finally {
      setLoading(false);
    }
  }

  async function submitOrder() {
    if (!variantId.trim()) return toast.error(tr("يرجى إدخال Variant ID", "Enter a variant ID"));
    if (!customerName.trim()) return toast.error(tr("يرجى إدخال اسم الزبون", "Enter the customer's name"));
    if (!phone.trim()) return toast.error(tr("يرجى إدخال رقم الهاتف", "Enter the phone number"));
    setLoading(true);
    try {
      const { data } = await http.post("/catalog/order-requests", {
        variantId: variantId.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        customerName: customerName.trim(),
        phone: phone.trim(),
        couponCode: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
        source: "admin-tester",
      });
      toast.success(tr("تم إنشاء طلب", "Order created"), { description: `ID: ${data?.id ?? ""}` });
    } catch (e: any) {
      toast.error(tr("فشل إنشاء الطلب", "Creating the order failed"), { description: e?.response?.data?.message ?? e?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-lg font-semibold">{tr("تجربة كوبون", "Try a coupon")}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label={tr("بحث عن منتج (اختياري)", "Search for a product (optional)")}
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder={tr("اسم المنتج...", "Type the product name...")}
          />
          <Select
            label={tr("اختيار Variant", "Choose variant")}
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            options={variantOptions}
            placeholder={pickerLoading ? "..." : (variantOptions.length ? tr("اختيار", "Choose") : tr("البحث أولاً", "Search first"))}
            disabled={pickerLoading || variantOptions.length === 0}
          />
          <div className="text-xs text-white/60 flex items-end">
            <div>
              {tr("بدل البحث عن Variant ID، الاختيار من القائمة أسهل.", "Instead of hunting for a variant ID, search and pick from the list.")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label={tr("Variant ID (للمطور)", "Variant ID (for developers)")} value={variantId} onChange={(e) => setVariantId(e.target.value)} placeholder="cuid..." />
          <Input
            label={tr("الكمية", "Quantity")}
            type="number"
            value={String(quantity)}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={1}
          />
          <Input
            label="Coupon Code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="SAVE10"
          />
          <Input label={tr("اسم الزبون", "Customer name")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <Input label={tr("هاتف", "Phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button onClick={runQuote} disabled={loading}>
            {loading ? "..." : tr("حساب (Quote)", "Work out (quote)")}
          </Button>
          <Button variant="secondary" onClick={submitOrder} disabled={loading}>
            {loading ? "..." : tr("إنشاء طلب OrderRequest", "Create an OrderRequest")}
          </Button>
        </div>
      </Card>

      {quote && (
        <Card className="p-4 space-y-2">
          <div className="text-base font-semibold">{tr("النتيجة", "Result")}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>{tr("عملة:", "Currency:")} <b>{quote.currencyCode}</b></div>
            <div>{tr("سعر القطعة:", "Unit price:")} <b>{formatMoney(quote.unitPrice, quote.currencyCode)}</b></div>
            <div>{tr("المجموع:", "Subtotal:")} <b>{formatMoney(quote.subtotal, quote.currencyCode)}</b></div>
            <div>{tr("خصم:", "Discount:")} <b>{formatMoney(quote.discountAmount, quote.currencyCode)}</b></div>
            <div>{tr("الإجمالي:", "Total:")} <b>{formatMoney(quote.total, quote.currencyCode)}</b></div>
            <div>
              {tr("كوبون:", "Coupon:")}
              <b className="ms-1">{quote.coupon ? quote.coupon.code : "—"}</b>
            </div>
          </div>

          {quote.coupon && (
            <div className="text-sm opacity-80">
              ({quote.coupon.discountType} {tr("• قيمة:", "• value:")} {quote.coupon.discountValue}
              {quote.coupon.maxDiscount != null ? tr(` • سقف: ${quote.coupon.maxDiscount}`, " • cap: {0}", [quote.coupon.maxDiscount]) : ""})
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
