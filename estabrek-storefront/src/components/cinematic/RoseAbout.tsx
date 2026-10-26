"use client";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./Language";
import { useRoseStore } from "./StorefrontChrome";
import { RosePageFrame } from "./RosePageFrame";
import { Icon } from "./Icons";
import type { RoseHeroData } from "./RoseSections";
import { useNames, useStoreIdentity } from "@/store/storeIdentity";
import { modestShop, pick } from "@/lib/storeIdentity";
import { tr } from "@/lib/words";
import { useStoreLook } from "@/store/storeLook";
import { ThemeAbout } from "@/storeThemes/inner/ThemeAbout";

/** The about page of a store that isn't modest fashion and has no theme: its own words, nothing else's. */
function PlainAbout() {
  const lang = useLanguage().language, store = useRoseStore();
  const n = useNames(), id = useStoreIdentity();
  return <RosePageFrame className="rose-about">
    <section className="rose-about-hero" data-rose-palette="pearl">
      <div className="rose-about-hero-copy" data-reveal><span className="atelier-eyebrow">{tr(lang, "قصتنا", "OUR STORY")}</span>
        <h1>{pick(id.tagline, lang) || n.store}</h1>
        <p>{pick(id.about, lang) || store.footerDescription || tr(lang, `أهلاً فيكم بـ${n.store}.`, "Welcome to {0}.", [n.store])}</p>
        <Link href="/shop" className="atelier-text-link">{tr(lang, "تسوّق الآن", "Shop now")}<Icon name="arrow" /></Link>
      </div>
      {store.logoUrl ? <div className="rose-about-portrait" data-reveal><Image src={store.logoUrl} alt={n.storeName} fill sizes="(max-width:760px) 100vw, 50vw" style={{ objectFit: "contain", padding: "12%" }} /></div> : null}
    </section>
  </RosePageFrame>;
}

export function RoseAboutHero({ data }: { data?: RoseHeroData }) {
  const lang = useLanguage().language, ar = lang === "ar", store = useRoseStore();
  const n = useNames();
  return <section className="rose-about-hero" data-rose-palette={data?.rosePresentation?.palette || "blush"}>
    <div className="rose-about-hero-copy" data-reveal><span className="atelier-eyebrow">{tr(lang, "قصتنا", "OUR STORY")}</span>
      <h1>{data?.roseTitle || data?.title || (tr(lang, "أناقة تشبهكِ.", "Modesty, beautifully yours."))}</h1>
      <p>{data?.subtitle || (tr(lang, "كل إطلالة تبدأ باختيار صغير. لون تحبينه، تفصيلة تريحكِ، وقطعة تعبّرين فيها عن نفسكِ.", "Every look begins with a little choice. A colour you love. A detail that feels right. A piece that feels like you."))}</p>
      {data ? <div className="rose-about-actions">{[data.primaryButton, data.secondaryButton].filter(b => b?.href && b.label).map((b, i) => <Link key={i} href={b!.href!} className="atelier-text-link">{b!.label}<Icon name="arrow" /></Link>)}</div> : <Link href="/shop" className="atelier-text-link">{tr(lang, `اكتشفي ${n.store}`, "Discover {0}", [n.store])}<Icon name="arrow" /></Link>}
    </div>
    <div className="rose-about-portrait" data-reveal><Image src={data?.roseImageUrl || (data?.backgroundImageUrl && data.backgroundImageUrl !== store.logoUrl ? data.backgroundImageUrl : "/editorial/hijab-campaign.webp")} alt={data?.roseImageAlt || (tr(lang, "إطلالة محتشمة بحجاب وردي", "A modest look in rose"))} fill priority sizes="(max-width:760px) 100vw, 50vw" /><span>MODESTLY, BEAUTIFULLY YOU</span></div>
  </section>;
}

