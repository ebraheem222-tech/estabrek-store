// src/components/ui/Modal.tsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** preferred */
  onClose?: () => void;
  /** backward-compat alias */
  onCancel?: () => void;
  footer?: React.ReactNode;
  closeText?: string;
  disableBackdropClose?: boolean;
  widthClassName?: string;
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  onCancel,
  footer,
  closeText = "إغلاق",
  disableBackdropClose,
  widthClassName = "max-w-lg",
}: Props) {
  const close = onClose ?? onCancel;
  if (!close) {
    throw new Error("[Modal] Missing onClose/onCancel handler");
  }

  useEffect(() => {
    if (!open) return;
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-50">
      {/* Premium Backdrop with radial gradient */}
      <div
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-md animate-fade-in"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.08), transparent 50%)'
        }}
        onClick={() => {
          if (!disableBackdropClose) close();
        }}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className={cn(
            "relative w-full max-h-[90vh] flex flex-col rounded-2xl border border-white/[0.06] shadow-elevated animate-scale-in overflow-hidden",
            widthClassName
          )}
          style={{ 
            animationDuration: "0.25s",
            background: 'linear-gradient(to bottom, rgba(16, 16, 18, 1), rgba(20, 20, 22, 1))'
          }}
        >
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
          
          {/* Ambient glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent-500/10 blur-3xl pointer-events-none" />
          
          {/* Header */}
          <div className="relative flex flex-col gap-3 px-4 pt-5 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-6">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-white/50">{description}</p>
              )}
            </div>
            <button
              onClick={close}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] hover:border hover:border-white/[0.1] transition-all duration-200 self-end sm:self-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content (scrollable when needed) */}
          <div className="relative flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6 scrollbar-thin">
            {children}
          </div>

          {/* Footer */}
          {(footer || closeText) && (
            <div className="relative flex flex-col-reverse gap-3 px-4 py-4 border-t border-white/[0.06] bg-white/[0.01] sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex-1">{footer ?? null}</div>
              <Button variant="ghost" onClick={close}>
                {closeText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
