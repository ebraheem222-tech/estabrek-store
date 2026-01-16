"use client";

import Image, { type ImageProps } from "next/image";

type LqipImageProps = ImageProps & {
  blurDataUrl?: string | null;
};

export function LqipImage({ blurDataUrl, loading, placeholder, ...rest }: LqipImageProps) {
  const hasBlur = typeof blurDataUrl === "string" && blurDataUrl.trim().length > 0;
  return (
    <Image
      {...rest}
      loading={loading ?? "lazy"}
      placeholder={placeholder ?? (hasBlur ? "blur" : "empty")}
      blurDataURL={hasBlur ? blurDataUrl : undefined}
    />
  );
}
