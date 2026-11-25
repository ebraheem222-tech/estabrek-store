import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseRequestPage } from "@/components/cinematic/RoseRequestPage";
import { routeLang, seoAlternates } from "@/lib/seoLang";
import { tr } from "@/lib/words";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  return { title: tr(routeLang(params), "اطلبي قطعتكِ", "Request a piece"), robots: { index: false, follow: true } };
}

/** «اطلبي قطعتكِ»: ask the shop for a size, colour or piece it doesn't have (admin → الطلبات الخاصة). */
export default async function RequestPage(props: { searchParams: Promise<{ q?: string; from?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseRequestPage query={typeof searchParams?.q === "string" ? searchParams.q.slice(0, 200) : ""} fromImage={searchParams?.from === "image"} />
      </RosePageFrame>
    </main>
  );
}
