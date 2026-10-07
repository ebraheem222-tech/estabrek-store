// Back-in-stock alerts (admin → المخزون → بانتظار التوفّر).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type StockAlertStatus = "WAITING" | "SENT" | "CANCELLED" | "FAILED";

export type WaitedPiece = {
  variantId: string;
  sku: string;
  stock: number;
  productId: string;
  productTitle: string;
  productSlug: string;
  colorName: string;
  sizeName: string;
  image: string | null;
  /** Shoppers waiting for this size. */
  waiting: number;
  /** The oldest of them asked on… */
  since: string | null;
};

export type StockAlertRow = {
  id: string;
  /** Shown in full only to members who can see customers. */
  email: string;
  status: StockAlertStatus;
  createdAt: string;
  notifiedAt: string | null;
  productTitle: string;
  colorName: string;
  sizeName: string;
};

export type StockAlertsView = {
  enabled: boolean;
  ready: { email: boolean; storefrontUrl: boolean };
  totals: { waiting: number; sentLast30Days: number };
  pieces: WaitedPiece[];
  recent: StockAlertRow[];
};

export async function getStockAlerts() {
  const res = await api.get(ENDPOINTS.admin.stockAlerts.base);
  return res.data as StockAlertsView;
}

export async function sendStockAlertsNow() {
  const res = await api.post(ENDPOINTS.admin.stockAlerts.sendNow, {});
  return res.data as { checked: number; sent: number; failed: number };
}

export async function cancelStockAlert(id: string) {
  await api.delete(ENDPOINTS.admin.stockAlerts.byId(id));
}

/** The switch (needs settings:write; kept in the settings history). */
export async function setStockAlerts(enabled: boolean) {
  const res = await api.patch(ENDPOINTS.admin.settings.base, { stockAlertsEnabled: enabled });
  return res.data as { stockAlertsEnabled?: boolean };
}
