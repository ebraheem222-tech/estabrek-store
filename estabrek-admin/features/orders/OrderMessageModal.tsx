// src/features/orders/OrderMessageModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import type { OrderRequest } from "../../types/orders";
import { validateSendMessage } from "./orders.schema";
import { useOrdersActions } from "../../hooks/useOrders";

type Channel = "WHATSAPP" | "SMS" | "EMAIL";

type Props = {
  open: boolean;
  order: OrderRequest | null;
  onClose: () => void;
};

type Errors = {
  channel?: string;
  to?: string;
  template?: string;
  payloadText?: string;
};

export default function OrderMessageModal({ open, order, onClose }: Props) {
  const { sendMessage } = useOrdersActions();

  const defaultTo = useMemo(() => {
    if (!order) return "";
    return (order.whatsapp ?? order.phone ?? "").trim();
  }, [order]);

  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [to, setTo] = useState("");
  const [template, setTemplate] = useState("");
  const [payloadText, setPayloadText] = useState<string>("{}");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open || !order) return;
    setChannel("WHATSAPP");
    setTo(defaultTo);
    setTemplate("order_update");
    setPayloadText(
      JSON.stringify(
        {
          orderId: order.id,
          name: order.customerName,
          phone: order.phone,
          status: order.status,
          quantity: order.quantity,
        },
        null,
        2
      )
    );
    setErrors({});
  }, [open, order, defaultTo]);

  const onSend = async () => {
    if (!order) return;

    let payloadJson: any = undefined;
    try {
      payloadJson = payloadText?.trim() ? JSON.parse(payloadText) : undefined;
    } catch {
      setErrors({ payloadText: "الـJSON غير صالح" });
      return;
    }

    const v = validateSendMessage({ channel, to, template, payloadJson });
    if (!v.ok) {
      const msg = v.error;
      const lower = msg.toLowerCase();
      const next: Errors = {};

      if (lower.includes("to") || lower.includes("رقم") || lower.includes("إلى") || lower.includes("email")) next.to = msg;
      else if (lower.includes("template")) next.template = msg;
      else if (lower.includes("json") || lower.includes("payload")) next.payloadText = msg;
      else if (lower.includes("channel") || lower.includes("قناة")) next.channel = msg;
      else next.to = msg;

      setErrors(next);
      return;
    }

    setErrors({});
    try {
      await sendMessage.mutateAsync({
        id: order.id,
        body: { channel, to: to.trim(), template: template.trim() || undefined, payloadJson },
      });
      onClose();
    } catch {
      // toast موجود بالهوك
    }
  };

  return (
    <Modal
      open={open}
      title="إرسال رسالة للعميل"
      onClose={onClose}
      widthClassName="max-w-2xl"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={onSend} isLoading={sendMessage.isPending}>
            إرسال
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="grid gap-4 sm:grid-cols-2">
        <Select
          label="القناة"
          value={channel}
          error={errors.channel}
          onChange={(e) => {
            setChannel(e.target.value as Channel);
            setErrors((p) => ({ ...p, channel: undefined }));
          }}
          options={[
            { value: "WHATSAPP", label: "WhatsApp" },
            { value: "SMS", label: "SMS" },
            { value: "EMAIL", label: "Email" },
          ]}
        />

        <Input
          label="إلى"
          value={to}
          error={errors.to}
          onChange={(e) => {
            setTo(e.target.value);
            setErrors((p) => ({ ...p, to: undefined }));
          }}
          placeholder="+972..."
        />

        <div className="sm:col-span-2">
          <Input
            label="Template (اختياري)"
            value={template}
            error={errors.template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setErrors((p) => ({ ...p, template: undefined }));
            }}
            placeholder="order_update"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">payloadJson (اختياري)</label>
          <textarea
            className={
              "min-h-[160px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
              (errors.payloadText ? "border-red-400/30 focus:border-red-400/40" : "border-white/10 focus:border-white/20")
            }
            value={payloadText}
            onChange={(e) => {
              setPayloadText(e.target.value);
              setErrors((p) => ({ ...p, payloadText: undefined }));
            }}
            dir="ltr"
          />
          <div className="mt-1 text-xs opacity-70">لازم يكون JSON صالح. مثال: {"{ \"name\": \"...\" }"}</div>
          {errors.payloadText ? <div className="mt-2 text-xs text-red-200">{errors.payloadText}</div> : null}
        </div>
      </div>
    </Modal>
  );
}
