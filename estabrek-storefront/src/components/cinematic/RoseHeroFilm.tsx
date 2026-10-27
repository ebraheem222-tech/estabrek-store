"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { requestScrollRefresh } from "@/lib/scrollRefresh";
import { createFilmScrubber } from "./heroFilmPlayback";
import { createHeroScrollMotion } from "./heroScrollMotion";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { Icon } from "./Icons";
import { HeroMascot } from "./mascot/HeroMascot";
import type { MascotHandle } from "./mascot/RoseMascot";
import { startFilmCutout, type FilmCutout } from "./filmCutout";
import { watchScarfFlight } from "./scarfFlight";
import { placeHeroMascotOnPhone } from "./mascot/phoneSpot";
import { motionLevel } from "@/lib/motionBudget";
import { motionSettings, sectionMotionOn } from "@/lib/motionSettings";
import { useNames } from "@/store/storeIdentity";
import { fill } from "@/lib/storeNames";
import { tr } from "@/lib/words";
import { useLanguage } from "./Language";

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
  he: ["אלגנטיות שמרגישה כמוך.", "רכות שעוטפת אותך.", "פרטים שמספרים על הטעם שלך.", "צבעים שמתאימים למצב הרוח."],
};
const FILM_CLOSING = {
  ar: { title: "{store}…\nأناقةٌ تليق بكِ.", text: "حجاب، فساتين وتفاصيل مختارة بحب، لتكوني أنتِ بكل ثقة." },
  en: { title: "{store}.\nBeautifully, you.", text: "Hijabs, dresses and details chosen with love, so you can be you, with confidence." },
  he: { title: "{store}…\nאלגנטיות שמתאימה לך.", text: "חיג'אבים, שמלות ופרטים שנבחרו באהבה, כדי להרגיש את עצמך בביטחון מלא." },
};
/** One colour per line, readable on the light page; the closing line takes the shopper's own colour. */
const LINE_COLORS = ["#b2486a", "#7c5fa8", "#3f7f78", "#a87a2c"];
/** Line i's colour: the admin's (roseFilmColors), else the shop's own. */
const lineColour = (own: string[] | undefined, i: number) => {
  const c = own?.[i % LINE_COLORS.length];
  return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : LINE_COLORS[i % LINE_COLORS.length];
};
/** The film's share of the scroll that tells the lines; the rest holds the closing line. */
const LINES_END = 0.84;

/**
 * The film at 120 frames a second, a key frame every 6 for quick seeks. Made from
 * the 24 fps original with motion interpolation (ffmpeg minterpolate, mci): the
 * earlier 120/240 fps copies (hero-film.*) blended neighbouring frames, so every
 * fast turn of the scarf showed two or three ghost copies of its edge.
 */
