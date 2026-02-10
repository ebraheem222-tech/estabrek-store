import { Suspense } from "react";
import CheckoutSuccessClient from "@/components/CheckoutSuccessClient";

export const metadata = {
  title: "تم الدفع بنجاح",
};

export default function CheckoutSuccessPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<div className="h-40 rounded-2xl bg-white/5" />}>
        <CheckoutSuccessClient />
      </Suspense>
    </main>
  );
}
