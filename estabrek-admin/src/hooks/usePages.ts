// src/hooks/usePages.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../api/pages.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

const keys = {
  pages: ["pages"] as const,
  page: (id: string) => ["pages", id] as const,
};

export function usePagesList() {
  return useQuery({
    queryKey: keys.pages,
    queryFn: PagesAPI.listPages,
  });
}

// Backward-compat: older pages import/use `usePages()`
export function usePages() {
  return usePagesList();
}

export function usePageDetails(id: string | null) {
  return useQuery({
    queryKey: id ? keys.page(id) : ["pages", "none"],
    queryFn: () => PagesAPI.getPage(id!),
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function usePagesActions() {
  const qc = useQueryClient();

  const createPage = useMutation({
    mutationFn: PagesAPI.createPage,
    onSuccess: async () => {
      toast.success("تم إنشاء الصفحة");
      await qc.invalidateQueries({ queryKey: keys.pages });
    },
    onError: (e) => toast.error("فشل إنشاء الصفحة", { description: getApiErrorMessage(e) }),
  });

  const updatePage = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof PagesAPI.updatePage>[1] }) => PagesAPI.updatePage(vars.id, vars.body),
    onSuccess: async (_d, vars) => {
      toast.success("تم حفظ الصفحة");
      await qc.invalidateQueries({ queryKey: keys.pages });
      await qc.invalidateQueries({ queryKey: keys.page(vars.id) });
    },
    onError: (e) => toast.error("فشل حفظ الصفحة", { description: getApiErrorMessage(e) }),
  });

  const deletePage = useMutation({
    mutationFn: PagesAPI.deletePage,
    onSuccess: async () => {
      toast.success("تم حذف الصفحة");
      await qc.invalidateQueries({ queryKey: keys.pages });
    },
    onError: (e) => toast.error("فشل حذف الصفحة", { description: getApiErrorMessage(e) }),
  });

  const createSection = useMutation({
    mutationFn: (vars: { pageId: string; body: Parameters<typeof PagesAPI.createSection>[1] }) => PagesAPI.createSection(vars.pageId, vars.body),
    onSuccess: async (_d, vars) => {
      toast.success("تم إضافة القسم");
      await qc.invalidateQueries({ queryKey: keys.page(vars.pageId) });
    },
    onError: (e) => toast.error("فشل إضافة القسم", { description: getApiErrorMessage(e) }),
  });

  const updateSection = useMutation({
    mutationFn: (vars: { pageId: string; sectionId: string; body: Parameters<typeof PagesAPI.updateSection>[1] }) =>
      PagesAPI.updateSection(vars.sectionId, vars.body),
    onSuccess: async (_d, vars) => {
      toast.success("تم تحديث القسم");
      await qc.invalidateQueries({ queryKey: keys.page(vars.pageId) });
    },
    onError: (e) => toast.error("فشل تحديث القسم", { description: getApiErrorMessage(e) }),
  });

  const moveSection = useMutation({
    mutationFn: (vars: { pageId: string; sectionId: string; order: number }) => PagesAPI.moveSection(vars.sectionId, { order: vars.order }),
    onSuccess: async (_d, vars) => qc.invalidateQueries({ queryKey: keys.page(vars.pageId) }),
    // ملاحظة: ما بنحط toast هون عشان ما يصير spam (التحريك ممكن ينادي مرتين).
    onError: (e) => toast.error("فشل ترتيب الأقسام", { description: getApiErrorMessage(e) }),
  });

  const deleteSection = useMutation({
    mutationFn: (vars: { pageId: string; sectionId: string }) => PagesAPI.deleteSection(vars.sectionId),
    onSuccess: async (_d, vars) => {
      toast.success("تم حذف القسم");
      await qc.invalidateQueries({ queryKey: keys.page(vars.pageId) });
    },
    onError: (e) => toast.error("فشل حذف القسم", { description: getApiErrorMessage(e) }),
  });

  return { createPage, updatePage, deletePage, createSection, updateSection, moveSection, deleteSection };
}
