// src/hooks/useCatalog.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as CatalogAPI from "../api/catalog.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { tr } from "@/lib/words";

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
      toast.success(tr("تم إنشاء التصنيف", "Category created"));
      await qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e) => {
      toast.error(tr("فشل إنشاء التصنيف", "Couldn't create the category"), { description: getApiErrorMessage(e) });
    },
  });

  const updateCategory = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CatalogAPI.updateCategory>[1] }) =>
      CatalogAPI.updateCategory(vars.id, vars.body),
    onSuccess: async () => {
      toast.success(tr("تم تحديث التصنيف", "Category updated"));
      await qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e) => {
      toast.error(tr("فشل تحديث التصنيف", "Couldn't update the category"), { description: getApiErrorMessage(e) });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: CatalogAPI.deleteCategory,
    onSuccess: async () => {
      toast.success(tr("تم حذف التصنيف", "Category deleted"));
      await qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e) => {
      toast.error(tr("فشل حذف التصنيف", "Couldn't delete the category"), { description: getApiErrorMessage(e) });
    },
  });

  const createSize = useMutation({
    mutationFn: CatalogAPI.createSize,
    onSuccess: async () => {
      toast.success(tr("تم إنشاء المقاس", "Size created"));
      await qc.invalidateQueries({ queryKey: keys.sizes });
    },
    onError: (e) => {
      toast.error(tr("فشل إنشاء المقاس", "Couldn't create the size"), { description: getApiErrorMessage(e) });
    },
  });

  const updateSize = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CatalogAPI.updateSize>[1] }) =>
      CatalogAPI.updateSize(vars.id, vars.body),
    onSuccess: async () => {
      toast.success(tr("تم تحديث المقاس", "Size updated"));
      await qc.invalidateQueries({ queryKey: keys.sizes });
    },
    onError: (e) => {
      toast.error(tr("فشل تحديث المقاس", "Couldn't update the size"), { description: getApiErrorMessage(e) });
    },
  });

  const deleteSize = useMutation({
    mutationFn: CatalogAPI.deleteSize,
    onSuccess: async () => {
      toast.success(tr("تم حذف المقاس", "Size deleted"));
      await qc.invalidateQueries({ queryKey: keys.sizes });
    },
    onError: (e) => {
      toast.error(tr("فشل حذف المقاس", "Couldn't delete the size"), { description: getApiErrorMessage(e) });
    },
  });

  const createProduct = useMutation({
    mutationFn: CatalogAPI.createProduct,
    onSuccess: async () => {
      toast.success(tr("تم إنشاء المنتج", "Product created"));
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error(tr("فشل إنشاء المنتج", "Couldn't create the product"), { description: getApiErrorMessage(e) });
    },
  });

  const updateProduct = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CatalogAPI.updateProduct>[1] }) =>
      CatalogAPI.updateProduct(vars.id, vars.body),
    onSuccess: async () => {
      toast.success(tr("تم تحديث المنتج", "Product updated"));
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error(tr("فشل تحديث المنتج", "Couldn't update the product"), { description: getApiErrorMessage(e) });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: CatalogAPI.deleteProduct,
    onSuccess: async (res) => {
      if ((res as any)?.archived) {
        toast.success(tr("تمت أرشفة المنتج", "Product archived"), {
          description: tr("لا يمكن حذف منتج مرتبط بطلبات. تم إيقافه بدل الحذف للحفاظ على سجل الطلبات.", "A product with orders can't be deleted. It was turned off instead, to keep the orders' history."),
        });
      } else {
        toast.success(tr("تم حذف المنتج", "Product deleted"));
      }
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error(tr("فشل حذف المنتج", "Couldn't delete the product"), { description: getApiErrorMessage(e) });
    },
  });

  const updateProductFull = useMutation({
    mutationFn: (vars: { id: string; body: CatalogAPI.ProductDeepUpdateBody }) =>
      CatalogAPI.updateProductFull(vars.id, vars.body),
    onSuccess: async (_data, vars) => {
      toast.success(tr("تم حفظ تفاصيل المنتج", "Product details saved"));
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      await qc.invalidateQueries({ queryKey: keys.productFull(vars.id) });
    },
    onError: (e) => {
      toast.error(tr("فشل حفظ تفاصيل المنتج", "Couldn't save the product details"), { description: getApiErrorMessage(e) });
    },
  });

  const bulkProducts = useMutation({
    mutationFn: CatalogAPI.bulkProducts,
    onSuccess: async () => {
      toast.success(tr("تم تنفيذ العملية على المنتجات المحددة", "Done for the selected products"));
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error(tr("فشل تنفيذ العملية", "Couldn't do that"), { description: getApiErrorMessage(e) });
    },
  });

  const importProducts = useMutation({
    mutationFn: CatalogAPI.importProducts,
    onSuccess: async () => {
      toast.success(tr("تم استيراد المنتجات", "Products imported"));
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
    onError: (e) => {
      toast.error(tr("فشل استيراد المنتجات", "Couldn't import the products"), { description: getApiErrorMessage(e) });
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
