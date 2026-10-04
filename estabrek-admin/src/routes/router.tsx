// src/routes/router.tsx
import React, { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import type { AdminPermission } from "../lib/authz";

// features pages
const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const TwoFactorPage = lazy(() => import("../features/auth/TwoFactorPage"));
const ForgotPasswordPage = lazy(() => import("../features/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../features/auth/ResetPasswordPage"));

const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));

const ProfilePage = lazy(() => import("../features/account/ProfilePage"));
const EmailChangePage = lazy(() => import("../features/account/EmailChangePage"));
const SecurityCenterPage = lazy(() => import("../features/account/SecurityCenterPage"));

const OrdersPage = lazy(() => import("../features/orders/OrdersPage"));
const OrderDetailsPage = lazy(() => import("../features/orders/OrderDetailsPage"));
const OrderPrintPage = lazy(() => import("../features/orders/OrderPrintPage"));

const OutboxPage = lazy(() => import("../features/outbox/OutboxPage"));
const OutboxDetailsPage = lazy(() => import("../features/outbox/OutboxDetailsPage"));

const CategoriesPage = lazy(() => import("../features/catalog/CategoriesPage"));
const ProductsPage = lazy(() => import("../features/catalog/ProductsPage"));
const ProductEditorPage = lazy(() => import("../features/catalog/ProductEditorPage"));
const ProductComposerPage = lazy(() => import("../features/catalog/ProductComposerPage"));
const SizesPage = lazy(() => import("../features/catalog/SizesPage"));

const LowStockPage = lazy(() => import("../features/inventory/LowStockPage"));
const InventoryAdjustmentsPage = lazy(() => import("../features/inventory/InventoryAdjustmentsPage"));

const CouponsPage = lazy(() => import("../features/discounts/CouponsPage"));
const CouponTesterPage = lazy(() => import("../features/discounts/CouponTesterPage"));

const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const ChatbotPage = lazy(() => import("../features/chatbot/ChatbotPage"));
const NavPage = lazy(() => import("../features/nav/NavPage"));
const MediaCenterPage = lazy(() => import("../features/media/MediaCenterPage"));

const PagesListPage = lazy(() => import("../features/pages/PagesListPage"));
const PageEditorPage = lazy(() => import("../features/pages/PageEditorPage"));
const PagePreviewPage = lazy(() => import("../features/pages/PagePreviewPage"));

const ReviewsPage = lazy(() => import("../features/ugc/ReviewsPage"));
const CommentsPage = lazy(() => import("../features/ugc/CommentsPage"));
import { ErrorBoundary } from "../components/ErrorBoundary";

function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-semibold">الصفحة غير موجودة</div>
        <a className="mt-4 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15" href="/admin/dashboard">
          رجوع للوحة التحكم
        </a>
      </div>
    </div>
  );
}

export default function AppRouter() {
  const withPermissions = (element: React.ReactNode, permissions: AdminPermission[]) => (
    <ProtectedRoute requireSuperAdmin={false} requirePermissions={permissions}>
      {element}
    </ProtectedRoute>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route
          path="/login/mfa"
          element={
            <AuthLayout>
              <TwoFactorPage />
            </AuthLayout>
          }
        />

        <Route
          path="/login/forgot"
          element={
            <AuthLayout>
              <ForgotPasswordPage />
            </AuthLayout>
          }
        />

        <Route
          path="/login/reset"
          element={
            <AuthLayout>
              <ResetPasswordPage />
            </AuthLayout>
          }
        />


        {/* Printable invoices / delivery labels (no admin chrome) */}
        <Route
          path="/print/orders"
          element={withPermissions(
            <React.Suspense fallback={<div dir="rtl" style={{ padding: 24 }}>جارٍ التحميل…</div>}>
              <OrderPrintPage />
            </React.Suspense>,
            ["orders:read"],
          )}
        />

        {/* Admin (Protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireSuperAdmin={false} requirePermissions={["dashboard:read"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={withPermissions(<DashboardPage />, ["dashboard:read"])} />

          {/* account */}
          <Route path="account/profile" element={withPermissions(<ProfilePage />, ["account:read"])} />
          <Route path="account/email" element={withPermissions(<EmailChangePage />, ["account:write"])} />
          <Route path="account/security" element={withPermissions(<SecurityCenterPage />, ["security:read", "audit:read"])} />

          {/* orders */}
          <Route path="orders" element={withPermissions(<OrdersPage />, ["orders:read"])} />
          <Route path="orders/:id" element={withPermissions(<OrderDetailsPage />, ["orders:read"])} />

          {/* outbox */}
          <Route path="outbox" element={withPermissions(<OutboxPage />, ["outbox:read"])} />
          <Route path="outbox/:id" element={withPermissions(<OutboxDetailsPage />, ["outbox:read"])} />

          {/* catalog */}
          <Route path="catalog/categories" element={withPermissions(<CategoriesPage />, ["catalog:read"])} />
          <Route path="catalog/products" element={withPermissions(<ProductsPage />, ["catalog:read"])} />
          <Route path="catalog/products/new" element={withPermissions(<ProductComposerPage />, ["catalog:write"])} />
          <Route path="catalog/products/:id" element={withPermissions(<ProductEditorPage />, ["catalog:write"])} />
          <Route path="catalog/sizes" element={withPermissions(<SizesPage />, ["catalog:read"])} />

          {/* inventory */}
          <Route path="inventory/low-stock" element={withPermissions(<LowStockPage />, ["inventory:read"])} />
          <Route path="inventory/adjustments" element={withPermissions(<InventoryAdjustmentsPage />, ["inventory:write"])} />

          {/* discounts */}
          <Route path="discounts/coupons" element={withPermissions(<CouponsPage />, ["discounts:read"])} />

          
              <Route path="discounts/coupons/test" element={withPermissions(<CouponTesterPage />, ["discounts:write"])} />{/* settings */}
          <Route path="settings" element={withPermissions(<SettingsPage />, ["settings:read"])} />
          <Route path="chatbot" element={withPermissions(<ChatbotPage />, ["chatbot:read"])} />
          <Route path="media" element={withPermissions(<MediaCenterPage />, ["settings:read"])} />

          {/* nav + pages */}
          <Route path="nav" element={withPermissions(<NavPage />, ["nav:write"])} />
          {/* ugc */}
          <Route path="ugc/reviews" element={withPermissions(<ReviewsPage />, ["ugc:read"])} />
          <Route path="ugc/comments" element={withPermissions(<CommentsPage />, ["ugc:read"])} />
          <Route
            path="pages"
            element={withPermissions(
              <ErrorBoundary title="Pages">
                <PagesListPage />
              </ErrorBoundary>,
              ["pages:read"]
            )}
          />
          <Route
            path="pages/:id"
            element={withPermissions(
              <ErrorBoundary title="Page editor">
                <PageEditorPage />
              </ErrorBoundary>,
              ["pages:write"]
            )}
          />
          <Route
            path="pages/:id/preview"
            element={withPermissions(
              <ErrorBoundary title="Page preview">
                <PagePreviewPage />
              </ErrorBoundary>,
              ["pages:read"]
            )}
          />
        </Route>

        {/* Root */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
