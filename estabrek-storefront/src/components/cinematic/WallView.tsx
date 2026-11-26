"use client";
/**
 * «شوفها على حيطك» (shared/wallArt.ts): a piece for a wall seen at its real size. The product page's frame gets a
 * button; it opens a drawn room (a wall the shopper paints, a sofa 210 cm wide for scale) with the piece hung in it
 * at its size, in its frame, at the size chosen. From there, the shopper's own wall through the camera
 * (lib/wallAr.ts: Android's WebXR, the iPhone's AR Quick Look); a computer shows a code to open the page on a phone.
 * The room is drawn in CSS by centimetres (a container's width is 360 cm of wall), so it fits any screen.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FRAME_LOOK, ROOM, roomBox, sizeFromName, type WallArt } from "../../../../shared/wallArt";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { qrMatrix, qrPath } from "@/lib/qr";
import { tr } from "@/lib/words";
import type { Lang } from "@/lib/i18n";
import type { WallArState } from "@/lib/wallAr";
import "./wallView.css";

/** The wall's paint (the shopper picks): warm white, sand, stone, sage, charcoal. */
export const WALL_PAINTS = ["#f1ece4", "#e3d6c3", "#c8ccca", "#8f9a86", "#33373a"] as const;
const paintNames = (lang: Lang) => [tr(lang, "أبيض دافي", "Warm white"), tr(lang, "رملي", "Sand"), tr(lang, "رمادي حجري", "Stone grey"), tr(lang, "أخضر مريمية", "Sage green"), tr(lang, "فحمي", "Charcoal")];
type ArWay = "webxr" | "quicklook" | "none";

/** How this device can show the piece through its camera. */
async function arWay(): Promise<ArWay> {
  // iPhone / iPad: a link to an AR file opens Apple's viewer. (Other browsers may throw when asked.)
  try {
    if (document.createElement("a").relList?.supports?.("ar")) return "quicklook";
  } catch {
    // Not Safari.
  }
  const xr = (navigator as unknown as { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } }).xr;
  try {
    if (await xr?.isSessionSupported?.("immersive-ar")) return "webxr";
  } catch {
    // A browser that refuses to say.
  }
  return "none";
}

