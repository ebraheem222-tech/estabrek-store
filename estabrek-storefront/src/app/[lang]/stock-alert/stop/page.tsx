import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseStockAlertStop } from "@/components/cinematic/RoseStockAlertStop";
import { routeLang, seoAlternates } from "@/lib/seoLang";
import { tr } from "@/lib/words";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  return { title: tr(routeLang(params), "إيقاف التنبيه", "Stop the alert"), robots: { index: false, follow: false } };
}

/** The stop link from a back-in-stock email (works even if the feature was turned off since). */
export default async function StockAlertStopPage(props: { searchParams: Promise<{ t?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseStockAlertStop token={typeof searchParams?.t === "string" ? searchParams.t : ""} />
      </RosePageFrame>
    </main>
  );
}
