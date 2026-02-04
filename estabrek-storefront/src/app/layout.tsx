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
  const darkModeDisabled = initialStorefrontSettings?.darkModeEnabled === false;
  const defaultTheme = darkModeDisabled
    ? "light"
    : initialStorefrontSettings?.darkModeDefault === false
    ? "light"
    : "dark";

  return (
    <html lang="ar" dir="rtl" data-theme={defaultTheme} className={defaultTheme} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">تخطي إلى المحتوى</a>
        <Providers initialStorefrontSettings={initialStorefrontSettings}>{children}</Providers>
      </body>
    </html>
  );
}
