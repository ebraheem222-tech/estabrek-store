import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseStockAlertStop } from "@/components/cinematic/RoseStockAlertStop";

export const metadata = { title: "إيقاف التنبيه", robots: { index: false, follow: false } };

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
