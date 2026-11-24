import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";
import { AccountView } from "../AccountView";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  return { title: tr(routeLang(await props.params), "حساب جديد", "New account"), robots: { index: false, follow: false } };
}

/** A new account: a name and an email, then the code (the store's bar links here). */
export default function AccountRegisterPage() {
  return <AccountView mode="register" />;
}
