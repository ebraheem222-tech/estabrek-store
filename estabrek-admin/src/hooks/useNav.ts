// src/hooks/useNav.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as NavAPI from "../api/nav.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { tr } from "@/lib/words";

const keys = {
  menus: ["nav", "menus"] as const,
};

export function useNavMenus() {
  return useQuery({
    queryKey: keys.menus,
    queryFn: NavAPI.listMenus,
  });
}

// Backward-compat: older pages import/use `useNav()`
export function useNav() {
  return useNavMenus();
}

export function useNavActions() {
  const qc = useQueryClient();

  const createMenu = useMutation({
    mutationFn: NavAPI.createMenu,
    onSuccess: async () => {
      toast.success(tr("تم إنشاء القائمة", "Menu created"));
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error(tr("فشل إنشاء القائمة", "Couldn't create the menu"), { description: getApiErrorMessage(e) }),
  });

  const updateMenu = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof NavAPI.updateMenu>[1] }) => NavAPI.updateMenu(vars.id, vars.body),
    onSuccess: async () => {
      toast.success(tr("تم تحديث القائمة", "Menu updated"));
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error(tr("فشل تحديث القائمة", "Couldn't update the menu"), { description: getApiErrorMessage(e) }),
  });

  const deleteMenu = useMutation({
    mutationFn: NavAPI.deleteMenu,
    onSuccess: async () => {
      toast.success(tr("تم حذف القائمة", "Menu deleted"));
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error(tr("فشل حذف القائمة", "Couldn't delete the menu"), { description: getApiErrorMessage(e) }),
  });

  const createItem = useMutation({
    mutationFn: NavAPI.createItem,
    onSuccess: async () => {
      toast.success(tr("تم إضافة العنصر", "Item added"));
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error(tr("فشل إضافة العنصر", "Couldn't add the item"), { description: getApiErrorMessage(e) }),
  });

  const updateItem = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof NavAPI.updateItem>[1] }) => NavAPI.updateItem(vars.id, vars.body),
    onSuccess: async () => {
      toast.success(tr("تم تحديث العنصر", "Item updated"));
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error(tr("فشل تحديث العنصر", "Couldn't update the item"), { description: getApiErrorMessage(e) }),
  });

  const moveItem = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof NavAPI.moveItem>[1] }) => NavAPI.moveItem(vars.id, vars.body),
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.menus }),
    // ملاحظة: التحريك ممكن يتكرر كثير (drag/drop)، فبنكتفي بـ error toast بس.
    onError: (e) => toast.error(tr("فشل ترتيب العناصر", "Couldn't reorder the items"), { description: getApiErrorMessage(e) }),
  });

  const deleteItem = useMutation({
    mutationFn: NavAPI.deleteItem,
    onSuccess: async () => {
      toast.success(tr("تم حذف العنصر", "Item deleted"));
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error(tr("فشل حذف العنصر", "Couldn't delete the item"), { description: getApiErrorMessage(e) }),
  });

  return { createMenu, updateMenu, deleteMenu, createItem, updateItem, moveItem, deleteItem };
}
