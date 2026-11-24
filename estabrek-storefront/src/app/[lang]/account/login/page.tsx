import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";
import { AccountView } from "../AccountView";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  return { title: tr(routeLang(await props.params), "تسجيل الدخول", "Sign in"), robots: { index: false, follow: false } };
}

/** Signing in (the store's bar links here); signed in already, it is her account. */
export default function AccountLoginPage() {
  return <AccountView mode="login" />;
}
