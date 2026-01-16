"use client";

import React, { useRef } from "react";
import { useGsapMotion } from "./useGsapMotion";

export default function MotionProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMotion(ref, enabled);

  return <div ref={ref}>{children}</div>;
}
