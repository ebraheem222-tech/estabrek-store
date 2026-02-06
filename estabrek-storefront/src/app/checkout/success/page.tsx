import CheckoutSuccessClient from "@/components/CheckoutSuccessClient";

export const metadata = {
  title: "تم الدفع بنجاح",
};

export default function CheckoutSuccessPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12">
      <CheckoutSuccessClient />
    </main>
  );
}
