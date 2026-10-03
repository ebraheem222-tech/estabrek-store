"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ════════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════════ */
export function GsapReveal({
  children, className = "", delay = 0, type = "up", style,
}: {
  children: React.ReactNode; className?: string;
  delay?: number; type?: "up" | "left" | "scale"; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => el.classList.add("is-visible"), delay); obs.unobserve(el); }
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el); return () => obs.disconnect();
  }, [delay]);
  const cls = type === "left" ? "reveal-left" : type === "scale" ? "reveal-scale" : "reveal-up";
  return <div ref={ref} className={`${cls} ${className}`} style={style}>{children}</div>;
}

/* ════════════════════════════════════════════════
   STAGGER CONTAINER
════════════════════════════════════════════════ */
export function GsapStagger({
  children, className = "", baseDelay = 0, stagger = 80, as: Tag = "div", style,
}: {
  children: React.ReactNode; className?: string; baseDelay?: number;
  stagger?: number; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current; if (!container) return;
    const items = Array.from(container.children) as HTMLElement[];
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        items.forEach((item, i) => setTimeout(() => item.classList.add("is-visible"), baseDelay + i * stagger));
        obs.unobserve(container);
      }
    }, { threshold: 0.04, rootMargin: "0px 0px -30px 0px" });
    obs.observe(container); return () => obs.disconnect();
  }, [baseDelay, stagger]);
  // @ts-ignore
  return <Tag ref={ref} className={className} style={style}>{children}</Tag>;
}

/* ════════════════════════════════════════════════
   ANIMATED COUNTER
════════════════════════════════════════════════ */
export function GsapCounter({
  target, suffix = "", prefix = "", duration = 2000, className = "",
}: {
  target: number; suffix?: string; prefix?: string; duration?: number; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = `${prefix}${Math.round(eased * target).toLocaleString("ar")}${suffix}`;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick); obs.unobserve(el);
      }
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, [target, duration, suffix, prefix]);
  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}

/* ════════════════════════════════════════════════
   FLOATING ORBS
════════════════════════════════════════════════ */
export function FloatingOrbs() {
  return (
    <div className="candy-orbs" aria-hidden="true">
      <div className="candy-orb candy-orb-1" />
      <div className="candy-orb candy-orb-2" />
      <div className="candy-orb candy-orb-3" />
      <div className="candy-orb candy-orb-4" />
    </div>
  );
}

