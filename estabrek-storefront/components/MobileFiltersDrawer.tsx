"use client";

import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) return;
    // lock scroll while drawer is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
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
              "absolute right-0 top-0 h-full w-[92%] max-w-sm overflow-auto bg-white p-4 shadow-2xl " +
              "transition-transform duration-200 will-change-transform " +
              (closing ? "translate-x-full" : "translate-x-0")
            }
            style={{ background: "#FFFFFF" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold">الفلاتر</div>
              <button
                type="button"
                onClick={close}
                className="text-sm opacity-70 hover:opacity-100"
              >
                إغلاق
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
