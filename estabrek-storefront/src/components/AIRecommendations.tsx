"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface Product {
  id: string;
  title: string;
  slug: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  score?: number;
}

interface AIRecommendationsProps {
  productId?: string; // For similar products
  title?: string;
  apiBaseUrl?: string;
}

export function AIRecommendations({
  productId,
  title = "مقترحات لك",
  apiBaseUrl,
}: AIRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = productId
          ? `${baseUrl}/storefront/recommend/similar/${productId}?limit=12`
          : `${baseUrl}/storefront/recommend/for-you?limit=12`;

        const res = await fetch(endpoint);
        
        if (!res.ok) {
          // Fallback to best sellers
          const fallbackRes = await fetch(`${baseUrl}/storefront/products/best-sellers?limit=12`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            // You would need to fetch full product details here
            setProducts([]);
          }
          return;
        }

        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        setError("Failed to load recommendations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [productId, baseUrl]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (error || (!isLoading && products.length === 0)) {
    return null;
  }

  return (
    <section className="ai-recommendations">
      <div className="ai-recommendations-header">
        <div className="ai-recommendations-title">
          <span className="ai-icon">
            <SparklesIcon />
          </span>
          <h2>{title}</h2>
          <span className="ai-badge">AI</span>
        </div>
        <div className="ai-recommendations-nav">
          <button onClick={() => scroll("right")} className="nav-btn">
            <ChevronRightIcon />
          </button>
          <button onClick={() => scroll("left")} className="nav-btn">
            <ChevronLeftIcon />
          </button>
        </div>
      </div>

      <div className="ai-recommendations-scroll" ref={scrollRef}>
        {isLoading ? (
          // Skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ai-product-skeleton">
              <div className="skeleton-image" />
              <div className="skeleton-title" />
              <div className="skeleton-price" />
            </div>
          ))
        ) : (
          products.map((product) => (
            <Link
              key={product.id}
              href={`/p/${product.slug}`}
              className="ai-product-card"
            >
              {product.imageUrl && (
                <div className="ai-product-image">
                  <img src={product.imageUrl} alt={product.title} />
                  {product.score && product.score > 0.8 && (
                    <span className="match-badge">تطابق عالي</span>
                  )}
                </div>
              )}
              <div className="ai-product-info">
                <h3>{product.title}</h3>
                <div className="ai-product-price">
                  {product.originalPrice && product.originalPrice > (product.price || 0) && (
                    <span className="original-price">₪{product.originalPrice}</span>
                  )}
                  {product.price && <span className="price">₪{product.price}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

// "Complete the Look" Section
interface CompleteTheLookProps {
  productId: string;
  title?: string;
  apiBaseUrl?: string;
}

export function CompleteTheLook({
  productId,
  title = "أكمل الإطلالة",
  apiBaseUrl,
}: CompleteTheLookProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";

  useEffect(() => {
    const fetchCompleteLook = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${baseUrl}/storefront/recommend/complete-look/${productId}?limit=4`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompleteLook();
  }, [productId, baseUrl]);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="complete-the-look">
      <h2>
        <span className="sparkle">✨</span>
        {title}
      </h2>
      <div className="complete-grid">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="complete-skeleton" />
          ))
        ) : (
          products.map((product) => (
            <Link key={product.id} href={`/p/${product.slug}`} className="complete-item">
              {product.imageUrl && <img src={product.imageUrl} alt={product.title} />}
              <div className="complete-overlay">
                <span>{product.title}</span>
                {product.price && <span className="price">₪{product.price}</span>}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

// "Customers Also Bought" Section
export function CustomersAlsoBought({ productId, apiBaseUrl }: { productId: string; apiBaseUrl?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";

  useEffect(() => {
    const fetchAlsoBought = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${baseUrl}/storefront/recommend/also-bought/${productId}?limit=6`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlsoBought();
  }, [productId, baseUrl]);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="also-bought">
      <h2>زبائن اشتروا أيضاً</h2>
      <div className="also-bought-grid">
        {products.map((product) => (
          <Link key={product.id} href={`/p/${product.slug}`} className="also-bought-item">
            {product.imageUrl && <img src={product.imageUrl} alt={product.title} />}
            <span className="title">{product.title}</span>
            {product.price && <span className="price">₪{product.price}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}
