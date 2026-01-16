"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

// Icons
const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface RecentlyViewedSectionProps {
  title?: string;
  maxItems?: number;
  showClear?: boolean;
  excludeId?: string;
}

export function RecentlyViewedSection({
  title = "شاهدته مؤخراً",
  maxItems,
  showClear = true,
  excludeId,
}: RecentlyViewedSectionProps) {
  const settings = useStorefrontSettings();
  const { items, clearRecentlyViewed } = useRecentlyViewed();
  const resolvedMaxItems =
    typeof maxItems === "number" ? maxItems : settings.productRecentlyViewedCount;

  if (!settings.productRecentlyViewed) return null;

  // Filter out excluded item and limit
  const displayItems = items
    .filter((item) => item.id !== excludeId)
    .slice(0, resolvedMaxItems);

  if (displayItems.length === 0) return null;

  return (
    <section className="recently-viewed-section" dir="rtl">
      <div className="recently-viewed-header">
        <h3 className="recently-viewed-title">
          <ClockIcon />
          {title}
        </h3>
        {showClear && (
          <button
            className="recently-viewed-clear"
            onClick={clearRecentlyViewed}
          >
            مسح الكل
          </button>
        )}
      </div>

      <div className="recently-viewed-scroll">
        <div className="recently-viewed-grid">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={`/p/${item.slug}`}
              className="recently-viewed-item"
            >
              <div className="recently-viewed-image">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                ) : (
                  <div className="recently-viewed-placeholder" />
                )}
              </div>
              <div className="recently-viewed-info">
                <p className="recently-viewed-name">{item.title}</p>
                {item.price && (
                  <span className="recently-viewed-price">
                    {item.price.toFixed(2)} ₪
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Compact version for sidebar
export function RecentlyViewedCompact({
  maxItems,
  excludeId,
}: {
  maxItems?: number;
  excludeId?: string;
}) {
  const settings = useStorefrontSettings();
  const { items } = useRecentlyViewed();
  const resolvedMaxItems =
    typeof maxItems === "number" ? maxItems : Math.min(4, settings.productRecentlyViewedCount);

  if (!settings.productRecentlyViewed) return null;

  const displayItems = items
    .filter((item) => item.id !== excludeId)
    .slice(0, resolvedMaxItems);

  if (displayItems.length === 0) return null;

  return (
    <div className="recently-viewed-compact" dir="rtl">
      <h4 className="recently-viewed-compact-title">
        <ClockIcon />
        شاهدته مؤخراً
      </h4>
      <div className="recently-viewed-compact-list">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={`/p/${item.slug}`}
            className="recently-viewed-compact-item"
          >
            <div className="recently-viewed-compact-image">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="recently-viewed-placeholder" />
              )}
            </div>
            <div className="recently-viewed-compact-info">
              <p className="recently-viewed-compact-name">{item.title}</p>
              {item.price && (
                <span className="recently-viewed-compact-price">
                  {item.price.toFixed(2)} ₪
                </span>
              )}
            </div>
            <ChevronLeftIcon />
          </Link>
        ))}
      </div>
    </div>
  );
}

