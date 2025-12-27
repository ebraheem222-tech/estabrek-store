// src/features/inventory/LowStockPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLowStock, useInventoryActions } from "../../hooks/useInventory";
import type { LowStockRow } from "../../api/inventory.api";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";

function clampInt(v: string, min = 0) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}

export default function LowStockPage() {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [onlyBelow, setOnlyBelow] = useState(true);
  const [take, setTake] = useState(50);

  const qLow = useLowStock({ q: q.trim() || undefined, onlyBelow, take, skip: 0 });
  const { adjust, setThreshold } = useInventoryActions();

  const rows = qLow.data?.rows ?? [];
  const total = qLow.data?.total ?? 0;

  const [openAdjust, setOpenAdjust] = useState(false);
  const [selected, setSelected] = useState<LowStockRow | null>(null);

  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("10");
  const [exact, setExact] = useState("");
  const [threshold, setThresholdVal] = useState("0");

  const open = (r: LowStockRow) => {
    setSelected(r);
    setReason("");
    setDelta("10");
    setExact("");
    setThresholdVal(String(r.lowStockThreshold ?? 0));
    setOpenAdjust(true);
  };

  const statusBadge = useMemo(() => {
    return (r: LowStockRow) => {
      const t = r.lowStockThreshold ?? 0;
      const isBelow = t > 0 && r.stock <= t;
      return isBelow ? <Badge variant="danger" dot>منخفض</Badge> : <Badge variant="success">OK</Badge>;
    };
  }, []);

  const doDelta = async (value: number) => {
    if (!selected) return;
    await adjust.mutateAsync({
      variantId: selected.variantId,
      body: { mode: "delta", value, reason: reason.trim() || null },
    });
    setOpenAdjust(false);
    setSelected(null);
  };

  const doSetExact = async () => {
    if (!selected) return;
    const n = clampInt(exact, 0);
    await adjust.mutateAsync({
      variantId: selected.variantId,
      body: { mode: "set", value: n, reason: reason.trim() || null },
    });
    setOpenAdjust(false);
    setSelected(null);
  };

  const doSaveThreshold = async () => {
    if (!selected) return;
    const n = clampInt(threshold, 0);
    await setThreshold.mutateAsync({ variantId: selected.variantId, lowStockThreshold: n });
    // keep modal open (user might adjust stock too)
    setThresholdVal(String(n));
  };

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="تنبيهات المخزون"
        subtitle={
          <span>
            إجمالي العناصر المضبوطة على تنبيه: <span className="font-semibold">{total}</span>
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => qLow.refetch()}>
              تحديث
            </Button>
            <Button variant="ghost" onClick={() => nav("/admin/inventory/adjustments")}>
              سجل التغييرات
            </Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <div className="text-xs opacity-70 mb-1">بحث (SKU / المنتج / اللون)</div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: SKU-123 أو فستان..." />
          </div>
          <div className="md:col-span-3">
            <div className="text-xs opacity-70 mb-1">الفلترة</div>
            <Select
              value={onlyBelow ? "below" : "all"}
              onChange={(e) => setOnlyBelow(e.target.value === "below")}
            >
              <option value="below">تحت الحد فقط</option>
              <option value="all">الكل (حدّ&gt;0)</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs opacity-70 mb-1">عدد النتائج</div>
            <Select value={String(take)} onChange={(e) => setTake(Number(e.target.value))}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card padding="none">
        {qLow.isLoading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>الحالة</TH>
                <TH>SKU</TH>
                <TH>المنتج</TH>
                <TH>اللون / المقاس</TH>
                <TH>المخزون</TH>
                <TH>الحد</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {rows.length ? (
                rows.map((r) => (
                  <TR key={r.variantId}>
                    <TD>{statusBadge(r)}</TD>
                    <TD className="font-mono text-xs">{r.sku}</TD>
                    <TD>
                      <div className="font-medium text-white">{r.productTitle ?? "—"}</div>
                      <div className="text-xs opacity-60">/{r.productSlug ?? ""}</div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{r.colorName ?? "—"}</span>
                        {r.colorHex ? (
                          <span className="inline-block w-3 h-3 rounded-full border border-white/20" style={{ background: r.colorHex }} />
                        ) : null}
                        <span className="text-xs opacity-60">•</span>
                        <span className="text-sm">{r.size ?? "—"}</span>
                      </div>
                    </TD>
                    <TD>
                      <div className="font-semibold">{r.stock}</div>
                      <div className="text-xs opacity-60">فرق: {r.shortage}</div>
                    </TD>
                    <TD>
                      <div className="font-semibold">{r.lowStockThreshold}</div>
                      <div className="text-xs opacity-60">0 = تعطيل</div>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => open(r)}>
                          تعديل
                        </Button>
                        <Button variant="ghost" onClick={() => nav(`/admin/inventory/adjustments?variantId=${r.variantId}`)}>
                          السجل
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))
              ) : (
                <TR>
                  <TD colSpan={7} className="p-6 text-center text-white/60">
                    لا يوجد نتائج
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={openAdjust}
        onClose={() => {
          setOpenAdjust(false);
          setSelected(null);
        }}
        title="تعديل المخزون"
        description={selected ? `${selected.productTitle ?? ""} • ${selected.colorName ?? ""} • ${selected.size ?? ""} • ${selected.sku}` : undefined}
        widthClassName="max-w-xl"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setOpenAdjust(false)}>
              إغلاق
            </Button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs opacity-70 mb-1">المخزون الحالي</div>
                  <div className="text-xl font-semibold">{selected.stock}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">حدّ التنبيه</div>
                  <Input
                    type="number"
                    min={0}
                    value={threshold}
                    onChange={(e) => setThresholdVal(e.target.value)}
                    placeholder="0"
                  />
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      onClick={doSaveThreshold}
                      isLoading={setThreshold.isPending}
                    >
                      حفظ الحد
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">السبب (اختياري)</div>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: جرد / توريد / تلف" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-2">تعديل سريع (Delta)</div>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
                    <Button
                      variant="primary"
                      onClick={() => doDelta(clampInt(delta, 0))}
                      isLoading={adjust.isPending}
                    >
                      +
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => doDelta(-clampInt(delta, 0))}
                      isLoading={adjust.isPending}
                    >
                      -
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="secondary" onClick={() => doDelta(10)} isLoading={adjust.isPending}>
                      +10
                    </Button>
                    <Button variant="secondary" onClick={() => doDelta(-10)} isLoading={adjust.isPending}>
                      -10
                    </Button>
                    <Button variant="secondary" onClick={() => doDelta(1)} isLoading={adjust.isPending}>
                      +1
                    </Button>
                    <Button variant="secondary" onClick={() => doDelta(-1)} isLoading={adjust.isPending}>
                      -1
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">تعيين قيمة دقيقة</div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} value={exact} onChange={(e) => setExact(e.target.value)} placeholder="مثال: 120" />
                    <Button variant="primary" onClick={doSetExact} isLoading={adjust.isPending}>
                      تعيين
                    </Button>
                  </div>
                  <div className="mt-2 text-xs opacity-60">لن يسمح بالنزول تحت 0</div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
