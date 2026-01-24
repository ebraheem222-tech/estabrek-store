"use client";

import dynamic from "next/dynamic";

const ProductModelCanvas = dynamic(() => import("./ProductModelCanvas"), { ssr: false });

export type ProductModelViewerProps = {
  modelUrl: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  className?: string;
};

export function ProductModelViewer({
  modelUrl,
  autoRotate,
  autoRotateSpeed,
  enableZoom,
  className,
}: ProductModelViewerProps) {
  if (!modelUrl) return null;

  return (
    <div className={["product-3d-view", className].filter(Boolean).join(" ")}>
      <ProductModelCanvas
        modelUrl={modelUrl}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enableZoom={enableZoom}
      />
      <div className="model-3d-hint">اسحب للتدوير</div>
    </div>
  );
}
