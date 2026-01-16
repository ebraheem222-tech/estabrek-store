"use client";

import React, { useState } from "react";
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
  const [loaded, setLoaded] = useState(false);
  const src = typeof imgProps.src === "string" ? imgProps.src : undefined;
  const loading = imgProps.loading ?? (settings.lazyLoadImages ? "lazy" : "eager");
  const decoding = imgProps.decoding ?? (settings.lazyLoadImages ? "async" : "auto");
  const blurEnabled = settings.imageBlurEnabled;

  if (!src) return null;

  const { className, onLoad, ...rest } = imgProps;
  const blurClass = blurEnabled ? (loaded ? "blur-0 scale-100" : "blur-sm scale-[1.02] opacity-90") : "";
  const transitionClass = blurEnabled ? "transition-[filter,transform,opacity] duration-500" : "";

  return (
    <span className={cx("inline-block", blurEnabled ? "overflow-hidden" : undefined, wrapperClassName)}>
      <img
        {...rest}
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
