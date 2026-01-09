"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ProductTile } from "@/components/ProductTile";
import type { CatalogProduct } from "@/lib/catalog";
import {
  clearImageSearchPayload,
  loadImageSearchPayload,
  saveImageSearchPayload,
  searchProductsByImage,
  type ImageSearchPayload,
} from "@/lib/imageSearchClient";

// Icons
const ImageIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "الصور المسموحة: PNG, JPG, WebP فقط.";
  if (file.size > MAX_BYTES) return "الحد الأقصى للصورة 8 ميجابايت.";
  return null;
}

export function ImageSearchPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImageSearchPayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const cached = loadImageSearchPayload();
    if (cached) setResults(cached);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function runSearch(file: File) {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setLoading(true);
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });

    try {
      const payload = await searchProductsByImage(file);
      setResults(payload);
      saveImageSearchPayload(payload);
    } catch (e: any) {
      setError(e?.message || "فشل البحث بالصورة.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void runSearch(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        await runSearch(file);
      } else {
        setError("يرجى سحب صورة فقط");
      }
    }
  }

  const products = (results?.products ?? []) as CatalogProduct[];

  return (
    <section id="image-search" className="image-search-panel" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white">
            <ImageIcon />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)]">البحث بالصورة</h3>
            <p className="text-sm text-[var(--muted)]">ارفع صورة للعثور على منتجات مشابهة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <>
                <SpinnerIcon />
                جاري البحث...
              </>
            ) : (
                          <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                اختر صورة
              </>
            )}
          </button>
          {results && (
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setPreviewUrl(null);
                clearImageSearchPayload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[var(--text)] text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <CloseIcon />
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Drag & Drop Zone */}
      {!results && !loading && (
        <div
          className={`drag-drop-zone mt-4 ${isDragging ? "active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drag-icon text-[var(--muted)]">
            <UploadIcon />
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">اسحب وأفلت صورة هنا</p>
          <p className="text-xs text-[var(--muted)]/60 mt-1">PNG, JPG, WEBP حتى 8MB</p>
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="image-search-preview mt-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="image-search-preview-img"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--text)]">
              {loading ? "جاري تحليل الصورة..." : results?.caption ? `تم الكشف: ${results.caption}` : "تم رفع الصورة"}
            </div>
            {loading && (
              <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-6">
          {/* Results Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="search-results-count">
              <ProductsIcon />
              {products.length} نتيجة
              {results.totalCandidates ? ` (من ${results.totalCandidates} صورة)` : ""}
            </div>

            {/* Tags */}
            {results.tags?.length ? (
              <div className="image-search-tags">
                {results.tags.slice(0, 6).map((tag, idx) => (
                  <span key={idx} className="image-search-tag">
                    <TagIcon />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Products Grid */}
          {products.length ? (
            <div className="products-grid">
              {products.map((p, idx) => (
                <div key={p.id} className="stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                  <ProductTile product={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <div className="no-results-icon text-[var(--muted)]">
                <ImageIcon />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">لا توجد نتائج</h3>
              <p className="text-sm text-[var(--muted)]">جرب رفع صورة أخرى للبحث</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
