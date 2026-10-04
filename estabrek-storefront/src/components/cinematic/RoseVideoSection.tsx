"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { VideoData } from "@/cms/sectionTypes";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

export const defaultCampaignVideo: VideoData = {
  url: "/editorial/rose-campaign.mp4", posterUrl: "/editorial/rose-campaign-poster.webp",
  provider: "MP4", autoplay: true, muted: true, loop: true,
};

type Playback = "paused" | "playing" | "blocked" | "error" | "scrubbing";
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Campaign clip. With motion allowed, the section holds while scrolling and the
 * scroll itself plays the clip: the arch opens into a wide frame and every
 * frame of fabric follows the shopper's scroll (forwards and backwards). The
 * shopper controls the motion, so no pause button is needed. With reduced
 * motion or CMS animations off, it is a still poster with a play button.
 */
export function RoseVideoSection({ data = defaultCampaignVideo }: { data?: VideoData }) {
  const ar = useLanguage().language === "ar";
  const { scrollAnimationsEnabled } = useStorefrontSettings();
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const alive = useRef(true);
  const [near, setNear] = useState(false);
  const [scroll, setScroll] = useState(false);
  const [playback, setPlayback] = useState<Playback>("paused");
  const isDefault = data.url === defaultCampaignVideo.url;
  const poster = data.posterUrl || defaultCampaignVideo.posterUrl;

  // Fetch the clip shortly before it is needed.
  useEffect(() => {
    alive.current = true;
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { setNear(true); io.disconnect(); }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => { alive.current = false; io.disconnect(); };
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el || !near) return;
    el.load();
    // <source> errors do not bubble: decide from the element once every candidate failed.
    const failed = () => {
      if (el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || el.error) setPlayback("error");
    };
    el.addEventListener("error", failed, true);
    return () => el.removeEventListener("error", failed, true);
  }, [near, data.url]);

  // Scroll-driven playback and frame animation.
  useEffect(() => {
    const section = root.current, media = frame.current, el = video.current;
    if (!section || !media || !el || !scrollAnimationsEnabled) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setScroll(true);
      section.dataset.motion = "true";
      el.pause();
      el.loop = false;
      const state = { p: 0 };
      let pending = false;
      const seek = () => {
        const d = el.duration;
        if (time.current) time.current.textContent = `${clock(state.p * (Number.isFinite(d) ? d : 0))} / ${clock(Number.isFinite(d) ? d : 0)}`;
        if (!Number.isFinite(d) || d <= 0 || el.readyState < 1) return;
        const target = Math.min(d - 0.04, Math.max(0, state.p * d));
        if (Math.abs(el.currentTime - target) < 0.012) return;
        // Skip a frame while the decoder is still seeking instead of queueing seeks.
        if (el.seeking) { pending = true; return; }
        el.currentTime = target;
      };
      const seeked = () => { if (pending) { pending = false; seek(); } };
      const ready = () => { if (el.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE) setPlayback("scrubbing"); seek(); };
      el.addEventListener("loadedmetadata", ready);
      el.addEventListener("seeked", seeked);
      if (el.readyState >= 1) ready();
      const copy = section.querySelectorAll<HTMLElement>(".rose-video-copy > *");
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
          refreshPriority: -1,
        },
      });
      tl.to(state, {
        p: 1,
        duration: 1,
        onUpdate: () => {
          seek();
          section.style.setProperty("--video-p", state.p.toFixed(4));
        },
      }, 0)
        // The arch opens into a wide, softly rounded frame.
        .fromTo(media, { borderRadius: "260px 260px 12px 12px", scale: 0.84 }, { borderRadius: "34px 34px 34px 34px", scale: 1, ease: "power2.out", duration: 0.4 }, 0)
        .fromTo(el, { scale: 1.22 }, { scale: 1, duration: 1 }, 0)
        .fromTo(copy, { y: 46, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.22, ease: "power2.out" }, 0.06);
      const refresh = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); };
      const raf = requestAnimationFrame(refresh);
      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener("loadedmetadata", ready);
        el.removeEventListener("seeked", seeked);
        tl.scrollTrigger?.kill();
        tl.kill();
        gsap.set([media, el, ...Array.from(copy)], { clearProps: "all" });
        section.dataset.motion = "false";
        section.style.removeProperty("--video-p");
        el.loop = data.loop !== false;
        setScroll(false);
        setPlayback("paused");
      };
    });
    return () => mm.revert();
  }, [scrollAnimationsEnabled, data.loop, data.url]);

  // Still mode: the shopper starts and stops the clip.
  const toggle = async () => {
    const el = video.current;
    if (!el) return;
    setNear(true);
    if (playback === "playing") { el.pause(); return; }
    if (playback === "error" || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) el.load();
    if (scroll) { setPlayback(el.readyState >= 1 ? "scrubbing" : "paused"); return; }
    try {
      await el.play();
    } catch (err) {
      if (alive.current && (err as DOMException)?.name !== "AbortError") setPlayback(el.error ? "error" : "blocked");
    }
  };

  const showButton = !scroll || playback === "error";
  return (
    <section
      ref={root}
      className="rose-video"
      data-motion="false"
      data-playback={playback}
      data-rose-palette={data.rosePresentation?.palette || "berry"}
      aria-label={data.title || (ar ? "حكاية قماش" : "A story in fabric")}
    >
      <div className="rose-video-stage">
        <div ref={frame} className="rose-video-media">
          <video
            ref={video}
            poster={poster}
            preload={near ? "auto" : "none"}
            playsInline
            muted
            loop={data.loop !== false}
            controls={data.controls === true && !scroll}
            aria-label={ar ? "طيات قماش وردي تتحرك" : "Rose fabric in motion"}
            onPlay={() => setPlayback("playing")}
            onPause={() => { if (!scroll) setPlayback(video.current?.error ? "error" : "paused"); }}
          >
            {near && isDefault && <source src="/editorial/rose-campaign-mobile.webm" type="video/webm" media="(max-width: 760px)" />}
            {near && isDefault && <source src="/editorial/rose-campaign-mobile.mp4" type="video/mp4" media="(max-width: 760px)" />}
            {near && isDefault && <source src="/editorial/rose-campaign.webm" type="video/webm" />}
            {near && <source src={data.url} type="video/mp4" />}
          </video>
          {playback === "error" && <img className="video-error-poster" src={poster} alt={ar ? "طيات قماش وردي" : "Folds of rose fabric"} />}
          {showButton && (
            <button
              type="button"
              className="rose-video-toggle"
              aria-label={playback === "error" ? (ar ? "إعادة تحميل الفيديو" : "Reload video") : playback === "playing" ? (ar ? "إيقاف الفيديو" : "Pause video") : (ar ? "تشغيل الفيديو" : "Play video")}
              onClick={() => void toggle()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{playback === "playing" ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /> : <path d="m8 4 13 8-13 8z" fill="currentColor" />}</svg>
              <span>{playback === "error" ? (ar ? "إعادة المحاولة" : "Retry") : playback === "playing" ? (ar ? "إيقاف" : "Pause") : (ar ? "تشغيل" : "Play")}</span>
            </button>
          )}
          {scroll && playback !== "error" && (
            <div className="rose-video-timeline" aria-hidden="true">
              <span className="timeline-track"><span /></span>
              <span ref={time} className="timeline-clock" dir="ltr">0:00</span>
            </div>
          )}
        </div>
        <div className="rose-video-copy">
          <span className="atelier-eyebrow">ESTABREK · IN MOTION</span>
          <h2>{data.title || (ar ? <>أناقةٌ تتحرّك.<br /><em>وتبقى في الذاكرة.</em></> : <>Elegance in motion.<br /><em>A feeling that stays.</em></>)}</h2>
          <p>{data.subtitle || (ar ? "تفاصيل ناعمة، وطيات تحكي الكثير. مرّري ببطء، ودعي القماش يتحرّك معكِ." : "Soft details. Beautiful folds. Scroll slowly and let the fabric move with you.")}</p>
          <Link href="/shop" className="atelier-text-link">{ar ? "اكتشفي المجموعة" : "Discover the collection"}<Icon name="arrow" /></Link>
          {playback === "error" && <span className="video-status" role="status">{ar ? "تعذّر تحميل الفيديو. يمكنكِ إعادة المحاولة." : "Video could not load. You can try again."}</span>}
        </div>
      </div>
    </section>
  );
}
