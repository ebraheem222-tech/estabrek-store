"use client";
import { useRef, type ReactNode } from "react";

/** Keep unchanged renderer props by identity across server-component view updates. */
export function StableWidgetView({ version, children }: { version: string; children: ReactNode }) {
  const current = useRef({ version, children });
  if (current.current.version !== version) current.current = { version, children };
  return current.current.children;
}
