"use client";

import React, { useRef } from "react";
import { useGsapMotion } from "./useGsapMotion";

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMotion(ref);

  return <div ref={ref}>{children}</div>;
}
