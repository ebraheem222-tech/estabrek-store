import CartClient from "@/components/CartClient";
import { getPublicSettings } from "@/lib/api";
import { renderCmsPageBySlug } from "../[[...slug]]/page";

export const metadata = {
  title: "سلة المشتريات",
};

export default async function CartPage() {
  const settings = await getPublicSettings().catch(() => null);
  const site = settings?.site || {};
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideCart !== false) {
    const cms = await renderCmsPageBySlug("/cart", undefined, { allowFallback: false, allowNotFound: false });
    if (cms) return cms;
  }
  return (
    <CartClient
      checkoutMode={(site as any).checkoutMode ?? "WHATSAPP"}
      whatsappNumber={(site as any).whatsappNumber ?? (site as any).contactPhone ?? null}
      ordersEmail={(site as any).ordersEmail ?? (site as any).contactEmail ?? null}
    />
  );
}
