import "./globals.css";
import "../cms/effects/effects.css";
import Providers from "./providers";
import { getPublicSettings } from "@/lib/api";

export const metadata = {
  title: "Estabrak Store",
  description: "Storefront",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings().catch(() => null);
  const initialStorefrontSettings = (settings?.site as any)?.header?.storefront ?? undefined;

  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers initialStorefrontSettings={initialStorefrontSettings}>{children}</Providers>
      </body>
    </html>
  );
}