export function RoseAbout() {
  const lang = useLanguage().language, ar = lang === "ar", store = useRoseStore();
  const n = useNames(), id = useStoreIdentity();
  const look = useStoreLook();
  // A store with a theme tells its story in its theme; one without, and not a modest store, without the hijab pictures and words.
  if (look.theme) return <RosePageFrame className="rose-about"><ThemeAbout lang={lang} /></RosePageFrame>;
  if (!look.modest) return <PlainAbout />;
  const values = lang === "he" ? [{ title: "צניעות בביטחון.", text: "חיג'אבים ובגדים צנועים הם חלק מהסיפור שלך ומהסגנון היומיומי." }, { title: "הטעם שלך קודם.", text: "צבעים ופרטים לגלות. בוחרים את מה שמרגיש כמוך." }, { title: "באהבה, בכל פרט.", text: "מקום לגלות פריטים, להשוות אפשרויות ולשאול אותנו על הפרטים." }] : ar ? [{ title: "احتشام بثقة.", text: "الحجاب والملابس المحتشمة جزء من حكايتكِ، ومن أسلوبكِ كل يوم." }, { title: "ذوقكِ أولاً.", text: "ألوان وتفاصيل مختلفة، تختارين منها ما يشبهكِ وما يناسب إطلالتكِ." }, { title: "كل تفصيلة، بحب.", text: "مساحة لاكتشاف القطع، مقارنة الخيارات، وسؤالنا عن التفاصيل قبل اختياركِ." }] : [{ title: "Confident modesty.", text: "Hijabs and modest clothing, a part of your story and your everyday style." }, { title: "Your style comes first.", text: "Colours and details to explore. Choose what feels like you." }, { title: "With love, in every detail.", text: "A place to discover pieces, compare options, and ask us about the details." }];
  return <RosePageFrame className="rose-about">
    <RoseAboutHero />
    <section className="rose-about-story" data-rose-palette="lilac">
      <div className="rose-about-fabric" data-reveal><Image src="/editorial/scarves.webp" alt={tr(lang, "طيات من القماش بألوان هادئة", "Fabric folds in soft colours")} fill sizes="(max-width:760px) 100vw, 50vw" /></div>
      <div data-reveal><span className="atelier-eyebrow">{tr(lang, `روح ${n.store}`, "THE {0} FEELING", [n.store.toUpperCase()])}</span><h2>{ar ? <>أكثر من إطلالة.<br /><em>مساحة لذوقكِ.</em></> : lang === "he" ? <>יותר מלוק.<br /><em>מקום קטן בשבילך.</em></> : <>More than a look.<br /><em>A little space for you.</em></>}</h2><p>{store.footerDescription || (modestShop(id) ? (tr(lang, `${n.store} متجر للحجاب والملابس المحتشمة. نمنحكِ مساحة لتكتشفي الألوان والقطع التي تناسب ذوقكِ، وتختاري إطلالة بطريقتكِ.`, "{0} is a store for hijabs and modest clothing. Explore colours and pieces that suit your taste, and make your look your own.", [n.store])) : pick(id.about, lang))}</p><Link href="/contact" className="atelier-text-link">{tr(lang, "خلينا نحكي", "Let's talk")}<Icon name="arrow" /></Link></div>
    </section>
    <section className="rose-about-values" data-rose-palette="pearl">{values.map((v, i) => <article key={i} data-reveal><Icon name="spark" /><h2>{v.title}</h2><p>{v.text}</p></article>)}</section>
    <section className="rose-about-finale" data-rose-palette="berry">{store.logoUrl ? <Image src={store.logoUrl} alt={n.storeName} width={120} height={120} /> : <span className="rose-about-wordmark">{n.store}</span>}<h2>{tr(lang, "حكايتكِ، بطريقتكِ.", "Your story. Your way.")}</h2><Link href="/shop" className="atelier-button button-light">{tr(lang, "اكتشفي المجموعة", "Discover the collection")}<Icon name="arrow" /></Link></section>
  </RosePageFrame>;
}
