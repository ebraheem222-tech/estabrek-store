// ============================================================
// ESTABREK E-COMMERCE - REVIEWS & RATINGS
// ============================================================

import React, { useState } from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export interface Review {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  date: string;
  verified?: boolean;
  helpful?: number;
  images?: string[];
}

// ============================================================
// STAR RATING
// ============================================================

export function StarRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i + 1)}
          onMouseEnter={() => interactive && setHoverValue(i + 1)}
          onMouseLeave={() => setHoverValue(null)}
          className={cn(
            interactive && "cursor-pointer hover:scale-110 transition-transform"
          )}
        >
          <svg
            className={cn(
              sizeClasses[size],
              i < displayValue ? "text-yellow-400" : "text-gray-300"
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// RATING SUMMARY
// ============================================================

export function RatingSummary({
  averageRating,
  totalReviews,
  distribution,
  className,
}: {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number }[];
  className?: string;
}) {
  const maxCount = Math.max(...distribution.map((d) => d.count));

  return (
    <div className={cn("flex flex-col sm:flex-row gap-8", className)}>
      {/* Average */}
      <div className="text-center">
        <div className="text-5xl font-bold text-[var(--color-text)]">{averageRating.toFixed(1)}</div>
        <StarRating value={Math.round(averageRating)} size="lg" className="justify-center mt-2" />
        <p className="text-[var(--color-text-muted)] mt-1">{totalReviews} تقييم</p>
      </div>

      {/* Distribution */}
      <div className="flex-1 space-y-2">
        {distribution.sort((a, b) => b.stars - a.stars).map((item) => (
          <div key={item.stars} className="flex items-center gap-3">
            <span className="w-8 text-sm text-[var(--color-text-muted)]">{item.stars} ⭐</span>
            <div className="flex-1 h-2 bg-[var(--color-bg-alt)] rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%" }}
              />
            </div>
            <span className="w-10 text-sm text-[var(--color-text-muted)]">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// REVIEW CARD
// ============================================================

export function ReviewCard({
  review,
  onHelpful,
  className,
}: {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("p-6 border-b border-[var(--color-border)]", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {review.authorAvatar ? (
            <img
              src={review.authorAvatar}
              alt={review.authorName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
              {review.authorName.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{review.authorName}</span>
              {review.verified && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  مشتري موثق
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating value={review.rating} size="sm" />
              <span className="text-xs text-[var(--color-text-muted)]">{review.date}</span>
            </div>
          </div>
        </div>
      </div>

      {review.title && <h4 className="font-bold mb-2">{review.title}</h4>}
      <p className="text-[var(--color-text-muted)] mb-3">{review.content}</p>

      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-3">
          {review.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`صورة ${i + 1}`}
              className="w-20 h-20 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {onHelpful && (
        <button
          onClick={() => onHelpful(review.id)}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          مفيد {review.helpful ? `(${review.helpful})` : ""}
        </button>
      )}
    </div>
  );
}

// ============================================================
// REVIEWS LIST
// ============================================================

export function ReviewsList({
  reviews,
  averageRating,
  onHelpful,
  onWriteReview,
  className,
}: {
  reviews: Review[];
  averageRating?: number;
  onHelpful?: (reviewId: string) => void;
  onWriteReview?: () => void;
  className?: string;
}) {
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }));

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">التقييمات والمراجعات</h2>
        {onWriteReview && (
          <button
            onClick={onWriteReview}
            className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            اكتب تقييمك
          </button>
        )}
      </div>

      {reviews.length > 0 && (
        <RatingSummary
          averageRating={averageRating ?? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length}
          totalReviews={reviews.length}
          distribution={distribution}
          className="mb-8 p-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]"
        />
      )}

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        {reviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-muted)] mb-4">لا توجد تقييمات بعد</p>
            {onWriteReview && (
              <button
                onClick={onWriteReview}
                className="text-[var(--color-accent)] hover:underline"
              >
                كن أول من يكتب تقييماً
              </button>
            )}
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onHelpful={onHelpful} />
          ))
        )}
      </div>
    </div>
  );
}

export default ReviewsList;
