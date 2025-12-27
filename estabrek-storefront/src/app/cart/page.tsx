import CartClient from "@/components/CartClient";
import { getPublicSettings } from "@/lib/api";

export const metadata = {
  title: "سلة المشتريات",
};

export default async function CartPage() {
  const settings = await getPublicSettings().catch(() => null);
  const site = settings?.site || {};
  return (
    <CartClient
      checkoutMode={(site as any).checkoutMode ?? "WHATSAPP"}
      whatsappNumber={(site as any).whatsappNumber ?? (site as any).contactPhone ?? null}
      ordersEmail={(site as any).ordersEmail ?? (site as any).contactEmail ?? null}
    />
  );
}
