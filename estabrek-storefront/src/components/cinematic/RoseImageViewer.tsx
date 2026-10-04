"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { LqipImage } from "@/components/LqipImage";
import { cldUrl } from "@/lib/cloudinary";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

/**
 * Full-screen product photos: opens from the main image on the product page.
 * Arrows / swipe / keyboard move between photos, a click on the photo zooms
 * in where she clicked (and follows the pointer), Esc or the backdrop closes.
 */
export function RoseImageViewer({
  images,
  index,
  title,
  host,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  title: string;
  host: HTMLElement | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ar = useLanguage().language === "ar";
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const touch = useRef<number | null>(null);
  const count = images.length;
  useBodyScrollLock(true);

  const go = (step: number) => {
    if (count < 2) return;
    setZoomed(false);
    onIndex((index + step + count) % count);
  };

  const close = () => {
    const el = root.current;
    if (!el) return onClose();
    gsap.to(el, { opacity: 0, duration: 0.22, ease: "power1.in", onComplete: onClose });
  };

  useEffect(() => {
    const el = root.current;
    if (el) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: "power1.out" });
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const img = stage.current?.querySelector(".rose-viewer-image");
    if (img) gsap.fromTo(img, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out", clearProps: "transform" });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      // In RTL the "next" photo is to the left.
      if (e.key === "ArrowRight") go(ar ? -1 : 1);
      if (e.key === "ArrowLeft") go(ar ? 1 : -1);
      if (e.key === "Tab" && root.current) {
        const focusables = Array.from(root.current.querySelectorAll<HTMLElement>("button"));
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const follow = (event: MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100, y = ((event.clientY - box.top) / box.height) * 100;
    event.currentTarget.style.setProperty("--viewer-origin", `${x}% ${y}%`);
  };

  const toggleZoom = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--viewer-origin", `${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`);
    setZoomed((z) => !z);
  };

  const src = images[index];
  const view = (
    <div
      ref={root}
      className="rose-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={ar ? `صور ${title}` : `${title} photos`}
      dir={ar ? "rtl" : "ltr"}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <header className="rose-viewer-bar">
        <span className="rose-viewer-title">{title}</span>
        {count > 1 && <span className="rose-viewer-count" dir="ltr">{index + 1} / {count}</span>}
        <button ref={closeButton} type="button" className="rose-viewer-close" onClick={close} aria-label={ar ? "إغلاق" : "Close"}>
          <Icon name="close" />
        </button>
      </header>

      <div
        ref={stage}
        className={`rose-viewer-stage${zoomed ? " zoomed" : ""}`}
        onClick={toggleZoom}
        onMouseMove={follow}
        onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null || zoomed || Math.abs(end - start) < 50) return;
          const forward = end < start;
          go(forward !== ar ? 1 : -1);
        }}
        title={zoomed ? (ar ? "اضغطي للتصغير" : "Click to zoom out") : (ar ? "اضغطي للتكبير" : "Click to zoom in")}
      >
        {src && (
          <LqipImage
            key={src}
            src={cldUrl(src, { w: 1800, c: "limit" })}
            alt={`${title} — ${index + 1}`}
            fill
            priority
            sizes="100vw"
            className="object-contain rose-viewer-image"
          />
        )}
      </div>

      {count > 1 && (
        <>
          <button type="button" className="rose-viewer-nav prev" onClick={() => go(-1)} aria-label={ar ? "الصورة السابقة" : "Previous photo"}>
            <Icon name="arrow" />
          </button>
          <button type="button" className="rose-viewer-nav next" onClick={() => go(1)} aria-label={ar ? "الصورة التالية" : "Next photo"}>
            <Icon name="arrow" />
          </button>
          <div className="rose-viewer-thumbs">
            {images.map((s, i) => (
              <button key={s} type="button" aria-label={`${ar ? "صورة" : "Photo"} ${i + 1}`} aria-current={i === index} onClick={() => { setZoomed(false); onIndex(i); }}>
                <LqipImage src={cldUrl(s, { w: 120, h: 150, c: "fill", g: "auto" })} alt="" fill sizes="60px" className="object-cover" showSkeleton={false} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
  return createPortal(view, host ?? document.body);
}
