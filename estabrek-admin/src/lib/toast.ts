export type ToastType = "success" | "error" | "info";

export type ToastPayload = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  durationMs?: number;
};

const EVENT_NAME = "estabrek-toast";

function emit(type: ToastType, message: string, opts?: { description?: string; durationMs?: number }) {
  const payload: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    description: opts?.description,
    durationMs: opts?.durationMs ?? 3500,
  };
  window.dispatchEvent(new CustomEvent<ToastPayload>(EVENT_NAME, { detail: payload }));
}

export const toast = {
  success: (message: string, opts?: { description?: string; durationMs?: number }) => emit("success", message, opts),
  error: (message: string, opts?: { description?: string; durationMs?: number }) => emit("error", message, opts),
  info: (message: string, opts?: { description?: string; durationMs?: number }) => emit("info", message, opts),
};

export const __toastEventName = EVENT_NAME;
