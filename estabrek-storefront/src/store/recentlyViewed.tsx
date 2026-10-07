"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRazan } from "@/store/razan";

export interface RecentlyViewedItem {
  id: string;
  title: string;
  slug: string;
  image?: string;
  imageBlurDataUrl?: string;
  price?: number;
  viewedAt: number;
  /** What she had picked on the piece (Razan's history reopens it the same way). */
  color?: string;
  size?: string;
  /** How long she stayed on it, in seconds (all visits together). */
  seconds?: number;
}

interface RecentlyViewedContextValue {
  items: RecentlyViewedItem[];
  addToRecentlyViewed: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  /** Add details to a piece already in the list (colour, size, time spent). */
  updateRecentlyViewed: (id: string, patch: Partial<Pick<RecentlyViewedItem, "color" | "size">> & { addSeconds?: number }) => void;
  clearRecentlyViewed: () => void;
  count: number;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | undefined>(undefined);

const STORAGE_KEY = "estabrek_recently_viewed";
const MAX_ITEMS = 20;

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [stored, setItems] = useState<RecentlyViewedItem[]>([]);
  // Admin → رزان → «شو كنتِ شايفة»: when it's on, pieces older than its expiry are forgotten.
  const history = useRazan().history;
  const ttlMs = history.enabled ? history.ttlHours * 3600_000 : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ttlMs) return;
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, [ttlMs]);
  const items = useMemo(() => (ttlMs ? stored.filter((i) => now - i.viewedAt < ttlMs) : stored), [stored, ttlMs, now]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load recently viewed:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        if (items.length !== stored.length) setItems(items); // expired ones are dropped for good
      } catch (e) {
        console.error("Failed to save recently viewed:", e);
      }
    }
  }, [items, stored.length, isLoaded]);

  const addToRecentlyViewed = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      // Remove existing entry if present
      const old = prev.find((i) => i.id === item.id);
      const filtered = prev.filter((i) => i.id !== item.id);
      // Add to beginning with timestamp (what she picked before is kept)
      const updated = [{ color: old?.color, size: old?.size, seconds: old?.seconds, ...item, viewedAt: Date.now() }, ...filtered];
      // Limit to MAX_ITEMS
      return updated.slice(0, MAX_ITEMS);
    });
  }, []);

  const updateRecentlyViewed = useCallback<RecentlyViewedContextValue["updateRecentlyViewed"]>((id, patch) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== id
          ? i
          : {
              ...i,
              ...(patch.color !== undefined ? { color: patch.color } : {}),
              ...(patch.size !== undefined ? { size: patch.size } : {}),
              ...(patch.addSeconds ? { seconds: Math.min(24 * 3600, (i.seconds ?? 0) + Math.round(patch.addSeconds)) } : {}),
            },
      ),
    );
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <RecentlyViewedContext.Provider
      value={{
        items,
        addToRecentlyViewed,
        updateRecentlyViewed,
        clearRecentlyViewed,
        count: items.length,
      }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewed must be used within a RecentlyViewedProvider");
  }
  return context;
}
