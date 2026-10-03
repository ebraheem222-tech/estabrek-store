"use client";

import React, { useEffect, useState } from "react";

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

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
  }, [
    isStarted,
    texts,
    textIndex,
    charIndex,
    isDeleting,
    isPaused,
    typeSpeed,
    deleteSpeed,
    pauseTime,
    loop,
    onComplete,
    onTextChange,
  ]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className={textClassName}>{displayText}</span>
      {showCursor ? (
        <span className={cn("mr-0.5 font-light", cursorBlink && "animate-blink")} style={{ color: cursorColor }}>
          {cursor}
        </span>
      ) : null}
    </span>
  );
}

export default TypewriterText;
