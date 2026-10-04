"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "./Language";
import { Icon } from "./Icons";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { selectStorefrontColor } from "@/lib/storefrontColor";

const ScarfScene = dynamic(() => import("./ScarfScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <span />
    </div>
  ),
});
const colors = [
  { name: "Rose", ar: "وردي", value: "#c97794" },
  { name: "Lilac", ar: "ليلكي", value: "#a08cbd" },
  { name: "Pearl", ar: "لؤلؤي", value: "#eee0d5" },
];

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function ScarfFallback({ color }: { color: string }) {
  return (
    <svg
      className="scarf-fallback"
      viewBox="0 0 500 520"
      role="img"
      aria-label="تصوّر لحجاب منسدل"
    >
      <defs>
        <linearGradient id="scarf-shade" x1="0" x2="1">
          <stop stopColor="#ffffff" stopOpacity=".45" />
          <stop offset=".35" stopColor="#000000" stopOpacity=".07" />
          <stop offset=".6" stopColor="#ffffff" stopOpacity=".25" />
          <stop offset="1" stopColor="#45132b" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id="scarf-shadow">
          <stop stopColor="#8e3358" stopOpacity=".2" />
          <stop offset="1" stopColor="#8e3358" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="250" cy="467" rx="160" ry="24" fill="url(#scarf-shadow)" />
      <path
        d="M209 211Q165 237 128 296L138 422Q246 464 383 422L393 300Q348 243 290 215Z"
        fill={color}
      />
      <path
        d="M209 211Q165 237 128 296L138 422Q246 464 383 422L393 300Q348 243 290 215Z"
        fill="url(#scarf-shade)"
      />
      <ellipse cx="250" cy="152" rx="49" ry="71" fill="#f4e6db" />
      <path
        d="M250 54C179 54 159 106 164 169L178 244L220 229L207 207C190 180 190 132 207 111C229 78 270 76 293 111C310 135 310 179 292 205L280 224L324 242L339 169C345 107 322 54 250 54Z"
        fill={color}
      />
      <path
        d="M250 54C179 54 159 106 164 169L178 244L220 229L207 207C190 180 190 132 207 111C229 78 270 76 293 111C310 135 310 179 292 205L280 224L324 242L339 169C345 107 322 54 250 54Z"
        fill="url(#scarf-shade)"
      />
      <path
        d="M203 214Q267 243 335 268L349 433Q245 466 145 420L157 285Z"
        fill={color}
      />
      <path
        d="M203 214Q267 243 335 268L349 433Q245 466 145 420L157 285Z"
        fill="url(#scarf-shade)"
      />
      <path
        d="M303 141Q324 212 353 274Q384 345 349 447L319 441Q349 340 325 284Q302 225 287 184Z"
        fill={color}
      />
      <path
        d="M303 141Q324 212 353 274Q384 345 349 447L319 441Q349 340 325 284Q302 225 287 184Z"
        fill="url(#scarf-shade)"
      />
      <g stroke="#fff8fa" strokeOpacity=".36" strokeWidth="1.5" fill="none">
        <path d="M208 210C185 176 187 128 208 106C233 78 275 78 294 111C315 145 307 187 287 210" />
        <path d="M209 220Q185 298 182 420M237 234Q218 308 224 441M272 246Q247 325 272 442M308 261Q286 325 312 433" />
        <path d="M310 159Q326 231 350 284Q373 353 338 440" />
      </g>
      <ellipse cx="250" cy="472" rx="122" ry="9" fill="#deb1c3" />
    </svg>
  );
}

