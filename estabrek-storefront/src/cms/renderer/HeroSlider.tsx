"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { HeroData, HeroSlide } from "../sectionTypes";
import { TypewriterText } from "@/components/effects/TypewriterText";
import { tokensToClassName, tokensToInlineStyle } from "@/cms/style/tokensToTw";

function clamp01(v: unknown, fallback = 0.35) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function safeNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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
      slideTokens: (d as any).slideTokens,
      titleTokens: (d as any).titleTokens,
      subtitleTokens: (d as any).subtitleTokens,
      primaryButtonTokens: (d as any).primaryButtonTokens,
      secondaryButtonTokens: (d as any).secondaryButtonTokens,
    },
  ];
}

const SPLIT_TEXT_EFFECTS = new Set(["wave", "bounce"]);

function splitTextWithEffect(text: string, effect?: string): { content: React.ReactNode; ariaLabel?: string } {
  if (!text || !effect || !SPLIT_TEXT_EFFECTS.has(effect)) {
    return { content: text };
  }
  const delayStep = effect === "wave" ? 0.06 : 0.04;
  const letters = Array.from(text);
  const content = letters.map((ch, idx) => (
    <span key={`${idx}-${ch}`} aria-hidden="true" style={{ animationDelay: `${idx * delayStep}s` }}>
      {ch === " " ? "\u00a0" : ch}
    </span>
  ));
  return { content, ariaLabel: text };
}

function textEffectClass(tokens?: any) {
  return tokensToClassName({ textEffect: tokens?.textEffect } as any);
}

function resolveFieldTokens<T>(fieldTokens: T | undefined | null, fallback?: T): T | undefined {
  if (fieldTokens === undefined || fieldTokens === null) return fallback;
  if (!fallback || typeof fieldTokens !== "object" || typeof fallback !== "object") return fieldTokens;
  const baseTypography = (fallback as any).typography;
  if (!baseTypography || typeof baseTypography !== "object") return fieldTokens;
  const fieldTypography = (fieldTokens as any).typography;
  return {
    ...(fieldTokens as any),
    typography: { ...baseTypography, ...(fieldTypography ?? {}) },
  } as T;
}

function stripTextEffectTokens(tokens?: any) {
  if (!tokens || typeof tokens !== "object" || !("textEffect" in tokens)) return tokens;
  return { ...tokens, textEffect: undefined };
}

function hasTypographyOverrides(tokens?: any): boolean {
  const typography = tokens?.typography;
  if (!typography || typeof typography !== "object") return false;
  return Object.values(typography).some((v) => v !== undefined && v !== null && v !== "" && v !== "default");
}

function tokensClass(tokens?: any): string {
  return cls(tokensToClassName(stripTextEffectTokens(tokens)), hasTypographyOverrides(tokens) ? "cms-section-text" : undefined);
}

function tokensStyle(tokens?: any): React.CSSProperties | undefined {
  return tokensToInlineStyle(tokens);
}

const HERO_ANIM_CLASS: Record<string, string> = {
  "fade-up": "anim-fade-up",
  "zoom-in": "anim-zoom-in",
  "slide-up": "anim-slide-up",
  "scale-in": "animate-scale-in",
};

