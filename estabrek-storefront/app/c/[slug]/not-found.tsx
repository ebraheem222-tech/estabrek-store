import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-white/70">This page isn't published in CMS, or the slug is wrong.</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500">
        Go home
      </Link>
    </div>
  );
}
