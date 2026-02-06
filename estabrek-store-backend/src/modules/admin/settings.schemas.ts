import { z } from "zod";

export const UpdateSettingsBody = z.object({
  siteName: z.string().min(1).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  storeCountryCode: z.string().min(2).max(2).optional(),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  header: z.any().nullable().optional(),
  footer: z.any().nullable().optional(),
  scriptsHead: z.any().nullable().optional(),
  scriptsBody: z.any().nullable().optional(),
  customCss: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  checkoutMode: z.enum(["WHATSAPP", "STRIPE", "PAYPAL", "PAYMENTS"]).optional(),
  ordersEmail: z.string().email().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  stripeEnabled: z.boolean().optional(),
  stripePublicKey: z.string().nullable().optional(),
  stripeSecretKey: z.string().nullable().optional(),
  stripeWebhookSecret: z.string().nullable().optional(),
  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().nullable().optional(),
  paypalClientSecret: z.string().nullable().optional(),
  paypalWebhookId: z.string().nullable().optional(),

  // Global announcement bar
  announcementIsActive: z.boolean().optional(),
  announcementText: z.string().min(1).max(200).nullable().optional(),
  // allow relative URLs like /shop as well as absolute URLs
  announcementLinkUrl: z.string().max(2048).nullable().optional(),


  // Newsletter
  newsletterIsActive: z.boolean().optional(),
  newsletterTitle: z.string().max(120).nullable().optional(),
  newsletterText: z.string().max(500).nullable().optional(),
  newsletterSuccess: z.string().max(200).nullable().optional(),

});

export const LinkNavsBody = z.object({
  primaryNavId: z.string().cuid().nullable().optional(),
  footerNavId: z.string().cuid().nullable().optional(),
});
