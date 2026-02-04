"use client";

import React, { useEffect, useMemo, useState } from "react";

type A11yState = {
  fontLarge: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
};

const STORAGE_KEY = "storefront_a11y";

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

export function AccessibilityTools() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(DEFAULT_STATE);

  useEffect(() => {
    const saved = safeParse(typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null);
    if (saved) {
      setState(saved);
      applyA11yState(saved);
    }
  }, []);

  useEffect(() => {
    applyA11yState(state);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  return (
    <>
      <button
        type="button"
        className="a11y-fab"
        aria-label="أدوات إمكانية الوصول"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>♿</span>
        <span className="a11y-fab-label">إمكانية الوصول</span>
      </button>

      {open ? (
        <div className="a11y-panel" role="dialog" aria-label="أدوات إمكانية الوصول">
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
