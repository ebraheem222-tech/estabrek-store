"use client";

import React, { useEffect, useState, useMemo } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: Date | string;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
  variant?: "default" | "compact" | "banner" | "flip";
  showLabels?: boolean;
  className?: string;
}

function calculateTimeLeft(targetDate: Date): TimeLeft | null {
  const difference = targetDate.getTime() - new Date().getTime();

  if (difference <= 0) {
    return null;
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function CountdownTimer({
  targetDate,
  title,
  subtitle,
  onComplete,
  variant = "default",
  showLabels = true,
  className = "",
}: CountdownTimerProps) {
  const target = useMemo(() => new Date(targetDate), [targetDate]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(target));
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);

      if (!newTimeLeft && !isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [target, onComplete, isComplete]);

  if (!timeLeft) {
    return (
      <div className={`countdown-expired ${className}`}>
        <span>انتهى العرض!</span>
      </div>
    );
  }

  const labels = {
    days: "يوم",
    hours: "ساعة",
    minutes: "دقيقة",
    seconds: "ثانية",
  };

  if (variant === "compact") {
    return (
      <div className={`countdown-compact ${className}`}>
        {title && <span className="countdown-title">{title}</span>}
        <div className="countdown-time">
          {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
          <span>{String(timeLeft.hours).padStart(2, "0")}</span>
          <span className="separator">:</span>
          <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
          <span className="separator">:</span>
          <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`countdown-banner ${className}`}>
        <div className="countdown-banner-content">
          {title && <h3>{title}</h3>}
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="countdown-banner-timer">
          <div className="timer-unit">
            <span className="value">{String(timeLeft.days).padStart(2, "0")}</span>
            <span className="label">{labels.days}</span>
          </div>
          <span className="colon">:</span>
          <div className="timer-unit">
            <span className="value">{String(timeLeft.hours).padStart(2, "0")}</span>
            <span className="label">{labels.hours}</span>
          </div>
          <span className="colon">:</span>
          <div className="timer-unit">
            <span className="value">{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span className="label">{labels.minutes}</span>
          </div>
          <span className="colon">:</span>
          <div className="timer-unit">
            <span className="value">{String(timeLeft.seconds).padStart(2, "0")}</span>
            <span className="label">{labels.seconds}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "flip") {
    return (
      <div className={`countdown-flip ${className}`}>
        {title && <h3 className="countdown-flip-title">{title}</h3>}
        <div className="countdown-flip-units">
          <FlipUnit value={timeLeft.days} label={labels.days} />
          <FlipUnit value={timeLeft.hours} label={labels.hours} />
          <FlipUnit value={timeLeft.minutes} label={labels.minutes} />
          <FlipUnit value={timeLeft.seconds} label={labels.seconds} />
        </div>
        {subtitle && <p className="countdown-flip-subtitle">{subtitle}</p>}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`countdown-default ${className}`}>
      {title && <h3 className="countdown-title">{title}</h3>}
      {subtitle && <p className="countdown-subtitle">{subtitle}</p>}
      <div className="countdown-units">
        {Object.entries(timeLeft).map(([key, value]) => (
          <div key={key} className="countdown-unit">
            <div className="countdown-value">{String(value).padStart(2, "0")}</div>
            {showLabels && (
              <div className="countdown-label">{labels[key as keyof typeof labels]}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Flip animation unit
function FlipUnit({ value, label }: { value: number; label: string }) {
  const [prevValue, setPrevValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setPrevValue(value);
        setIsFlipping(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return (
    <div className="flip-unit">
      <div className={`flip-card ${isFlipping ? "flipping" : ""}`}>
        <div className="flip-card-top">
          <span>{String(isFlipping ? prevValue : value).padStart(2, "0")}</span>
        </div>
        <div className="flip-card-bottom">
          <span>{String(value).padStart(2, "0")}</span>
        </div>
        <div className="flip-card-back">
          <span>{String(value).padStart(2, "0")}</span>
        </div>
      </div>
      <span className="flip-label">{label}</span>
    </div>
  );
}

// Sale Badge with Timer
interface SaleBadgeProps {
  endDate: Date | string;
  discount: number | string;
  className?: string;
}

export function SaleBadge({ endDate, discount, className = "" }: SaleBadgeProps) {
  const target = useMemo(() => new Date(endDate), [endDate]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(target));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;

  return (
    <div className={`sale-badge ${isUrgent ? "urgent" : ""} ${className}`}>
      <div className="sale-discount">
        <span className="percent">{discount}%</span>
        <span className="off">خصم</span>
      </div>
      <div className="sale-timer">
        <span className="ends-in">ينتهي خلال</span>
        <span className="time">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, "0")}:
          {String(timeLeft.minutes).padStart(2, "0")}:
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

// Flash Sale Banner
interface FlashSaleBannerProps {
  title: string;
  endDate: Date | string;
  backgroundImage?: string;
  ctaText?: string;
  ctaHref?: string;
  className?: string;
}

export function FlashSaleBanner({
  title,
  endDate,
  backgroundImage,
  ctaText = "تسوق الآن",
  ctaHref = "/shop",
  className = "",
}: FlashSaleBannerProps) {
  return (
    <div
      className={`flash-sale-banner ${className}`}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      <div className="flash-sale-overlay" />
      <div className="flash-sale-content">
        <div className="flash-icon">⚡</div>
        <h2>{title}</h2>
        <CountdownTimer targetDate={endDate} variant="flip" />
        <a href={ctaHref} className="flash-cta">
          {ctaText}
        </a>
      </div>
    </div>
  );
}
