"use client";

import React, { useEffect, useRef, useState } from "react";

const POSITION_KEY = "storefront_whatsapp_pos";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function WhatsAppFloatingButton({ phone }: { phone: string }) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition({ x: parsed.x, y: parsed.y });
          return;
        }
      } catch {
        // ignore
      }
    }

    const isRtl = document.documentElement.getAttribute("dir") === "rtl";
    const size = window.innerWidth <= 768 ? 48 : 56;
    const margin = window.innerWidth <= 768 ? 16 : 24;
    const bottomOffset = window.innerWidth <= 768 ? 80 : 96;
    const defaultX = isRtl ? margin : window.innerWidth - size - margin;
    const defaultY = Math.max(margin, window.innerHeight - size - bottomOffset);
    setPosition({ x: defaultX, y: defaultY });
  }, []);

  useEffect(() => {
    if (!position || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // ignore
    }
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (!position) return;
    pointerIdRef.current = e.pointerId;
    movedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: position.x,
      top: position.y,
    };
    (e.currentTarget as HTMLAnchorElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (!dragStartRef.current || typeof window === "undefined") return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;

    const btn = buttonRef.current;
    const width = btn?.offsetWidth ?? 56;
    const height = btn?.offsetHeight ?? 56;
    const nextX = dragStartRef.current.left + dx;
    const nextY = dragStartRef.current.top + dy;
    const clampedX = clamp(nextX, 8, window.innerWidth - width - 8);
    const clampedY = clamp(nextY, 8, window.innerHeight - height - 8);
    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    dragStartRef.current = null;
    (e.currentTarget as HTMLAnchorElement).releasePointerCapture(e.pointerId);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (movedRef.current) {
      movedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const href = `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

  return (
    <a
      ref={buttonRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-btn"
      aria-label="تواصل عبر واتساب"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px`, right: "auto", bottom: "auto", touchAction: "none", cursor: "grab" }
          : undefined
      }
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}
