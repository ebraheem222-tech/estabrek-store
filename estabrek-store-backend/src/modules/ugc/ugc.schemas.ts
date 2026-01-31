import { z } from "zod";

export const ListReviewsQuery = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ListCommentsQuery = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateReviewStatusBody = z.object({
  toStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const UpdateCommentStatusBody = z.object({
  toStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});


export const NewsletterSubscribeBody = z.object({
  email: z.string().email(),
  source: z.string().max(50).optional(),
});

export const ContactMessageBody = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  fields: z.record(z.string()).optional(),
  pageUrl: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
}).refine((v) => {
  if (typeof v.message === "string" && v.message.trim()) return true;
  if (v.fields && Object.keys(v.fields).length > 0) return true;
  if (typeof v.subject === "string" && v.subject.trim()) return true;
  return false;
}, { message: "message or fields required" });
