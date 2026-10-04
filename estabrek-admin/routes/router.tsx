// src/routes/router.tsx
import React, { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";

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

const OutboxPage = lazy(() => import("../features/outbox/OutboxPage"));
const OutboxDetailsPage = lazy(() => import("../features/outbox/OutboxDetailsPage"));

const CategoriesPage = lazy(() => import("../features/catalog/CategoriesPage"));
const ProductsPage = lazy(() => import("../features/catalog/ProductsPage"));
const ProductEditorPage = lazy(() => import("../features/catalog/ProductEditorPage"));
const SizesPage = lazy(() => import("../features/catalog/SizesPage"));

const LowStockPage = lazy(() => import("../features/inventory/LowStockPage"));
const InventoryAdjustmentsPage = lazy(() => import("../features/inventory/InventoryAdjustmentsPage"));

const CouponsPage = lazy(() => import("../features/discounts/CouponsPage"));
const CouponTesterPage = lazy(() => import("../features/discounts/CouponTesterPage"));

const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const ChatbotPage = lazy(() => import("../features/chatbot/ChatbotPage"));
const NavPage = lazy(() => import("../features/nav/NavPage"));

const PagesListPage = lazy(() => import("../features/pages/PagesListPage"));
const PageEditorPage = lazy(() => import("../features/pages/PageEditorPage"));
const PagePreviewPage = lazy(() => import("../features/pages/PagePreviewPage"));

const ReviewsPage = lazy(() => import("../features/ugc/ReviewsPage"));
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


        {/* Admin (Protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />

          {/* account */}
          <Route path="account/profile" element={<ProfilePage />} />
          <Route path="account/email" element={<EmailChangePage />} />
          <Route path="account/security" element={<SecurityCenterPage />} />

          {/* orders */}
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />

          {/* outbox */}
          <Route path="outbox" element={<OutboxPage />} />
          <Route path="outbox/:id" element={<OutboxDetailsPage />} />

          {/* catalog */}
          <Route path="catalog/categories" element={<CategoriesPage />} />
          <Route path="catalog/products" element={<ProductsPage />} />
          <Route path="catalog/products/:id" element={<ProductEditorPage />} />
          <Route path="catalog/sizes" element={<SizesPage />} />

          {/* inventory */}
          <Route path="inventory/low-stock" element={<LowStockPage />} />
          <Route path="inventory/adjustments" element={<InventoryAdjustmentsPage />} />

          {/* discounts */}
          <Route path="discounts/coupons" element={<CouponsPage />} />

          
              <Route path="discounts/coupons/test" element={<CouponTesterPage />} />{/* settings */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="chatbot" element={<ChatbotPage />} />

          {/* nav + pages */}
          <Route path="nav" element={<NavPage />} />
          {/* ugc */}
          <Route path="ugc/reviews" element={<ReviewsPage />} />
          <Route
            path="pages"
            element={(
              <ErrorBoundary title="Pages">
                <PagesListPage />
              </ErrorBoundary>
            )}
          />
          <Route
            path="pages/:id"
            element={(
              <ErrorBoundary title="Page editor">
                <PageEditorPage />
              </ErrorBoundary>
            )}
          />
          <Route
            path="pages/:id/preview"
            element={(
              <ErrorBoundary title="Page preview">
                <PagePreviewPage />
              </ErrorBoundary>
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
