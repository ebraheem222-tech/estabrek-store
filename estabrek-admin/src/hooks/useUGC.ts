// src/hooks/useUGC.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as UGCAPI from "../api/ugc.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { tr } from "@/lib/words";

export function useReviews(params: {
  status?: UGCAPI.UGCStatus;
  productId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["admin", "ugc", "reviews", params],
    queryFn: () => UGCAPI.listReviews(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useComments(params: {
  status?: UGCAPI.UGCStatus;
  productId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["admin", "ugc", "comments", params],
    queryFn: () => UGCAPI.listComments(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useUGCActions() {
  const qc = useQueryClient();

  const setReviewStatus = useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: UGCAPI.UGCStatus }) => UGCAPI.setReviewStatus(id, toStatus),
    onSuccess: async () => {
      toast.success(tr("تم تحديث حالة التقييم", "Review status updated"));
      await qc.invalidateQueries({ queryKey: ["admin", "ugc", "reviews"] });
    },
    onError: (e) => {
      toast.error(tr("فشل تحديث حالة التقييم", "Couldn't update the review status"), { description: getApiErrorMessage(e) });
    },
  });

  const deleteReview = useMutation({
    mutationFn: (id: string) => UGCAPI.deleteReview(id),
    onSuccess: async () => {
      toast.success(tr("تم حذف التقييم", "Review deleted"));
      await qc.invalidateQueries({ queryKey: ["admin", "ugc", "reviews"] });
    },
    onError: (e) => {
      toast.error(tr("فشل حذف التقييم", "Couldn't delete the review"), { description: getApiErrorMessage(e) });
    },
  });

  const setCommentStatus = useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: UGCAPI.UGCStatus }) => UGCAPI.setCommentStatus(id, toStatus),
    onSuccess: async () => {
      toast.success(tr("تم تحديث حالة التعليق", "Comment status updated"));
      await qc.invalidateQueries({ queryKey: ["admin", "ugc", "comments"] });
    },
    onError: (e) => {
      toast.error(tr("فشل تحديث حالة التعليق", "Couldn't update the comment status"), { description: getApiErrorMessage(e) });
    },
  });

  const deleteComment = useMutation({
    mutationFn: (id: string) => UGCAPI.deleteComment(id),
    onSuccess: async () => {
      toast.success(tr("تم حذف التعليق", "Comment deleted"));
      await qc.invalidateQueries({ queryKey: ["admin", "ugc", "comments"] });
    },
    onError: (e) => {
      toast.error(tr("فشل حذف التعليق", "Couldn't delete the comment"), { description: getApiErrorMessage(e) });
    },
  });

  return { setReviewStatus, deleteReview, setCommentStatus, deleteComment };
}
