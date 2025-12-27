import { z } from "zod";

export const UpdateSettingsBody = z.object({
  siteName: z.string().min(1).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  header: z.any().nullable().optional(),
  footer: z.any().nullable().optional(),
  scriptsHead: z.any().nullable().optional(),
  scriptsBody: z.any().nullable().optional(),
  customCss: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),

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
