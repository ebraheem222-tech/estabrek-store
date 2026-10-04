// src/types/catalog.ts
import type { ID, ISODateString, Money, WithTimestamps } from "./common";

/** Prisma: Category */
export type Category = WithTimestamps & {
  id: ID;
  name: string;
  slug: string;
  parentId?: ID | null;
  iconUrl?: string | null;

  parent?: Category | null;
  children?: Category[];
};

/** Prisma: Size (name/order/active) */
export type Size = {
  id: ID;
  name: string;
  order: number;
  active: boolean;
};

/** Prisma: Product */
export type Product = WithTimestamps & {
  id: ID;
  title: string;
  slug: string;
  description?: string | null;
  isActive: boolean;

  categoryId: ID;
  category?: Category;

  items?: ProductItem[];
};

/** Prisma: ProductItem */
export type ProductItem = WithTimestamps & {
  id: ID;
  productId: ID;

  colorName: string;
  colorHex?: string | null;
  suggestedColors?: string[];
  skuBase: string;
  isActive: boolean;

  images?: ProductItemImage[];
  variants?: ProductVariant[];
};

/** Prisma: ProductItemImage */
export type ProductItemImage = {
  id: ID;
  productItemId: ID;

  url: string;
  alt?: string | null;
  position: number;
  isPrimary: boolean;

  createdAt?: ISODateString;
};

/** Prisma: ProductVariant (Decimal serialized) */
export type ProductVariant = WithTimestamps & {
  id: ID;

  productItemId: ID;
  sizeId: ID;

  sku: string;
  price: Money;
  compareAt?: Money | null;
  stock: number;
  weightGrams?: number | null;

  size?: Size;
  item?: ProductItem & { product?: Product };
};

/** Deep graph returned by /admin/catalog/products/:id/full */
export type ProductFull = Product & {
  category?: Category;
  items: Array<
    ProductItem & {
      images: ProductItemImage[];
      variants: Array<ProductVariant & { size?: Size }>;
    }
  >;
};

/** Inputs used in admin editors (handy for forms) */
export type CreateCategoryInput = { name: string; slug: string; parentId?: ID | null; iconUrl?: string | null };
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type CreateProductInput = {
  title: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
  categoryId: ID;
};
export type UpdateProductInput = Partial<CreateProductInput>;

export type CreateItemInput = {
  productId: ID;
  colorName: string;
  colorHex?: string | null;
  suggestedColors?: string[];
  skuBase: string;
  isActive?: boolean;
};
export type UpdateItemInput = Partial<CreateItemInput>;

export type CreateSizeInput = { name: string; order?: number; active?: boolean };
export type UpdateSizeInput = Partial<CreateSizeInput>;

export type CreateVariantInput = {
  itemId: ID;
  sizeId: ID;
  sku: string;
  price: Money;
  compareAt?: Money | null;
  stock?: number;
  weightGrams?: number | null;
};
export type UpdateVariantInput = Partial<CreateVariantInput>;

export type AddImageInput = {
  itemId: ID;
  url: string;
  alt?: string | null;
  position?: number;
  isPrimary?: boolean;
};
export type UpdateImageInput = Partial<AddImageInput>;
