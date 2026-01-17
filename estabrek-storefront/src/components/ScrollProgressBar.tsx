"use client";

import { useEffect, useRef } from "react";

type ScrollProgressBarProps = {
  placement?: "overlay" | "under-header";
};

export function ScrollProgressBar({ placement = "overlay" }: ScrollProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const root = document.documentElement;
    const isRtl = root.getAttribute("dir") === "rtl";
    bar.style.transformOrigin = isRtl ? "right center" : "left center";

    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      const scrollTop = root.scrollTop || document.body.scrollTop || 0;
      const scrollHeight = root.scrollHeight || document.body.scrollHeight || 0;
      const clientHeight = root.clientHeight || window.innerHeight || 0;
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
    const wrapper = wrapRef.current;
    if (!wrapper) return;

    if (placement !== "under-header") {
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
    return () => window.removeEventListener("resize", updateOffset);
  }, [placement]);

  const rootClass =
    placement === "under-header" ? "scroll-progress scroll-progress--under-header" : "scroll-progress";

  return (
    <div ref={wrapRef} className={rootClass} aria-hidden="true">
      <div ref={barRef} className="scroll-progress-bar" />
    </div>
  );
}
