// src/features/outbox/CancelOutboxModal.tsx
import React, { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { validateCancel } from "./outbox.schema";
import { useOutboxActions } from "../../hooks/useOutbox";

export default function CancelOutboxModal({
  open,
  messageId,
  onClose,
}: {
  open: boolean;
  messageId: string | null;
  onClose: () => void;
}) {
  const { cancel } = useOutboxActions();

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(undefined);
  }, [open]);

  const onCancel = async () => {
    if (!messageId) return;

    const v = validateCancel({ reason });
    if (!v.ok) {
      setError(v.error);
      return;
    }

    setError(undefined);
    try {
      await cancel.mutateAsync({ id: messageId, reason: reason.trim() || undefined });
      onClose();
    } catch {
      // toast موجود بالهوك
    }
  };

  return (
    <Modal
      open={open}
      title="إلغاء الرسالة"
      onClose={onClose}
      widthClassName="max-w-md"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="danger" onClick={onCancel} isLoading={cancel.isPending}>
            إلغاء
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        <Input
          label="سبب الإلغاء (اختياري)"
          value={reason}
          error={error}
          onChange={(e) => {
            setReason(e.target.value);
            setError(undefined);
          }}
          placeholder="مثال: رقم غير صحيح / طلب مكرر…"
        />
      </div>
    </Modal>
  );
}
