"use client";

import React from "react";
import { useUiSettings } from "@/components/UiSettingsProvider";

export function LoadingIndicator({
  className,
  fallback,
}: {
  className?: string;
  fallback?: React.ReactNode;
}) {
  const { loading } = useUiSettings();

  if (!loading?.enabled) return <>{fallback ?? null}</>;

  return (
    <div className={className}>
      <div dangerouslySetInnerHTML={{ __html: loading.html }} />
    </div>
  );
}

