"use client";

import { useEffect, useRef, useState } from "react";

type ScrollProgressBarProps = {
  placement?: "overlay" | "under-header" | "auto";
};

type ResolvedPlacement = "overlay" | "under-header";

export function ScrollProgressBar({ placement = "auto" }: ScrollProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<ResolvedPlacement>(
    placement === "under-header" ? "under-header" : "overlay"
  );

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const root = document.documentElement;
    const isRtl = root.getAttribute("dir") === "rtl";
    bar.style.transformOrigin = isRtl ? "right center" : "left center";

    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      const scrollRoot = document.scrollingElement ?? root;
      const scrollTop = scrollRoot.scrollTop || document.body.scrollTop || 0;
      const scrollHeight = scrollRoot.scrollHeight || document.body.scrollHeight || 0;
      const clientHeight = scrollRoot.clientHeight || window.innerHeight || 0;
      const max = Math.max(1, scrollHeight - clientHeight);
      const progress = Math.min(1, Math.max(0, scrollTop / max));
      bar.style.transform = `scaleX(${progress})`;
    };

    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (placement !== "auto") {
      setResolvedPlacement(placement === "under-header" ? "under-header" : "overlay");
      return;
    }

    const resolve = () => {
      const header = document.querySelector("header");
      if (!header) {
        setResolvedPlacement("overlay");
        return;
      }
      const position = window.getComputedStyle(header).position;
      setResolvedPlacement(position === "sticky" || position === "fixed" ? "under-header" : "overlay");
    };

    resolve();
    window.addEventListener("resize", resolve);
    return () => window.removeEventListener("resize", resolve);
  }, [placement]);

  useEffect(() => {
    const wrapper = wrapRef.current;
    if (!wrapper) return;

    if (resolvedPlacement !== "under-header") {
      wrapper.style.top = "0px";
      return;
    }

    const updateOffset = () => {
      const header = document.querySelector("header");
      const height = header ? Math.round(header.getBoundingClientRect().height) : 0;
      wrapper.style.top = `${Math.max(0, height)}px`;
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    let observer: ResizeObserver | null = null;
    const header = document.querySelector("header");
    if (header && "ResizeObserver" in window) {
      observer = new ResizeObserver(updateOffset);
      observer.observe(header);
    }

    return () => {
      window.removeEventListener("resize", updateOffset);
      observer?.disconnect();
    };
  }, [resolvedPlacement]);

  const rootClass =
    resolvedPlacement === "under-header" ? "scroll-progress scroll-progress--under-header" : "scroll-progress";

  return (
    <div ref={wrapRef} className={rootClass} aria-hidden="true">
      <div ref={barRef} className="scroll-progress-bar" />
    </div>
  );
}
