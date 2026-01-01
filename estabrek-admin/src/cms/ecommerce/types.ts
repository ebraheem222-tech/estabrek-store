// ============================================================
// ESTABREK CMS - E-COMMERCE TYPES
// ============================================================

// Product Types
export interface CmsProduct {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  comparePrice?: number;
  currency?: string;
  images: string[];
  category?: string;
  categoryId?: string;
  tags?: string[];
  badge?: string;
  badgeVariant?: "sale" | "new" | "hot" | "limited" | "soldout";
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  stockCount?: number;
  variants?: CmsProductVariant[];
  attributes?: Record<string, string>;
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  seo?: CmsSeoData;
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsProductVariant {
  id: string;
  name: string;
  nameAr?: string;
  price?: number;
  sku?: string;
  image?: string;
  inStock?: boolean;
  stockCount?: number;
  attributes: Record<string, string>;
}

// Category Types
export interface CmsCategory {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  icon?: string;
  parentId?: string;
  children?: CmsCategory[];
  productCount?: number;
  sortOrder?: number;
  isActive?: boolean;
  seo?: CmsSeoData;
}

// Cart Types
export interface CmsCartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
  sku?: string;
  maxQuantity?: number;
}

export interface CmsCart {
  id: string;
  items: CmsCartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  couponCode?: string;
}

// Order Types
export type CmsOrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface CmsOrder {
  id: string;
  orderNumber: string;
  status: CmsOrderStatus;
  items: CmsOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: CmsAddress;
  billingAddress?: CmsAddress;
  shippingMethod?: CmsShippingMethod;
  paymentMethod?: CmsPaymentMethod;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
}

export interface CmsOrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  sku?: string;
}

// Address Types
export interface CmsAddress {
  id?: string;
  fullName: string;
  phone: string;
  email?: string;
  country?: string;
  city: string;
  area?: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
  notes?: string;
  isDefault?: boolean;
  type?: "shipping" | "billing";
}

// Shipping Types
export interface CmsShippingMethod {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  price: number;
  estimatedDays: string;
  icon?: string;
  isActive?: boolean;
}

// Payment Types
export interface CmsPaymentMethod {
  id: string;
  type: "card" | "cash" | "wallet" | "bank" | "paypal" | "stripe";
  name: string;
  nameAr: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  config?: Record<string, any>;
}

// Coupon Types
export interface CmsCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

// Review Types
export interface CmsReview {
  id: string;
  productId: string;
  authorId?: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  verified?: boolean;
  helpful?: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
}

// Wishlist Types
export interface CmsWishlist {
  id: string;
  userId: string;
  items: CmsWishlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CmsWishlistItem {
  id: string;
  productId: string;
  addedAt: string;
}

// SEO Types
export interface CmsSeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  schema?: Record<string, any>;
}

// Promo Types
export interface CmsPromo {
  id: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonText?: string;
  buttonLink?: string;
  countdown?: string;
  discount?: string;
  code?: string;
  variant?: "hero" | "strip" | "card" | "countdown" | "floating";
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  priority?: number;
  targetPages?: string[];
}

// Store Settings
export interface CmsStoreSettings {
  name: string;
  nameAr?: string;
  logo?: string;
  favicon?: string;
  currency: string;
  locale: string;
  timezone: string;
  taxRate?: number;
  freeShippingThreshold?: number;
  enableGuestCheckout?: boolean;
  enableReviews?: boolean;
  enableWishlist?: boolean;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    tiktok?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}
