"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

type RevealDirection = "up" | "down" | "left" | "right" | "fade" | "scale" | "rotate";

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  distance?: number;
}

export function RevealOnScroll({
  children,
  className = "",
  direction = "up",
  delay = 0,
  duration = 600,
  threshold = 0.1,
  once = true,
  distance = 40,
}: RevealOnScrollProps) {
  const settings = useStorefrontSettings();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  if (!settings.scrollAnimationsEnabled) {
    return <div className={className}>{children}</div>;
  }

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, once]);

  const getInitialTransform = (): string => {
    switch (direction) {
      case "up":
        return `translateY(${distance}px)`;
      case "down":
        return `translateY(-${distance}px)`;
      case "left":
        return `translateX(${distance}px)`;
      case "right":
        return `translateX(-${distance}px)`;
      case "scale":
        return "scale(0.8)";
      case "rotate":
        return "rotate(-10deg) scale(0.9)";
      case "fade":
      default:
        return "none";
    }
  };

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : getInitialTransform(),
        transition: `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Staggered reveal for lists
interface StaggeredRevealProps {
  children: React.ReactNode[];
  className?: string;
  direction?: RevealDirection;
  staggerDelay?: number;
  duration?: number;
  threshold?: number;
}

export function StaggeredReveal({
  children,
  className = "",
  direction = "up",
  staggerDelay = 100,
  duration = 600,
  threshold = 0.1,
}: StaggeredRevealProps) {
  const settings = useStorefrontSettings();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  if (!settings.scrollAnimationsEnabled) {
    return <div className={className}>{children}</div>;
  }

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return (
    <div ref={ref} className={`staggered-reveal ${className}`}>
      {React.Children.map(children, (child, index) => (
        <RevealOnScroll
          direction={direction}
          delay={isVisible ? index * staggerDelay : 0}
          duration={duration}
          once={true}
        >
          {child}
        </RevealOnScroll>
      ))}
    </div>
  );
}

// Parallax Effect
interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  speed?: number; // -1 to 1, negative = opposite direction
  direction?: "vertical" | "horizontal";
}

export function Parallax({
  children,
  className = "",
  speed = 0.5,
  direction = "vertical",
}: ParallaxProps) {
  const settings = useStorefrontSettings();
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  if (!settings.parallaxEffectsEnabled) {
    return <div className={className}>{children}</div>;
  }

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how far the element is from the center of the viewport
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const distanceFromCenter = elementCenter - viewportCenter;
      
      // Apply parallax effect
      setOffset(distanceFromCenter * speed * -0.3);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [speed]);

  const transform = direction === "vertical"
    ? `translateY(${offset}px)`
    : `translateX(${offset}px)`;

  return (
    <div
      ref={ref}
      className={`parallax ${className}`}
      style={{ transform, willChange: "transform" }}
    >
      {children}
    </div>
  );
}

// Text Reveal Animation (letter by letter)
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  letterDelay?: number;
  tag?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export function TextReveal({
  text,
  className = "",
  delay = 0,
  letterDelay = 30,
  tag: Tag = "span",
}: TextRevealProps) {
  const settings = useStorefrontSettings();
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  if (!settings.scrollAnimationsEnabled) {
    return <Tag ref={ref as any} className={className}>{text}</Tag>;
  }

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  return (
    <Tag ref={ref as any} className={`text-reveal ${className}`}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="text-reveal-char"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(100%)",
            transition: `all 0.4s ease ${delay + index * letterDelay}ms`,
            display: char === " " ? "inline" : "inline-block",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </Tag>
  );
}

// Counter Animation
interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  separator?: string;
}

export function CountUp({
  end,
  start = 0,
  duration = 2000,
  prefix = "",
  suffix = "",
  className = "",
  separator = ",",
}: CountUpProps) {
  const settings = useStorefrontSettings();
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);

  if (!settings.scrollAnimationsEnabled) {
    const formatted = end.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return (
      <span ref={ref} className={`count-up ${className}`}>
        {prefix}{formatted}{suffix}
      </span>
    );
  }

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = performance.now();
    const difference = end - start;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + difference * easeOut);
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, start, end, duration]);

  const formattedCount = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return (
    <span ref={ref} className={`count-up ${className}`}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
}

// Progress Bar on Scroll
export function ScrollProgress({ className = "" }: { className?: string }) {
  const settings = useStorefrontSettings();
  const [progress, setProgress] = useState(0);

  if (!settings.scrollAnimationsEnabled) {
    return null;
  }

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / windowHeight) * 100;
      setProgress(scrolled);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`scroll-progress ${className}`}>
      <div
        className="scroll-progress-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
