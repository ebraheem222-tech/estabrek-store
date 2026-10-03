"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function LoadingImg({
  wrapperClassName,
  blurDataUrl,
  disableBlur,
  ...imgProps
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
  blurDataUrl?: string | null;
  disableBlur?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const src = typeof imgProps.src === "string" ? imgProps.src : undefined;
  const settings = useStorefrontSettings();
  const loading = imgProps.loading ?? "lazy";
  const decoding = imgProps.decoding ?? "async";
  const blurEnabled = settings.imageBlurEnabled && !disableBlur;

  if (!src) return null;

  const { className, onLoad, ...rest } = imgProps;
  const blurClass = blurEnabled ? (loaded ? "blur-0 scale-100" : "blur-sm scale-[1.02] opacity-90") : "";
  const transitionClass = blurEnabled ? "transition-[filter,transform,opacity] duration-500" : "";
  const showPlaceholder = blurEnabled && !loaded && typeof blurDataUrl === "string" && blurDataUrl.trim().length > 0;
  const placeholderStyle = showPlaceholder
    ? {
        backgroundImage: `url("${blurDataUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <span
      className={cx("inline-block", blurEnabled ? "overflow-hidden" : undefined, wrapperClassName)}
      style={placeholderStyle}
    >
      <img
        {...rest}
        ref={imgRef}
        src={src}
        loading={loading}
        decoding={decoding}
        className={cx(className, transitionClass, blurClass)}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
      />
    </span>
  );
}
