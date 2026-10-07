"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type A11yState = {
  fontLarge: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
};

const STORAGE_KEY = "storefront_a11y";
const POSITION_KEY = "storefront_a11y_pos";

const DEFAULT_STATE: A11yState = {
  fontLarge: false,
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
};

function safeParse(value: string | null): A11yState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      fontLarge: !!(parsed as any).fontLarge,
      highContrast: !!(parsed as any).highContrast,
      reduceMotion: !!(parsed as any).reduceMotion,
      underlineLinks: !!(parsed as any).underlineLinks,
    };
  } catch {
    return null;
  }
}

function applyA11yState(state: A11yState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("a11y-font-lg", state.fontLarge);
  root.classList.toggle("a11y-contrast", state.highContrast);
  root.classList.toggle("a11y-reduce-motion", state.reduceMotion);
  root.classList.toggle("a11y-underline-links", state.underlineLinks);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function AccessibilityTools() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(DEFAULT_STATE);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const saved = safeParse(typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null);
    if (saved) {
      setState(saved);
      applyA11yState(saved);
    }
  }, []);

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
    const defaultX = 20;
    const defaultY = Math.max(20, window.innerHeight - 120);
    setPosition({ x: defaultX, y: defaultY });
  }, []);

  useEffect(() => {
    applyA11yState(state);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (!position || typeof window === "undefined") return;
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !position || typeof window === "undefined") return;
    const updatePanel = () => {
      const panel = panelRef.current;
      const panelWidth = panel?.offsetWidth ?? 320;
      const panelHeight = panel?.offsetHeight ?? 280;
      const x = clamp(position.x, 8, window.innerWidth - panelWidth - 8);
      const y = clamp(position.y - panelHeight - 12, 8, window.innerHeight - panelHeight - 8);
      setPanelPosition({ x, y });
    };
    updatePanel();
    window.addEventListener("resize", updatePanel);
    return () => window.removeEventListener("resize", updatePanel);
  }, [open, position]);

  const items = useMemo(
    () => [
      {
        key: "fontLarge",
        label: "تكبير الخط",
        desc: "زيادة حجم النصوص لقراءة أسهل",
      },
      {
        key: "highContrast",
        label: "تباين عالي",
        desc: "تعزيز التباين بين النص والخلفية",
      },
      {
        key: "underlineLinks",
        label: "تسطير الروابط",
        desc: "إظهار الروابط بخط سفلي واضح",
      },
      {
        key: "reduceMotion",
        label: "تقليل الحركة",
        desc: "إيقاف الأنيميشن للحساسية من الحركة",
      },
    ],
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined") return;
    if (!position) return;
    pointerIdRef.current = e.pointerId;
    movedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: position.x,
      top: position.y,
    };
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (!dragStartRef.current || typeof window === "undefined") return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextX = dragStartRef.current.left + dx;
    const nextY = dragStartRef.current.top + dy;
    const clampedX = clamp(nextX, 8, window.innerWidth - 56);
    const clampedY = clamp(nextY, 8, window.innerHeight - 56);
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    dragStartRef.current = null;
    (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <button
        type="button"
        className="a11y-fab"
        aria-label="أدوات إمكانية الوصول"
        aria-expanded={open}
        ref={fabRef}
        onClick={() => {
          if (movedRef.current) {
            movedRef.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px`, bottom: "auto", right: "auto" }
            : undefined
        }
      >
        <span aria-hidden>♿</span>
        <span className="sr-only">إمكانية الوصول</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="a11y-panel"
          role="dialog"
          aria-label="أدوات إمكانية الوصول"
          style={
            panelPosition
              ? { left: `${panelPosition.x}px`, top: `${panelPosition.y}px`, bottom: "auto", right: "auto" }
              : undefined
          }
        >
          <div className="a11y-panel-header">
            <div className="a11y-panel-title">أدوات إمكانية الوصول</div>
            <button type="button" className="a11y-close" onClick={() => setOpen(false)} aria-label="إغلاق">
              ✕
            </button>
          </div>
          <div className="a11y-panel-body">
            {items.map((item) => {
              const active = (state as any)[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`a11y-toggle ${active ? "active" : ""}`}
                  aria-pressed={active}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key as keyof A11yState],
                    }))
                  }
                >
                  <div className="a11y-toggle-text">
                    <div className="a11y-toggle-label">{item.label}</div>
                    <div className="a11y-toggle-desc">{item.desc}</div>
                  </div>
                  <div className={`a11y-toggle-indicator ${active ? "on" : "off"}`}>
                    <span className="a11y-toggle-dot" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
