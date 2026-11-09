"use client";
import Image from "next/image";
import { Fragment, useEffect, useRef } from "react";
import { RoseShopRing, type RingPiece } from "./RoseShopRing";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useRazan } from "@/store/razan";
import { razanOpen } from "@/lib/razanRuntime";
import { useNames } from "@/store/storeIdentity";
import { tr } from "@/lib/words";
import { useStoreLook } from "@/store/storeLook";
import { ThemeIntro } from "@/storeThemes/inner/ThemeIntro";
import { modelFor } from "@/storeThemes/inner/modelFor";
import { say } from "@/storeThemes/words";
/** The silk film in the opening's arch: muted, looping, only once it may move (and not for less motion). */
function SilkFilm() {
  const film = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = film.current;
    if (!video) return;
    video.muted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = () => { video.preload = "auto"; void video.play().catch(() => undefined); };
    const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: object) => number);
    const handle = idle ? idle(start, { timeout: 1500 }) : window.setTimeout(start, 600);
    return () => { if (!idle) window.clearTimeout(handle); };
  }, []);
  return <video ref={film} className="rose-stage-film" muted loop playsInline preload="none" poster="/editorial/rose-campaign-poster.webp" aria-hidden="true">
    <source src="/editorial/rose-campaign-mobile.webm" type="video/webm" media="(max-width: 760px)" />
    <source src="/editorial/rose-campaign-mobile.mp4" type="video/mp4" media="(max-width: 760px)" />
    <source src="/editorial/rose-campaign.webm" type="video/webm" />
    <source src="/editorial/rose-campaign.mp4" type="video/mp4" />
  </video>;
}

/** Words that rise one after another (the opening's title). */
function Rising({ text, from = 0 }: { text: string; from?: number }) {
  return <>{text.split(" ").map((word, i) => <Fragment key={i}>{i ? " " : null}<span className="rose-rise" style={{ "--i": from + i } as React.CSSProperties}>{word}</span></Fragment>)}</>;
}

export function RoseShopIntro({ showcase = [] }: { showcase?: RingPiece[] }) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  const razan = useRazan();
  const look = useStoreLook();
  // A store with a theme: its own opening, drawing and model of what it sells.
  if (look.theme) {
    const t = look.theme;
    return <ThemeIntro eyebrow={say(t.copy.productsTitle, lang)} title={tr(lang, "كل المنتجات", "All products")} subtitle={say(t.copy.subtitle, lang)} cta={{ label: say(t.copy.cta, lang), href: "#shop-products" }} model={modelFor(t, look.industry)} />;
  }
  // The opening: the words on one side; on the other an arch with the silk film (in the colour picked) and the
  // shop's own pieces turning around it on a 3D ring (rose-showcase.css).
  const stage = look.modest || showcase.length >= 3;
  return <section className={`rose-shop-intro${stage ? " rose-shop-stage" : ""}`} data-rose-palette="pearl">
    <div data-reveal><span className="atelier-eyebrow">{tr(lang, "كل القطع", "THE COLLECTION")}</span>
      <h1><Rising text={tr(lang, "المتجر", "The collection")} /><span><Rising text={tr(lang, "كل القطع في مكان واحد.", "Every piece in one place.")} from={2} /></span></h1>
      <p>{look.modest ? tr(lang, "حجاب، فساتين، وقطع تختارينها بحب. اكتشفي إطلالتكِ القادمة.", "Hijabs, dresses, and pieces to love. Find your next favourite.") : tr(lang, "كل منتجاتنا بمكان واحد، اختار اللي بيناسبك.", "Everything we sell in one place. Find what suits you.")}</p>
      <a href="#shop-products" className="atelier-text-link">{tr(lang, "اكتشفي المجموعة", "Explore the collection")}<Icon name="down" /></a>
      {razan.enabled && razan.styleQuiz.enabled ? (
        <button type="button" className="rose-quiz-cta" onClick={() => razanOpen("quiz")}>{tr(lang, `محتارة؟ ${n.assistant} بتختارلك 🌸`, "Not sure? Let {0} pick for you 🌸", [n.assistant])}</button>
      ) : null}
    </div>
    {stage ? <div className="rose-stage-visual">
      <div className="rose-stage-arch">
        {look.modest ? <SilkFilm /> : <Image src="/editorial/scarves.webp" alt="" fill priority sizes="(max-width:760px) 60vw, 26vw" />}
        <span className="rose-stage-dye" aria-hidden="true" />
      </div>
      <svg className="rose-stage-line" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} d="M2 138V50A48 48 0 0 1 98 50V138" /></svg>
      <RoseShopRing pieces={showcase} label={tr(lang, "قطع من المتجر، اسحبي لتلفّيها", "Pieces from the shop: drag to turn them")} />
    </div> : null}
  </section>;
}
