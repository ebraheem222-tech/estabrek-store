import { routeLang } from "@/lib/seoLang";
import { tr } from "@/lib/words";
import { AccountView } from "./AccountView";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  return { title: tr(routeLang(params), "حسابي", "My account"), robots: { index: false, follow: false } };
}

export default function AccountPage() {
  return <AccountView mode="login" />;
}
