"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { requestScrollRefresh } from "@/lib/scrollRefresh";
import type { StoryChapter, StoryKey } from "@/lib/collectionStories";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { selectStorefrontColor } from "@/lib/storefrontColor";
import { themeFollower } from "@/lib/themeTween";
import { claimTheme, releaseTheme, themeHeld } from "@/lib/themeBase";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { QuickAddButton } from "@/components/QuickAddButton";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useRoseTheme } from "./RoseThemeProvider";
import { mixHex } from "./roseDesign";
import { placeMascotOnPhone, watchMascotSpot } from "./mascot/phoneSpot";
import { RoseMascot, type MascotHandle, type PalmRef } from "./mascot/RoseMascot";
import type { RoseExtras, RoseOutfit } from "@/lib/roseEvents";

const CollectionModelsScene = dynamic(() => import("./CollectionModelsScene"), { ssr: false, loading: () => null });

type Copy = { eyebrow: string; title: string; text: string; cta: string };

/** What Rose wears for each chapter. */
const STORY_OUTFIT: Record<StoryKey, { outfit: RoseOutfit; extras: RoseExtras }> = {
  accessories: { outfit: "abaya", extras: { pearls: true } },
  kids: { outfit: "tunic", extras: {} },
  incense: { outfit: "eid", extras: {} },
};

