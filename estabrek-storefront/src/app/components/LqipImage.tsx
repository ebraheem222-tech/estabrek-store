"use client";

import Image, { type ImageProps } from "next/image";
import { isCloudinaryUrl } from "@/lib/cloudinary";

type LqipImageProps = ImageProps & {
  blurDataUrl?: string | null;
};

export function LqipImage({ blurDataUrl, loading, placeholder, priority, ...rest }: LqipImageProps) {
  const hasBlur = typeof blurDataUrl === "string" && blurDataUrl.trim().length > 0;
  const src = typeof rest.src === "string" ? rest.src : "";
  const unoptimized = src ? isCloudinaryUrl(src) : false;
  const resolvedLoading = priority ? undefined : (loading ?? "lazy");
  return (
    <Image
      {...rest}
      priority={priority}
      loading={resolvedLoading}
      unoptimized={unoptimized || rest.unoptimized}
      placeholder={placeholder ?? (hasBlur ? "blur" : "empty")}
      blurDataURL={hasBlur ? blurDataUrl : undefined}
    />
  );
}
