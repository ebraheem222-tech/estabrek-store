import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseStockAlertStop } from "@/components/cinematic/RoseStockAlertStop";
import { routeLang, seoAlternates } from "@/lib/seoLang";
import { tr } from "@/lib/words";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  return { title: tr(routeLang(params), "إيقاف التنبيه", "Stop the alert"), robots: { index: false, follow: false } };
}

/** The stop link from a back-in-stock email (works even if the feature was turned off since). */
export default function StockAlertStopPage({ searchParams }: { searchParams: { t?: string } }) {
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseStockAlertStop token={typeof searchParams?.t === "string" ? searchParams.t : ""} />
      </RosePageFrame>
    </main>
  );
}
