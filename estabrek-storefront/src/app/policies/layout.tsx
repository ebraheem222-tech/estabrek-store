import React from "react";

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">
      {children}
    </main>
  );
}
