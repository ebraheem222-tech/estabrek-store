// src/components/ConfirmDialog.tsx
import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { cn } from "./ui/cn";

type Props = {
  open: boolean;
  title?: string;
  /** preferred */
  message?: string;
  /** backward-compat alias */
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  /** preferred */
  onClose?: () => void;
  /** backward-compat */
  onCancel?: () => void;
};

const icons = {
  danger: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

const colors = {
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function ConfirmDialog({
  open,
  title = "تأكيد",
  message,
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  variant = "danger",
  isLoading,
  onConfirm,
  onClose,
  onCancel,
}: Props) {
  const body = message ?? description ?? "";
  const closeHandler = onClose ?? onCancel ?? (() => {});
  return (
    <Modal
      open={open}
      onClose={closeHandler}
      widthClassName="max-w-md"
      closeText=""
      footer={null}
    >
      <div className="flex flex-col items-center text-center py-2">
        <div className={cn(
          "w-14 h-14 rounded-2xl border flex items-center justify-center mb-4",
          colors[variant]
        )}>
          {icons[variant]}
        </div>
        
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/60">{body}</p>
        
        <div className="flex items-center gap-3 mt-6 w-full">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
