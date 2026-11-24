"use client";
// The library's styles (lib.css, scoped to .lx-scope) in one module of their own, loaded the way an item is
// (LibBlock's next/dynamic): a page showing library items gets them once, however many it shows; a page showing
// none never does.
import "./lib.css";

export default function LibStyles() {
  return null;
}
