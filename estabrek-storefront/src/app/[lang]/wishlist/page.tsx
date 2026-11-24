import WishlistClassic from "@/components/WishlistClassic";
import { RoseWishlist } from "@/components/cinematic/RoseWishlist";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { routeLang, seoAlternates } from "@/lib/seoLang";
import { tr } from "@/lib/words";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  return { title: tr(routeLang(params), "المفضلة", "Wishlist") };
}

export default function WishlistPage() {
  if (process.env.ESTABREK_HOME_MODE === "cms") return <WishlistClassic />;
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page">
        <RoseWishlist />
      </RosePageFrame>
    </main>
  );
}
