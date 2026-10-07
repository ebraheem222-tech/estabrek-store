"use client";
import Link from "next/link";
import { useSiteFeatures } from "@/store/siteFeatures";
import { useLanguage } from "./Language";
import { RoseRequestForm } from "./RoseRequestForm";

/** The /request page: a short promise, then the form (or a way to reach us while it's off). */
export function RoseRequestPage({ query, fromImage }: { query: string; fromImage: boolean }) {
  const ar = useLanguage().language === "ar";
  const { requests } = useSiteFeatures();
  return (
    <section className="rose-account rose-request-page" data-testid="request-page">
      <span className="atelier-eyebrow">{ar ? "اطلبي قطعتكِ" : "REQUEST A PIECE"}</span>
      {requests.enabled ? (
        <>
          <h1>{ar ? "ما لقيتي اللي بدك؟ احكيلنا." : "Didn't find it? Tell us."}</h1>
          <p>{ar ? "مقاس مش موجود، لون تاني، أو قطعة شفتيها بمحل تاني — ابعتيلنا وصفها أو صورتها، ونحن بندوّر عليها بأقصى جهدنا ونخبّركِ." : "A missing size, another colour, or a piece you saw elsewhere — send us a description or a photo and we'll do our best to find it."}</p>
          <RoseRequestForm source={fromImage ? "IMAGE_SEARCH" : query ? "SEARCH" : "PAGE"} initialKind="NEW_PIECE" initialDetails={query} withHandedPhoto={fromImage} />
        </>
      ) : (
        <>
          <h1>{ar ? "احكيلنا شو بدك" : "Tell us what you need"}</h1>
          <p>{ar ? "راسلينا وفريقنا بيساعدكِ تلاقي القطعة." : "Message us and our team will help you find it."}</p>
          <p><Link className="atelier-button button-dark" href="/contact">{ar ? "صفحة التواصل" : "Contact us"}</Link></p>
        </>
      )}
    </section>
  );
}
