import { RoseTrack } from "@/components/cinematic/RoseTrack";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  return { title: tr(routeLang(params), "تابعي طلبكِ", "Track your order"), robots: { index: false, follow: false } };
}

/** «تابعي طلبكِ»: an order placed without an account, by its number and phone (RoseTrack). */
export default function TrackPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseTrack />
      </RosePageFrame>
    </main>
  );
}
