// src/components/ui/Modal.tsx
import React, { useEffect, useRef, useCallback } from "react";
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
  icon?: React.ReactNode;
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
  icon,
}: Props) {
  const close = onClose ?? onCancel;
  const modalRef = useRef<HTMLDivElement>(null);
  
  if (!close) {
    throw new Error("[Modal] Missing onClose/onCancel handler");
  }

  // Spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    modalRef.current.style.setProperty('--spotlight-x', `${x}px`);
    modalRef.current.style.setProperty('--spotlight-y', `${y}px`);
  }, []);

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
      {/* Premium Backdrop with animated radial gradient */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.12), transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139, 92, 246, 0.08), transparent 50%),
            rgba(9, 9, 11, 0.85)
          `,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={() => {
          if (!disableBackdropClose) close();
        }}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          ref={modalRef}
          onMouseMove={handleMouseMove}
          className={cn(
            "modal-spotlight relative w-full max-h-[90vh] flex flex-col rounded-2xl border border-white/[0.08] shadow-elevated overflow-hidden animate-modal-enter",
            widthClassName
          )}
          style={{ 
            background: 'linear-gradient(180deg, rgba(20, 20, 24, 1) 0%, rgba(16, 16, 20, 1) 100%)'
          }}
        >
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-500/40 to-transparent" />
          
          {/* Ambient glow top */}
          <div className="ambient-glow-top" />
          
          {/* Ambient glow bottom */}
          <div className="ambient-glow-bottom" />
          
          {/* Header */}
          <div className="relative flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-6 border-b border-white/[0.06]">
            {/* Header accent line */}
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />
            
            <div className="flex items-start gap-4">
              {icon && (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/25 flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-gradient-premium">{title}</h2>
                )}
                {description && (
                  <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{description}</p>
                )}
              </div>
            </div>
            <button
              onClick={close}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 self-end sm:self-auto group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content (scrollable when needed) */}
          <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 scrollbar-thin">
            {children}
          </div>

          {/* Footer */}
          {(footer || closeText) && (
            <div className="relative flex flex-col-reverse gap-3 px-5 py-4 border-t border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-6"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(0, 0, 0, 0.1) 100%)'
              }}
            >
              <div className="flex-1">{footer ?? null}</div>
              <Button variant="ghost" onClick={close} className="btn-shine">
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
