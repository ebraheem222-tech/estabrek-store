import CartClient from "@/components/CartClient";
import { getPublicSettings } from "@/lib/api";
import Link from "next/link";
import { FloatingOrbs } from "@/components/candy/GsapAnimations";

export const metadata = { title: "سلة المشتريات | إستبرق" };

export default async function CartPage() {
  const settings = await getPublicSettings().catch(() => null);
  const site = settings?.site || {};
  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />
      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">سلة المشتريات</span>
      </nav>
      <section className="candy-section" style={{ paddingTop:"1.5rem" }}>
        <div className="candy-container">
          <div style={{ marginBottom:"1.5rem" }}>
            <div className="candy-section-eyebrow">🛒 مشترياتك</div>
            <h1 className="candy-section-title">سلة <span className="grad">المشتريات</span></h1>
          </div>
          <CartClient
            checkoutMode={(site as any).checkoutMode ?? "WHATSAPP"}
            whatsappNumber={(site as any).whatsappNumber ?? (site as any).contactPhone ?? null}
            ordersEmail={(site as any).ordersEmail ?? (site as any).contactEmail ?? null}
            stripeEnabled={(site as any).stripeEnabled ?? false}
            paypalEnabled={(site as any).paypalEnabled ?? false}
            paypalClientId={(site as any).paypalClientId ?? null}
            currencyCode={(site as any).currencyCode ?? "ILS"}
          />
        </div>
      </section>
    </main>
  );
}
