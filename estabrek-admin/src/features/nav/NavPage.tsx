// src/features/nav/NavPage.tsx
import React, { useMemo, useState } from "react";
import { useNav, useNavActions } from "../../hooks/useNav";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Spinner } from "../../components/ui/Spinner";
import { toast } from "../../lib/toast";

export default function NavPage() {
  const q = useNav();
  const actions = useNavActions();

  const menus = q.data ?? [];
  const byId = useMemo(() => {
    const m = new Map<string, any>();
    menus.forEach((x) => m.set(x.id, x));
    return m;
  }, [menus]);

  const [activeMenuId, setActiveMenuId] = useState<string>("");
  const activeMenu = activeMenuId ? byId.get(activeMenuId) : null;

  // Menu modal
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEditingId, setMenuEditingId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuErrors, setMenuErrors] = useState<{ name?: string }>({});

  // Item modal
  const [itemOpen, setItemOpen] = useState(false);
  const [itemEditingId, setItemEditingId] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [itemHref, setItemHref] = useState("");
  const [itemOrder, setItemOrder] = useState<number>(0);
  const [itemParentId, setItemParentId] = useState<string>("");
  const [itemErrors, setItemErrors] = useState<{ label?: string; href?: string }>({});

  const [confirmMenuId, setConfirmMenuId] = useState<string | null>(null);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);
  const parentOptions = useMemo(() => {
    const items = activeMenu?.items ?? [];
    return [
      { value: "", label: tr("بدون (رئيسي)", "None (top level)") },
      ...items
        .filter((it: any) => it.id !== itemEditingId)
        .map((it: any) => ({ value: it.id, label: it.label ?? it.id })),
    ];
  }, [activeMenu, itemEditingId]);

  const ensureActiveMenu = () => {
    if (activeMenuId) return true;
    if (menus.length) {
      setActiveMenuId(menus[0].id);
      return true;
    }
    toast.error(tr("لا يوجد قائمة. لازم تنعمل قائمة أولاً", "No menu. Create a menu first"));
    return false;
  };

  const openCreateMenu = () => {
    setMenuEditingId(null);
    setMenuName("");
    setMenuErrors({});
    setMenuOpen(true);
  };

  const openEditMenu = (id: string) => {
    const m = byId.get(id);
    setMenuEditingId(id);
    setMenuName(m?.name ?? "");
    setMenuErrors({});
    setMenuOpen(true);
  };

  const saveMenu = async () => {
    const body = { name: menuName.trim() };
    const nextErrors: { name?: string } = {};
    if (!body.name) nextErrors.name = tr("الاسم مطلوب", "The name is required");

    if (Object.keys(nextErrors).length) {
      setMenuErrors(nextErrors);
      return;
    }
    setMenuErrors({});

    try {
      if (menuEditingId) {
        await actions.updateMenu.mutateAsync({ id: menuEditingId, body });
      } else {
        const created = await actions.createMenu.mutateAsync(body);
        if (created?.id) setActiveMenuId(created.id);
      }
      setMenuOpen(false);
    } catch {
      // toast handled inside hook
    }
  };

  const openCreateItem = () => {
    if (!ensureActiveMenu()) return;
    setItemEditingId(null);
    setItemLabel("");
    setItemHref("");
    setItemParentId("");
    const items = activeMenu?.items ?? [];
    const lastOrder = items.length ? (items[items.length - 1]?.order ?? items.length - 1) : -1;
    setItemOrder(lastOrder + 1);
    setItemErrors({});
    setItemOpen(true);
  };

  const openEditItem = (it: any) => {
    if (!ensureActiveMenu()) return;
    setItemEditingId(it.id);
    setItemLabel(it.label ?? "");
    setItemHref(it.href ?? "");
    setItemOrder(Number.isFinite(it.order) ? it.order : 0);
    setItemParentId(it.parentId ?? "");
    setItemErrors({});
    setItemOpen(true);
  };

  const saveItem = async () => {
    if (!ensureActiveMenu()) return;

    const body = {
      label: itemLabel.trim(),
      href: itemHref.trim(),
      parentId: itemParentId ? itemParentId : null,
      order: Number.isFinite(itemOrder) ? itemOrder : 0,
    };

    const nextErrors: { label?: string; href?: string } = {};
    if (!body.label) nextErrors.label = tr("العنوان مطلوب", "The title is required");
    if (!body.href) nextErrors.href = tr("الرابط مطلوب", "The link is required");

    if (Object.keys(nextErrors).length) {
      setItemErrors(nextErrors);
      return;
    }
    setItemErrors({});

    try {
      if (itemEditingId) {
        await actions.updateItem.mutateAsync({ id: itemEditingId, body });
      } else {
        // createItem expects the full payload, not { body: ... }
        await actions.createItem.mutateAsync({ menuId: activeMenuId, ...body });
      }
      setItemOpen(false);
    } catch {
      // toast handled inside hook
    }
  };

  const deleteMenu = async () => {
    if (!confirmMenuId) return;
    try {
      await actions.deleteMenu.mutateAsync(confirmMenuId);
      if (activeMenuId === confirmMenuId) setActiveMenuId("");
    } finally {
      setConfirmMenuId(null);
    }
  };

  const deleteItem = async () => {
    if (!confirmItemId) return;
    try {
      await actions.deleteItem.mutateAsync(confirmItemId);
    } finally {
      setConfirmItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">{tr("القوائم", "Menus")}</div>
            <div className="mt-1 text-xs opacity-70">Navigation menus</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-white/20 sm:w-64"
              value={activeMenuId}
              onChange={(e) => setActiveMenuId(e.target.value)}
              disabled={!menus.length}
            >
              {!menus.length ? <option value="">{tr("لا يوجد قوائم", "No menus")}</option> : null}
              {menus.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={openCreateMenu} className="w-full sm:w-auto">
              {tr("إضافة قائمة", "Add menu")}
            </Button>

            <Button variant="primary" onClick={openCreateItem} disabled={!menus.length} className="w-full sm:w-auto">
              {tr("إضافة رابط", "Add link")}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">{tr("جاري التحميل…", "Loading…")}</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{tr("فشل تحميل القوائم.", "The menus couldn't load.")}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">{tr("قوائم", "Menus")}</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => activeMenuId && openEditMenu(activeMenuId)} disabled={!activeMenuId}>
                    {tr("تعديل", "Edit")}
                  </Button>
                  <Button variant="danger" onClick={() => activeMenuId && setConfirmMenuId(activeMenuId)} disabled={!activeMenuId}>
                    {tr("حذف", "Delete")}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-3 sm:hidden">
                  {menus.map((m: any) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${m.id === activeMenuId ? "border-white/30 bg-white/[0.08]" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{m.name}</div>
                        <div className="text-xs opacity-70">{(m.items ?? []).length}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => {
                            setActiveMenuId(m.id);
                            openEditMenu(m.id);
                          }}
                        >
                          {tr("تعديل", "Edit")}
                        </Button>
                        <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmMenuId(m.id)}>
                          {tr("حذف", "Delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block">
                  <Table>
                <THead>
                  <TR>
                    <TH>{tr("الاسم", "Name")}</TH>
                    <TH className="w-28">{tr("روابط", "Links")}</TH>
                    <TH className="w-36">{tr("إجراءات", "Actions")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {menus.map((m: any) => (
                    <TR key={m.id} className={m.id === activeMenuId ? "bg-white/5" : ""}>
                      <TD className="font-medium">{m.name}</TD>
                      <TD className="opacity-80">{(m.items ?? []).length}</TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setActiveMenuId(m.id);
                              openEditMenu(m.id);
                            }}
                          >
                            {tr("تعديل", "Edit")}
                          </Button>
                          <Button variant="danger" onClick={() => setConfirmMenuId(m.id)}>
                            {tr("حذف", "Delete")}
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">{tr("روابط القائمة", "Menu links")}</div>
                <div className="text-sm opacity-70">{activeMenu ? activeMenu.name : "—"}</div>
              </div>

              {!activeMenu ? (
                <div className="text-sm opacity-80">{tr("اختيار قائمة بيعرض روابطها.", "Choose a menu to see its links.")}</div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-3 sm:hidden">
                    {(activeMenu.items ?? []).map((it: any) => (
                      <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{it.label}</div>
                            <div dir="ltr" className="mt-1 text-xs opacity-70">
                              {it.href}
                            </div>
                          </div>
                          <div className="text-xs opacity-70 tabular-nums">#{it.order ?? 0}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEditItem(it)}>
                            {tr("تعديل", "Edit")}
                          </Button>
                          <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmItemId(it.id)}>
                            {tr("حذف", "Delete")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <Table>
                  <THead>
                    <TR>
                      <TH>{tr("العنوان", "Title")}</TH>
                      <TH>{tr("الرابط", "Link")}</TH>
                      <TH className="w-24">{tr("ترتيب", "Order")}</TH>
                      <TH className="w-40">{tr("إجراءات", "Actions")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {(activeMenu.items ?? []).map((it: any) => (
                      <TR key={it.id}>
                        <TD className="font-medium">{it.label}</TD>
                        <TD dir="ltr" className="text-left opacity-80">
                          {it.href}
                        </TD>
                        <TD className="opacity-80">{it.order ?? 0}</TD>
                        <TD>
                          <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => openEditItem(it)}>
                              {tr("تعديل", "Edit")}
                            </Button>
                            <Button variant="danger" onClick={() => setConfirmItemId(it.id)}>
                              {tr("حذف", "Delete")}
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Menu modal */}
      <Modal
        open={menuOpen}
        title={menuEditingId ? tr("تعديل قائمة", "Edit menu") : tr("إضافة قائمة", "Add menu")}
        onClose={() => setMenuOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveMenu} isLoading={actions.createMenu.isPending || actions.updateMenu.isPending}>
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={tr("اسم القائمة", "Menu name")}
            value={menuName}
            error={menuErrors.name}
            onChange={(e) => {
              setMenuName(e.target.value);
              setMenuErrors((p) => ({ ...p, name: undefined }));
            }}
          />
        </div>
      </Modal>

      {/* Item modal */}
      <Modal
        open={itemOpen}
        title={itemEditingId ? tr("تعديل رابط", "Edit link") : tr("إضافة رابط", "Add link")}
        onClose={() => setItemOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveItem} isLoading={actions.createItem.isPending || actions.updateItem.isPending}>
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={tr("العنوان", "Title")}
            value={itemLabel}
            error={itemErrors.label}
            onChange={(e) => {
              setItemLabel(e.target.value);
              setItemErrors((p) => ({ ...p, label: undefined }));
            }}
          />
          <Input
            label={tr("الرابط", "Link")}
            value={itemHref}
            error={itemErrors.href}
            placeholder={tr("/about أو https://...", "/about or https://...")}
            onChange={(e) => {
              setItemHref(e.target.value);
              setItemErrors((p) => ({ ...p, href: undefined }));
            }}
          />
          <Select
            label={tr("العنصر الأب (اختياري)", "Parent item (optional)")}
            value={itemParentId}
            onChange={(v) => setItemParentId(v as string)}
            options={parentOptions}
          />
          <Input label={tr("الترتيب", "Order")} type="number" value={String(itemOrder)} onChange={(e) => setItemOrder(parseInt(e.target.value || "0", 10))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmMenuId}
        title={tr("تأكيد حذف القائمة", "Confirm deleting the menu")}
        message={tr("الحذف أكيد؟ القائمة وروابطها رح ينحذفوا.", "Sure? The menu and its links will be deleted.")}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={deleteMenu}
        onCancel={() => setConfirmMenuId(null)}
      />

      <ConfirmDialog
        open={!!confirmItemId}
        title={tr("تأكيد حذف الرابط", "Confirm deleting the link")}
        message={tr("الحذف أكيد؟", "Sure?")}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={deleteItem}
        onCancel={() => setConfirmItemId(null)}
      />
    </div>
  );
}



import { tr } from "@/lib/words";