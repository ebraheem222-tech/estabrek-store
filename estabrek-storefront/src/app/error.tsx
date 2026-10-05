"use client";
// A page that failed to load shows a calm message inside the shop (header and footer stay).
import { useEffect } from "react";
import { RoseStatusPage } from "@/components/cinematic/RoseStatusPage";

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <RoseStatusPage kind="error" onRetry={reset} reference={error.digest ? `ref ${error.digest}` : undefined} />;
}
