"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { requestScrollRefresh } from "@/lib/scrollRefresh";
import { reportSeek } from "@/lib/motionBudget";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { Icon } from "./Icons";
import { HeroMascot } from "./mascot/HeroMascot";
import type { MascotHandle } from "./mascot/RoseMascot";
import { startFilmCutout, type FilmCutout } from "./filmCutout";
import { watchScarfFlight } from "./scarfFlight";
import { placeHeroMascotOnPhone } from "./mascot/phoneSpot";

/**
 * The opening film: a sheer scarf flies in, wraps itself into a hijab and
 * settles. Scrolling plays it (forwards and backwards) on one side of the
 * screen; on the other the headline changes with the film — a new line and a
 * new colour at every turn of the scarf — and when the hijab is complete the
 * shop's closing line appears.
 *
 * The clip is a scarf on black: it sits in a dark arch and is blended with
 * "screen", so the black becomes the arch's own tinted dark and only the
 * fabric shows. With reduced motion (or scroll animations off in Admin) the
 * film simply plays once on its own, or shows the finished hijab.
 */

export const FILM_LINES = {
  ar: ["أناقة تشبهكِ.", "نعومةٌ تلتفّ حولكِ.", "تفاصيل تحكي ذوقكِ.", "ألوانٌ تشبه مزاجكِ."],
  en: ["Elegance that feels like you.", "Softness that wraps around you.", "Details that tell your taste.", "Colours that match your mood."],
};
const FILM_CLOSING = {
  ar: { title: "استبرق…\nأناقةٌ تليق بكِ.", text: "حجاب، فساتين وتفاصيل مختارة بحب، لتكوني أنتِ بكل ثقة." },
  en: { title: "Estabrek.\nBeautifully, you.", text: "Hijabs, dresses and details chosen with love, so you can be you, with confidence." },
};
/** One colour per line, readable on the light page; the closing line takes the shopper's own colour. */
const LINE_COLORS = ["#b2486a", "#7c5fa8", "#3f7f78", "#a87a2c"];
/** The film's share of the scroll that tells the lines; the rest holds the closing line. */
const LINES_END = 0.84;

const SOURCES = {
  desktop: { webm: "/editorial/hero-film.webm", mp4: "/editorial/hero-film.mp4" },
  mobile: { webm: "/editorial/hero-film-mobile.webm", mp4: "/editorial/hero-film-mobile.mp4" },
};

type Button = { label?: string; href?: string } | undefined;

/** Where the sparkles appear around the finished hijab: [x %, y %, size px, delay ms]. */
const SPARKS: [number, number, number, number][] = [
  [30, 16, 22, 0], [70, 12, 16, 260], [78, 38, 26, 520], [22, 44, 14, 780],
  [72, 66, 18, 140], [28, 74, 22, 640], [56, 4, 12, 900], [46, 92, 16, 380], [86, 22, 10, 1100], [14, 26, 12, 1300],
];

