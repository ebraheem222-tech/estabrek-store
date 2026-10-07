// أنواع المنتجات: kinds of products and their own fields.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export const FIELD_KINDS = ["text", "longtext", "number", "select", "multiselect", "boolean", "date", "url"] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export type TypeField = {
  key: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  options?: string[];
  required?: boolean;
  filterable?: boolean;
  showOnPage?: boolean;
  help?: string;
};

export type ProductType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: TypeField[];
  colorLabel: string;
  sizeLabel: string;
  showColor: boolean;
  showSize: boolean;
  /** How it reaches the shopper: shipped, downloaded (files) or a booking (tickets). */
  fulfillment: "SHIPPING" | "DIGITAL" | "BOOKING";
  position: number;
  /** Products of this kind. */
  products: number;
};

export type ProductTypeInput = Partial<Omit<ProductType, "id" | "products">> & { name?: string };

export async function listProductTypes() {
  const res = await api.get(ENDPOINTS.admin.catalog.productTypes.base);
  return (res.data?.types ?? []) as ProductType[];
}

export async function createProductType(body: ProductTypeInput & { name: string }) {
  const res = await api.post(ENDPOINTS.admin.catalog.productTypes.base, body);
  return res.data as ProductType;
}

export async function updateProductType(id: string, body: ProductTypeInput) {
  const res = await api.patch(ENDPOINTS.admin.catalog.productTypes.byId(id), body);
  return res.data as ProductType;
}

/** moveTo: the type its products move to (needed when it has products). */
export async function deleteProductType(id: string, moveTo?: string) {
  const res = await api.delete(ENDPOINTS.admin.catalog.productTypes.byId(id), { params: moveTo ? { moveTo } : undefined });
  return res.data as { ok: true; moved: number };
}