function cls(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

function heroAnimClass(anim?: string, duration?: number, delay?: number) {
  if (!anim || anim === "none") return "";
  const dur = Number.isFinite(duration as number) ? `animation-duration-${duration}` : "";
  const del = Number.isFinite(delay as number) ? `animation-delay-${delay}` : "";
  return cls(HERO_ANIM_CLASS[anim] ?? "", dur, del);
}

function textContent(text: string, tokens?: any) {
  const value = typeof text === "string" ? text : String(text ?? "");
  const effect = tokens?.textEffect;
  const typewriter = tokens?.typewriter;
  const typewriterTexts = Array.isArray(typewriter?.texts) && typewriter.texts.length
    ? typewriter.texts
    : value
      ? [value]
      : [];
  const useTypewriter = !!(typewriter?.enabled && typewriterTexts.length);

  if (useTypewriter) {
    const allowEffect = effect && effect !== "none" && !SPLIT_TEXT_EFFECTS.has(effect) && effect !== "typewriter";
    const typewriterClass = allowEffect ? textEffectClass(tokens) : "";
    return {
      useTypewriter: true,
      ariaLabel: undefined as string | undefined,
      className: "",
      content: (
        <TypewriterText
          texts={typewriterTexts}
          typeSpeed={typewriter?.speed}
          deleteSpeed={typewriter?.deleteSpeed}
          pauseTime={typewriter?.pauseTime}
          loop={typewriter?.loop ?? true}
          textClassName={typewriterClass || undefined}
        />
      ),
    };
  }

  const split = splitTextWithEffect(value, effect);
  return { useTypewriter: false, ariaLabel: split.ariaLabel, className: textEffectClass(tokens), content: split.content };
}

export default function HeroSlider({ data, textTokens }: { data: HeroData; textTokens?: any }) {
  const slides = useMemo(() => normalizeSlides(data), [data]);
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const tokens = textTokens ?? (data as any).twTokens;

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

  const slideAnim = (data as any).slideAnim ?? "none";
  const slideDuration = safeNum((data as any).slideDuration, 600);
  const contentAnim = (data as any).contentAnim ?? "fade-up";
  const contentDuration = safeNum((data as any).contentDuration, 400);
  const contentDelay = safeNum((data as any).contentDelay, 0);
  const slideAnimClass = heroAnimClass(slideAnim, slideDuration, 0);
  const contentAnimClass = heroAnimClass(contentAnim, contentDuration, contentDelay);
  const slideKey = `${index}-${slideAnim}-${slideDuration}`;
  const contentKey = `${index}-${contentAnim}-${contentDuration}-${contentDelay}`;

  const slideTokens = resolveFieldTokens((current as any).slideTokens);
  const baseSlideTokens = slideTokens ?? tokens;
  const titleTokens = resolveFieldTokens((current as any).titleTokens, baseSlideTokens);
  const subtitleTokens = resolveFieldTokens((current as any).subtitleTokens, baseSlideTokens);
  const primaryButtonTokens = resolveFieldTokens((current as any).primaryButtonTokens, baseSlideTokens);
  const secondaryButtonTokens = resolveFieldTokens((current as any).secondaryButtonTokens, baseSlideTokens);

  const hasBg = !!current?.backgroundImageUrl;
  const titleData = textContent(String(current?.title ?? ""), titleTokens);
  const subtitleData = current?.subtitle ? textContent(String(current.subtitle), subtitleTokens) : null;
  const primaryLabelData = current?.primaryButton?.label ? textContent(String(current.primaryButton.label), primaryButtonTokens) : null;
  const secondaryLabelData = current?.secondaryButton?.label ? textContent(String(current.secondaryButton.label), secondaryButtonTokens) : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/40">
      {/* background */}
      <div
        key={slideKey}
        className={cls("relative min-h-[340px] sm:min-h-[420px]", slideAnimClass, tokensClass(slideTokens))}
        style={
          hasBg
            ? {
                backgroundImage: `url(${current.backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                ...(tokensStyle(slideTokens) ?? {}),
              }
            : tokensStyle(slideTokens)
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

        <div
          key={contentKey}
          className={cls(
            "relative mx-auto flex h-full min-h-[340px] max-w-6xl flex-col justify-center gap-5 px-6 py-14 sm:min-h-[420px] sm:px-10",
            contentAnimClass
          )}
        >
          <div className={"flex flex-col gap-4 " + justify}>
            <h2
              className={cls(
                "text-balance text-4xl font-black tracking-tight sm:text-5xl",
                tokensClass(titleTokens),
                titleData.className
              )}
              style={{ color: hasBg ? "#F7F4E9" : "#0B0B0B", ...(tokensStyle(titleTokens) ?? {}) }}
              aria-label={titleData.ariaLabel}
            >
              {titleData.content}
            </h2>
            {subtitleData ? (
              <p
                className={cls(
                  "max-w-[70ch] text-base leading-relaxed",
                  tokensClass(subtitleTokens),
                  subtitleData.className
                )}
                style={{ color: hasBg ? "rgba(247,244,233,0.85)" : "rgba(11,11,11,0.65)", ...(tokensStyle(subtitleTokens) ?? {}) }}
                aria-label={subtitleData.ariaLabel}
              >
                {subtitleData.content}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2">
              {current?.primaryButton?.label && current?.primaryButton?.href ? (
                <a
                  href={current.primaryButton.href}
                  className={cls(
                    "inline-flex items-center justify-center rounded-2xl border border-[color:var(--accent-2)]/50 bg-[color:var(--accent-2)] px-5 py-3 text-sm font-semibold text-[#0B0B0B] shadow-sm transition hover:brightness-95",
                    tokensClass(primaryButtonTokens),
                    primaryLabelData?.className
                  )}
                  style={tokensStyle(primaryButtonTokens)}
                  aria-label={primaryLabelData?.ariaLabel}
                >
                  {primaryLabelData?.content ?? current.primaryButton.label}
                </a>
              ) : null}
              {current?.secondaryButton?.label && current?.secondaryButton?.href ? (
                <a
                  href={current.secondaryButton.href}
                  className={cls(
                    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition",
                    hasBg
                      ? "border border-white/20 bg-white/10 text-[#F7F4E9] hover:bg-white/15"
                      : "border border-[#0B0B0B]/20 bg-[#0B0B0B] text-[#F7F4E9] hover:bg-[#1A1A1A]",
                    tokensClass(secondaryButtonTokens),
                    secondaryLabelData?.className
                  )}
                  style={tokensStyle(secondaryButtonTokens)}
                  aria-label={secondaryLabelData?.ariaLabel}
                >
                  {secondaryLabelData?.content ?? current.secondaryButton.label}
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