export function WallViewButton({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  return (
    <button type="button" className="rose-pdp-wall" onClick={onOpen} data-testid="pdp-wall">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="4" width="14" height="12" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 13l3-3 2 2 2-2 2 3M3 20h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {tr(lang, "على حيطك", "On your wall")}
    </button>
  );
}

export function WallViewDialog(o: {
  art: WallArt;
  picture: string;
  title: string;
  lang: Lang;
  /** The sizes the piece comes in (their names); the one chosen, and how to choose another. */
  sizes: string[];
  size: string;
  onSize: (key: string) => void;
  onClose: () => void;
}) {
  const { lang } = o;
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const live = useRef<{ end: () => void; ahead: () => void } | null>(null);
  const [paint, setPaint] = useState<string>(WALL_PAINTS[0]);
  const [way, setWay] = useState<ArWay | null>(null);
  const [ar, setAr] = useState<WallArState | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [code, setCode] = useState(false);
  useBodyScrollLock(true);

  // The sizes whose names say a size (50×70…): the shopper can try each on the wall.
  const sized = useMemo(() => o.sizes.filter((s) => sizeFromName(s)), [o.sizes]);
  const own = sizeFromName(o.size);
  const art: WallArt = own ? { ...o.art, ...own } : o.art;
  // In centimetres (the CSS turns them into the room's pixels).
  const box = roomBox(art, ROOM.wallCm, FRAME_LOOK[art.frame].cm);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !live.current && o.onClose();
    window.addEventListener("keydown", onKey);
    void arWay().then(setWay);
    return () => {
      window.removeEventListener("keydown", onKey);
      live.current?.end();
      opener?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const camera = async () => {
    setProblem(null);
    if (way === "none") { setCode(true); return; }
    try {
      const lib = await import("@/lib/wallAr");
      if (way === "quicklook") await lib.openQuickLook(o.picture, art);
      else if (way === "webxr" && overlay.current) live.current = await lib.startWallAr({ src: o.picture, art, overlay: overlay.current, onState: (s) => { setAr(s); if (s === "ended") live.current = null; } });
    } catch {
      setAr(null);
      live.current = null;
      setProblem(tr(lang, "ما قدرنا نفتح الكاميرا هون. الكود تحت بيفتح الصفحة على موبايل تاني.", "The camera couldn't open here. The code below opens the page on another phone."));
      setCode(true);
    }
  };

  // This page, opening the room at once, for a phone to scan.
  const link = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?wall=1` : "";
  const qr = useMemo(() => { try { return link ? qrPath(qrMatrix(link)) : null; } catch { return null; } }, [link]);
  const frame = FRAME_LOOK[art.frame];
  const vars = {
    "--wall": paint,
    "--art-w": String(box.w), "--art-h": String(box.h), "--art-left": String(box.left), "--art-bottom": String(box.bottomCm),
    "--frame": frame.color, "--frame-cm": String(frame.cm), "--sofa": String(ROOM.sofaCm), "--sofa-h": String(ROOM.sofaBackCm),
  } as CSSProperties;
  const dark = paint === WALL_PAINTS[4];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${o.title} · ${tr(lang, "على حيطك", "On your wall")}`} className="wall-view" data-testid="wall-view" onClick={(e) => e.target === e.currentTarget && !live.current && o.onClose()}>
      <div className="wall-view-card">
        <div className="wall-view-head">
          <div>
            <b>{tr(lang, "على حيطك", "On your wall")}</b>
            <span data-testid="wall-size">{art.w} × {art.h} {tr(lang, "سم", "cm")}</span>
          </div>
          <button ref={closeRef} type="button" onClick={o.onClose} className="wall-view-close" aria-label={tr(lang, "إغلاق", "Close")}>×</button>
        </div>

        <div className="wall-room" style={vars} data-dark={dark ? "" : undefined} data-testid="wall-room">
          <div className="wall-room-wall" />
          <div className="wall-room-floor" />
          <div className={`wall-art${art.frame === "none" ? " wall-art-bare" : ""}`} data-testid="wall-art">
            <img src={o.picture} alt={o.title} draggable={false} />
          </div>
          <svg className="wall-sofa" viewBox="0 0 210 85" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0" y="22" width="210" height="48" rx="10" fill="currentColor" />
            <rect x="10" y="0" width="190" height="44" rx="12" fill="currentColor" opacity=".88" />
            <rect x="0" y="30" width="22" height="42" rx="9" fill="currentColor" opacity=".95" />
            <rect x="188" y="30" width="22" height="42" rx="9" fill="currentColor" opacity=".95" />
            <rect x="14" y="70" width="6" height="15" rx="2" fill="currentColor" opacity=".7" />
            <rect x="190" y="70" width="6" height="15" rx="2" fill="currentColor" opacity=".7" />
          </svg>
          <span className="wall-scale">{tr(lang, "الكنباية ٢١٠ سم", "Sofa 210 cm")}</span>
        </div>

        <div className="wall-view-row" role="radiogroup" aria-label={tr(lang, "لون الحيط", "Wall colour")}>
          {WALL_PAINTS.map((p, i) => (
            <button key={p} type="button" role="radio" aria-checked={p === paint} aria-label={paintNames(lang)[i]} className="wall-paint" style={{ background: p }} onClick={() => setPaint(p)} />
          ))}
        </div>
        {sized.length > 1 ? (
          <div className="wall-view-row" role="radiogroup" aria-label={tr(lang, "المقاس", "Size")} data-testid="wall-sizes">
            {sized.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={s === o.size} className="wall-size" onClick={() => o.onSize(s)}>{s}</button>
            ))}
          </div>
        ) : null}

        <button type="button" className="wall-view-camera" onClick={() => void camera()} disabled={way === null} data-testid="wall-camera" data-way={way ?? undefined}>
          {tr(lang, "على حيطك بالكاميرا", "On your wall, with the camera")}
        </button>
        {problem ? <p className="wall-view-note" role="status">{problem}</p> : null}
        {code ? (
          <div className="wall-view-code" data-testid="wall-code">
            {qr ? <svg viewBox={`0 0 ${qr.size} ${qr.size}`} width="148" height="148" role="img" aria-label={tr(lang, "كود الصفحة", "The page's code")}><rect width="100%" height="100%" fill="#fff" /><path d={qr.d} fill="#111" /></svg> : null}
            <p>{tr(lang, "الكود بيفتح هالصفحة على الموبايل، ومن هناك القطعة بتطلع على حيطك بالكاميرا.", "The code opens this page on a phone; from there the piece goes on your wall through the camera.")}</p>
          </div>
        ) : null}
      </div>

      {/* Over the camera, while it is on (Android): what to do, and the buttons. */}
      <div ref={overlay} className="wall-ar-layer" data-on={ar && ar !== "ended" ? "" : undefined}>
        <p>{ar === "placed" ? tr(lang, "كبسة على مكان تاني بتنقلها.", "A tap on another spot moves it.") : ar === "found" ? tr(lang, "لقينا الحيط: كبسة بتعلّقها.", "Wall found: a tap hangs it.") : tr(lang, "الكاميرا عالحيط، مع حركة خفيفة.", "The camera on the wall, moving it a little.")}</p>
        <div>
          <button type="button" onClick={() => live.current?.ahead()}>{tr(lang, "قدّامي مباشرة", "Right in front of me")}</button>
          <button type="button" onClick={() => live.current?.end()}>{tr(lang, "تمّ", "Done")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