/* ════════════════════════════════════════════════
   TICKER TAPE
════════════════════════════════════════════════ */
export function CandyTicker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="candy-ticker-wrap" aria-hidden="true">
      <div className="candy-ticker">
        {doubled.map((item, i) => (
          <span key={i} className="candy-ticker-item"><span>✦</span>{item}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHIMMER IMAGE — fade in with skeleton
════════════════════════════════════════════════ */
export function CandyImage({
  src, alt, className = "", style,
}: {
  src: string; alt: string; className?: string; style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      {!loaded && !error && <div className="candy-img-shimmer" />}
      {!error ? (
        <img
          src={src} alt={alt} className={className}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity 0.55s cubic-bezier(0.4,0,0.2,1)" }}
        />
      ) : (
        <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem",background:"linear-gradient(135deg,#F8F5FF,#F0F7FF)",color:"#9CA3AF" }}>🛍</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   3D TILT ENGINE — spring physics, magnetic
════════════════════════════════════════════════ */
export function Card3D({
  children, className = "", style, intensity = 14, scale = 1.04,
}: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; intensity?: number; scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const cur = useRef({ rx: 0, ry: 0, sx: 50, sy: 50, sc: 1 });
  const tgt = useRef({ rx: 0, ry: 0, sx: 50, sy: 50, sc: 1 });
  const animating = useRef(false);

  useEffect(() => {
    const el = ref.current; if (!el) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const T = 0.08; // lerp factor — lower = more spring

    const tick = () => {
      const c = cur.current; const t = tgt.current;
      c.rx = lerp(c.rx, t.rx, T);
      c.ry = lerp(c.ry, t.ry, T);
      c.sc = lerp(c.sc, t.sc, T);
      c.sx = lerp(c.sx, t.sx, T);
      c.sy = lerp(c.sy, t.sy, T);

      el.style.transform = `perspective(1000px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) scale3d(${c.sc},${c.sc},${c.sc})`;
      el.style.boxShadow = c.sc > 1
        ? `0 ${28 + (c.sc - 1) * 200}px ${60 + (c.sc - 1) * 200}px rgba(124,58,237,${0.08 + (c.sc - 1) * 2}), 0 4px 20px rgba(0,0,0,0.08)`
        : "";

      const shine = el.querySelector<HTMLElement>(".c3d-shine");
      if (shine) {
        shine.style.background = `radial-gradient(circle at ${c.sx}% ${c.sy}%, rgba(255,255,255,0.22) 0%, transparent 60%)`;
        shine.style.opacity = c.sc > 1.001 ? "1" : "0";
      }

      const diff = Math.abs(c.rx-t.rx)+Math.abs(c.ry-t.ry)+Math.abs(c.sc-t.sc);
      if (diff > 0.002) raf.current = requestAnimationFrame(tick);
      else animating.current = false;
    };

    const go = () => { if (!animating.current) { animating.current = true; raf.current = requestAnimationFrame(tick); } };

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width;
      const cy = (e.clientY - r.top) / r.height;
      tgt.current.ry = (cx - 0.5) * intensity;
      tgt.current.rx = -(cy - 0.5) * intensity;
      tgt.current.sx = cx * 100;
      tgt.current.sy = cy * 100;
      go();
    };
    const onEnter = () => { tgt.current.sc = scale; go(); };
    const onLeave = () => { tgt.current = { rx:0, ry:0, sx:50, sy:50, sc:1 }; go(); };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [intensity, scale]);

  return (
    <div ref={ref} className={`c3d-wrap ${className}`} style={{ transformStyle:"preserve-3d", willChange:"transform", ...style }}>
      {children}
      <div className="c3d-shine" style={{ position:"absolute",inset:0,pointerEvents:"none",borderRadius:"inherit",transition:"opacity 0.35s",zIndex:20,opacity:0 }} />
    </div>
  );
}

/* ════════════════════════════════════════════════
   SUPER 3D PRODUCT CARD
   — Spring 3D tilt
   — Cinematic scroll-in (translate+scale+blur)
   — Crossfade hover image
   — Shimmer image loading
   — Magnetic "add to cart" button
   — Color swatches
   — Gradient price
════════════════════════════════════════════════ */
export function SuperProductCard({
  href, image, hoverImage, title, price, originalPrice,
  category, badge, isNew, colorSwatches = [], idx = 0,
}: {
  href: string; image?: string | null; hoverImage?: string | null;
  title: string; price?: string | null; originalPrice?: string | null;
  category?: string | null; badge?: string | null; isNew?: boolean;
  colorSwatches?: string[]; idx?: number;
}) {
  const entryRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [swatchHover, setSwatchHover] = useState<number | null>(null);

  // Cinematic scroll entry: starts below, blurred, rotated slightly
  useEffect(() => {
    const el = entryRef.current; if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(50px) scale(0.9)";
    el.style.filter = "blur(6px)";
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => {
          el.style.transition = "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1), filter 0.7s cubic-bezier(0.22,1,0.36,1)";
          el.style.opacity = "1";
          el.style.transform = "translateY(0) scale(1)";
          el.style.filter = "blur(0px)";
        }, idx * 65);
        obs.unobserve(el);
      }
    }, { threshold: 0.06, rootMargin: "0px 0px -20px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [idx]);

  return (
    <div ref={entryRef} style={{ display:"block" }}>
      <Card3D intensity={12} scale={1.045} style={{ borderRadius:20 }}>
        <a
          href={href}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display:"block", textDecoration:"none", color:"inherit",
            background:"#fff", borderRadius:20,
            border:"1.5px solid #E9E3FF",
            overflow:"hidden", position:"relative",
          }}
        >
          {/* ── Image Area ── */}
          <div style={{ position:"relative", aspectRatio:"1", overflow:"hidden", background:"linear-gradient(135deg,#F8F5FF,#F0F7FF)" }}>

            {/* Shimmer placeholder */}
            {!imgLoaded && image && (
              <div style={{
                position:"absolute", inset:0,
                background:"linear-gradient(90deg,#F3F0FF 0%,#EDE8FF 40%,#F3F0FF 80%)",
                backgroundSize:"200% 100%",
                animation:"shimmer 1.6s ease-in-out infinite",
                zIndex:1,
              }} />
            )}

            {/* Primary image */}
            {image ? (
              <img
                src={image} alt={title}
                onLoad={() => setImgLoaded(true)}
                style={{
                  position:"absolute", inset:0,
                  width:"100%", height:"100%", objectFit:"cover",
                  opacity: imgLoaded ? (hovered && hoverImage ? 0 : 1) : 0,
                  transition: "opacity 0.5s ease, transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)",
                  transform: hovered ? "scale(1.08)" : "scale(1)",
                  zIndex:2,
                }}
              />
            ) : (
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3rem",color:"#C4B5FD",zIndex:2 }}>🛍</div>
            )}

            {/* Hover swap image — crossfade */}
            {hoverImage && (
              <img
                src={hoverImage} alt=""
                aria-hidden="true"
                style={{
                  position:"absolute", inset:0,
                  width:"100%", height:"100%", objectFit:"cover",
                  opacity: hovered ? 1 : 0,
                  transform: hovered ? "scale(1.05)" : "scale(1.1)",
                  transition: "opacity 0.5s ease, transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)",
                  zIndex:3,
                }}
              />
            )}

            {/* Gradient overlay — bottom fade */}
            <div style={{
              position:"absolute", inset:0,
              background:"linear-gradient(to top, rgba(28,16,51,0.55) 0%, rgba(28,16,51,0.15) 45%, transparent 70%)",
              opacity: hovered ? 1 : 0.4,
              transition:"opacity 0.4s ease",
              zIndex:4,
              pointerEvents:"none",
            }} />

            {/* Badge */}
            {(badge || isNew) && (
              <div style={{
                position:"absolute", top:10, right:10, zIndex:8,
                padding:"3px 10px", borderRadius:9999,
                background: isNew ? "linear-gradient(135deg,#7C3AED,#EC4899)" : "linear-gradient(135deg,#F59E0B,#EF4444)",
                color:"#fff", fontSize:"0.6rem", fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase",
                boxShadow:"0 2px 10px rgba(0,0,0,0.2)",
              }}>
                {badge ?? "✨ جديد"}
              </div>
            )}

            {/* Color dots at bottom-left of image */}
            {colorSwatches.length > 1 && (
              <div style={{
                position:"absolute", bottom:8, right:8, zIndex:8,
                display:"flex", gap:4,
                opacity: hovered ? 1 : 0.7,
                transition:"opacity 0.3s",
              }}>
                {colorSwatches.slice(0,5).map((hex, i) => (
                  <span key={i} style={{
                    width:12, height:12, borderRadius:"50%",
                    background:hex, border:"2px solid rgba(255,255,255,0.9)",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.25)",
                    display:"inline-block",
                    transform: swatchHover === i ? "scale(1.5)" : "scale(1)",
                    transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                    onMouseEnter={() => setSwatchHover(i)}
                    onMouseLeave={() => setSwatchHover(null)}
                  />
                ))}
                {colorSwatches.length > 5 && (
                  <span style={{ fontSize:"0.55rem",color:"#fff",fontWeight:800,alignSelf:"center",background:"rgba(0,0,0,0.35)",borderRadius:9999,padding:"1px 5px" }}>
                    +{colorSwatches.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Quick action — slides up on hover */}
            <div style={{
              position:"absolute", bottom:0, left:0, right:0, zIndex:7,
              padding:"10px 12px",
              transform: hovered ? "translateY(0)" : "translateY(100%)",
              transition:"transform 0.38s cubic-bezier(0.22,1,0.36,1)",
            }}>
              <div style={{
                width:"100%",
                background:"linear-gradient(135deg,#7C3AED,#EC4899)",
                color:"#fff", fontWeight:800, fontSize:"0.78rem",
                borderRadius:9999, padding:"9px 0",
                textAlign:"center", letterSpacing:"0.04em",
                boxShadow:"0 4px 16px rgba(124,58,237,0.45)",
              }}>
                🛒 أضف للسلة
              </div>
            </div>
          </div>

          {/* ── Info area ── */}
          <div style={{ padding:"12px 14px 14px" }}>
            {category && (
              <div style={{ fontSize:"0.6rem",fontWeight:700,color:"#7C3AED",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:4 }}>
                {category}
              </div>
            )}
            <h3 style={{
              fontSize: "clamp(0.78rem,2vw,0.9rem)", fontWeight:700,
              color:"#1C1033", lineHeight:1.35, marginBottom:7,
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
            }}>
              {title}
            </h3>
            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                {price ? (
                  <>
                    <span style={{ fontSize:"clamp(0.95rem,2.5vw,1.05rem)",fontWeight:900,background:"linear-gradient(135deg,#7C3AED,#EC4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                      {price}
                    </span>
                    {originalPrice && (
                      <span style={{ fontSize:"0.72rem",color:"#9CA3AF",textDecoration:"line-through" }}>{originalPrice}</span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize:"0.82rem",color:"#9CA3AF" }}>السعر عند الطلب</span>
                )}
              </div>
              {/* Stars */}
              <div style={{ display:"flex",gap:1 }}>
                {[0,1,2,3,4].map(i=>(
                  <svg key={i} viewBox="0 0 20 20" style={{ width:11,height:11,fill:"#F59E0B" }}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </a>
      </Card3D>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CINEMATIC PRODUCT GALLERY
   — Color-filtered images (only show active color)
   — Full crossfade transition with blur
   — Animated thumbnails
   — Loading shimmer on each image
   — Scroll-aware zoom
════════════════════════════════════════════════ */
export function CandyGallery({
  images, activeIdx, onSelect, colorName,
}: {
  images: string[]; activeIdx: number; onSelect: (i: number) => void; colorName?: string;
}) {
  const [displayIdx, setDisplayIdx] = useState(activeIdx);
  const [transitioning, setTransitioning] = useState(false);
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});
  const [zoomed, setZoomed] = useState(false);
  const prevImages = useRef(images);

  // When images array changes (color changed) → reset with fade
  useEffect(() => {
    if (images !== prevImages.current) {
      prevImages.current = images;
      setTransitioning(true);
      setTimeout(() => {
        setDisplayIdx(0);
        setTransitioning(false);
        setLoadedMap({});
      }, 280);
    }
  }, [images]);

  // When activeIdx changes (thumbnail click) → crossfade
  useEffect(() => {
    if (activeIdx === displayIdx) return;
    setTransitioning(true);
    setTimeout(() => {
      setDisplayIdx(activeIdx);
      setTransitioning(false);
    }, 260);
  }, [activeIdx]);

  const markLoaded = useCallback((i: number) => {
    setLoadedMap(m => ({ ...m, [i]: true }));
  }, []);

  const handleThumb = (i: number) => {
    if (i === displayIdx && !transitioning) return;
    onSelect(i);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* ── Main viewport ── */}
      <div
        style={{
          position:"relative",
          aspectRatio:"1",
          borderRadius:24,
          overflow:"hidden",
          background:"linear-gradient(135deg,#F8F5FF,#EDE8FF)",
          border:"1.5px solid rgba(124,58,237,0.12)",
          boxShadow:"0 20px 60px rgba(124,58,237,0.1), 0 4px 16px rgba(0,0,0,0.06)",
          cursor: zoomed ? "zoom-out" : "zoom-in",
        }}
        onClick={() => setZoomed(z => !z)}
      >
        {/* Loading shimmer — shows until image loads */}
        {!loadedMap[displayIdx] && images[displayIdx] && (
          <div style={{
            position:"absolute", inset:0, zIndex:1,
            background:"linear-gradient(90deg,#F3F0FF 0%,#EDE8FF 40%,#F8F5FF 80%)",
            backgroundSize:"200% 100%",
            animation:"shimmer 1.6s ease-in-out infinite",
          }} />
        )}

        {/* Actual image */}
        {images[displayIdx] && (
          <img
            key={`img-${displayIdx}-${images[displayIdx]}`}
            src={images[displayIdx]}
            alt={colorName ? `${colorName} - صورة ${displayIdx + 1}` : `صورة ${displayIdx + 1}`}
            onLoad={() => markLoaded(displayIdx)}
            style={{
              position:"absolute", inset:0,
              width:"100%", height:"100%",
              objectFit: zoomed ? "contain" : "cover",
              opacity: transitioning ? 0 : (loadedMap[displayIdx] ? 1 : 0),
              transform: transitioning ? "scale(0.96) blur(4px)" : zoomed ? "scale(1.15)" : "scale(1)",
              transition:"opacity 0.38s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)",
              filter: transitioning ? "blur(3px)" : "blur(0)",
              willChange:"transform,opacity",
              zIndex:2,
            }}
          />
        )}

        {!images[displayIdx] && (
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3.5rem",color:"#C4B5FD",zIndex:2 }}>🛍</div>
        )}

        {/* Color label overlay */}
        {colorName && (
          <div style={{
            position:"absolute", top:12, right:12, zIndex:10,
            background:"rgba(255,255,255,0.92)",
            backdropFilter:"blur(10px)",
            border:"1px solid rgba(124,58,237,0.18)",
            borderRadius:9999,
            padding:"4px 12px",
            fontSize:"0.68rem", fontWeight:800,
            color:"#7C3AED",
          }}>
            🎨 {colorName}
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div style={{
            position:"absolute", bottom:12, left:12, zIndex:10,
            background:"rgba(28,16,51,0.55)",
            backdropFilter:"blur(8px)",
            borderRadius:9999, padding:"3px 10px",
            fontSize:"0.68rem", fontWeight:700, color:"rgba(255,255,255,0.9)",
          }}>
            {displayIdx + 1} / {images.length}
          </div>
        )}

        {/* Zoom hint */}
        <div style={{
          position:"absolute", bottom:12, right:12, zIndex:10,
          background:"rgba(255,255,255,0.85)",
          backdropFilter:"blur(8px)",
          border:"1px solid rgba(124,58,237,0.15)",
          borderRadius:9999,
          padding:"3px 10px",
          fontSize:"0.62rem",fontWeight:700,color:"#7C3AED",
          opacity: zoomed ? 0 : 0.9,
          transition:"opacity 0.3s",
        }}>
          🔍 انقر للتكبير
        </div>

        {/* Navigation arrows (for mobile) */}
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); handleThumb(displayIdx > 0 ? displayIdx - 1 : images.length - 1); }}
              style={{
                position:"absolute", top:"50%", right:10, zIndex:10,
                transform:"translateY(-50%)",
                width:36, height:36, borderRadius:"50%",
                background:"rgba(255,255,255,0.9)",
                backdropFilter:"blur(8px)",
                border:"1.5px solid rgba(124,58,237,0.2)",
                display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"pointer", fontSize:"0.9rem",
                boxShadow:"0 4px 12px rgba(0,0,0,0.12)",
              }}
              aria-label="الصورة السابقة"
            >›</button>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); handleThumb(displayIdx < images.length - 1 ? displayIdx + 1 : 0); }}
              style={{
                position:"absolute", top:"50%", left:10, zIndex:10,
                transform:"translateY(-50%)",
                width:36, height:36, borderRadius:"50%",
                background:"rgba(255,255,255,0.9)",
                backdropFilter:"blur(8px)",
                border:"1.5px solid rgba(124,58,237,0.2)",
                display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"pointer", fontSize:"0.9rem",
                boxShadow:"0 4px 12px rgba(0,0,0,0.12)",
              }}
              aria-label="الصورة التالية"
            >‹</button>
          </>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {images.length > 1 && (
        <div style={{
          display:"flex",
          gap:8,
          overflowX:"auto",
          paddingBottom:4,
          scrollbarWidth:"thin",
          scrollbarColor:"rgba(124,58,237,0.3) transparent",
        }}>
          {images.map((url, i) => {
            const isActive = displayIdx === i;
            return (
              <button
                key={`${url}-${i}`}
                onClick={() => handleThumb(i)}
                style={{
                  flexShrink:0,
                  width:72, height:72,
                  borderRadius:12,
                  overflow:"hidden",
                  border: isActive
                    ? "2.5px solid #7C3AED"
                    : "1.5px solid #E9E3FF",
                  cursor:"pointer",
                  padding:0,
                  background:"#F8F5FF",
                  position:"relative",
                  boxShadow: isActive ? "0 0 0 3px rgba(124,58,237,0.2), 0 4px 12px rgba(124,58,237,0.2)" : "none",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                }}
                aria-label={`صورة ${i + 1}`}
              >
                {/* Shimmer on thumb */}
                {!loadedMap[i] && (
                  <div style={{
                    position:"absolute",inset:0,
                    background:"linear-gradient(90deg,#F3F0FF 0%,#EDE8FF 50%,#F3F0FF 100%)",
                    backgroundSize:"200% 100%",
                    animation:"shimmer 1.6s ease-in-out infinite",
                    animationDelay:`${i*0.15}s`,
                  }} />
                )}
                <img
                  src={url} alt={`صورة ${i+1}`}
                  onLoad={() => markLoaded(i)}
                  style={{
                    width:"100%",height:"100%",objectFit:"cover",
                    opacity: loadedMap[i] ? 1 : 0,
                    transition:"opacity 0.4s ease",
                    transform: isActive ? "scale(1.08)" : "scale(1)",
                    transition2:"transform 0.4s ease",
                  } as any}
                />
                {/* Active indicator ring */}
                {isActive && (
                  <div style={{
                    position:"absolute",inset:0,
                    border:"2px solid rgba(124,58,237,0.4)",
                    borderRadius:"inherit",
                    pointerEvents:"none",
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Dot indicators for mobile ── */}
      {images.length > 1 && images.length <= 8 && (
        <div style={{ display:"flex",justifyContent:"center",gap:6 }}>
          {images.map((_,i) => (
            <button
              key={i}
              onClick={() => handleThumb(i)}
              style={{
                width: displayIdx === i ? 24 : 7,
                height:7, borderRadius:9999,
                background: displayIdx === i ? "linear-gradient(135deg,#7C3AED,#EC4899)" : "#E9E3FF",
                border:"none", cursor:"pointer", padding:0,
                transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              aria-label={`صورة ${i+1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
