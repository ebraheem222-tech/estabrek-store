import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";
import { AccountView } from "./AccountView";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  return { title: tr(routeLang(await props.params), "حسابي", "My account"), robots: { index: false, follow: false } };
}

export default function AccountPage() {
  return <AccountView mode="login" />;
}
