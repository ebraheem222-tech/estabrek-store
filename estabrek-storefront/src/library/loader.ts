"use client";
/**
 * A library piece, loaded in the browser when a page shows it: its own file (public/library/js, made by
 * scripts/library/bundle.mjs, never compiled by the shop's build) and its styles (the library's shared lib.css and
 * its file's own css/<file>.css). The pieces use the shop's own React, motion and words runtime (globalThis.__lx):
 * one copy on the page, one words context.
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JSX from "react/jsx-runtime";
import * as Motion from "motion/react";
import type { ComponentType } from "react";
import * as Runtime from "./runtime";

const BASE = "/library";

function shopsOwn() {
  const g = globalThis as { __lx?: Record<string, unknown> };
  g.__lx ??= { react: React, reactDom: ReactDOM, jsx: JSX, motion: Motion, runtime: Runtime };
}

const sheets = new Map<string, Promise<void>>();
/** A stylesheet on the page once; done when it has loaded (or failed: the piece still shows). */
export function libSheet(href: string): Promise<void> {
  let p = sheets.get(href);
  if (!p) {
    p = new Promise<void>((done) => {
      const there = document.querySelector<HTMLLinkElement>(`link[data-lx-sheet="${href}"]`);
      if (there) return done();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.lxSheet = href;
      link.onload = () => done();
      link.onerror = () => done();
      document.head.appendChild(link);
    });
    sheets.set(href, p);
  }
  return p;
}

const pieces = new Map<string, Promise<ComponentType>>();
/** A piece's component and its styles, fetched once each. */
export function loadPiece(js: string, css: string, version: string): Promise<ComponentType> {
  let p = pieces.get(js);
  if (!p) {
    shopsOwn();
    const mod = import(/* webpackIgnore: true */ `${BASE}/js/${js}`) as Promise<{ default: ComponentType }>;
    p = Promise.all([mod, libSheet(`${BASE}/lib.css?v=${version}`), libSheet(`${BASE}/css/${css}.css?v=${version}`)]).then(([m]) => m.default);
    p.catch(() => pieces.delete(js));
    pieces.set(js, p);
  }
  return p;
}
