"use client";

import { useEffect } from "react";

let lockCount = 0;
let prevOverflow: string | null = null;

function lock() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlock() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = prevOverflow ?? "";
    prevOverflow = null;
  }
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lock();
    return () => {
      unlock();
    };
  }, [locked]);
}

export function clearBodyScrollLocks() {
  lockCount = 0;
  if (typeof document !== "undefined") {
    document.body.style.overflow = prevOverflow ?? "";
  }
  prevOverflow = null;
}
