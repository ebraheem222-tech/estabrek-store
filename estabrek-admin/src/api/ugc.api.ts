// src/api/ugc.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type UGCStatus = "PENDING" | "APPROVED" | "REJECTED";

export type UGCListResult<T> = {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
};

export async function listReviews(params?: {
  status?: UGCStatus;
  productId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get(ENDPOINTS.admin.ugc.reviews, { params });
  return res.data as UGCListResult<any>;
}

export async function setReviewStatus(id: string, toStatus: UGCStatus) {
  const res = await api.patch(ENDPOINTS.admin.ugc.reviewStatus(id), { toStatus });
  return res.data as any;
}

export async function deleteReview(id: string) {
  const res = await api.delete(ENDPOINTS.admin.ugc.reviewById(id));
  return res.data as { ok: true };
}

export async function listComments(params?: {
  status?: UGCStatus;
  productId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get(ENDPOINTS.admin.ugc.comments, { params });
  return res.data as UGCListResult<any>;
}

export async function setCommentStatus(id: string, toStatus: UGCStatus) {
  const res = await api.patch(ENDPOINTS.admin.ugc.commentStatus(id), { toStatus });
  return res.data as any;
}

export async function deleteComment(id: string) {
  const res = await api.delete(ENDPOINTS.admin.ugc.commentById(id));
  return res.data as { ok: true };
}
