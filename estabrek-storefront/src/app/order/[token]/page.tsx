import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseOrderAccess } from "@/components/cinematic/RoseOrderAccess";

export const metadata = { title: "طلبكِ", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

/** The private link sent after paying / acceptance: downloads and tickets. */
export default function OrderAccessPage({ params }: { params: { token: string } }) {
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseOrderAccess token={typeof params?.token === "string" ? decodeURIComponent(params.token) : ""} />
      </RosePageFrame>
    </main>
  );
}
