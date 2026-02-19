"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { isCloudinaryUrl } from "@/lib/cloudinary";

type LqipImageProps = ImageProps & {
  blurDataUrl?: string | null;
  wrapperClassName?: string;
  skeletonClassName?: string;
  showSkeleton?: boolean;
  fallback?: ReactNode;
};

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function LqipImage({
  blurDataUrl,
  loading,
  placeholder,
  priority,
  wrapperClassName,
  skeletonClassName,
  showSkeleton = true,
  fallback,
  onLoad,
  onError,
  onLoadingComplete,
  className,
  ...rest
}: LqipImageProps) {
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const sourceKey =
    typeof rest.src === "string"
      ? rest.src
      : typeof (rest.src as any)?.src === "string"
      ? (rest.src as any).src
      : "";
  const [isLoading, setIsLoading] = useState(Boolean(sourceKey));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(Boolean(sourceKey));
    setHasError(false);
  }, [sourceKey]);

  // Cached images may finish before handlers attach. Detect completed <img> proactively.
  useEffect(() => {
    if (!isLoading || !sourceKey) return;
    let raf = 0;
    let ticks = 0;

    const check = () => {
      const img = shellRef.current?.querySelector("img");
      if (img?.complete) {
        if (img.naturalWidth > 0) {
          setIsLoading(false);
          return;
        }
        if (img.naturalWidth === 0) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
      }
      ticks += 1;
      if (ticks < 24) {
        raf = window.requestAnimationFrame(check);
      }
    };

    raf = window.requestAnimationFrame(check);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isLoading, sourceKey]);

  const hasBlur = typeof blurDataUrl === "string" && blurDataUrl.trim().length > 0;
  const src = typeof rest.src === "string" ? rest.src : sourceKey;
  const unoptimized = src ? isCloudinaryUrl(src) : false;
  const resolvedLoading = priority ? undefined : (loading ?? "lazy");
  const fillMode = Boolean(rest.fill);

  return (
    <span
      ref={shellRef}
      className={cx(
        "lqip-image-shell",
        fillMode ? "block h-full w-full" : "relative inline-block align-middle",
        wrapperClassName
      )}
      style={fillMode ? { position: "absolute", inset: 0 } : undefined}
    >
      {showSkeleton && isLoading ? (
        <span className={cx("lqip-image-skeleton", skeletonClassName)} aria-hidden />
      ) : null}

      {!hasError ? (
        <Image
          {...rest}
          priority={priority}
          loading={resolvedLoading}
          unoptimized={unoptimized || rest.unoptimized}
          placeholder={placeholder ?? (hasBlur ? "blur" : "empty")}
          blurDataURL={hasBlur ? blurDataUrl : undefined}
          className={cx(className, isLoading ? "lqip-image-state-loading" : "lqip-image-state-ready")}
          onLoad={(event) => {
            setIsLoading(false);
            onLoad?.(event);
          }}
          onLoadingComplete={(img) => {
            setIsLoading(false);
            onLoadingComplete?.(img);
          }}
          onError={(event) => {
            setHasError(true);
            setIsLoading(false);
            onError?.(event);
          }}
        />
      ) : (
        <span className="lqip-image-fallback" aria-label="Image not available">
          {fallback ?? "No image"}
        </span>
      )}
    </span>
  );
}
