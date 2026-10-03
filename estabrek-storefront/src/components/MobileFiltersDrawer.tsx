"use client";

import React, { useState } from "react";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";

export function MobileFiltersDrawer({
  children,
  buttonLabel = "فلترة",
}: {
  children: React.ReactNode;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  function close() {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }

  useBodyScrollLock(open);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className={
              "absolute inset-0 bg-black/50 transition-opacity duration-200 " +
              (closing ? "opacity-0" : "opacity-100")
            }
            onClick={close}
          />

          <div
            className={
              "absolute right-0 top-0 h-full w-[92%] max-w-sm overflow-auto bg-[var(--surface)] p-4 text-[var(--text)] shadow-2xl " +
              "transition-transform duration-200 will-change-transform " +
              (closing ? "translate-x-full" : "translate-x-0")
            }
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-[var(--text)]">الفلاتر</div>
              <button
                type="button"
                onClick={close}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                إغلاق
              </button>
            </div>
            <div className="text-[var(--text)]">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
