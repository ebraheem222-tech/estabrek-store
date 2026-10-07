import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseRequestPage } from "@/components/cinematic/RoseRequestPage";

export const metadata = { title: "اطلبي قطعتكِ", robots: { index: false, follow: true } };

/** «اطلبي قطعتكِ»: ask the shop for a size, colour or piece it doesn't have (admin → الطلبات الخاصة). */
export default function RequestPage({ searchParams }: { searchParams: { q?: string; from?: string } }) {
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseRequestPage query={typeof searchParams?.q === "string" ? searchParams.q.slice(0, 200) : ""} fromImage={searchParams?.from === "image"} />
      </RosePageFrame>
    </main>
  );
}
