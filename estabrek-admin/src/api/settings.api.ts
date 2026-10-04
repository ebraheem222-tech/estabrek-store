// src/api/settings.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type SiteSettings = {
  id: string;
  siteName?: string | null;
  currencyCode?: string | null;
  storeCountryCode?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  header?: any | null;
  footer?: any | null;
  scriptsHead?: any | null;
  scriptsBody?: any | null;
  customCss?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  primaryNavId?: string | null;
  footerNavId?: string | null;
  checkoutMode?: "WHATSAPP" | "STRIPE" | "PAYPAL" | "PAYMENTS";
  ordersEmail?: string | null;
  whatsappNumber?: string | null;
  stripeEnabled?: boolean;
  stripePublicKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  paypalEnabled?: boolean;
  paypalClientId?: string | null;
  paypalClientSecret?: string | null;
  paypalWebhookId?: string | null;

  // Phase 1A: Global announcement bar
  announcementIsActive?: boolean;
  announcementText?: string | null;
  announcementLinkUrl?: string | null;

  /**
   * Theme Engine (presets)
   * NOTE: kept inside `header.theme` to avoid backend/schema changes.
   * Storefront reads: settings.site.header.theme
   */
};

export async function getSettings() {
  const res = await api.get(ENDPOINTS.admin.settings.base);
  return res.data as SiteSettings;
}

export async function updateSettings(body: Partial<Omit<SiteSettings, "id">>) {
  const res = await api.patch(ENDPOINTS.admin.settings.base, body);
  return res.data as SiteSettings;
}

export async function linkNavs(body: { primaryNavId?: string | null; footerNavId?: string | null }) {
  const res = await api.post(ENDPOINTS.admin.settings.linkNavs, body);
  return res.data as SiteSettings;
}
