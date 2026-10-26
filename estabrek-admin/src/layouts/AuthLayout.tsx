// src/layouts/AuthLayout.tsx
import React, { Suspense } from "react";
import { Spinner } from "../components/ui/Spinner";
import { LanguageSwitch } from "./shell/LanguageSwitch";
import { tr } from "@/lib/words";

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface-950 text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 end-1/4 w-[600px] h-[600px] bg-accent-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 start-1/4 w-[500px] h-[500px] bg-accent-600/[0.02] rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* The admin's language, before signing in too (kept on this browser). */}
      <div className="fixed top-4 end-4 z-10">
        <LanguageSwitch />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center p-6">
        <Suspense fallback={<Spinner size="lg" />}>{children}</Suspense>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 end-0 start-0 text-center">
        <p className="text-xs text-white/30">
          © {new Date().getFullYear()} — {tr("لوحة إدارة المتجر", "Store admin")}
        </p>
      </div>
    </div>
  );
}
