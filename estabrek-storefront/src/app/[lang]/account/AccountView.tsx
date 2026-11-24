import { notFound } from "next/navigation";
import { RoseAccount, type AccountMode } from "@/components/cinematic/RoseAccount";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { getPublicSettings } from "@/lib/api";
import { googleClientId } from "@/lib/googleSignIn";
import { socialSignIn } from "@/lib/socialSignIn";

/** حسابي, signing in (/account, /account/login) or a new account (/account/register): only while accounts are on. */
export async function AccountView({ mode }: { mode: AccountMode }) {
  // Admin → Settings → حسابات الزبائن. While it's off the store is visitors only.
  const { site } = await getPublicSettings();
  if (site?.customerAccountsEnabled !== true) notFound();
  const header = (site as { header?: unknown } | null)?.header;
  const social = socialSignIn(header);

  return (
    <main id="main-content" tabIndex={-1}>
      <RosePageFrame className="rose-shop rose-cart-page rose-account-page">
        <RoseAccount googleClientId={googleClientId(header)} discord={social.discord} steam={social.steam} mode={mode} />
      </RosePageFrame>
    </main>
  );
}
