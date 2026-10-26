// src/features/catalog/SizesPage.tsx
import React, { useState } from "react";
import { useCatalogActions, useSizes } from "../../hooks/useCatalog";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Spinner } from "../../components/ui/Spinner";
import { tr } from "@/lib/words";

export default function SizesPage() {
  const q = useSizes();
  const actions = useCatalogActions();

  const sizes = q.data ?? [];

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [order, setOrder] = useState<number>(0);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setOrder(sizes.length ? (sizes[sizes.length - 1]?.order ?? sizes.length - 1) + 1 : 0);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setName(s.name ?? "");
    setOrder(Number.isFinite(s.order) ? s.order : 0);
    setErrors({});
    setOpen(true);
  };

  const onSave = async () => {
    const body = { name: name.trim(), order: Number.isFinite(order) ? order : 0 };

    const nextErrors: { name?: string } = {};
    if (!body.name) nextErrors.name = tr("الاسم مطلوب", "The name is required");

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      if (editingId) {
        await actions.updateSize.mutateAsync({ id: editingId, body });
      } else {
        await actions.createSize.mutateAsync(body);
      }
      setOpen(false);
    } catch {
      // toast handled inside hook
    }
  };

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await actions.deleteSize.mutateAsync(confirmId);
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{tr("المقاسات", "Sizes")}</div>
            <div className="mt-1 text-xs opacity-70">Sizes</div>
          </div>
          <Button variant="primary" onClick={openCreate}>
            {tr("إضافة مقاس", "Add size")}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">{tr("جاري التحميل…", "Loading…")}</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{tr("فشل تحميل المقاسات.", "The sizes couldn't load.")}</div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{tr("الاسم", "Name")}</TH>
                <TH>{tr("الترتيب", "Order")}</TH>
                <TH className="w-40">{tr("إجراءات", "Actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {sizes.map((s: any) => (
                <TR key={s.id}>
                  <TD className="font-medium">{s.name}</TD>
                  <TD className="opacity-80">{s.order ?? 0}</TD>
                  <TD>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openEdit(s)}>
                        {tr("تعديل", "Edit")}
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmId(s.id)}>
                        {tr("حذف", "Delete")}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <Modal
        open={open}
        title={editingId ? tr("تعديل مقاس", "Edit size") : tr("إضافة مقاس", "Add size")}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={onSave} isLoading={actions.createSize.isPending || actions.updateSize.isPending}>
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={tr("الاسم", "Name")}
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />

          <Input
            label={tr("الترتيب", "Order")}
            type="number"
            value={String(order)}
            onChange={(e) => setOrder(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title={tr("تأكيد الحذف", "Confirm delete")}
        message={tr("الحذف أكيد؟ ممكن ما يزبط إذا المقاس مرتبط بمنتجات.", "Delete for sure? It may fail if the size is used by products.")}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
