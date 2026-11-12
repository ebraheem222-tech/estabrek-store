"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { TreeMotion } from "./TreeMotion";
import { TreeMedia } from "./TreeMedia";

// Scroll scenes, triggers and held sections, each loaded only once a page has one.
const TreeScenes = dynamic(() => import("./TreeScenes").then((m) => m.TreeScenes), { ssr: false });
const TreeTriggers = dynamic(() => import("./TreeTriggers").then((m) => m.TreeTriggers), { ssr: false });
const TreeCovers = dynamic(() => import("./TreeCovers").then((m) => m.TreeCovers), { ssr: false });
const TreePaint = dynamic(() => import("./TreePage").then((m) => m.TreePaint), { ssr: false });
const TreeCursor = dynamic(() => import("./TreePage").then((m) => m.TreeCursor), { ssr: false });
// Elements' own speed settings at work (perf.ts): light on phones and weak devices, resting off screen.
const TreePerf = dynamic(() => import("./TreePerf").then((m) => m.TreePerf), { ssr: false });
const NEEDS = { scenes: "[data-pt-scroll-scene]", triggers: "[data-pt-triggers]", covers: "[data-pt-cover]", paint: "[data-pt-paint]", cursor: "[data-pt-cursor]", perf: "[data-perf-watch],[data-perf-tier=light],[data-perf-phone],[data-perf-strong]" } as const;
type Needs = Record<keyof typeof NEEDS, boolean>;
const NONE: Needs = { scenes: false, triggers: false, covers: false, paint: false, cursor: false, perf: false };
const needsOf = (): Needs => Object.fromEntries(Object.entries(NEEDS).map(([k, sel]) => [k, Boolean(document.querySelector(sel))])) as Needs;

/** One runtime for all customer documents, including pages arriving after a loading boundary. */
export function TreeRuntime() {
  const [revision, setRevision] = useState(0);
  const [needs, setNeeds] = useState<Needs>(NONE);
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
  useEffect(() => {
    const look = () => {
      const found = needsOf();
      setNeeds((was) => ((Object.keys(NEEDS) as Array<keyof Needs>).every((k) => was[k] === found[k]) ? was : found));
    };
    look();
    // The editor's preview: a scene, trigger or held section added in place.
    window.addEventListener("studio-view-updated", look);
    return () => window.removeEventListener("studio-view-updated", look);
  }, [revision]);
  return (
    <>
      <TreeMotion revision={revision} />
      <TreeMedia revision={revision} />
      {needs.scenes ? <TreeScenes revision={revision} /> : null}
      {needs.triggers ? <TreeTriggers revision={revision} /> : null}
      {needs.covers ? <TreeCovers revision={revision} /> : null}
      {needs.paint ? <TreePaint revision={revision} /> : null}
      {needs.cursor ? <TreeCursor revision={revision} /> : null}
      {needs.perf ? <TreePerf revision={revision} /> : null}
    </>
  );
}
