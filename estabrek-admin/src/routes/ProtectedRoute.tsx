// src/routes/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasTokens } from "../lib/storage";

type Props = {
  children: React.ReactNode;
  /** if you ever want to allow non-superadmin roles later */
  requireSuperAdmin?: boolean;
};

export default function ProtectedRoute({ children, requireSuperAdmin = true }: Props) {
  const location = useLocation();
  const { admin, meQuery, isSuperAdmin } = useAuth();

  // No tokens at all => go login
  if (!hasTokens()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Tokens exist but admin not loaded yet => wait for /admin/account/me
  if (!admin) {
    if (meQuery.isError) {
      // tokens invalid/expired and refresh failed
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">جاري التحقق…</div>
          <div className="mt-2 text-sm opacity-80">لحظات وبنفتح لوحة الإدارة.</div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse bg-white/30" />
          </div>
        </div>
      </div>
    );
  }

  // Admin loaded but not authorized
  if (requireSuperAdmin && !isSuperAdmin()) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-xl font-semibold">غير مصرح</div>
          <div className="mt-2 text-sm opacity-80">
            هذا الحساب لا يملك صلاحيات <b>SUPERADMIN</b>.
          </div>
          <div className="mt-4 text-sm opacity-80">بدك؟ سجّل دخول بحساب أدمن صحيح.</div>
          <div className="mt-6">
            <a
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              href="/login"
            >
              رجوع لتسجيل الدخول
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
