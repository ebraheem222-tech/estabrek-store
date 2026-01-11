// ============================================================
// ESTABREK E-COMMERCE - PROMO BANNERS
// ============================================================
// Multiple promotional banner variants
// ============================================================

import React, { useState, useEffect } from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export interface PromoBannerProps {
  variant?: "hero" | "strip" | "card" | "countdown" | "split" | "fullwidth" | "floating";
  title: string;
  titleAr?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonText?: string;
  buttonLink?: string;
  countdown?: Date;
  discount?: string;
  code?: string;
  onButtonClick?: () => void;
  onClose?: () => void;
  className?: string;
}

// ============================================================
// COUNTDOWN TIMER
// ============================================================

function CountdownTimer({ targetDate, className }: { targetDate: Date; className?: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className={cn("flex gap-3", className)}>
      {[
        { value: timeLeft.days, label: "يوم" },
        { value: timeLeft.hours, label: "ساعة" },
        { value: timeLeft.minutes, label: "دقيقة" },
        { value: timeLeft.seconds, label: "ثانية" },
      ].map((item, i) => (
        <div key={i} className="text-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[60px]">
            <span className="text-2xl font-bold">{String(item.value).padStart(2, "0")}</span>
          </div>
          <span className="text-xs mt-1 block opacity-80">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STRIP BANNER
// ============================================================

function StripBanner({
  title,
  titleAr,
  code,
  discount,
  onClose,
  backgroundColor = "#E94560",
  className,
}: PromoBannerProps) {
  return (
    <div
      className={cn("relative py-2 px-4 text-center text-white", className)}
      style={{ backgroundColor }}
    >
      <div className="container mx-auto flex items-center justify-center gap-4 text-sm">
        <span className="font-medium">{titleAr || title}</span>
        {discount && <span className="font-bold">{discount}</span>}
        {code && (
          <span className="bg-white/20 px-3 py-1 rounded-lg font-mono">{code}</span>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute left-4 top-1/2 -translate-y-1/2 hover:opacity-70"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================
// HERO BANNER
// ============================================================

function HeroBanner({
  title,
  titleAr,
  subtitle,
  description,
  image,
  buttonText,
  onButtonClick,
  countdown,
  backgroundColor = "#1A1A2E",
  textColor = "#FFFFFF",
  className,
}: PromoBannerProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl", className)}
      style={{ backgroundColor }}
    >
      <div className="grid lg:grid-cols-2 gap-8 p-8 lg:p-12">
        {/* Content */}
        <div className="flex flex-col justify-center" style={{ color: textColor }}>
          {subtitle && (
            <span className="text-sm uppercase tracking-wider opacity-80 mb-2">{subtitle}</span>
          )}
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">{titleAr || title}</h2>
          {description && (
            <p className="text-lg opacity-90 mb-6">{description}</p>
          )}
          {countdown && (
            <div className="mb-6">
              <p className="text-sm opacity-80 mb-2">ينتهي العرض خلال:</p>
              <CountdownTimer targetDate={countdown} />
            </div>
          )}
          {buttonText && (
            <button
              onClick={onButtonClick}
              className="self-start px-8 py-3 bg-white text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              {buttonText}
            </button>
          )}
        </div>

        {/* Image */}
        {image && (
          <div className="relative">
            <img
              src={image}
              alt={titleAr || title}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
    </div>
  );
}

// ============================================================
// COUNTDOWN BANNER
// ============================================================

function CountdownBanner({
  title,
  titleAr,
  subtitle,
  countdown,
  buttonText,
  onButtonClick,
  backgroundColor = "#E94560",
  className,
}: PromoBannerProps) {
  if (!countdown) return null;

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl p-8 text-white text-center", className)}
      style={{ backgroundColor }}
    >
      <div className="relative z-10">
        {subtitle && <p className="text-sm opacity-80 mb-2">{subtitle}</p>}
        <h2 className="text-3xl font-bold mb-6">{titleAr || title}</h2>
        <CountdownTimer targetDate={countdown} className="justify-center mb-6" />
        {buttonText && (
          <button
            onClick={onButtonClick}
            className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {buttonText}
          </button>
        )}
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white rounded-full" />
      </div>
    </div>
  );
}

// ============================================================
// CARD BANNER
// ============================================================

function CardBanner({
  title,
  titleAr,
  subtitle,
  image,
  discount,
  buttonText,
  onButtonClick,
  className,
}: PromoBannerProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] p-6 text-white",
      className
    )}>
      {image && (
        <img
          src={image}
          alt=""
          className="absolute left-0 bottom-0 w-32 h-32 object-contain opacity-20"
        />
      )}
      <div className="relative z-10">
        {discount && (
          <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-bold mb-3">
            {discount}
          </span>
        )}
        <h3 className="text-xl font-bold mb-2">{titleAr || title}</h3>
        {subtitle && <p className="text-sm opacity-90 mb-4">{subtitle}</p>}
        {buttonText && (
          <button
            onClick={onButtonClick}
            className="px-6 py-2 bg-white text-[var(--color-accent)] rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FLOATING BANNER
// ============================================================

function FloatingBanner({
  title,
  titleAr,
  discount,
  code,
  buttonText,
  onButtonClick,
  onClose,
  className,
}: PromoBannerProps) {
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 max-w-sm bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] p-4 animate-slide-up",
      className
    )}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 left-2 p-1 hover:bg-[var(--color-bg-alt)] rounded-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold)] rounded-xl flex items-center justify-center text-white text-2xl font-bold">
          {discount || "🎁"}
        </div>
        <div className="flex-1">
          <h4 className="font-bold">{titleAr || title}</h4>
          {code && (
            <span className="text-sm text-[var(--color-accent)] font-mono">{code}</span>
          )}
        </div>
      </div>
      {buttonText && (
        <button
          onClick={onButtonClick}
          className="w-full mt-3 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function PromoBanner(props: PromoBannerProps) {
  const { variant = "hero" } = props;

  switch (variant) {
    case "strip":
      return <StripBanner {...props} />;
    case "countdown":
      return <CountdownBanner {...props} />;
    case "card":
      return <CardBanner {...props} />;
    case "floating":
      return <FloatingBanner {...props} />;
    default:
      return <HeroBanner {...props} />;
  }
}

export default PromoBanner;
