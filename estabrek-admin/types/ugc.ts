// src/types/ugc.ts
import type { ID, ISODateString } from "./common";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CommentStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Prisma: Review */
export type Review = {
  id: ID;
  productId: ID;
  userId?: ID | null;

  rating: number;
  title?: string | null;
  body: string;

  status: ReviewStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/** Prisma: ProductComment */
export type ProductComment = {
  id: ID;
  productId: ID;
  userId?: ID | null;

  body: string;
  status: CommentStatus;

  createdAt: ISODateString;
};

/** generic list shape used by admin UGC endpoints */
export type UGCListResult<T> = {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
};

export type SetUGCStatusBody = {
  toStatus: ReviewStatus | CommentStatus;
};