/** What Rose says as she lifts each chapter's model. */
const ROSE_LINE: Record<StoryKey, { ar: string; en: string }> = {
  accessories: { ar: "شوفي هالتفاصيل الحلوة ✨", en: "Look at these little details ✨" },
  kids: { ar: "للصغيرات الحلوات 💕", en: "For the little ones 💕" },
  incense: { ar: "ريحة البخور بتجنن 🤍", en: "Smell that bakhoor 🤍" },
};
const STORY: Record<StoryKey, { seed: string; fallback: string; ar: Copy; en: Copy }> = {
  accessories: {
    seed: "#c4a266",
    fallback: "/editorial/scarves.webp",
    ar: { eyebrow: "الإكسسوارات", title: "معاصم، دبابيس\nوقمطات.", text: "خاتم التسبيح الإلكتروني، دبابيس الشال، المعاصم والبيسك… كل ما يثبّت لفّتكِ ويكمّلها.", cta: "تسوّقي الإكسسوارات" },
    en: { eyebrow: "ACCESSORIES", title: "Sleeves, pins\nand underscarves.", text: "The electronic tasbih ring, shawl pins, sleeves and underscarves: everything that holds your wrap in place.", cta: "Shop accessories" },
  },
  kids: {
    seed: "#e59b9b",
    fallback: "/editorial/hijab-campaign.webp",
    ar: { eyebrow: "للصغيرات", title: "فساتين وأطقم\nللبنات الصغيرات.", text: "فساتين مورّدة وأطقم مريحة بألوان فرحة.", cta: "تسوّقي الأطفال" },
    en: { eyebrow: "FOR LITTLE ONES", title: "Dresses and sets\nfor little girls.", text: "Floral dresses and comfy sets in happy colours.", cta: "Shop kids" },
  },
  incense: {
    seed: "#9b6b4e",
    fallback: "/editorial/rose-campaign-poster.webp",
    ar: { eyebrow: "المباخر", title: "مباخر خشب\nونقش عربي.", text: "مباخر من الخشب والبورسلان بنقوش عربية، مع عيدان البخور وتوزيعات العطر.", cta: "تسوّقي المباخر" },
    en: { eyebrow: "INCENSE BURNERS", title: "Wooden burners,\nArabic carving.", text: "Wood and porcelain burners with Arabic carving, plus incense sticks and perfume favours.", cta: "Shop incense burners" },
  },
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Chapter visibility: each one leaves in the first half of a hand-off and the next arrives in the second. */
function chapterWeights(p: number, n: number, half = 0.07) {
  return Array.from({ length: n }, (_, i) => {
    const arrive = i === 0 ? 1 : smooth(i / n, i / n + half, p);
    const leave = i === n - 1 ? 0 : smooth((i + 1) / n - half, (i + 1) / n, p);
    return arrive * (1 - leave);
  });
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function StoryRack({ chapter, ar }: { chapter: StoryChapter; ar: boolean }) {
  const fallback = STORY[chapter.key].fallback;
  if (!chapter.products.length) return null;
  return (
    <div className="season-rack story-rack">
      {chapter.products.map((p, i) => (
        <article key={p.id} className="season-card story-card" style={{ "--i": i } as CSSProperties}>
          <Link href={`/p/${encodeURIComponent(p.slug)}`} className="season-card-link">
            <span className={`season-card-image${p.secondaryImageUrl ? " has-alt" : ""}`}>
              {p.badge && <span className={`rose-badge rose-badge-${p.badge.kind}`}>{ar ? p.badge.ar : p.badge.en}</span>}
              <Image src={p.imageUrl || fallback} alt={p.title} fill sizes="(max-width:760px) 42vw, 13vw" className="product-image-main" />
              {p.secondaryImageUrl && <Image src={p.secondaryImageUrl} alt="" aria-hidden fill sizes="(max-width:760px) 42vw, 13vw" className="product-image-alt" />}
            </span>
            <span className="season-card-title">{p.title}</span>
            {p.priceText && <span className="season-card-price">{p.priceText}</span>}
          </Link>
          <QuickAddButton className="season-card-add" productId={p.id} slug={p.slug} buttonLabel={ar ? "إضافة سريعة" : "Quick add"} />
        </article>
      ))}
    </div>
  );
}

/**
 * Pinned homepage scene for the shop's other worlds. The page holds while
 * scrolling moves through accessories → kids → incense: each chapter brings
 * its own 3D model, backdrop, products and storefront colour, then the
 * storefront returns to its own colours.
 */
export function RoseCollectionStory({ chapters }: { chapters: StoryChapter[] }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const settings = useStorefrontSettings();
  const theme = useRoseTheme();
  const root = useRef<HTMLElement>(null);
  const weights = useRef<number[]>(chapters.map((_, i) => (i === 0 ? 1 : 0)));
  const palm: PalmRef = useRef(null);
  const rose = useRef<MascotHandle>(null);
  const [lead, setLead] = useState(0);
  const [motion, setMotion] = useState(false);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [compact, setCompact] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const keys = chapters.map((c) => c.key);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Built once when the shopper gets close, then kept (rebuilding the 3D models on
    // every pass meant a fresh WebGL start-up and shader compile each time).
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: "700px 0px" });
    const view = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    view.observe(el);
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => { io.disconnect(); view.disconnect(); mq.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    const el = root.current;
    const shell = theme?.root.current;
    if (!el || !settings.scrollAnimationsEnabled || chapters.length < 1) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setMotion(true);
      el.dataset.motion = "true";
      const n = chapters.length;
      const layers = Array.from(el.querySelectorAll<HTMLElement>(".story-layer"));
      const dots = Array.from(el.querySelectorAll<HTMLElement>(".story-meter-step"));
      let saved = false;
      let enteredColor: string | undefined;
      const seeds = chapters.map((c) => STORY[c.key].seed);
      const seedAt = (p: number) => {
        let seed = seeds[Math.min(n - 1, Math.floor(p * n))];
        for (let j = 1; j < n; j++) {
          const b = j / n;
          if (Math.abs(p - b) < 0.07) seed = mixHex(seeds[j - 1], seeds[j], smooth(b - 0.07, b + 0.07, p));
        }
        return seed;
      };
      let lastSeed = "";
      // While the colours move, only this section and the header get them (the whole page
      // restyled on every frame of a hand-over otherwise); the page catches up when they settle.
      const header = shell?.querySelector<HTMLElement>(".atelier-header") ?? null;
      // "On stage" = the section is pinned and fills the screen (set by its scroll timeline below).
      let onStage = false;
      const follow = shell ? themeFollower(shell, { local: () => (onStage ? [el, header] : []) }) : null;
      const takeOver = (seed: string) => {
        if (!shell || !follow) return;
        // The colour only moves during a hand-over between chapters: skip the other frames.
        if (saved && seed === lastSeed) return;
        lastSeed = seed;
        const values = storefrontPalette(seed);
        const entering = !saved;
        if (!saved) {
          saved = true;
          claimTheme(shell, "stories", Object.keys(values));
          enteredColor = shell.dataset.storefrontColor;
          shell.dataset.season = "true";
        }
        follow.to(values, entering ? 0.8 : 0.35);
        // Only its presence matters to the header styles; changing its value on every frame
        // made the browser re-check every link on the page.
        if (!shell.dataset.navbarColor) shell.dataset.navbarColor = seed;
      };
      const giveBack = () => {
        if (!shell || !saved) return;
        saved = false;
        lastSeed = "";
        follow?.stop();
        const chosen = shell.dataset.storefrontColor;
        releaseTheme(shell, "stories", {
          duration: 0.8,
          onComplete: () => {
            if (saved || themeHeld(shell)) return;
            delete shell.dataset.season;
            if (chosen) {
              shell.dataset.navbarColor = chosen;
              if (chosen !== enteredColor) selectStorefrontColor(chosen);
            } else delete shell.dataset.navbarColor;
          },
        });
      };
      let shownLead = -1;
      const shownV: string[] = [];
      // Each chapter's weight goes on its own layer and sky only: written on the
      // section it would restyle everything inside (mascot, all racks) every frame.
      const skies = Array.from(el.querySelectorAll<HTMLElement>(".story-sky > span"));
      const render = (p: number) => {
        const w = chapterWeights(p, n);
        weights.current = w;
        let lead = 0;
        w.forEach((v, i) => {
          // Settled chapters (fully in or out) are not rewritten every frame.
          const value = v.toFixed(4);
          if (shownV[i] !== value) {
            layers[i]?.style.setProperty("--v", value);
            skies[i]?.style.setProperty("--v", value);
            shownV[i] = value;
          }
          if (v > w[lead]) lead = i;
        });
        if (lead === shownLead) return; // attributes only change at a hand-over
        shownLead = lead;
        el.dataset.chapter = chapters[lead].key;
        setLead(lead);
        layers.forEach((layer, i) => { layer.inert = i !== lead; });
        dots.forEach((dot, i) => dot.toggleAttribute("data-active", i === lead));
      };
      const state = { p: 0 };
      const themeTrigger = ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 45%",
        refreshPriority: -1,
        onToggle: (self) => (self.isActive ? takeOver(seedAt(state.p)) : giveBack()),
      });
      const tween = gsap.fromTo(state, { p: 0 }, {
        p: 1,
        ease: "none",
        onUpdate: () => {
          render(state.p);
          if (themeTrigger.isActive) takeOver(seedAt(state.p));
        },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", onToggle: (self) => { onStage = self.isActive; if (!onStage) follow?.unpin(); }, scrub: 0.4, refreshPriority: -1 },
      });
      render(0);
      const refresh = requestScrollRefresh;
      refresh();
      window.addEventListener("load", refresh);
      const late = window.setTimeout(refresh, 1500);
      return () => {
        window.removeEventListener("load", refresh);
        window.clearTimeout(late);
        tween.scrollTrigger?.kill();
        tween.kill();
        themeTrigger.kill();
        giveBack();
        layers.forEach((layer) => { layer.inert = false; });
        el.dataset.motion = "false";
        setMotion(false);
      };
    });
    return () => mm.revert();
  }, [settings.scrollAnimationsEnabled, theme, chapters]);

  // Rose introduces each chapter as it takes the stage.
  useEffect(() => {
    if (!motion || !inView) return;
    const key = chapters[lead]?.key;
    if (!key) return;
    const t = window.setTimeout(() => {
      rose.current?.say(ROSE_LINE[key][ar ? "ar" : "en"], 2600);
      rose.current?.joy();
    }, 350);
    return () => window.clearTimeout(t);
  }, [lead, motion, inView, chapters, ar]);

  // Phones: stand in the free corner above the products (measured, see phoneSpot.ts).
  useEffect(() => {
    if (!motion || !near) return;
    return watchMascotSpot(root.current);
  }, [motion, near]);
  useEffect(() => {
    if (!motion || !near) return;
    // Re-measure once the new chapter's copy has settled into place.
    const t = window.setTimeout(() => placeMascotOnPhone(root.current), 450);
    return () => window.clearTimeout(t);
  }, [lead, motion, near]);

  if (!chapters.length) return null;
  return (
    <section
      ref={root}
      className="rose-stories"
      data-motion="false"
      data-chapter={chapters[0].key}
      data-scene={sceneReady && !sceneFailed ? "ready" : "static"}
      style={{ "--chapters": chapters.length } as CSSProperties}
      aria-label={ar ? "من عوالم استبرق" : "More from Estabrek"}
    >
      <div className="stories-sticky">
        <div className="story-sky" aria-hidden="true">
          {chapters.map((c, i) => (
            <span key={c.key} className={`sky-${c.key}`} style={{ "--v": i === 0 ? "1" : "0" } as CSSProperties} />
          ))}
        </div>
        {motion && near && !sceneFailed && (
          <div className="story-canvas" aria-hidden="true">
            <SceneBoundary onError={() => setSceneFailed(true)}>
              <CollectionModelsScene
                keys={keys}
                weights={weights}
                active={inView}
                compact={compact}
                rtl={ar}
                onReady={() => setSceneReady(true)}
                onFailure={() => setSceneFailed(true)}
                palm={palm}
              />
            </SceneBoundary>
          </div>
        )}
        {motion && near && (
          <RoseMascot
            ref={rose}
            className="story-mascot"
            ar={ar}
            reactive
            pose={sceneFailed ? "idle" : "hold"}
            outfit={STORY_OUTFIT[chapters[lead]?.key ?? "accessories"].outfit}
            extras={STORY_OUTFIT[chapters[lead]?.key ?? "accessories"].extras}
            mirrored={!ar}
            palm={palm}
            label={ar ? "رَزان تعرض المجموعة" : "Rose presents the collection"}
          />
        )}
        <div className="story-stage">
          {chapters.map((chapter, i) => {
            const c = STORY[chapter.key][ar ? "ar" : "en"];
            return (
              <div key={chapter.key} className={`story-layer story-${chapter.key}`} style={{ "--v": i === 0 ? "1" : "0" } as CSSProperties}>
                <div className="season-copy story-copy">
                  <span className="atelier-eyebrow">
                    <Icon name="spark" />
                    {c.eyebrow}
                    <em>· {chapter.categoryName}</em>
                  </span>
                  <h2>{c.title}</h2>
                  <p>{c.text}</p>
                  <Link href={chapter.href} className="atelier-button button-dark">
                    {c.cta}
                    <Icon name="arrow" />
                  </Link>
                </div>
                <StoryRack chapter={chapter} ar={ar} />
              </div>
            );
          })}
        </div>
        <ol className="story-meter" aria-hidden="true">
          {chapters.map((chapter, i) => (
            <li key={chapter.key} className="story-meter-step" data-active={i === 0 ? "" : undefined}>
              <span />
              {STORY[chapter.key][ar ? "ar" : "en"].eyebrow}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
