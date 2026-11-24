import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";
import { AccountView } from "../AccountView";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  return { title: tr(routeLang(params), "تسجيل الدخول", "Sign in"), robots: { index: false, follow: false } };
}

/** Signing in (the store's bar links here); signed in already, it is her account. */
export default function AccountLoginPage() {
  return <AccountView mode="login" />;
}
