import { prisma } from "../../lib/prisma.js";
import type { Prisma, ReviewStatus, CommentStatus } from "@prisma/client";

export async function listReviews(params: {
  status?: ReviewStatus;
  productId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.ReviewWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.productId) where.productId = params.productId;
  if (params.userId) where.userId = params.userId;

  if (params.minRating != null || params.maxRating != null) {
    where.rating = {};
    if (params.minRating != null) (where.rating as Prisma.IntFilter).gte = params.minRating;
    if (params.maxRating != null) (where.rating as Prisma.IntFilter).lte = params.maxRating;
  }

  const skip = (params.page - 1) * params.pageSize;
  const [total, data] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.pageSize,
      include: {
        user: true,
        product: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);

  return { total, page: params.page, pageSize: params.pageSize, data };
}

export async function listComments(params: {
  status?: CommentStatus;
  productId?: string;
  userId?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.ProductCommentWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.productId) where.productId = params.productId;
  if (params.userId) where.userId = params.userId;

  const skip = (params.page - 1) * params.pageSize;
  const [total, data] = await Promise.all([
    prisma.productComment.count({ where }),
    prisma.productComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.pageSize,
      include: {
        user: true,
        product: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);

  return { total, page: params.page, pageSize: params.pageSize, data };
}

export function setReviewStatus(id: string, toStatus: ReviewStatus) {
  return prisma.review.update({ where: { id }, data: { status: toStatus } });
}

export function setCommentStatus(id: string, toStatus: CommentStatus) {
  return prisma.productComment.update({ where: { id }, data: { status: toStatus } });
}

export function deleteReview(id: string) {
  return prisma.review.delete({ where: { id } });
}

export function deleteComment(id: string) {
  return prisma.productComment.delete({ where: { id } });
}

/* Optional: public helpers if you ever want standalone UGC fetchers */
export function listApprovedReviewsByProduct(productId: string) {
  return prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
}
export function listApprovedCommentsByProduct(productId: string) {
  return prisma.productComment.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
}


export async function subscribeNewsletter(email: string, source?: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalized } });
  if (existing) return { ok: true, created: false };

  await prisma.newsletterSubscriber.create({
    data: { email: normalized, source: source?.trim() || null },
  });
  return { ok: true, created: true };
}
