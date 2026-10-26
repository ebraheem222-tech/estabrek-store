"use client";
/**
 * An inner page's opening in the store's theme (the shop, a category, the about page): the
 * theme's drawing behind, its words and motion marks, and beside them one of its 3D models
 * turning (ModelSpot), the theme's own drawing until the model is ready or without WebGL.
 * The rose design keeps its own openings; this is for stores with a theme.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useStoreLook } from "@/store/storeLook";
import { themePalette } from "../css";
import { Backdrop, Divider, HeroArt } from "../svg/kits";
import type { ModelKind } from "../three/kinds";

const ModelSpot = dynamic(() => import("../three/ModelSpot"), { ssr: false });

export type Crumb = { label: string; href: string };

export function ThemeIntro({
  eyebrow,
  title,
  subtitle,
  cta,
  crumbs,
  model,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  crumbs?: Crumb[];
  /** The model beside the words; none = the theme's drawing. */
  model?: ModelKind | null;
  children?: ReactNode;
}) {
  const { theme, mode } = useStoreLook();
  const [ready, setReady] = useState(false);
  if (!theme) return null;
  const palette = themePalette(theme, mode).palette;
  const finish = theme.stage?.finish ?? "matte";
  return (
    <>
      <section className="th-home th-intro" data-th={theme.id} data-th-card={theme.card} data-th-svg={theme.svg} data-testid="theme-intro">
        <Backdrop kit={theme.svg} />
        <div className="th-intro-copy">
          {crumbs?.length ? (
            <nav className="th-crumbs" aria-label="breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.href}>
                  {i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                  {i < crumbs.length - 1 ? <span aria-hidden> / </span> : null}
                </span>
              ))}
            </nav>
          ) : null}
          <p className="th-eyebrow" data-th-reveal="block">
            <span className="th-rule" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="th-intro-title" data-th-reveal="headline">
            {title}
          </h1>
          {subtitle ? (
            <p className="th-hero-sub" data-th-reveal="block">
              {subtitle}
            </p>
          ) : null}
          {cta ? (
            <div className="th-hero-actions" data-th-reveal="block">
              <Link href={cta.href} className="th-button" data-th-magnetic="">
                {cta.label}
                <span className="th-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          ) : null}
          {children}
        </div>
        <div className={`th-intro-art${ready ? " is-ready" : ""}`}>
          <div className="th-intro-drawing">
            <HeroArt kit={theme.svg} />
          </div>
          {model ? <ModelSpot kind={model} palette={palette} finish={finish} onReady={() => setReady(true)} /> : null}
        </div>
      </section>
      <div className="th-home th-intro-divider" data-th={theme.id}>
        <Divider kit={theme.svg} />
      </div>
    </>
  );
}
