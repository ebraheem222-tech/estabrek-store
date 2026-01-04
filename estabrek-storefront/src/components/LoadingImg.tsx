"use client";

import React, { useEffect, useState } from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useUiSettings } from "@/components/UiSettingsProvider";

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function LoadingImg({
  wrapperClassName,
  loaderClassName,
  onLoad,
  onError,
  ...imgProps
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
  loaderClassName?: string;
}) {
  const src = typeof imgProps.src === "string" ? imgProps.src : undefined;
  const { loading } = useUiSettings();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [src]);

  if (!src) return null;

  return (
    <span className={cx("relative inline-block", wrapperClassName)}>
      {!ready && loading?.enabled ? (
        <LoadingIndicator
          className={cx(
            "pointer-events-none absolute inset-0 grid place-items-center",
            loaderClassName
          )}
        />
      ) : null}
      <img
        {...imgProps}
        src={src}
        onLoad={(e) => {
          onLoad?.(e);
          setReady(true);
        }}
        onError={(e) => {
          onError?.(e);
          setReady(true);
        }}
      />
    </span>
  );
}
