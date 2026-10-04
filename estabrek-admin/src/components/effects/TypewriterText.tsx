// ============================================================
// ESTABREK - TYPEWRITER TEXT EFFECT
// ============================================================
// تأثير الكتابة الذاتية المتحركة
// ============================================================

import React, { useState, useEffect } from "react";
import { cn } from "../ui/cn";

export interface TypewriterTextProps {
  texts: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
  startDelay?: number;
  loop?: boolean;
  showCursor?: boolean;
  cursor?: string;
  cursorColor?: string;
  cursorBlink?: boolean;
  className?: string;
  textClassName?: string;
  onComplete?: () => void;
  onTextChange?: (text: string, index: number) => void;
}

export function TypewriterText({
  texts,
  typeSpeed = 100,
  deleteSpeed = 50,
  pauseTime = 2000,
  startDelay = 500,
  loop = true,
  showCursor = true,
  cursor = "|",
  cursorColor,
  cursorBlink = true,
  className,
  textClassName,
  onComplete,
  onTextChange,
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!isStarted || texts.length === 0) return;

    const currentText = texts[textIndex];

    if (!isDeleting && charIndex === currentText.length) {
      setIsPaused(true);
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(pauseTimer);
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      const nextIndex = (textIndex + 1) % texts.length;
      
      if (nextIndex === 0 && !loop) {
        onComplete?.();
        return;
      }
      
      setTextIndex(nextIndex);
      onTextChange?.(texts[nextIndex], nextIndex);
      return;
    }

    if (isPaused) return;

    const speed = isDeleting ? deleteSpeed : typeSpeed;
    const timer = setTimeout(() => {
      setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
      setDisplayText(currentText.substring(0, charIndex + (isDeleting ? -1 : 1)));
    }, speed);

    return () => clearTimeout(timer);
  }, [isStarted, texts, textIndex, charIndex, isDeleting, isPaused, typeSpeed, deleteSpeed, pauseTime, loop, onComplete, onTextChange]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className={textClassName}>{displayText}</span>
      {showCursor && (
        <span
          className={cn("mr-0.5 font-light", cursorBlink && "animate-blink")}
          style={{ color: cursorColor }}
        >
          {cursor}
        </span>
      )}
    </span>
  );
}

export function TypewriterHighlight({
  prefix,
  texts,
  suffix,
  highlightClassName = "text-[var(--color-accent)]",
  ...props
}: TypewriterTextProps & { prefix?: string; suffix?: string; highlightClassName?: string }) {
  return (
    <span className={props.className}>
      {prefix && <span>{prefix} </span>}
      <TypewriterText {...props} texts={texts} textClassName={cn(props.textClassName, highlightClassName)} />
      {suffix && <span> {suffix}</span>}
    </span>
  );
}

export function TypewriterHero({
  greeting = "مرحباً، أنا",
  name,
  roles,
  description,
  className,
}: {
  greeting?: string;
  name: string;
  roles: string[];
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-lg text-[var(--color-text-muted)]">{greeting}</p>
      <h1 className="text-4xl md:text-6xl font-bold">{name}</h1>
      <div className="text-2xl md:text-3xl">
        <TypewriterText
          texts={roles}
          typeSpeed={80}
          deleteSpeed={40}
          pauseTime={2500}
          textClassName="text-[var(--color-accent)] font-bold"
          showCursor
          cursorColor="var(--color-accent)"
        />
      </div>
      {description && <p className="text-lg text-[var(--color-text-muted)] max-w-2xl">{description}</p>}
    </div>
  );
}

export default TypewriterText;