export function DesignStudy({ language, embedded = false, words }: { language: Language; embedded?: boolean; words?: string[] }) {
  const ar = language === "ar";
  const settings = useStorefrontSettings();
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [near, setNear] = useState(false);
  const [sceneApproached, setSceneApproached] = useState(false);
  const approachedRef = useRef(false);
  const [active, setActive] = useState(false);
  const visibleRef = useRef(false);
  // Static-first markup keeps every chapter available before hydration and without JS.
  const [reducedMotion, setReducedMotion] = useState(true);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const chapterRef = useRef(0);
  const loadScene = near && preferenceReady && (!embedded || reducedMotion || sceneApproached);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches || !settings.scrollAnimationsEnabled);
      setPreferenceReady(true);
    };
    update();
    media.addEventListener("change", update);
    const target = root.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    const visibility = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0].isIntersecting;
        setActive(entries[0].isIntersecting && (!embedded || target?.closest<HTMLElement>(".rose-opening")?.dataset.phase === "fabric"));
      },
      { threshold: 0 },
    );
    if (target) {
      observer.observe(target);
      visibility.observe(target);
    }
    return () => {
      observer.disconnect();
      visibility.disconnect();
      media.removeEventListener("change", update);
    };
  }, [settings.scrollAnimationsEnabled, embedded]);
  useEffect(() => {
    if (!loadScene) return;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
      setSupported(Boolean(context));
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setSupported(false);
    }
  }, [loadScene]);
  useEffect(() => {
    if (!root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    if (reducedMotion) {
      progress.current = 0;
      setChapter(0);
      return;
    }
    const update = (p: number, next = Math.min(2, Math.floor(p * 3))) => {
      progress.current = p;
      if (next !== chapterRef.current) {
        chapterRef.current = next;
        setChapter(next);
      }
    };
    if (embedded) {
      const opening = root.current.closest<HTMLElement>(".rose-opening");
      const receive = (event: Event) => {
        const p = (event as CustomEvent<number>).detail;
        if (p >= .14 && !approachedRef.current) { approachedRef.current = true; setSceneApproached(true); }
        setActive(visibleRef.current && p > .2 && p < .95);
        update(Math.max(0, Math.min(1, (p - .2) / .65)), p < .45 ? 0 : p < .7 ? 1 : 2);
      };
      opening?.addEventListener("rose-opening-progress", receive);
      return () => opening?.removeEventListener("rose-opening-progress", receive);
    }
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        update(self.progress);
      },
    });
    return () => trigger.kill();
  }, [reducedMotion, embedded]);
  const copy = ar
    ? [
        {
          title: (
            <>
              النعومة في
              <br />
              <em>كل تفصيلة.</em>
            </>
          ),
          text: "طيات ناعمة تنساب حول الرأس والكتفين. مرّري لتكتشفي الحجاب من كل زاوية.",
        },
        {
          title: (
            <>
              خفة
              <br />
              <em>ترافق يومكِ.</em>
            </>
          ),
          text: "من أول طيّة إلى آخر لمسة، الاحتشام والراحة يلتقيان في إطلالة تحبينها.",
        },
        {
          title: (
            <>
              لونكِ.
              <br />
              <em>حكايتكِ.</em>
            </>
          ),
          text: "وردي، ليلكي، أم لؤلؤي؟ اختاري لونكِ، ثم اكتشفي الحجاب والملابس في مجموعتنا.",
        },
      ]
    : [
        {
          title: (
            <>
              Softness in
              <br />
              <em>every fold.</em>
            </>
          ),
          text: "Soft folds around the head and shoulders. Scroll from a close-up to the full drape.",
        },
        {
          title: (
            <>
              Lightness that
              <br />
              <em>moves with you.</em>
            </>
          ),
          text: "From the first fold to the finishing touch. A little comfort, a little confidence, completely you.",
        },
        {
          title: (
            <>
              Your colour.
              <br />
              <em>Your story.</em>
            </>
          ),
          text: "Rose, lilac, or pearl? Find your shade, then discover hijabs and modest clothing in our collection.",
        },
      ];
  const selected = colors[colorIndex];
  const fallback = <ScarfFallback color={selected.value} />;
  return (
    <section
      id="craft"
      ref={root}
      className="design-study"
      data-embedded={embedded}
      data-chapter={chapter}
      data-reduced-motion={reducedMotion}
      aria-labelledby="study-title"
    >
      <div className="design-study-sticky">
        <div className="study-copy">
          <span className="atelier-eyebrow">
            {ar
              ? "عالم الأقمشة · اكتشفي النعومة"
              : "THE FABRIC STORY · A SOFTER PERSPECTIVE"}
          </span>
          {(reducedMotion ? copy : [copy[chapter]]).map((part, index) => (
            <div
              className={`study-chapter ${reducedMotion ? "study-chapter-static" : ""}`}
              key={`${language}-${reducedMotion ? index : chapter}`}
            >
              <h2 id={index === 0 ? "study-title" : undefined}>{part.title}</h2>
              <p>{part.text}</p>
            </div>
          ))}
          <div className="study-color-picker">
            <span>
              {ar ? "اللون" : "COLOUR"} — {ar ? selected.ar : selected.name}
            </span>
            <div className="study-swatches">
              {colors.map((color, index) => (
                <button
                  key={color.name}
                  style={{ "--swatch": color.value } as React.CSSProperties}
                  aria-label={color.name}
                  title={ar ? color.ar : color.name}
                  aria-pressed={colorIndex === index}
                  onClick={() => { setColorIndex(index); selectStorefrontColor(color.value); }}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
          <Link href="/shop" className="atelier-text-link">
            {ar ? "اكتشف المجموعة" : "Find your next favourite"}
            <Icon name="arrow" />
          </Link>
          <div
            className="study-progress"
            aria-label={
              ar ? `المشهد ${chapter + 1} من 3` : `Chapter ${chapter + 1} of 3`
            }
          >
            {[0, 1, 2].map((index) => (
              <span key={index} className={chapter === index ? "current" : ""}>
                <b>0{index + 1}</b>
                <i />
              </span>
            ))}
          </div>
        </div>
        <div
          className="model-stage"
          data-rotation={rotation}
          data-renderer={supported && !failed ? "webgl" : "fallback"}
          data-ready={ready}
          data-color={selected.name}
        >
          <span className="model-backdrop-word" aria-hidden="true">
            {words?.[chapter] || (ar ? ["نعومة", "انسياب", "أناقة"] : ["SOFTNESS", "FLOW", "ELEGANCE"])[chapter]}
          </span>
          <div className="model-canvas-wrap">
            {loadScene && supported && !failed ? (
              <>
              {!ready && <div className="model-fallback-underlay" aria-hidden="true">{fallback}</div>}
              <SceneBoundary fallback={fallback}>
                <ScarfScene
                  color={selected.value}
                  progress={progress}
                  rotation={rotation}
                  active={active}
                  reducedMotion={reducedMotion}
                  onReady={() => setReady(true)}
                  onFailure={() => setFailed(true)}
                />
              </SceneBoundary>
              </>
            ) : (
              fallback
            )}
          </div>
          <div className="model-caption">
            <div>
              <span className="model-caption-title">
                {ar ? "تصوّر لحجاب منسدل" : "THE DRAPED HIJAB"}
              </span>
              <span className="model-caption-sub">
                {ar
                  ? "إلهام للأقمشة · الألوان المتاحة في صفحة كل منتج"
                  : "Fabric inspiration · see each product for available colours"}
              </span>
            </div>
            <div className="model-rotation">
              <button
                className="atelier-icon-button"
                aria-label="Rotate left"
                title={ar ? "تدوير لليسار" : "Rotate left"}
                onClick={() => setRotation((value) => value - 1)}
              >
                <Icon name="arrow" className="rotate-left" />
              </button>
              <Icon name="rotate" width="17" height="17" />
              <button
                className="atelier-icon-button"
                aria-label="Rotate right"
                title={ar ? "تدوير لليمين" : "Rotate right"}
                onClick={() => setRotation((value) => value + 1)}
              >
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <span className="model-scroll-hint">
            {reducedMotion
              ? ar
                ? "استكشف بطريقتك"
                : "EXPLORE AT YOUR OWN PACE"
              : ar
                ? "مرّر لتكتشف كل زاوية"
                : "SCROLL TO SEE EVERY ANGLE"}
            <Icon name="down" width="12" height="12" />
          </span>
        </div>
      </div>
    </section>
  );
}
