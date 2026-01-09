"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ProductTile } from "@/components/ProductTile";
import type { CatalogProduct } from "@/lib/catalog";
import {
  clearImageSearchPayload,
  loadImageSearchPayload,
  saveImageSearchPayload,
  searchProductsByImage,
  type ImageSearchPayload,
} from "@/lib/imageSearchClient";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Only PNG, JPG, or WebP images are allowed.";
  if (file.size > MAX_BYTES) return "Max file size is 8MB.";
  return null;
}

export function ImageSearchPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImageSearchPayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      setError(e?.message || "Image search failed.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void runSearch(file);
  }

  const products = (results?.products ?? []) as CatalogProduct[];

  return (
    <section id="image-search" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-[var(--text)]">Search by image</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            Upload a product photo to find similar items.
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
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text)] hover:brightness-95"
            disabled={loading}
          >
            {loading ? "Searching..." : "Choose image"}
          </button>
          {results ? (
            <button
              type="button"
              onClick={() => {
                setResults(null);
                clearImageSearchPayload();
              }}
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {previewUrl ? (
        <div className="mt-4 flex items-center gap-4">
          <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-[var(--border)]" />
          <div className="text-sm text-[var(--muted)]">
            {results?.caption ? `Detected: ${results.caption}` : "Analyzing image..."}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 text-sm text-red-500">{error}</div>
      ) : null}

      {results ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--muted)]">
              {products.length} results{results.totalCandidates ? ` (from ${results.totalCandidates} images)` : ""}
            </div>
            {results.tags?.length ? (
              <div className="text-xs text-[var(--muted)]">
                Tags: {results.tags.slice(0, 6).join(", ")}
              </div>
            ) : null}
          </div>

          {products.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductTile key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-[var(--muted)]">No matches yet. Try another image.</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
