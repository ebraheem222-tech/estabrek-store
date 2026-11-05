"use client";

import { useEffect, useState } from "react";
import { TreeMotion } from "./TreeMotion";
import { TreeMedia } from "./TreeMedia";

/** One runtime for all customer documents, including pages arriving after a loading boundary. */
export function TreeRuntime() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let frame = 0;
    const containsTree = (node: Node) => node instanceof Element && (node.matches("[data-page-tree-root]") || Boolean(node.querySelector("[data-page-tree-root]")));
    const observer = new MutationObserver((changes) => {
      // Watch document commits only. GSAP's text splits and media players mutate their
      // own descendants; those must never restart the runtime.
      if (!changes.some((change) => [...Array.from(change.addedNodes), ...Array.from(change.removedNodes)].some(containsTree))) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRevision((value) => value + 1));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return <><TreeMotion revision={revision} /><TreeMedia revision={revision} /></>;
}
