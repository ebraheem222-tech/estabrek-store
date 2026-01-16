import CmsPageRoute from "../[[...slug]]/page";

type SP = Record<string, string | string[] | undefined>;

export default async function ContactPage({ searchParams }: { searchParams?: SP }) {
  return CmsPageRoute({ params: { slug: ["contact"] }, searchParams });
}
