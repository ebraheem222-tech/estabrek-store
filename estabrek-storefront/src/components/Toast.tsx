"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { alertThemes, alertComponents, additionalAlertComponents, type AlertType } from "@/cms/alert-themes";

// Types
export type ToastType = "success" | "error" | "warning" | "info";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const toastThemeMap = { ...alertComponents, ...additionalAlertComponents } as Record<string, React.FC<any>>;
const toastThemeIds = new Set(alertThemes.filter((t) => t.style === "toast").map((t) => t.id));
const toastTypeMap: Record<ToastType, AlertType> = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
};

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Context
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Provider
export function ToastProvider({
  children,
  enabled = true,
  position = "bottom-left",
  themeId,
}: {
  children: React.ReactNode;
  enabled?: boolean;
  position?: ToastPosition;
  themeId?: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    if (!enabled) return;
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, [enabled]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {enabled ? (
        <ToastContainer
          toasts={toasts}
          removeToast={removeToast}
          position={position}
          themeId={themeId}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Toast Container
function ToastContainer({
  toasts,
  removeToast,
  position,
  themeId,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
  position: ToastPosition;
  themeId?: string;
}) {
  const ThemeComponent = themeId && toastThemeIds.has(themeId) ? toastThemeMap[themeId] : null;
  return (
    <div className={`toast-container toast-${position}`} dir="rtl">
      {toasts.map((toast) => (
        ThemeComponent ? (
          <ThemedToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
            position={position}
            ThemeComponent={ThemeComponent}
          />
        ) : (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        )
      ))}
    </div>
  );
}

// Toast Item
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: <CheckIcon />,
    error: <XIcon />,
    warning: <AlertIcon />,
    info: <InfoIcon />,
  };

  return (
    <div className={`toast-item toast-${toast.type} ${isExiting ? "toast-exit" : ""}`}>
      <div className={`toast-icon toast-icon-${toast.type}`}>
        {icons[toast.type]}
      </div>
      <div className="toast-content">
        <p className="toast-title">{toast.title}</p>
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>
      <button className="toast-close" onClick={handleClose}>
        <CloseIcon />
      </button>
      <div className="toast-progress">
        <div 
          className="toast-progress-bar" 
          style={{ animationDuration: `${toast.duration ?? 4000}ms` }}
        />
      </div>
    </div>
  );
}

function ThemedToastItem({
  toast,
  onClose,
  position,
  ThemeComponent,
}: {
  toast: Toast;
  onClose: () => void;
  position: ToastPosition;
  ThemeComponent: React.FC<any>;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };
  const hasMessage = typeof toast.message === "string" && toast.message.trim().length > 0;
  const message = hasMessage ? toast.message! : toast.title;
  const title = hasMessage ? toast.title : undefined;
  return (
    <ThemeComponent
      type={toastTypeMap[toast.type]}
      title={title}
      message={message}
      position={position}
      closable
      isVisible={!isExiting}
      onClose={handleClose}
      autoClose={false}
      showIcon
    />
  );
}

// Shortcut hooks
export function useToastShortcuts() {
  const { addToast } = useToast();

  return {
    success: (title: string, message?: string) => addToast({ type: "success", title, message }),
    error: (title: string, message?: string) => addToast({ type: "error", title, message }),
    warning: (title: string, message?: string) => addToast({ type: "warning", title, message }),
    info: (title: string, message?: string) => addToast({ type: "info", title, message }),
    cartAdded: (productName: string) => addToast({ 
      type: "success", 
      title: "تمت الإضافة للسلة", 
      message: productName 
    }),
    wishlistAdded: (productName: string) => addToast({ 
      type: "success", 
      title: "تمت الإضافة للمفضلة", 
      message: productName 
    }),
    wishlistRemoved: (productName: string) => addToast({ 
      type: "info", 
      title: "تمت الإزالة من المفضلة", 
      message: productName 
    }),
  };
}
