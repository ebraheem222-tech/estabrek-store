"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { HeroData, HeroSlide } from "../sectionTypes";

function clamp01(v: unknown, fallback = 0.35) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function normalizeSlides(d: HeroData): HeroSlide[] {
  const raw = (d as any).slides;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter(Boolean) as HeroSlide[];
  }
  // Backward compat: treat root as single slide
  return [
    {
      title: (d as any).title ?? "",
      subtitle: (d as any).subtitle,
      backgroundImageUrl: (d as any).backgroundImageUrl,
      overlay: (d as any).overlay,
      align: (d as any).align,
      primaryButton: (d as any).primaryButton,
      secondaryButton: (d as any).secondaryButton,
    },
  ];
}

export default function HeroSlider({ data }: { data: HeroData }) {
  const slides = useMemo(() => normalizeSlides(data), [data]);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const autoplayMs = Number((data as any).autoplayMs);
  const shouldAutoplay = Number.isFinite(autoplayMs) && autoplayMs > 0 && count > 1;

  useEffect(() => {
    if (!shouldAutoplay) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [shouldAutoplay, autoplayMs, count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  const current = slides[index] ?? slides[0];
  const overlay = clamp01(current?.overlay ?? (data as any).overlay ?? 0.35);
  const align = (current?.align ?? (data as any).align ?? "center") as "left" | "center" | "right";
  const justify =
    align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";

  const hasBg = !!current?.backgroundImageUrl;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/40">
      {/* background */}
      <div
        className="relative min-h-[340px] sm:min-h-[420px]"
        style={
          hasBg
            ? {
                backgroundImage: `url(${current.backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {/* if background image exists, keep overlay; otherwise use a luxury gold gradient haze */}
        {hasBg ? (
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
        ) : (
          <div className="absolute inset-0 bg-[#F7F4E9]" />
        )}

        {/* decorative svg glow */}
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[-140px] h-[520px] w-[520px] rounded-full bg-[color:var(--accent-1)]/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-[-160px] h-[620px] w-[620px] rounded-full bg-[color:var(--accent-2)]/20 blur-3xl" />

        <div className="relative mx-auto flex h-full min-h-[340px] max-w-6xl flex-col justify-center gap-5 px-6 py-14 sm:min-h-[420px] sm:px-10">
          <div className={"flex flex-col gap-4 " + justify}>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl" style={{ color: hasBg ? "#F7F4E9" : "#0B0B0B" }}>
              {current?.title}
            </h2>
            {current?.subtitle ? (
              <p className="max-w-[70ch] text-base leading-relaxed" style={{ color: hasBg ? "rgba(247,244,233,0.85)" : "rgba(11,11,11,0.65)" }}>
                {current.subtitle}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2">
              {current?.primaryButton?.label && current?.primaryButton?.href ? (
                <a
                  href={current.primaryButton.href}
                  className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--accent-2)]/50 bg-[color:var(--accent-2)] px-5 py-3 text-sm font-semibold text-[#0B0B0B] shadow-sm transition hover:brightness-95"
                >
                  {current.primaryButton.label}
                </a>
              ) : null}
              {current?.secondaryButton?.label && current?.secondaryButton?.href ? (
                <a
                  href={current.secondaryButton.href}
                  className={
                    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition " +
                    (hasBg
                      ? "border border-white/20 bg-white/10 text-[#F7F4E9] hover:bg-white/15"
                      : "border border-[#0B0B0B]/20 bg-[#0B0B0B] text-[#F7F4E9] hover:bg-[#1A1A1A]")
                  }
                >
                  {current.secondaryButton.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-white/60 px-3 py-2 text-[#0B0B0B] shadow-sm backdrop-blur hover:bg-white/80"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
          >
            {"<"}
          </button>
          <button
            type="button"
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-white/60 px-3 py-2 text-[#0B0B0B] shadow-sm backdrop-blur hover:bg-white/80"
            onClick={() => setIndex((i) => (i + 1) % count)}
          >
            {">"}
          </button>

          {(data as any).showDots !== false ? (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  className={
                    "h-2.5 w-2.5 rounded-full border " +
                    (i === index
                      ? "border-[color:var(--accent-2)] bg-[color:var(--accent-2)]"
                      : "border-black/20 bg-black/10 hover:bg-black/20")
                  }
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
