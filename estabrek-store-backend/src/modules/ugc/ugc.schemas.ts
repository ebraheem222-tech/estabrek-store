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