export function RoseHeroFilm({
  ar,
  lines: customLines,
  closing: customClosing,
  description,
  primary,
  secondary,
}: {
  ar: boolean;
  /** Kept for the Admin data; the film opening shows no small eyebrow line. */
  eyebrow?: string;
  /** Admin lines (one per turn of the scarf); the shop's own lines when empty. */
  lines?: string[];
  closing?: string;
  description?: string;
  primary?: Button;
  secondary?: Button;
}) {
  const { scrollAnimationsEnabled } = useStorefrontSettings();
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rose = useRef<MascotHandle>(null);
  // "on": the scarf floats on the page (black taken out live); "off": no WebGL, the film shows in a dark arch.
  const [cutout, setCutout] = useState<"on" | "off">("on");
  const lang = ar ? "ar" : "en";
  const authored = (customLines ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 6);
  const lines = authored.length ? authored : FILM_LINES[lang];
  const closing = customClosing?.trim() || FILM_CLOSING[lang].title;
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState(false);
  const final = step >= lines.length;

  // Scroll plays the film; the headline follows it.
  useEffect(() => {
    const section = root.current, el = video.current;
    if (!section || !el || !scrollAnimationsEnabled) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setMotion(true);
      section.dataset.motion = "true";
      el.pause();
      el.loop = false;
      const state = { p: 0 };
      let pending = false;
      let shown = -1;
      let shownP = "";
      // The film's frame (video, cut-out canvas, halo) is the only part that follows the scroll value.
      const progress = section.querySelector<HTMLElement>(".film-arch");
      let shownZoom = "";
      let lastLook = 0;
      let askedAt = 0;
      const seek = () => {
        const d = el.duration;
        if (!Number.isFinite(d) || d <= 0 || el.readyState < 1) return;
        // The film runs a little ahead of the lines, so the hijab is complete when the closing line arrives.
        const target = Math.min(d - 0.04, Math.max(0, Math.min(1, state.p / (LINES_END + 0.04)) * d));
        // Under one frame of the film (24 a second) apart: the same picture, no seek needed.
        if (Math.abs(el.currentTime - target) < 0.03) return;
        if (el.seeking) { pending = true; return; }
        askedAt = performance.now();
        el.currentTime = target;
      };
      const seeked = () => {
        if (askedAt) { reportSeek(performance.now() - askedAt); askedAt = 0; }
        if (pending) { pending = false; seek(); }
      };
      const update = () => {
        seek();
        const p = state.p;
        const s = p >= LINES_END ? lines.length : Math.min(lines.length - 1, Math.floor((p / LINES_END) * lines.length));
        if (s !== shown) { shown = s; setStep(s); }
        // Only the small parts that follow the scroll get the value (not the whole section).
        const value = p.toFixed(3);
        if (value !== shownP) {
          shownP = value;
          progress?.style.setProperty("--film-p", value);
        }
        // The scarf grows as it flies, then comes back to its own size as the hijab settles.
        const zoom = (1 + 0.3 * Math.sin(Math.PI * Math.min(1, p / LINES_END))).toFixed(3);
        if (zoom !== shownZoom) {
          shownZoom = zoom;
          progress?.style.setProperty("--film-zoom", zoom);
        }
        // Rose watches the scarf fly past (a few times a second is plenty).
        const now = performance.now();
        if (now - lastLook > 180 && p < LINES_END) {
          lastLook = now;
          const r = canvas.current?.getBoundingClientRect();
          if (r && r.width) rose.current?.lookAt?.(r.left + r.width * (0.5 + Math.sin(p * 9) * 0.18), r.top + r.height * 0.4, 700);
        }
      };
      el.addEventListener("loadedmetadata", update);
      el.addEventListener("seeked", seeked);
      const tween = gsap.fromTo(state, { p: 0 }, {
        p: 1, ease: "none", onUpdate: update,
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.5, refreshPriority: -1 },
      });
      update();
      requestScrollRefresh();
      return () => {
        el.removeEventListener("loadedmetadata", update);
        el.removeEventListener("seeked", seeked);
        tween.scrollTrigger?.kill();
        tween.kill();
        section.dataset.motion = "false";
        progress?.style.removeProperty("--film-p");
        progress?.style.removeProperty("--film-zoom");
        el.loop = true;
        setMotion(false);
        setStep(0);
      };
    });
    return () => mm.revert();
  }, [scrollAnimationsEnabled, lines.length]);

  // The closing words can change the layout under Rose on phones: measure her spot again.
  useEffect(() => {
    const t = window.setTimeout(placeHeroMascotOnPhone, 80);
    return () => window.clearTimeout(t);
  }, [final]);

  // Rose cheers when the hijab is complete (only when the shopper scrolled there).
  const seenFinal = useRef(false);
  const filmRef = useRef<FilmCutout | null>(null);
  useEffect(() => {
    if (!motion) return;
    if (step === 1) rose.current?.wink();
    if (final && !seenFinal.current) {
      seenFinal.current = true;
      const t = window.setTimeout(() => {
        rose.current?.cheer();
        rose.current?.say(ar ? "شو هالحلا! ✨" : "So lovely! ✨", 2600);
      }, 450);
      return () => window.clearTimeout(t);
    }
    if (!final) seenFinal.current = false;
  }, [step, final, motion, ar]);

  // Take the black out of the film, and dye the scarf in the shopper's colour.
  useEffect(() => {
    const el = video.current, out = canvas.current;
    if (!el || !out || cutout === "off") return;
    const film = startFilmCutout(el, out, () => setCutout("off"));
    if (!film) { setCutout("off"); return; }
    film.setTint(document.documentElement.dataset.storefrontColor ?? null);
    filmRef.current = film;
    // iPhones load no video data until it plays: start it for a moment (muted), then the
    // scroll takes over. Tried soon after load and again on her first touch or scroll.
    const prime = () => {
      if (el.readyState >= 2) return;
      el.play()
        .then(() => { if (root.current?.dataset.motion === "true") el.pause(); })
        .catch(() => {});
    };
    const primeTimer = window.setTimeout(prime, 900);
    const firstTouch = ["touchstart", "pointerdown", "scroll"] as const;
    const onFirst = () => { prime(); firstTouch.forEach((e) => window.removeEventListener(e, onFirst)); };
    firstTouch.forEach((e) => window.addEventListener(e, onFirst, { passive: true }));
    const pick = (e: Event) => film.setTint((e as CustomEvent<string>).detail);
    // After a long break the shop's own colours return (RoseThemeProvider): the scarf too.
    const unpick = () => film.setTint(null);
    window.addEventListener("storefront-color-selected", pick);
    window.addEventListener("storefront-color-reset", unpick);
    return () => {
      window.removeEventListener("storefront-color-selected", pick);
      window.removeEventListener("storefront-color-reset", unpick);
      window.clearTimeout(primeTimer);
      firstTouch.forEach((e) => window.removeEventListener(e, onFirst));
      film.stop();
      filmRef.current = null;
    };
  }, [cutout]);

  // Below the film, the finished hijab flies into the first products (once a visit).
  useEffect(() => {
    const section = root.current;
    if (!section || !motion || cutout === "off") return;
    return watchScarfFlight(section, () => filmRef.current?.snapshot() ?? null);
  }, [motion, cutout]);

  // Desktop: the scarf leans a little towards the pointer, as if it moved in the air.
  useEffect(() => {
    const arch = root.current?.querySelector<HTMLElement>(".film-arch");
    if (!arch || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        arch.style.setProperty("--tilt-x", ((e.clientX / innerWidth - 0.5) * 2).toFixed(3));
        arch.style.setProperty("--tilt-y", ((e.clientY / innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); };
  }, []);

  // Without the scroll scene the film plays on its own (never with reduced motion).
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    // The scroll scene (set up just before this effect) owns the film: never autoplay over it.
    if (motion || root.current?.dataset.motion === "true") { el.pause(); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.loop = true;
    el.play().catch(() => {});
  }, [motion]);

  const accent = final ? "var(--selection-accent, #a43b64)" : LINE_COLORS[step % LINE_COLORS.length];
  const shop = primary?.href ? primary : { href: "/shop", label: ar ? "تسوّقي الآن" : "Shop now" };
  return (
    <section
      ref={root}
      className="rose-film"
      data-motion="false"
      data-final={final ? "true" : undefined}
      data-cutout={cutout}
      aria-labelledby="hero-title"
      style={{ "--film-accent": accent, "--film-steps": lines.length } as CSSProperties}
    >
      <div className="rose-film-sticky">
        <div className="film-copy">
          {/* Screen readers hear the promise once; the changing lines are the film's captions. */}
          <h1 id="hero-title" className="hero-headline film-lines" aria-label={`${lines[0]} ${closing.replace(/\n/g, " ")}`}>
            {lines.map((line, i) => (
              <span
                key={i}
                className="film-line"
                data-state={i === step ? "on" : i < step ? "past" : "next"}
                aria-hidden="true"
                style={{ color: LINE_COLORS[i % LINE_COLORS.length] }}
              >
                {line.split(/\s+/).map((word, j) => (
                  <span key={j}>{j > 0 ? " " : null}<span className="film-word" style={{ "--j": j } as CSSProperties}>{word}</span></span>
                ))}
              </span>
            ))}
            <span className="film-line film-closing" data-state={final ? "on" : "next"} aria-hidden="true">
              {closing.split("\n").map((row, r, rows) => {
                // Word order continues across the two rows so the words still arrive one by one.
                const before = rows.slice(0, r).join(" ").split(/\s+/).filter(Boolean).length;
                return (
                  <span key={r} className="film-row">
                    {row.trim().split(/\s+/).map((word, j) => (
                      <span key={j}>{j > 0 ? " " : null}<span className="film-word" style={{ "--j": before + j } as CSSProperties}>{word}</span></span>
                    ))}
                  </span>
                );
              })}
            </span>
          </h1>
          <p className="hero-description">
            {final ? FILM_CLOSING[lang].text : description || (ar
              ? "حجاب، فساتين، وقطع تختارينها بحب. إطلالات تجمع الاحتشام والراحة، بلمسة تشبهكِ."
              : "Hijabs, dresses, and pieces to love. A little softness, a little confidence. Completely you.")}
          </p>
          <div className="hero-actions">
            <Link href={shop.href || "/shop"} className="atelier-button button-dark film-cta">
              {shop.label || (ar ? "تسوّقي الآن" : "Shop now")}
              <Icon name="arrow" />
            </Link>
            {secondary?.href && secondary.label ? (
              <Link href={secondary.href} className="atelier-text-link">
                {secondary.label}
                <Icon name="arrow" />
              </Link>
            ) : null}
          </div>
          <ol className="film-steps" aria-hidden="true">
            {[...lines, closing].map((_, i) => (
              <li key={i} data-on={i <= step ? "true" : undefined} />
            ))}
          </ol>
          {motion && (
            <span className="film-cue" aria-hidden="true">
              <Icon name="down" />
              {ar ? "مرّري ودعي الحجاب يكتمل" : "Scroll and watch the hijab come together"}
            </span>
          )}
        </div>
        <div className="film-stage">
          <div className="film-arch">
            <video
              ref={video}
              className="film-video"
              muted
              playsInline
              preload="auto"
              poster="/editorial/hero-film-poster.webp"
              aria-label={ar ? "شال شفاف يتطاير ويلتفّ ليصبح حجاباً" : "A sheer scarf flies and wraps itself into a hijab"}
            >
              <source src={SOURCES.mobile.webm} type="video/webm" media="(max-width: 760px)" />
              <source src={SOURCES.mobile.mp4} type="video/mp4" media="(max-width: 760px)" />
              <source src={SOURCES.desktop.webm} type="video/webm" />
              <source src={SOURCES.desktop.mp4} type="video/mp4" />
            </video>
            <canvas ref={canvas} className="film-canvas" aria-hidden="true" />
            {/* The scarf at once, before (or without) the video's first frame. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="film-still" src="/editorial/hero-film-still.webp" alt="" aria-hidden="true" decoding="async" />
            <span className="film-glow" aria-hidden="true" />
            {/* When the hijab is complete it catches the light. */}
            <span className="film-sparkles" aria-hidden="true">
              {SPARKS.map(([x, y, size, delay], i) => (
                <svg key={i} viewBox="0 0 24 24" style={{ "--x": `${x}%`, "--y": `${y}%`, "--s": `${size}px`, "--d": `${delay}ms` } as CSSProperties}>
                  <path d="M12 0c.9 6.3 5.7 11.1 12 12-6.3.9-11.1 5.7-12 12-.9-6.3-5.7-11.1-12-12C6.3 11.1 11.1 6.3 12 0Z" />
                </svg>
              ))}
              <i className="film-shine" />
            </span>
          </div>
          <HeroMascot ref={rose} ar={ar} />
        </div>
      </div>
    </section>
  );
}
