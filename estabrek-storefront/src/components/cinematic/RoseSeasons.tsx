"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { requestScrollRefresh } from "@/lib/scrollRefresh";
import { onPageRest } from "@/lib/pageRest";
import { motionLevel } from "@/lib/motionBudget";
import { lazyMargin, prebuildAfter, sectionMotionOn, sectionSmoothTime } from "@/lib/motionSettings";
import type { SeasonEdit, SeasonKey } from "@/lib/seasonalEdits";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { themeFollower } from "@/lib/themeTween";
import { claimTheme, releaseTheme, themeHeld } from "@/lib/themeBase";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { QuickAddButton } from "@/components/QuickAddButton";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { RoseBadge } from "./RoseBadge";
import { createScrollProgressMotion } from "./scrollProgressMotion";
import { useRoseTheme } from "./RoseThemeProvider";
import { mixHex } from "./roseDesign";
import { placeMascotOnPhone, watchMascotSpot } from "./mascot/phoneSpot";
import { RoseMascot, type MascotHandle } from "./mascot/RoseMascot";

const SeasonsScene = dynamic(() => import("./SeasonsScene"), { ssr: false, loading: () => null });

/** Seeds for the temporary storefront theme while each season is on stage. */
const SEASON_SEED: Record<SeasonKey, string> = { winter: "#7d8ec4", spring: "#e9a27c" };
/** What Rose says when the season turns. */
const ROSE_LINE: Record<SeasonKey, { ar: string; en: string }> = {
  winter: { ar: "بررر! وقت الدفا ☔", en: "Brrr! Time for warm layers ☔" },
  spring: { ar: "الربيع وصل! 🌸", en: "Spring is here! 🌸" },
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const COPY: Record<SeasonKey, { ar: { eyebrow: string; title: string; text: string; cta: string }; en: { eyebrow: string; title: string; text: string; cta: string } }> = {
  winter: {
    ar: { eyebrow: "مجموعة الشتاء", title: "عبايات وأطقم\nلأيام الشتاء.", text: "أقمشة أثقل وألوان أعمق، بقصّات واسعة ومحتشمة.", cta: "تسوّقي الشتاء" },
    en: { eyebrow: "THE WINTER EDIT", title: "Abayas and sets\nfor winter days.", text: "Heavier fabrics and deeper tones, in loose, modest cuts.", cta: "Shop winter" },
  },
  spring: {
    ar: { eyebrow: "مجموعة الربيع", title: "فساتين خفيفة\nللربيع والصيف.", text: "أقمشة تتنفّس وألوان فاتحة للأيام الدافئة.", cta: "تسوّقي الربيع" },
    en: { eyebrow: "THE SPRING EDIT", title: "Light dresses\nfor spring and summer.", text: "Breathable fabrics and light colours for warm days.", cta: "Shop spring" },
  },
};

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function SeasonRack({ edit, ar }: { edit: SeasonEdit; ar: boolean }) {
  const fallbackImage = edit.key === "winter" ? "/editorial/hijab-campaign.webp" : "/editorial/scarves.webp";
  if (!edit.products.length) {
    return (
      <div className="season-rack season-rack-empty">
        <Link href={edit.href} className="season-card" style={{ "--i": 0 } as React.CSSProperties}>
          <span className="season-card-image">
            <Image src={fallbackImage} alt="" fill sizes="(max-width:760px) 60vw, 22vw" />
          </span>
          <span className="season-card-title">{edit.categoryName || (ar ? "اكتشفي المجموعة" : "Explore the edit")}</span>
        </Link>
      </div>
    );
  }
  return (
    <div className="season-rack">
      {edit.products.map((p, i) => (
        <article key={p.id} className="season-card" style={{ "--i": i } as React.CSSProperties}>
          <Link href={`/p/${encodeURIComponent(p.slug)}`} className="season-card-link">
            <span className="season-card-image">
              <RoseBadge badge={p.badge} ar={ar} />
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.title} fill sizes="(max-width:760px) 42vw, 13vw" className="product-image-main" />
              ) : (
                <Image src={fallbackImage} alt="" fill sizes="(max-width:760px) 42vw, 13vw" />
              )}
              {p.secondaryImageUrl && (
                <Image src={p.secondaryImageUrl} alt="" aria-hidden fill sizes="(max-width:760px) 42vw, 13vw" className="product-image-alt" />
              )}
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
 * Pinned homepage scene: the page holds still while scrolling re-dresses it
 * from winter (rain, snow, deep tones) to spring (sun, blossoms, light tones).
 * The storefront theme follows the season and returns to normal afterwards.
 */
export function RoseSeasons({ seasons }: { seasons: SeasonEdit[] }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const settings = useStorefrontSettings();
  const theme = useRoseTheme();
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [motion, setMotion] = useState(false);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [season, setSeason] = useState<SeasonKey>("winter");
  const rose = useRef<MascotHandle>(null);
  const winter = seasons.find((s) => s.key === "winter") ?? { key: "winter" as const, categoryName: null, href: "/shop", products: [] };
  const spring = seasons.find((s) => s.key === "spring") ?? { key: "spring" as const, categoryName: null, href: "/shop", products: [] };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Built once when the shopper gets close, then kept: tearing the 3D scene down and
    // rebuilding it on every pass meant a fresh WebGL start-up (a visible hitch) each time.
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: lazyMargin(600) });
    // Built ahead while the shopper reads (the page resting), so it is ready before she
    // gets here: built on the way in, its start-up stopped her scroll for a moment.
    const after = prebuildAfter(0);
    const early = motionLevel() === "lite" || after === null ? null : onPageRest(() => setNear(true), { after, quiet: 600 });
    const view = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    view.observe(el);
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => { io.disconnect(); view.disconnect(); mq.removeEventListener("change", sync); early?.(); };
  }, []);

  useEffect(() => {
    const el = root.current;
    const shell = theme?.root.current;
    if (!el || !settings.scrollAnimationsEnabled || !sectionMotionOn("seasons")) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      setMotion(true);
      el.dataset.motion = "true";
      let saved = false;
      let lastSeed = "";
      // Only the header follows the season's colours with the scroll. Written on the page
      // shell, every element of the page was restyled on every frame of the glide (before
      // the scene pinned and after it ended the rain dropped to about 20 frames a second);
      // written on this section, its ~700 elements were, while the sun rose (13 frames a
      // second on a phone). The section wears its season's colours instead (see `wear`).
      const header = shell?.querySelector<HTMLElement>(".atelier-header") ?? null;
      const follow = shell ? themeFollower(shell, { local: () => [header] }) : null;
      const takeOver = (seed: string) => {
        if (!shell || !follow) return;
        // Most scroll frames do not change the colour (it only moves while the
        // seasons hand over): nothing to write, so the page is not restyled.
        if (saved && seed === lastSeed) return;
        lastSeed = seed;
        const values = storefrontPalette(seed);
        const entering = !saved;
        if (!saved) {
          saved = true;
          claimTheme(shell, "seasons", Object.keys(values));
          shell.dataset.season = "true";
        }
        // Glide into the season, then follow the scroll.
        follow.to(values, entering ? 0.8 : 0.35);
        // Only its presence matters to the header styles; changing its value on every frame
        // made the browser re-check every link on the page.
        if (!shell.dataset.navbarColor) shell.dataset.navbarColor = seed;
      };
      /** `now`: no glide (the scene is going away). */
      const giveBack = (now = false) => {
        if (!shell || !follow || !saved) return;
        saved = false;
        lastSeed = "";
        // The header glides back to the page's own colours (a swatch picked meanwhile
        // already went to the page), then the page lets go of the scene.
        follow.release(now ? 0 : 0.8, () => releaseTheme(shell, "seasons", {
          duration: 0.8,
          onComplete: () => {
            if (saved || themeHeld(shell)) return; // a scene took over again meanwhile
            delete shell.dataset.season;
            const chosen = shell.dataset.storefrontColor;
            if (chosen) shell.dataset.navbarColor = chosen;
            else delete shell.dataset.navbarColor;
          },
        }));
      };
      const winterLayer = el.querySelector<HTMLElement>(".season-winter");
      const springLayer = el.querySelector<HTMLElement>(".season-spring");
      let shown: SeasonKey | "" = "";
      let shownMix = "";
      const meter = el.querySelector<HTMLElement>(".season-meter");
      // The mix goes only on the small pieces that use it (no children to restyle).
      const mixed = [".sky-spring", ".season-static-snow", ".season-static-sun", ".meter-winter", ".meter-spring"]
        .map((s) => el.querySelector<HTMLElement>(s))
        .filter((x): x is HTMLElement => Boolean(x));
      // The two seasons and their cards move by their own opacity and transform: a
      // --season-mix on a season restyled its whole copy and rack on every frame.
      const cards = (layer: HTMLElement | null) =>
        Array.from(layer?.querySelectorAll<HTMLElement>(".season-card") ?? []).map((card) => ({ card, i: Number(card.style.getPropertyValue("--i")) || 0 }));
      const winterCards = cards(winterLayer);
      const springCards = cards(springLayer);
      const px = (n: number) => `translateY(${n.toFixed(2)}px)`;
      const place = (mix: number) => {
        // Winter leaves in the first half of the change, spring arrives in the second (no overlap).
        if (winterLayer) { winterLayer.style.opacity = String(1 - Math.min(1, mix * 2)); winterLayer.style.transform = px(mix * -40); }
        if (springLayer) { springLayer.style.opacity = String(Math.max(0, mix * 2 - 1)); springLayer.style.transform = px((1 - mix) * 40); }
        winterCards.forEach(({ card, i }) => { card.style.transform = px(mix * (-30 - i * 14)); });
        springCards.forEach(({ card, i }) => { card.style.transform = px((1 - mix) * (40 + i * 22)); });
      };
      // The section always wears its season's colours, so it never glides them. It changes
      // season once, in the middle of the hand-over, when neither season's copy shows.
      const palettes = { winter: storefrontPalette(SEASON_SEED.winter), spring: storefrontPalette(SEASON_SEED.spring) };
      const wear = (key: SeasonKey) => Object.entries(palettes[key]).forEach(([name, value]) => el.style.setProperty(name, value));
      const render = (p: number) => {
        progress.current = p;
        const mix = smooth(0.38, 0.62, p);
        // Only the meter needs the raw progress; the mix only moves during the hand-over.
        // Unchanged values are skipped, so nothing is restyled outside the hand-over.
        meter?.style.setProperty("--season-p", p.toFixed(3));
        const m = mix.toFixed(4);
        if (m !== shownMix) {
          mixed.forEach((part) => part.style.setProperty("--season-mix", m));
          place(mix);
          shownMix = m;
        }
        const now: SeasonKey = mix > 0.5 ? "spring" : "winter";
        if (now === shown) return; // attributes only change at the hand-over, not every frame
        shown = now;
        wear(now);
        el.dataset.season = now;
        setSeason(now);
        // Only the visible season can be tabbed into or read out.
        if (winterLayer) winterLayer.inert = now === "spring";
        if (springLayer) springLayer.inert = now === "winter";
      };
      const seedAt = (p: number) => mixHex(SEASON_SEED.winter, SEASON_SEED.spring, smooth(0.38, 0.62, p));
      // Game-loop motion (scrollProgressMotion.ts): the scroll only sets the target, the
      // display's own frames move to it. progress.current is what SeasonsScene's useFrame
      // reads, so the 3D, the page and the colours all show the same position.
      let themeTrigger: ScrollTrigger | null = null;
      const scrollMotion = createScrollProgressMotion((p) => {
        render(p);
        if (themeTrigger?.isActive) takeOver(seedAt(p));
      }, { smoothTime: sectionSmoothTime("seasons") });
      const sceneTrigger = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        refreshPriority: -1,
        onUpdate: (self) => scrollMotion.target(self.progress),
        // A re-measure lands on the true position instead of gliding there from a stale one.
        onRefresh: (self) => scrollMotion.snap(self.progress),
      });
      // Right from the first paint (a reload or Back can land halfway down).
      scrollMotion.snap(sceneTrigger.progress);
      // The theme is taken a little before the scene fills the screen and given back after.
      themeTrigger = ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 45%",
        refreshPriority: -1,
        onToggle: (self) => (self.isActive ? takeOver(seedAt(progress.current)) : giveBack()),
      });
      // The scene just grew to its pinned height: re-measure every trigger below it.
      const refresh = requestScrollRefresh;
      refresh();
      // Images and the 3D study load late and can still move the page.
      window.addEventListener("load", refresh);
      const late = window.setTimeout(refresh, 1500);
      return () => {
        window.removeEventListener("load", refresh);
        window.clearTimeout(late);
        sceneTrigger.kill();
        themeTrigger?.kill();
        scrollMotion.stop();
        if (winterLayer) winterLayer.inert = false;
        if (springLayer) springLayer.inert = false;
        [winterLayer, springLayer, ...winterCards.map((c) => c.card), ...springCards.map((c) => c.card)].forEach((part) => part?.style.removeProperty("transform"));
        [winterLayer, springLayer].forEach((part) => part?.style.removeProperty("opacity"));
        Object.keys(palettes.winter).forEach((name) => el.style.removeProperty(name));
        giveBack(true);
        el.dataset.motion = "false";
        setMotion(false);
      };
    });
    return () => media.revert();
  }, [settings.scrollAnimationsEnabled, theme]);

  // Rose reacts each time the season turns while the scene is on screen.
  useEffect(() => {
    if (!motion || !inView) return;
    const t = window.setTimeout(() => {
      rose.current?.say(ROSE_LINE[season][ar ? "ar" : "en"], 2600);
      if (season === "spring") rose.current?.joy();
    }, 300);
    return () => window.clearTimeout(t);
  }, [season, motion, inView, ar]);

  // Phones: stand in the free corner above the products (measured, see phoneSpot.ts).
  useEffect(() => {
    if (!motion || !near) return;
    return watchMascotSpot(root.current);
  }, [motion, near]);
  useEffect(() => {
    if (!motion || !near) return;
    // Re-measure once the new season's copy has settled into place.
    const t = window.setTimeout(() => placeMascotOnPhone(root.current), 450);
    return () => window.clearTimeout(t);
  }, [season, motion, near]);

  const copy = (key: SeasonKey) => COPY[key][ar ? "ar" : "en"];
  const block = (edit: SeasonEdit) => {
    const c = copy(edit.key);
    return (
      <div className={`season-layer season-${edit.key}`}>
        <div className="season-copy">
          <span className="atelier-eyebrow">
            <Icon name="spark" />
            {c.eyebrow}
            {edit.categoryName ? <em>· {edit.categoryName}</em> : null}
          </span>
          <h2>{c.title}</h2>
          <p>{c.text}</p>
          <Link href={edit.href} className="atelier-button button-dark">
            {c.cta}
            <Icon name="arrow" />
          </Link>
        </div>
        <SeasonRack edit={edit} ar={ar} />
      </div>
    );
  };

  return (
    <section
      ref={root}
      className="rose-seasons"
      data-motion="false"
      data-season="winter"
      data-scene={sceneReady && !sceneFailed ? "ready" : "static"}
      aria-label={ar ? "من الشتاء إلى الربيع" : "From winter to spring"}
    >
      <div className="rose-seasons-sticky">
        <div className="season-sky" aria-hidden="true">
          <span className="sky-winter" />
          <span className="sky-spring" />
          <span className="season-static-snow" />
          <span className="season-static-sun" />
        </div>
        {motion && near && !sceneFailed && (
          <div className="season-canvas" aria-hidden="true">
            <SceneBoundary onError={() => setSceneFailed(true)}>
              <SeasonsScene
                progress={progress}
                active={inView}
                reducedMotion={false}
                showModel={desktop}
                rtl={ar}
                onReady={() => setSceneReady(true)}
                onFailure={() => setSceneFailed(true)}
              />
            </SceneBoundary>
          </div>
        )}
        {motion && near && (
          <RoseMascot
            ref={rose}
            className="season-mascot"
            ar={ar}
            reactive
            prop={season === "winter" ? "umbrella" : "flower"}
            outfit={season === "winter" ? "coat" : "dress"}
            mood={season === "winter" ? "cold" : "happy"}
            mirrored={!ar}
            label={ar ? "رَزان تعيش الفصول" : "Rose through the seasons"}
          />
        )}
        <div className="season-stage">
          {block(winter)}
          {block(spring)}
        </div>
        <div className="season-meter" aria-hidden="true">
          <span className="meter-winter">{ar ? "شتاء" : "Winter"}</span>
          <span className="meter-track"><span /></span>
          <span className="meter-spring">{ar ? "ربيع" : "Spring"}</span>
        </div>
      </div>
    </section>
  );
}
