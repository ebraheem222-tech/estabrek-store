// src/hooks/usePages.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../api/pages.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { tr } from "@/lib/words";

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
      toast.success(tr("تم إنشاء الصفحة", "Page created"));
      await qc.invalidateQueries({ queryKey: keys.pages });
    },
    onError: (e) => toast.error(tr("فشل إنشاء الصفحة", "Couldn't create the page"), { description: getApiErrorMessage(e) }),
  });

  const updatePage = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof PagesAPI.updatePage>[1] }) => PagesAPI.updatePage(vars.id, vars.body),
    onSuccess: async (_d, vars) => {
      toast.success(tr("تم حفظ الصفحة", "Page saved"));
      await qc.invalidateQueries({ queryKey: keys.pages });
      await qc.invalidateQueries({ queryKey: keys.page(vars.id) });
    },
    onError: (e) => toast.error(tr("فشل حفظ الصفحة", "Couldn't save the page"), { description: getApiErrorMessage(e) }),
  });

  const deletePage = useMutation({
    mutationFn: PagesAPI.deletePage,
    onSuccess: async () => {
      toast.success(tr("تم حذف الصفحة", "Page deleted"));
      await qc.invalidateQueries({ queryKey: keys.pages });
    },
    onError: (e) => toast.error(tr("فشل حذف الصفحة", "Couldn't delete the page"), { description: getApiErrorMessage(e) }),
  });

  const createSection = useMutation({
    mutationFn: (vars: { pageId: string; body: Parameters<typeof PagesAPI.createSection>[1] }) => PagesAPI.createSection(vars.pageId, vars.body),
    onSuccess: async (_d, vars) => {
      toast.success(tr("تم إضافة القسم", "Section added"));
      await qc.invalidateQueries({ queryKey: keys.page(vars.pageId) });
    },
    onError: (e) => toast.error(tr("فشل إضافة القسم", "Couldn't add the section"), { description: getApiErrorMessage(e) }),
  });

  const updateSection = useMutation({
    mutationFn: (vars: { pageId: string; sectionId: string; body: Parameters<typeof PagesAPI.updateSection>[1] }) =>
      PagesAPI.updateSection(vars.sectionId, vars.body),
    onSuccess: async (_d, vars) => {
      toast.success(tr("تم تحديث القسم", "Section updated"));
      await qc.invalidateQueries({ queryKey: keys.page(vars.pageId) });
    },
    onError: (e) => toast.error(tr("فشل تحديث القسم", "Couldn't update the section"), { description: getApiErrorMessage(e) }),
  });

  const moveSection = useMutation({
    mutationFn: (vars: { pageId: string; sectionId: string; order: number }) => PagesAPI.moveSection(vars.sectionId, { order: vars.order }),
    onSuccess: async (_d, vars) => qc.invalidateQueries({ queryKey: keys.page(vars.pageId) }),
    // ملاحظة: ما بنحط toast هون عشان ما يصير spam (التحريك ممكن ينادي مرتين).
    onError: (e) => toast.error(tr("فشل ترتيب الأقسام", "Couldn't reorder the sections"), { description: getApiErrorMessage(e) }),
  });

  const deleteSection = useMutation({
    mutationFn: (vars: { pageId: string; sectionId: string }) => PagesAPI.deleteSection(vars.sectionId),
    onSuccess: async (_d, vars) => {
      toast.success(tr("تم حذف القسم", "Section deleted"));
      await qc.invalidateQueries({ queryKey: keys.page(vars.pageId) });
    },
    onError: (e) => toast.error(tr("فشل حذف القسم", "Couldn't delete the section"), { description: getApiErrorMessage(e) }),
  });

  return { createPage, updatePage, deletePage, createSection, updateSection, moveSection, deleteSection };
}
