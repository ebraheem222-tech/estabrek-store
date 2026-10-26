import React, { useEffect, useState } from "react";
import { Skeleton } from "./Spinner";
import { cn } from "./cn";

type AsyncImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> & {
  wrapperClassName?: string;
  skeletonClassName?: string;
  fallback?: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
};

export function AsyncImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  skeletonClassName,
  fallback,
  loading,
  onLoadingChange,
  ...rest
}: AsyncImageProps) {
  const [isLoading, setIsLoading] = useState(Boolean(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const nextLoading = Boolean(src);
    setIsLoading(nextLoading);
    setHasError(false);
    onLoadingChange?.(nextLoading);
  }, [src, onLoadingChange]);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {isLoading ? <Skeleton className={cn("absolute inset-0 h-full w-full rounded-none", skeletonClassName)} /> : null}
      {src && !hasError ? (
        <img
          {...rest}
          src={src}
          alt={alt}
          loading={loading ?? "lazy"}
          className={cn("h-full w-full object-cover transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100", className)}
          onLoad={() => {
            setIsLoading(false);
            onLoadingChange?.(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
            onLoadingChange?.(false);
          }}
        />
      ) : null}
      {(!src || hasError) && !isLoading ? (
        <div className="flex h-full w-full items-center justify-center bg-black/30 text-[10px] opacity-70">
          {fallback ?? "No image"}
        </div>
      ) : null}
    </div>
  );
}

export default AsyncImage;
