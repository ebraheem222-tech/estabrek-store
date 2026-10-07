import { notFound } from "next/navigation";
import { RoseAccount } from "@/components/cinematic/RoseAccount";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { getPublicSettings } from "@/lib/api";

export const metadata = { title: "حسابي", robots: { index: false, follow: false } };

export default async function AccountPage() {
  // Admin → Settings → حسابات الزبائن. While it's off the store is visitors only.
  const { site } = await getPublicSettings();
  if (site?.customerAccountsEnabled !== true) notFound();

  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseAccount />
      </RosePageFrame>
    </main>
  );
}
