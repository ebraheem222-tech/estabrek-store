// src/types/settings.ts
import type { ID, ISODateString, JsonValue } from "./common";
import type { NavigationMenu } from "./nav";

/** Prisma: SiteSettings */
export type SiteSettings = {
  id: ID;

  siteName: string;
  currencyCode?: string | null;
  storeCountryCode?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;

  header?: JsonValue | null;
  footer?: JsonValue | null;

  primaryNavId?: ID | null;
  footerNavId?: ID | null;

  primaryNav?: NavigationMenu | null;
  footerNav?: NavigationMenu | null;

  scriptsHead?: JsonValue | null;
  scriptsBody?: JsonValue | null;

  customCss?: string | null;

  contactEmail?: string | null;
  contactPhone?: string | null;
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

  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type UpdateSettingsInput = Partial<
  Pick<
    SiteSettings,
    | "siteName"
    | "currencyCode"
    | "storeCountryCode"
    | "logoUrl"
    | "faviconUrl"
    | "header"
    | "footer"
    | "scriptsHead"
    | "scriptsBody"
    | "customCss"
    | "contactEmail"
    | "contactPhone"
    | "checkoutMode"
    | "ordersEmail"
    | "whatsappNumber"
    | "stripeEnabled"
    | "stripePublicKey"
    | "stripeSecretKey"
    | "stripeWebhookSecret"
    | "paypalEnabled"
    | "paypalClientId"
    | "paypalClientSecret"
    | "paypalWebhookId"
    | "announcementIsActive"
    | "announcementText"
    | "announcementLinkUrl"
  >
>;

export type LinkNavsInput = {
  primaryNavId?: ID | null;
  footerNavId?: ID | null;
};
