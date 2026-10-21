// "Are you sure?" inside the page instead of the browser's confirm(), which some
// phone and in-app browsers block or answer "no" to without showing anything.
import React, { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type Ask = { title: string; message: string; confirmText?: string; cancelText?: string; variant?: "danger" | "warning" | "info" };

export function useConfirm() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const answer = useRef<((yes: boolean) => void) | null>(null);
  const confirm = useCallback(
    (o: Ask) =>
      new Promise<boolean>((resolve) => {
        answer.current?.(false);
        answer.current = resolve;
        setAsk(o);
      }),
    [],
  );
  const close = (yes: boolean) => {
    answer.current?.(yes);
    answer.current = null;
    setAsk(null);
  };
  const dialog = (
    <ConfirmDialog
      open={Boolean(ask)}
      title={ask?.title}
      message={ask?.message}
      confirmText={ask?.confirmText ?? "حذف"}
      cancelText={ask?.cancelText ?? "إلغاء"}
      variant={ask?.variant ?? "danger"}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    />
  );
  return [confirm, dialog] as const;
}
