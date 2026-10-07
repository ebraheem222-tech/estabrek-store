"use client";
import Image from "next/image";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useRazan } from "@/store/razan";
import { razanOpen } from "@/lib/razanRuntime";
export function RoseShopIntro() {
  const ar = useLanguage().language === "ar";
  const razan = useRazan();
  return <section className="rose-shop-intro" data-rose-palette="pearl">
    <div data-reveal><span className="atelier-eyebrow">{ar ? "كل القطع" : "THE COLLECTION"}</span>
      <h1>{ar ? "المتجر" : "The collection"}<span>{ar ? "كل القطع في مكان واحد." : "Every piece in one place."}</span></h1>
      <p>{ar ? "حجاب، فساتين، وقطع تختارينها بحب. اكتشفي إطلالتكِ القادمة." : "Hijabs, dresses, and pieces to love. Find your next favourite."}</p>
      <a href="#shop-products" className="atelier-text-link">{ar ? "اكتشفي المجموعة" : "Explore the collection"}<Icon name="down" /></a>
      {razan.enabled && razan.styleQuiz.enabled ? (
        <button type="button" className="rose-quiz-cta" onClick={() => razanOpen("quiz")}>{ar ? "محتارة؟ رزان بتختارلك 🌸" : "Not sure? Let Rose pick for you 🌸"}</button>
      ) : null}
    </div>
    <div className="rose-shop-intro-image" data-reveal><Image src="/editorial/scarves.webp" alt={ar ? "أقمشة وردية وليلكية ولؤلؤية" : "Rose, lilac and pearl fabrics"} fill priority sizes="(max-width:760px) 100vw, 45vw" /></div>
  </section>;
}
