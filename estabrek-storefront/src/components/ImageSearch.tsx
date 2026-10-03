"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { LoadingImg } from "@/components/LoadingImg";
import { getProductImageBlurDataUrl } from "@/lib/catalog";

const CameraIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  imageUrl?: string;
  price?: number;
  similarity?: number;
}

interface ImageSearchProps {
  onClose?: () => void;
  apiBaseUrl?: string;
}

export function ImageSearchModal({ onClose, apiBaseUrl }: ImageSearchProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("يرجى رفع صورة بصيغة JPG أو PNG أو WebP");
      return;
    }

    // Validate file size (8MB max)
    if (file.size > 8 * 1024 * 1024) {
      setError("حجم الصورة يجب أن يكون أقل من 8MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Search
    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${baseUrl}/storefront/search/image?limit=12`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "فشل البحث");
      }

      const data = await res.json();
      setResults(data.products || []);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء البحث");
    } finally {
      setIsSearching(false);
    }
  }, [baseUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearSearch = () => {
    setPreview(null);
    setResults([]);
    setError(null);
  };

  return (
    <div className="image-search-modal">
      <div className="image-search-overlay" onClick={onClose} />
      <div className="image-search-content">
        {/* Header */}
        <div className="image-search-header">
          <div className="flex items-center gap-3">
            <div className="image-search-icon">
              <CameraIcon />
            </div>
            <div>
              <h2>البحث بالصورة</h2>
              <p>ارفع صورة للعثور على منتجات مشابهة</p>
            </div>
          </div>
          {onClose && (
            <button className="image-search-close" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Upload Area */}
        {!preview && (
          <div
            className={`image-search-dropzone ${isDragging ? "dragging" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              hidden
            />
            <UploadIcon />
            <span className="dropzone-text">اسحب صورة هنا أو اضغط للرفع</span>
            <span className="dropzone-hint">PNG, JPG, WebP - حتى 8MB</span>
          </div>
        )}

        {/* Preview & Results */}
        {preview && (
          <div className="image-search-preview-section">
            <div className="image-search-preview">
              <LoadingImg src={preview} alt="Preview" className="h-full w-full object-cover" />
              <button className="preview-clear" onClick={clearSearch}>
                <CloseIcon />
              </button>
            </div>

            {isSearching && (
              <div className="image-search-loading">
                <SpinnerIcon />
                <span>جارٍ البحث عن منتجات مشابهة...</span>
              </div>
            )}

            {error && (
              <div className="image-search-error">
                <span>{error}</span>
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div className="image-search-results">
                <h3>المنتجات المشابهة ({results.length})</h3>
                <div className="results-grid">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/p/${product.slug}`}
                      className="result-card"
                      onClick={onClose}
                    >
                      {product.imageUrl && (
                        <div className="result-image">
                          <LoadingImg
                            src={product.imageUrl}
                            alt={product.title}
                            blurDataUrl={getProductImageBlurDataUrl(product, product.imageUrl ?? null) ?? undefined}
                            className="h-full w-full object-cover"
                          />
                          {product.similarity && (
                            <span className="similarity-badge">
                              {Math.round(product.similarity * 100)}% تطابق
                            </span>
                          )}
                        </div>
                      )}
                      <div className="result-info">
                        <span className="result-title">{product.title}</span>
                        {product.price && (
                          <span className="result-price">₪{product.price}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && !error && results.length === 0 && preview && (
              <div className="image-search-empty">
                <span>لم نجد منتجات مشابهة</span>
                <button onClick={clearSearch}>جرب صورة أخرى</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Trigger Button
export function ImageSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button className="image-search-trigger" onClick={onClick} title="البحث بالصورة">
      <CameraIcon />
    </button>
  );
}
