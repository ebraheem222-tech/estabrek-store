"use client";
import Image from "next/image";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useRazan } from "@/store/razan";
import { razanOpen } from "@/lib/razanRuntime";
import { useNames } from "@/store/storeIdentity";
import { tr } from "@/lib/words";
export function RoseShopIntro() {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  const razan = useRazan();
  return <section className="rose-shop-intro" data-rose-palette="pearl">
    <div data-reveal><span className="atelier-eyebrow">{tr(lang, "كل القطع", "THE COLLECTION")}</span>
      <h1>{tr(lang, "المتجر", "The collection")}<span>{tr(lang, "كل القطع في مكان واحد.", "Every piece in one place.")}</span></h1>
      <p>{tr(lang, "حجاب، فساتين، وقطع تختارينها بحب. اكتشفي إطلالتكِ القادمة.", "Hijabs, dresses, and pieces to love. Find your next favourite.")}</p>
      <a href="#shop-products" className="atelier-text-link">{tr(lang, "اكتشفي المجموعة", "Explore the collection")}<Icon name="down" /></a>
      {razan.enabled && razan.styleQuiz.enabled ? (
        <button type="button" className="rose-quiz-cta" onClick={() => razanOpen("quiz")}>{tr(lang, `محتارة؟ ${n.assistant} بتختارلك 🌸`, "Not sure? Let {0} pick for you 🌸", [n.assistant])}</button>
      ) : null}
    </div>
    <div className="rose-shop-intro-image" data-reveal><Image src="/editorial/scarves.webp" alt={tr(lang, "أقمشة وردية وليلكية ولؤلؤية", "Rose, lilac and pearl fabrics")} fill priority sizes="(max-width:760px) 100vw, 45vw" /></div>
  </section>;
}
