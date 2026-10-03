"use client";

import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import { useGsapMotion } from "./useGsapMotion";

export default function MotionProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useGsapMotion(ref, enabled, pathname);

  return <div ref={ref}>{children}</div>;
}
