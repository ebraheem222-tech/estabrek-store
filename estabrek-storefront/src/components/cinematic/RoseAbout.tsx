"use client";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./Language";
import { useRoseStore } from "./StorefrontChrome";
import { RosePageFrame } from "./RosePageFrame";
import { Icon } from "./Icons";
import type { RoseHeroData } from "./RoseSections";

export function RoseAboutHero({ data }: { data?: RoseHeroData }) {
  const ar = useLanguage().language === "ar", store = useRoseStore();
  return <section className="rose-about-hero" data-rose-palette={data?.rosePresentation?.palette || "blush"}>
    <div className="rose-about-hero-copy" data-reveal><span className="atelier-eyebrow">{ar ? "قصتنا" : "OUR STORY"}</span>
      <h1>{data?.roseTitle || data?.title || (ar ? "أناقة تشبهكِ." : "Modesty, beautifully yours.")}</h1>
      <p>{data?.subtitle || (ar ? "كل إطلالة تبدأ باختيار صغير. لون تحبينه، تفصيلة تريحكِ، وقطعة تعبّرين فيها عن نفسكِ." : "Every look begins with a little choice. A colour you love. A detail that feels right. A piece that feels like you.")}</p>
      {data ? <div className="rose-about-actions">{[data.primaryButton, data.secondaryButton].filter(b => b?.href && b.label).map((b, i) => <Link key={i} href={b!.href!} className="atelier-text-link">{b!.label}<Icon name="arrow" /></Link>)}</div> : <Link href="/shop" className="atelier-text-link">{ar ? "اكتشفي استبرق" : "Discover Estabrek"}<Icon name="arrow" /></Link>}
    </div>
    <div className="rose-about-portrait" data-reveal><Image src={data?.roseImageUrl || (data?.backgroundImageUrl && data.backgroundImageUrl !== store.logoUrl ? data.backgroundImageUrl : "/editorial/hijab-campaign.webp")} alt={data?.roseImageAlt || (ar ? "إطلالة محتشمة بحجاب وردي" : "A modest look in rose")} fill priority sizes="(max-width:760px) 100vw, 50vw" /><span>MODESTLY, BEAUTIFULLY YOU</span></div>
  </section>;
}

export function RoseAbout() {
  const ar = useLanguage().language === "ar", store = useRoseStore();
  const values = ar ? [{ title: "احتشام بثقة.", text: "الحجاب والملابس المحتشمة جزء من حكايتكِ، ومن أسلوبكِ كل يوم." }, { title: "ذوقكِ أولاً.", text: "ألوان وتفاصيل مختلفة، تختارين منها ما يشبهكِ وما يناسب إطلالتكِ." }, { title: "كل تفصيلة، بحب.", text: "مساحة لاكتشاف القطع، مقارنة الخيارات، وسؤالنا عن التفاصيل قبل اختياركِ." }] : [{ title: "Confident modesty.", text: "Hijabs and modest clothing, a part of your story and your everyday style." }, { title: "Your style comes first.", text: "Colours and details to explore. Choose what feels like you." }, { title: "With love, in every detail.", text: "A place to discover pieces, compare options, and ask us about the details." }];
  return <RosePageFrame className="rose-about">
    <RoseAboutHero />
    <section className="rose-about-story" data-rose-palette="lilac">
      <div className="rose-about-fabric" data-reveal><Image src="/editorial/scarves.webp" alt={ar ? "طيات من القماش بألوان هادئة" : "Fabric folds in soft colours"} fill sizes="(max-width:760px) 100vw, 50vw" /></div>
      <div data-reveal><span className="atelier-eyebrow">{ar ? "روح استبرق" : "THE ESTABREK FEELING"}</span><h2>{ar ? <>أكثر من إطلالة.<br /><em>مساحة لذوقكِ.</em></> : <>More than a look.<br /><em>A little space for you.</em></>}</h2><p>{store.footerDescription || (ar ? "استبرق متجر للحجاب والملابس المحتشمة. نمنحكِ مساحة لتكتشفي الألوان والقطع التي تناسب ذوقكِ، وتختاري إطلالة بطريقتكِ." : "Estabrek is a store for hijabs and modest clothing. Explore colours and pieces that suit your taste, and make your look your own.")}</p><Link href="/contact" className="atelier-text-link">{ar ? "خلينا نحكي" : "Let's talk"}<Icon name="arrow" /></Link></div>
    </section>
    <section className="rose-about-values" data-rose-palette="pearl">{values.map((v, i) => <article key={i} data-reveal><Icon name="spark" /><h2>{v.title}</h2><p>{v.text}</p></article>)}</section>
    <section className="rose-about-finale" data-rose-palette="berry"><Image src={store.logoUrl || "/editorial/estabrek-logo.webp"} alt={store.siteName || "استبرق"} width={120} height={120} /><h2>{ar ? "حكايتكِ، بطريقتكِ." : "Your story. Your way."}</h2><Link href="/shop" className="atelier-button button-light">{ar ? "اكتشفي المجموعة" : "Discover the collection"}<Icon name="arrow" /></Link></section>
  </RosePageFrame>;
}
