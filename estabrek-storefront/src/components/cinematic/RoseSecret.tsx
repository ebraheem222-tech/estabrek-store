"use client";
import { useEffect, useRef, useState } from "react";
import { burst } from "@/pageTree/triggerEffects";
import { tr } from "@/lib/words";
import { useLanguage } from "./Language";

/*
 * The store's secret (rose-wonders.css, "the secret"): holding the logo down for a moment (a ring fills round
 * it) opens a small card: "you found our secret", with the owner's hidden coupon to copy (Admin → الإعدادات →
 * سرّ المتجر), or just a sweet word when there is no code. Confetti, once. A plain tap still opens the home.
 */
const HOLD_MS = 1100;

export function RoseSecret({ code, text, enabled = true }: { code?: string | null; text?: string | null; enabled?: boolean }) {
  const { language: lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    let holding: HTMLElement | null = null;
    let found = false;
    const brand = () => document.querySelector<HTMLElement>(".atelier-header .atelier-brand");
    const stop = () => {
      window.clearTimeout(timer);
      holding?.removeAttribute("data-secret-hold");
      holding = null;
    };
    const down = (e: PointerEvent) => {
      const b = brand();
      if (!b || !(e.target instanceof Node) || !b.contains(e.target) || e.button > 0) return;
      found = false;
      holding = b;
      b.setAttribute("data-secret-hold", "true");
      timer = window.setTimeout(() => {
        found = true;
        stop();
        const r = b.getBoundingClientRect();
        burst("confetti", { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 90);
        setCopied(false);
        setOpen(true);
        try { localStorage.setItem("estabrek_secret_found", "1"); } catch { /* private mode */ }
      }, HOLD_MS);
    };
    // A long press opens the secret, not the home.
    const click = (e: MouseEvent) => {
      if (!found) return;
      const b = brand();
      if (b && e.target instanceof Node && b.contains(e.target)) { e.preventDefault(); e.stopPropagation(); found = false; }
    };
    // Only leaving the logo itself ends the hold (not sliding between its picture and its name).
    const leave = (e: PointerEvent) => { if (holding && e.target === holding) stop(); };
    const menu = (e: Event) => { const b = brand(); if (b && e.target instanceof Node && b.contains(e.target)) e.preventDefault(); };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", stop, true);
    document.addEventListener("pointercancel", stop, true);
    document.addEventListener("pointerleave", leave, true);
    document.addEventListener("click", click, true);
    document.addEventListener("contextmenu", menu, true);
    return () => {
      stop();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", stop, true);
      document.removeEventListener("pointercancel", stop, true);
      document.removeEventListener("pointerleave", leave, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("contextmenu", menu, true);
    };
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", key);
    window.setTimeout(() => card.current?.focus(), 30);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  if (!enabled || !open) return null;
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); } catch { /* the code is on screen to copy by hand */ }
    setCopied(true);
  };
  return (
    <div className="rose-secret" role="dialog" aria-modal="true" aria-label={tr(lang, "سرّ المتجر", "The store's secret")}>
      <button type="button" className="rose-secret-scrim" aria-label={tr(lang, "إغلاق", "Close")} onClick={() => setOpen(false)} />
      <div ref={card} className="rose-secret-card" tabIndex={-1}>
        <span className="rose-secret-key" aria-hidden="true">
          <svg viewBox="0 0 48 48"><circle cx="17" cy="24" r="9" /><path d="M26 24h16M36 24v7M41 24v5" /></svg>
        </span>
        <h2>{tr(lang, "لقيتي سرّنا الصغير!", "You found our little secret!")}</h2>
        <p>{text || (code ? tr(lang, "هدية إلك لأنك فضولية: استعمليه بالحقيبة.", "A gift for being curious: use it in your bag.") : tr(lang, "مش كل الناس بيعرفوا هالمكان. خليه بيننا 🤫", "Not everyone knows this spot. Keep it between us 🤫"))}</p>
        {code ? (
          <button type="button" className="rose-secret-code" onClick={() => void copy()} aria-label={tr(lang, "انسخي الكود", "Copy the code")}>
            <strong dir="ltr">{code}</strong>
            <span>{copied ? tr(lang, "انتسخ ✓", "Copied ✓") : tr(lang, "انسخي", "Copy")}</span>
          </button>
        ) : null}
        <button type="button" className="rose-secret-close" onClick={() => setOpen(false)}>{tr(lang, "تمام", "OK")}</button>
      </div>
    </div>
  );
}