const SOURCES = {
  desktop: { webm: "/editorial/hero-film-120.webm", mp4: "/editorial/hero-film-120.mp4" },
  mobile: { webm: "/editorial/hero-film-mobile-120.webm", mp4: "/editorial/hero-film-mobile-120.mp4" },
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
  lineColors,
}: {
  ar: boolean;
  /** The admin's colours for the lines, in turn (roseFilmColors); the shop's own where missing. */
  lineColors?: string[];
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
  const { language: lang } = useLanguage();
  const n = useNames();
  const authored = (customLines ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 6);
  const lines = authored.length ? authored : FILM_LINES[lang];
  const closing = customClosing?.trim() || fill(FILM_CLOSING[lang].title, n);
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState(false);
  const final = step >= lines.length;
  // The whole film is fetched into memory once (about 0.6 MB on phones, 1 MB on computers)
  // and played from there. Streamed, the first scroll often asked for parts not yet
  // downloaded, and every such jump waited for the network: the first pass stuttered on
  // every device, the second was smooth. Until it is in, the still of the scarf shows.
  const [filmSrc, setFilmSrc] = useState<string | null>(null);
  const [streamed, setStreamed] = useState(false); // the download failed: stream it as before
  const [filmReady, setFilmReady] = useState(false);
  // No film at all (the still of the scarf instead): with reduced motion nothing would
  // play it, and with data saver it is several megabytes nobody asked for. Data saver
  // also keeps the opening short (no long scroll scene); so does a film that cannot load.
  const [wantFilm, setWantFilm] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [filmFailed, setFilmFailed] = useState(false);
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const saver = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    setSaveData(saver);
    setLite(motionLevel() === "lite");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setWantFilm(!saver && !reduce.matches);
    sync();
    reduce.addEventListener("change", sync);
    return () => reduce.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const el = video.current;
    if (!el || !wantFilm || filmSrc) return;
    const set = window.matchMedia("(max-width: 760px)").matches ? SOURCES.mobile : SOURCES.desktop;
    const url = el.canPlayType('video/webm; codecs="vp9"') ? set.webm : set.mp4;
    const ctrl = new AbortController();
    let objectUrl = "";
    fetch(url, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setFilmSrc(objectUrl); })
      .catch(() => { if (!ctrl.signal.aborted) setStreamed(true); });
    return () => { ctrl.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // filmSrc is left out: once the film is in, it stays (also if reduced motion comes and goes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantFilm]);
  useEffect(() => {
    const el = video.current;
    if (!streamed || !el) return;
    el.load();
    // Streaming failed too (every <source>; their errors do not bubble): keep the still.
    const failed = () => { if (el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || el.error) setFilmFailed(true); };
    el.addEventListener("error", failed, true);
    return () => el.removeEventListener("error", failed, true);
  }, [streamed]);
  // iPhones decode nothing until a video plays: once the film is in, start it for a moment.
  useEffect(() => {
    const el = video.current;
    if (!filmSrc || !el) return;
    const t = window.setTimeout(() => {
      if (el.readyState >= 2) return;
      el.play().then(() => { if (root.current?.dataset.motion === "true") el.pause(); }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(t);
  }, [filmSrc]);
  // "Ready" = the film can be drawn (or will not be): only then do the other hellos start.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const ready = () => setFilmReady(true);
    if (el.readyState >= 2) ready();
    el.addEventListener("loadeddata", ready);
    const latest = window.setTimeout(ready, 6000);
    return () => { el.removeEventListener("loadeddata", ready); window.clearTimeout(latest); };
  }, [filmSrc, streamed]);

  // Scroll plays the film; the headline follows it.
  useEffect(() => {
    const section = root.current, el = video.current;
    if (!section || !el || !scrollAnimationsEnabled || !sectionMotionOn("hero") || saveData || filmFailed) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setMotion(true);
      section.dataset.motion = "true";
      // Android: the closing glint is a plain light, not a blend over the WebGL film (slow, and
      // drawn wrongly on some phones' graphics cards).
      if (/Android/i.test(navigator.userAgent)) section.dataset.plainLight = "true";
      el.pause();
      el.loop = false;
      // 120 fps with a key frame every 6 (see SOURCES). The frame on screen is noted on
      // the canvas (data-frame) for the checks; nothing styles it.
      const scrubber = createFilmScrubber(el, (index) => canvas.current?.setAttribute("data-frame", String(index)), 120, motionSettings().keyframeSnap ? 6 : 1);
      let shown = -1;
      let shownP = "";
      // The film's frame (video, cut-out canvas, halo) is the only part that follows the scroll value.
      const progress = section.querySelector<HTMLElement>(".film-arch");
      let shownZoom = "";
      let lastLook = 0;
      let scarfBox: DOMRect | null = null;
      let scarfAt = 0;
      const update = (p: number) => {
        // Input, transforms and captions share one elapsed-time position. The
        // decoder coalesces targets and waits for the next display frame after
        // seeked, so the completed picture can reach the canvas first.
        scrubber.update(p / (LINES_END + 0.04));
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
        // Rose watches the scarf fly past (a few times a second is plenty). The scarf's box
        // is read once in a while, not on every look: reading it right after the scroll
        // values were written made the browser lay the page out mid-frame.
        const now = performance.now();
        if (now - lastLook > 180 && p < LINES_END) {
          lastLook = now;
          if (!scarfBox || now - scarfAt > 1000) { scarfBox = canvas.current?.getBoundingClientRect() ?? null; scarfAt = now; }
          const r = scarfBox;
          if (r && r.width) rose.current?.lookAt?.(r.left + r.width * (0.5 + Math.sin(p * 9) * 0.18), r.top + r.height * 0.4, 700);
        }
      };
      const motion = createHeroScrollMotion(update);
      const trigger = ScrollTrigger.create({
        trigger: section, start: "top top", end: "bottom bottom", refreshPriority: -1,
        onUpdate: self => motion.target(self.progress),
        onRefresh: self => motion.target(self.progress),
      });
      update(0);
      motion.target(trigger.progress);
      // Let a jump past the hero settle before these on-demand loops sleep:
      // the scarf flight below takes a snapshot of this completed film.
      requestScrollRefresh();
      return () => {
        trigger.kill();
        motion.stop();
        scrubber.stop();
        section.dataset.motion = "false";
        progress?.style.removeProperty("--film-p");
        progress?.style.removeProperty("--film-zoom");
        el.loop = true;
        setMotion(false);
        setStep(0);
      };
    });
    return () => mm.revert();
  }, [scrollAnimationsEnabled, lines.length, saveData, filmFailed]);

  // Off screen the finished hijab's sparkles rest: their twinkle restyled them on every
  // frame even far below the film, right while the 3D scenes needed the time.
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete section.dataset.away;
      else section.dataset.away = "true";
    });
    io.observe(section);
    return () => io.disconnect();
  }, []);

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
      // She cheers once the shopper stops scrolling: her stars and the film's last turn
      // and sparkles all at once were the heaviest moment of the opening on phones.
      let t = 0;
      const wait = () => {
        window.clearTimeout(t);
        t = window.setTimeout(() => {
          window.removeEventListener("scroll", wait);
          rose.current?.cheer();
          rose.current?.say(tr(lang, "شو هالحلا! ✨", "So lovely! ✨"), 2600);
        }, 700);
      };
      window.addEventListener("scroll", wait, { passive: true });
      wait();
      return () => { window.clearTimeout(t); window.removeEventListener("scroll", wait); };
    }
    if (!final) seenFinal.current = false;
  }, [step, final, motion, ar, lang]);

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

  const accent = final ? "var(--selection-accent, #a43b64)" : lineColour(lineColors, step);
  const shop = { href: primary?.href || "/shop", label: primary?.label || tr(lang, "تسوّقي الآن", "Shop now") };
  return (
    <section
      ref={root}
      className="rose-film"
      data-motion="false"
      // How the opening runs: "full"/"lite" = the scroll plays the film, "static" = the still.
      data-playback={motion ? (lite ? "lite" : "full") : "static"}
      data-final={final ? "true" : undefined}
      data-cutout={cutout}
      aria-labelledby="hero-title"
      style={{ "--film-steps": lines.length } as CSSProperties}
    >
      <div className="rose-film-sticky">
        <div className="film-copy">
          {/* Screen readers hear the promise once; the changing lines are the film's captions. */}
          <h1 id="hero-title" className="hero-headline film-lines" aria-label={`${lines[0]} ${closing.replace(/\n/g, " ")}`} data-edit="roseFilmLines" data-edit-list="">
            {lines.map((line, i) => (
              <span
                key={i}
                className="film-line"
                data-state={i === step ? "on" : i < step ? "past" : "next"}
                aria-hidden="true"
                style={{ color: lineColour(lineColors, i) }}
              >
                {line.split(/\s+/).map((word, j) => (
                  <span key={j}>{j > 0 ? " " : null}<span className="film-word" style={{ "--j": j } as CSSProperties}>{word}</span></span>
                ))}
              </span>
            ))}
            <span className="film-line film-closing" data-state={final ? "on" : "next"} aria-hidden="true" data-edit={final ? "roseFilmClosing" : undefined} data-edit-lines="">
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
          <p className="hero-description" data-edit={final ? undefined : "subtitle"} data-part={final ? "closing-text" : undefined}>
            {final ? FILM_CLOSING[lang].text : description || (tr(lang, "حجاب، فساتين، وقطع تختارينها بحب. إطلالات تجمع الاحتشام والراحة، بلمسة تشبهكِ.", "Hijabs, dresses, and pieces to love. A little softness, a little confidence. Completely you."))}
          </p>
          <div className="hero-actions">
            <Link href={shop.href || "/shop"} className="atelier-button button-dark film-cta" data-edit-box="primaryButton.label" data-edit-link="primaryButton.href">
              <span data-edit="primaryButton.label" data-edit-boxed="">{shop.label || (tr(lang, "تسوّقي الآن", "Shop now"))}</span>
              <Icon name="arrow" />
            </Link>
            {secondary?.href && secondary.label ? (
              <Link href={secondary.href} className="atelier-text-link" data-edit-box="secondaryButton.label" data-edit-link="secondaryButton.href">
                <span data-edit="secondaryButton.label" data-edit-boxed="">{secondary.label}</span>
                <Icon name="arrow" />
              </Link>
            ) : null}
          </div>
          {/* The line's colour goes only where it shows (these steps, the halo in the arch): on the
              section, every new line restyled the whole opening, Rose included (~50 ms on a phone). */}
          <ol className="film-steps" aria-hidden="true" style={{ "--film-accent": accent } as CSSProperties} data-part="steps">
            {[...lines, closing].map((_, i) => (
              <li key={i} data-on={i <= step ? "true" : undefined} />
            ))}
          </ol>
          {motion && (
            <span className="film-cue" aria-hidden="true" data-part="cue">
              <Icon name="down" />
              {tr(lang, "مرّري ودعي الحجاب يكتمل", "Scroll and watch the hijab come together")}
            </span>
          )}
        </div>
        <div className="film-stage">
          <div className="film-arch" style={{ "--film-accent": accent } as CSSProperties} data-part="film">
            <video
              ref={video}
              className="film-video"
              muted
              playsInline
              preload="auto"
              src={filmSrc ?? undefined}
              poster="/editorial/hero-film-poster.webp"
              aria-label={tr(lang, "شال شفاف يتطاير ويلتفّ ليصبح حجاباً", "A sheer scarf flies and wraps itself into a hijab")}
            >
              {streamed && (
                <>
                  <source src={SOURCES.mobile.webm} type="video/webm" media="(max-width: 760px)" />
                  <source src={SOURCES.mobile.mp4} type="video/mp4" media="(max-width: 760px)" />
                  <source src={SOURCES.desktop.webm} type="video/webm" />
                  <source src={SOURCES.desktop.mp4} type="video/mp4" />
                </>
              )}
            </video>
            <canvas ref={canvas} className="film-canvas" aria-hidden="true" />
            {/* The scarf at once, before (or without) the video's first frame. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="film-still" src="/editorial/hero-film-still.webp" alt="" aria-hidden="true" decoding="async" />
            <span className="film-glow" aria-hidden="true" />
            {/* When the hijab is complete it catches the light. */}
            <span className="film-sparkles" aria-hidden="true">
              {/* The glow is painted in each star (one soft gradient), not three blur filters:
                  re-blurred on every frame of the twinkle, they dropped phones with dense
                  screens to ~35 frames a second at the end of the film. */}
              <svg className="film-spark-defs" width="0" height="0" focusable="false">
                <defs>
                  <radialGradient id="film-spark-glow">
                    <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
                    <stop offset=".28" stopColor="#f7d27a" stopOpacity=".55" />
                    <stop offset=".62" style={{ stopColor: "color-mix(in srgb, var(--film-accent) 60%, #fff)", stopOpacity: 0.22 }} />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
              {SPARKS.map(([x, y, size, delay], i) => (
                <svg key={i} className="film-spark" viewBox="-12 -12 48 48" style={{ "--x": `${x}%`, "--y": `${y}%`, "--s": `${size}px`, "--d": `${delay}ms` } as CSSProperties}>
                  <circle cx="12" cy="12" r="24" fill="url(#film-spark-glow)" />
                  <path d="M12 0c.9 6.3 5.7 11.1 12 12-6.3.9-11.1 5.7-12 12-.9-6.3-5.7-11.1-12-12C6.3 11.1 11.1 6.3 12 0Z" />
                </svg>
              ))}
              <i className="film-shine" />
            </span>
          </div>
          <HeroMascot ref={rose} ar={ar} holdGreeting={!filmReady} />
        </div>
      </div>
    </section>
  );
}
