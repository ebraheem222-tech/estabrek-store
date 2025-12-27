// src/features/orders/OrderStatusModal.tsx
import React, { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import type { OrderReqStatus, OrderRequest } from "../../types/orders";
import { ORDER_STATUSES, validateStatusChange } from "./orders.schema";
import { useOrdersActions } from "../../hooks/useOrders";

type Props = {
  open: boolean;
  order: OrderRequest | null;
  onClose: () => void;
};

type Errors = { toStatus?: string; note?: string };

export default function OrderStatusModal({ open, order, onClose }: Props) {
  const { updateStatus } = useOrdersActions();

  const [toStatus, setToStatus] = useState<OrderReqStatus>("NEW");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open || !order) return;
    setToStatus(order.status);
    setNote("");
    setErrors({});
  }, [open, order]);

  const onSave = async () => {
    if (!order) return;

    const v = validateStatusChange({ toStatus, note });
    if (!v.ok) {
      const next: Errors = {};
      // ملاحظة: validateStatusChange يرجع رسالة عامة، فنحاول نربطها بالحقل المناسب
      if (v.error.toLowerCase().includes("ملاحظة") || v.error.toLowerCase().includes("note")) next.note = v.error;
      else next.toStatus = v.error;
      setErrors(next);
      return;
    }

    setErrors({});
    try {
      await updateStatus.mutateAsync({ id: order.id, toStatus });
      onClose();
    } catch {
      // toast موجود بالهوك
    }
  };

  return (
    <Modal
      open={open}
      title="تغيير حالة الطلب"
      onClose={onClose}
      widthClassName="max-w-md"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={onSave} isLoading={updateStatus.isPending}>
            حفظ
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        <Select
          label="الحالة الجديدة"
          value={toStatus}
          error={errors.toStatus}
          onChange={(e) => {
            setToStatus(e.target.value as OrderReqStatus);
            setErrors((p) => ({ ...p, toStatus: undefined }));
          }}
          options={ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        />

        <Input
          label="ملاحظة (اختياري)"
          value={note}
          error={errors.note}
          onChange={(e) => {
            setNote(e.target.value);
            setErrors((p) => ({ ...p, note: undefined }));
          }}
          placeholder="مثال: تم التواصل عبر واتساب…"
        />
      </div>
    </Modal>
  );
}
