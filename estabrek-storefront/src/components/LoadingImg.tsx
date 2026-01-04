"use client";

import React from "react";

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function LoadingImg({
  wrapperClassName,
  ...imgProps
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
}) {
  const src = typeof imgProps.src === "string" ? imgProps.src : undefined;

  if (!src) return null;

  return (
    <span className={cx("inline-block", wrapperClassName)}>
      <img
        {...imgProps}
        src={src}
      />
    </span>
  );
}
