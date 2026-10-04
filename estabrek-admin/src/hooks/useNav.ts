// src/hooks/useNav.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as NavAPI from "../api/nav.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

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
      toast.success("تم إنشاء القائمة");
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error("فشل إنشاء القائمة", { description: getApiErrorMessage(e) }),
  });

  const updateMenu = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof NavAPI.updateMenu>[1] }) => NavAPI.updateMenu(vars.id, vars.body),
    onSuccess: async () => {
      toast.success("تم تحديث القائمة");
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error("فشل تحديث القائمة", { description: getApiErrorMessage(e) }),
  });

  const deleteMenu = useMutation({
    mutationFn: NavAPI.deleteMenu,
    onSuccess: async () => {
      toast.success("تم حذف القائمة");
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error("فشل حذف القائمة", { description: getApiErrorMessage(e) }),
  });

  const createItem = useMutation({
    mutationFn: NavAPI.createItem,
    onSuccess: async () => {
      toast.success("تم إضافة العنصر");
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error("فشل إضافة العنصر", { description: getApiErrorMessage(e) }),
  });

  const updateItem = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof NavAPI.updateItem>[1] }) => NavAPI.updateItem(vars.id, vars.body),
    onSuccess: async () => {
      toast.success("تم تحديث العنصر");
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error("فشل تحديث العنصر", { description: getApiErrorMessage(e) }),
  });

  const moveItem = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof NavAPI.moveItem>[1] }) => NavAPI.moveItem(vars.id, vars.body),
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.menus }),
    // ملاحظة: التحريك ممكن يتكرر كثير (drag/drop)، فبنكتفي بـ error toast بس.
    onError: (e) => toast.error("فشل ترتيب العناصر", { description: getApiErrorMessage(e) }),
  });

  const deleteItem = useMutation({
    mutationFn: NavAPI.deleteItem,
    onSuccess: async () => {
      toast.success("تم حذف العنصر");
      await qc.invalidateQueries({ queryKey: keys.menus });
    },
    onError: (e) => toast.error("فشل حذف العنصر", { description: getApiErrorMessage(e) }),
  });

  return { createMenu, updateMenu, deleteMenu, createItem, updateItem, moveItem, deleteItem };
}
