import WishlistClassic from "@/components/WishlistClassic";
import { RoseWishlist } from "@/components/cinematic/RoseWishlist";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";

export const metadata = { title: "المفضلة" };

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
