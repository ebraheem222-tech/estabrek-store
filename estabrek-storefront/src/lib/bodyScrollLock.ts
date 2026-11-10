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
    const root = document.documentElement;
    const body = document.body.style;
    // Nothing locked or shifted: nothing to undo. (Reading and resetting the sideways scroll made the browser
    // lay the whole page out at once, right while a page was still starting.)
    if (prevOverflow === null && !body.overflow && !body.position && !body.top && !body.transform && !body.paddingRight && !root.style.overflow && !root.style.transform) return;
    document.body.style.overflow = prevOverflow ?? "";
    document.body.style.position = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.paddingRight = "";
    document.body.style.transform = "";
    root.style.overflow = "";
    root.style.transform = "";
    root.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }
  prevOverflow = null;
}
