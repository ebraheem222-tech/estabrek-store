import { Suspense } from "react";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RosePayRequest } from "@/components/cinematic/RosePayRequest";
import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  return { title: tr(routeLang(params), "الدفع", "Payment"), robots: { index: false, follow: false } };
}

/** A payment the shop asked for (a function's «اطلب دفع» step): its link, sent to the shopper. */
export default async function PayRequestPage(props: { params: Promise<{ lang: string; token: string }> }) {
  const params = await props.params;
  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <Suspense fallback={<section className="rose-account rose-pay" data-testid="pay-page" data-status="LOADING" />}>
          <RosePayRequest token={typeof params?.token === "string" ? params.token : ""} />
        </Suspense>
      </RosePageFrame>
    </main>
  );
}
