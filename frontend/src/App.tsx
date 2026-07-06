import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const ScratchPage = lazy(() => import('@/pages/ScratchPage'));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const CampaignsPage = lazy(() => import('@/pages/admin/CampaignsPage'));
const CouponsPage = lazy(() => import('@/pages/admin/CouponsPage'));
const VerifyPage = lazy(() => import('@/pages/admin/VerifyPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));

const ParticipantsPage = lazy(() => import('@/pages/admin/ParticipantsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* User-facing routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/scratch" element={<ScratchPage />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
