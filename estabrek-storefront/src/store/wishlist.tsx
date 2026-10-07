"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { roseReact } from "@/lib/roseEvents";
import { useOptionalAccount } from "@/store/account";

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

type ServerItem = { id: string; title: string; slug: string; image: string | null; price: number | null; addedAt: number };

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const account = useOptionalAccount();
  const signedIn = account?.status === "signedIn";
  const api = account?.api;
  const prevStatus = useRef(account?.status);

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

  // Signed in: favourites saved on this device join her account, and the list
  // follows her to every device. Signed out: this device forgets them.
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = account?.status;
    if (!isLoaded || !api) return;
    if (account?.status === "signedIn" && was !== "signedIn") {
      const local = new Map(items.map((i) => [i.id, i]));
      api<{ items: ServerItem[] }>("/customer/me/wishlist/merge", { method: "POST", body: JSON.stringify({ productIds: items.map((i) => i.id) }) })
        .then((out) =>
          setItems(
            out.items.map((x) => ({
              id: x.id,
              title: x.title,
              slug: x.slug,
              image: x.image ?? local.get(x.id)?.image,
              imageBlurDataUrl: local.get(x.id)?.imageBlurDataUrl,
              price: x.price ?? local.get(x.id)?.price,
              addedAt: local.get(x.id)?.addedAt ?? x.addedAt,
            })),
          ),
        )
        .catch(() => {
          /* offline: keep the local list */
        });
    } else if (account?.status === "guest" && was === "signedIn") {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.status, isLoaded, api]);

  const pushServer = useCallback(
    (method: "PUT" | "DELETE", id: string) => {
      if (!signedIn || !api) return;
      api(`/customer/me/wishlist/${encodeURIComponent(id)}`, { method }).catch(() => {
        /* the next sign-in merge catches up */
      });
    },
    [signedIn, api],
  );

  const isInWishlist = useCallback((id: string) => {
    return items.some((item) => item.id === id);
  }, [items]);

  const addToWishlist = useCallback((item: Omit<WishlistItem, "addedAt">) => {
    roseReact("wishlist-add");
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: Date.now() }];
    });
    pushServer("PUT", item.id);
  }, [pushServer]);

  const removeFromWishlist = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    pushServer("DELETE", id);
  }, [pushServer]);

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
    setItems((prev) => {
      prev.forEach((i) => pushServer("DELETE", i.id));
      return [];
    });
  }, [pushServer]);

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
