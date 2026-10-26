// ============================================================
// ESTABREK - COUNTER ANIMATION
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { cn } from "../ui/cn";

export interface CounterAnimationProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  separator?: string;
  easing?: "linear" | "easeOut" | "easeIn" | "easeInOut";
  startOnView?: boolean;
  viewThreshold?: number;
  once?: boolean;
  className?: string;
  onComplete?: () => void;
}

const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export function CounterAnimation({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  prefix = "",
  suffix = "",
  decimals = 0,
  separator = ",",
  easing = "easeOut",
  startOnView = true,
  viewThreshold = 0.5,
  once = true,
  className,
  onComplete,
}: CounterAnimationProps) {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const [hasCompleted, setHasCompleted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView || hasStarted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          if (once) observer.disconnect();
        }
      },
      { threshold: viewThreshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView, hasStarted, once, viewThreshold]);

  useEffect(() => {
    if (!hasStarted || (once && hasCompleted)) return;
    const startTime = performance.now() + delay;
    const easeFn = easingFunctions[easing];
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < 0) { requestAnimationFrame(animate); return; }
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeFn(progress);
      setCount(start + (end - start) * easedProgress);
      if (progress < 1) requestAnimationFrame(animate);
      else { setHasCompleted(true); onComplete?.(); }
    };
    requestAnimationFrame(animate);
  }, [hasStarted, start, end, duration, delay, easing, once, hasCompleted, onComplete]);

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals);
    const [intPart, decPart] = fixed.split(".");
    const withSeparator = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart ? `${withSeparator}.${decPart}` : withSeparator;
  };

  return <span ref={ref} className={className}>{prefix}{formatNumber(count)}{suffix}</span>;
}

export interface StatItem {
  value: number;
  label: string;
  labelAr?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function StatsCounter({
  stats,
  columns = 4,
  duration = 2000,
  stagger = 200,
  className,
  itemClassName,
}: {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  duration?: number;
  stagger?: number;
  className?: string;
  itemClassName?: string;
}) {
  const columnClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-6", columnClasses[columns], className)}>
      {stats.map((stat, index) => (
        <div key={index} className={cn("text-center p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]", itemClassName)}>
          <div className="text-3xl md:text-4xl font-bold text-[var(--color-accent)] mb-2">
            <CounterAnimation end={stat.value} duration={duration} delay={index * stagger} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">{stat.labelAr || stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function CircularProgress({
  value, max = 100, size = 120, strokeWidth = 8, duration = 1500,
  showValue = true, suffix = "%", className,
  trackColor = "var(--color-border)", progressColor = "var(--color-accent)",
}: {
  value: number; max?: number; size?: number; strokeWidth?: number; duration?: number;
  showValue?: boolean; suffix?: string; className?: string; trackColor?: string; progressColor?: string;
}) {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / max) * circumference;

  useEffect(() => {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setProgress(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={progressColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      {showValue && <div className="absolute text-2xl font-bold">{Math.round(progress)}{suffix}</div>}
    </div>
  );
}

export default CounterAnimation;
