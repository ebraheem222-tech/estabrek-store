"use client";

import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────
   Scroll-based reveal (no GSAP dependency, 
   pure IntersectionObserver for SSR safety)
   ────────────────────────────────────────── */

export function GsapReveal({
  children,
  className = "",
  delay = 0,
  type = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  type?: "up" | "left" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const cls = type === "left" ? "reveal-left" : type === "scale" ? "reveal-scale" : "reveal-up";

  return (
    <div ref={ref} className={`${cls} ${className}`}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────
   Stagger container — reveals children with
   incremental delays
   ────────────────────────────────────────── */

export function GsapStagger({
  children,
  className = "",
  baseDelay = 0,
  stagger = 80,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  baseDelay?: number;
  stagger?: number;
  as?: keyof JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = Array.from(container.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          items.forEach((item, i) => {
            setTimeout(() => item.classList.add("is-visible"), baseDelay + i * stagger);
          });
          observer.unobserve(container);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -30px 0px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [baseDelay, stagger]);

  return (
    // @ts-ignore
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/* ──────────────────────────────────────────
   GSAP-powered hero title typewriter
   ────────────────────────────────────────── */

export function GsapHeroEntrance({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = Array.from(el.querySelectorAll("[data-gsap-hero]")) as HTMLElement[];

    items.forEach((item, i) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(30px)";
      item.style.transition = "none";
      setTimeout(() => {
        item.style.transition = `opacity 0.8s cubic-bezier(0,0,0.2,1), transform 0.8s cubic-bezier(0.34,1.56,0.64,1)`;
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      }, 100 + i * 120);
    });
  }, []);

  return <div ref={ref} className={className} />;
}

/* ──────────────────────────────────────────
   Animated counter
   ────────────────────────────────────────── */

export function GsapCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
  className = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = `${prefix}${current.toLocaleString("ar")}${suffix}`;
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, suffix, prefix]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

/* ──────────────────────────────────────────
   Floating orbs background (client only)
   ────────────────────────────────────────── */

export function FloatingOrbs() {
  return (
    <div className="candy-orbs" aria-hidden="true">
      <div className="candy-orb candy-orb-1" />
      <div className="candy-orb candy-orb-2" />
      <div className="candy-orb candy-orb-3" />
      <div className="candy-orb candy-orb-4" />
    </div>
  );
}

/* ──────────────────────────────────────────
   Scrolling ticker tape
   ────────────────────────────────────────── */

export function CandyTicker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="candy-ticker-wrap" aria-hidden="true">
      <div className="candy-ticker">
        {doubled.map((item, i) => (
          <span key={i} className="candy-ticker-item">
            <span>✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Spotlight effect on mouse move
   ────────────────────────────────────────── */

export function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--spot-x", `${x}%`);
      el.style.setProperty("--spot-y", `${y}%`);
    };

    el.addEventListener("mousemove", handleMove);
    return () => el.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      className={`spotlight-card ${className}`}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle 200px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(124,58,237,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "opacity 0.3s",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
