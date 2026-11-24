"use client";

/**
 * The shop page's parts that run only in the visitor's browser (picture search, AI suggestions), each in a script of
 * its own. Next 15+ allows `ssr: false` only in a client file, so they're made here and the (server) shop page draws them.
 */
import dynamic from "next/dynamic";

export const ImageSearchPanel = dynamic(
  () => import("@/components/ImageSearchPanel").then((m) => m.ImageSearchPanel),
  { ssr: false, loading: () => null }
);

export const AIRecommendations = dynamic(
  () => import("@/components/AIRecommendations").then((m) => m.AIRecommendations),
  { ssr: false, loading: () => null }
);
