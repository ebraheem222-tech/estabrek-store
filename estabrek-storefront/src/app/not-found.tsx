import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl font-arabic" dir="rtl">
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
        <div className="text-5xl font-bold text-white/90">404</div>
        <h1 className="mt-3 text-xl font-semibold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-white/70">عذرًا، لم نجد الصفحة المطلوبة.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast)] hover:opacity-90"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/shop"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            تصفح المنتجات
          </Link>
        </div>
      </div>
    </div>
  );
}
