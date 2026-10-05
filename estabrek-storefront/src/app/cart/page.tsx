import CartClient from "@/components/CartClient";
import { RoseCart } from "@/components/cinematic/RoseCart";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { getPublicSettings } from "@/lib/api";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";

export const revalidate = 300;

export const metadata = {
  title: "سلة المشتريات",
};

export default async function CartPage() {
  const settings = await getPublicSettings().catch(() => null);
  const site = settings?.site || {};
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideCart !== false) {
    const cms = await renderCmsPageBySlug("/cart", undefined, { allowFallback: false, allowNotFound: false });
    if (cms) {
      return (
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">
          {cms}
        </main>
      );
    }
  }
  const cfg = site as any;
  if (process.env.ESTABREK_HOME_MODE !== "cms") {
    return (
      <main id="main-content" tabIndex={-1}>
        <RosePageFrame className="rose-shop rose-cart-page">
          <RoseCart
            checkoutMode={cfg.checkoutMode ?? "WHATSAPP"}
            whatsappNumber={cfg.whatsappNumber ?? cfg.contactPhone ?? null}
            ordersEmail={cfg.ordersEmail ?? null}
            stripeEnabled={cfg.stripeEnabled ?? false}
            paypalEnabled={cfg.paypalEnabled ?? false}
            countryCode={cfg.storeCountryCode ?? null}
            delivery={cfg.header?.delivery ?? null}
          />
        </RosePageFrame>
      </main>
    );
  }
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">
      <CartClient
        checkoutMode={(site as any).checkoutMode ?? "WHATSAPP"}
        whatsappNumber={(site as any).whatsappNumber ?? (site as any).contactPhone ?? null}
        ordersEmail={(site as any).ordersEmail ?? (site as any).contactEmail ?? null}
        stripeEnabled={(site as any).stripeEnabled ?? false}
        paypalEnabled={(site as any).paypalEnabled ?? false}
      />
    </main>
  );
}
