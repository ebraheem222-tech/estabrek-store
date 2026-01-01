import "./globals.css";
import Providers from "./providers";
import "../cms/effects/effects.css";
export const metadata = {
  title: "Estabrak Store",
  description: "Storefront",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
