"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface WishlistItem {
  id: string;
  title: string;
  slug: string;
  image?: string;
  imageBlurDataUrl?: string;
  price?: number;
  addedAt: number;
}

interface WishlistContextValue {
  items: WishlistItem[];
  isInWishlist: (id: string) => boolean;
  addToWishlist: (item: Omit<WishlistItem, "addedAt">) => void;
  removeFromWishlist: (id: string) => void;
  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (id: string) => void;
  toggleWishlist: (item: Omit<WishlistItem, "addedAt">) => boolean; // returns new state
  clearWishlist: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

const STORAGE_KEY = "estabrek_wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
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
      console.error("Failed to load wishlist:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save wishlist:", e);
      }
    }
  }, [items, isLoaded]);

  const isInWishlist = useCallback((id: string) => {
    return items.some((item) => item.id === id);
  }, [items]);

  const addToWishlist = useCallback((item: Omit<WishlistItem, "addedAt">) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleWishlist = useCallback((item: Omit<WishlistItem, "addedAt">) => {
    const exists = items.some((i) => i.id === item.id);
    if (exists) {
      removeFromWishlist(item.id);
      return false;
    } else {
      addToWishlist(item);
      return true;
    }
  }, [items, addToWishlist, removeFromWishlist]);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        items,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        addItem: addToWishlist,
        removeItem: removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        count: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
