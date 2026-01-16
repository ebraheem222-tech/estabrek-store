"use client";

import React from "react";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function LoadingImg({
  wrapperClassName,
  ...imgProps
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
}) {
  const settings = useStorefrontSettings();
  const src = typeof imgProps.src === "string" ? imgProps.src : undefined;
  const loading = imgProps.loading ?? (settings.lazyLoadImages ? "lazy" : "eager");
  const decoding = imgProps.decoding ?? (settings.lazyLoadImages ? "async" : "auto");

  if (!src) return null;

  return (
    <span className={cx("inline-block", wrapperClassName)}>
      <img
        {...imgProps}
        src={src}
        loading={loading}
        decoding={decoding}
      />
    </span>
  );
}
