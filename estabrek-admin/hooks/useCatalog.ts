// src/hooks/useCatalog.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as CatalogAPI from "../api/catalog.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

const keys = {
  categories: ["catalog", "categories"] as const,
  sizes: ["catalog", "sizes"] as const,
  products: (status: "all" | "active" | "draft") => ["catalog", "products", status] as const,
  productFull: (id: string) => ["catalog", "products", id, "full"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: CatalogAPI.listCategories,
  });
}

export function useSizes() {
  return useQuery({
    queryKey: keys.sizes,
    queryFn: CatalogAPI.listSizes,
  });
}

export function useProducts(status: "all" | "active" | "draft" = "all") {
  return useQuery({
    queryKey: keys.products(status),
    queryFn: () => CatalogAPI.listProducts(status),
  });
}

export function useProductFull(id: string | null) {
  return useQuery({
    queryKey: id ? keys.productFull(id) : ["catalog", "products", "none", "full"],
    queryFn: () => CatalogAPI.getProductFull(id!),
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function useCatalogActions() {
  const qc = useQueryClient();

  const createCategory = useMutation({
    mutationFn: CatalogAPI.createCategory,
    onSuccess: async () => {
      toast.success("تم إنشاء التصنيف");
      await qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e) => {
      toast.error("فشل إنشاء التصنيف", { description: getApiErrorMessage(e) });
    },
  });

  const updateCategory = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CatalogAPI.updateCategory>[1] }) =>
      CatalogAPI.updateCategory(vars.id, vars.body),
    onSuccess: async () => {
      toast.success("تم تحديث التصنيف");
      await qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e) => {
      toast.error("فشل تحديث التصنيف", { description: getApiErrorMessage(e) });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: CatalogAPI.deleteCategory,
    onSuccess: async () => {
      toast.success("تم حذف التصنيف");
      await qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e) => {
      toast.error("فشل حذف التصنيف", { description: getApiErrorMessage(e) });
    },
  });

  const createSize = useMutation({
    mutationFn: CatalogAPI.createSize,
    onSuccess: async () => {
      toast.success("تم إنشاء المقاس");
      await qc.invalidateQueries({ queryKey: keys.sizes });
    },
    onError: (e) => {
      toast.error("فشل إنشاء المقاس", { description: getApiErrorMessage(e) });
    },
  });

  const updateSize = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CatalogAPI.updateSize>[1] }) =>
      CatalogAPI.updateSize(vars.id, vars.body),
    onSuccess: async () => {
      toast.success("تم تحديث المقاس");
      await qc.invalidateQueries({ queryKey: keys.sizes });
    },
    onError: (e) => {
      toast.error("فشل تحديث المقاس", { description: getApiErrorMessage(e) });
    },
  });

  const deleteSize = useMutation({
    mutationFn: CatalogAPI.deleteSize,
    onSuccess: async () => {
      toast.success("تم حذف المقاس");
      await qc.invalidateQueries({ queryKey: keys.sizes });
    },
    onError: (e) => {
      toast.error("فشل حذف المقاس", { description: getApiErrorMessage(e) });
    },
  });

  const createProduct = useMutation({
    mutationFn: CatalogAPI.createProduct,
    onSuccess: async () => {
      toast.success("تم إنشاء المنتج");
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error("فشل إنشاء المنتج", { description: getApiErrorMessage(e) });
    },
  });

  const updateProduct = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CatalogAPI.updateProduct>[1] }) =>
      CatalogAPI.updateProduct(vars.id, vars.body),
    onSuccess: async () => {
      toast.success("تم تحديث المنتج");
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error("فشل تحديث المنتج", { description: getApiErrorMessage(e) });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: CatalogAPI.deleteProduct,
    onSuccess: async (res) => {
      if ((res as any)?.archived) {
        toast.success("تمت أرشفة المنتج", {
          description: "لا يمكن حذف منتج مرتبط بطلبات. تم إيقافه بدل الحذف للحفاظ على سجل الطلبات.",
        });
      } else {
        toast.success("تم حذف المنتج");
      }
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error("فشل حذف المنتج", { description: getApiErrorMessage(e) });
    },
  });

  const updateProductFull = useMutation({
    mutationFn: (vars: { id: string; body: CatalogAPI.ProductDeepUpdateBody }) =>
      CatalogAPI.updateProductFull(vars.id, vars.body),
    onSuccess: async (_data, vars) => {
      toast.success("تم حفظ تفاصيل المنتج");
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      await qc.invalidateQueries({ queryKey: keys.productFull(vars.id) });
    },
    onError: (e) => {
      toast.error("فشل حفظ تفاصيل المنتج", { description: getApiErrorMessage(e) });
    },
  });

  const bulkProducts = useMutation({
    mutationFn: CatalogAPI.bulkProducts,
    onSuccess: async () => {
      toast.success("تم تنفيذ العملية على المنتجات المحددة");
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error("فشل تنفيذ العملية", { description: getApiErrorMessage(e) });
    },
  });

  const importProducts = useMutation({
    mutationFn: CatalogAPI.importProducts,
    onSuccess: async () => {
      toast.success("تم استيراد المنتجات");
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error("فشل استيراد المنتجات", { description: getApiErrorMessage(e) });
    },
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,

    createSize,
    updateSize,
    deleteSize,

    createProduct,
    updateProduct,
    deleteProduct,

    updateProductFull,

    bulkProducts,
    importProducts,
  };
}
