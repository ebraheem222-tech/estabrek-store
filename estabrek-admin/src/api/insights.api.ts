// Smart selling: the stock forecast (admin → توقّع المخزون).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type StockStatus = "soldOut" | "soon" | "watch" | "ok" | "noSales" | "empty";

export type ForecastSettings = { windowDays: number; leadDays: number; coverDays: number; unseenDays: number };

export type ForecastVariant = {
  variantId: string;
  sku: string;
  color: string;
  colorHex: string | null;
  size: string;
  stock: number;
  /** In open orders that haven't taken stock yet. */
  held: number;
  available: number;
  sold7: number;
  soldWindow: number;
  onSale: boolean;
  /** Pieces a day. */
  pace: number;
  daysLeft: number | null;
  status: StockStatus;
  reorder: number;
  rough: boolean;
};

export type ForecastProduct = {
  productId: string;
  title: string;
  slug: string;
  category: string | null;
  thumbUrl: string | null;
  rising: boolean;
  demand: { views7: number; viewsPrev7: number; bags7: number; bagsPrev7: number };
  status: StockStatus;
  stock: number;
  available: number;
  pace: number;
  daysLeft: number | null;
  /** The first size to run out. */
  firstOutDays: number | null;
  reorder: number;
  soldWindow: number;
  variants: ForecastVariant[];
};

type ShelfProduct = { productId: string; title: string; slug: string; category: string | null; thumbUrl: string | null; stock: number; stockValue: number; onSale: boolean };

export type StockInsights = {
  now: number;
  settings: ForecastSettings;
  defaults: ForecastSettings;
  limits: Record<keyof ForecastSettings, { min: number; max: number }>;
  viewsSince: string | null;
  viewsDays: number;
  summary: { products: number; soldOut: number; soon: number; watch: number; reorderPieces: number; unseen: number; unseenValue: number; lookedNotBought: number };
  products: ForecastProduct[];
  unseen: Array<ShelfProduct & { ageDays: number; lastViewedAt: string | null }>;
  lookedNotBought: Array<ShelfProduct & { views: number; bags: number }>;
  updatedAt: string | null;
};

const I = ENDPOINTS.admin.insights;

export async function getStockInsights() {
  return (await api.get(I.stock)).data as StockInsights;
}

export async function saveForecastSettings(patch: Partial<ForecastSettings>) {
  return (await api.patch(I.stockSettings, patch)).data as { settings: ForecastSettings };
}
