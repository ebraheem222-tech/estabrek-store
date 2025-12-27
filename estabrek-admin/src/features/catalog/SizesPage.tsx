// src/features/catalog/SizesPage.tsx
import React, { useState } from "react";
import { useCatalogActions, useSizes } from "../../hooks/useCatalog";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Spinner } from "../../components/ui/Spinner";

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
    if (!body.name) nextErrors.name = "الاسم مطلوب";

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
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">المقاسات</div>
            <div className="mt-1 text-xs opacity-70">Sizes</div>
          </div>
          <Button variant="primary" onClick={openCreate}>
            إضافة مقاس
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري التحميل…</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">فشل تحميل المقاسات.</div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>الاسم</TH>
                <TH>الترتيب</TH>
                <TH className="w-40">إجراءات</TH>
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
                        تعديل
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmId(s.id)}>
                        حذف
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
        title={editingId ? "تعديل مقاس" : "إضافة مقاس"}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={onSave} isLoading={actions.createSize.isPending || actions.updateSize.isPending}>
              حفظ
            </Button>
          </div>
        }
      >
        <div dir="rtl" className="space-y-4">
          <Input
            label="الاسم"
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />

          <Input
            label="الترتيب"
            type="number"
            value={String(order)}
            onChange={(e) => setOrder(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="تأكيد الحذف"
        message="هل أنت متأكد؟ قد يفشل الحذف إذا المقاس مرتبط بمنتجات."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
