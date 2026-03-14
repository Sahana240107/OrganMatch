import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import NotificationToast from './components/ui/NotificationToast';
import { ROLES } from './utils/constants';

/* Lazy-loaded pages */
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MatchingEngine = React.lazy(() => import('./pages/MatchingEngine'));
const LocationMap = React.lazy(() => import('./pages/LocationMap'));
const RegisterDonor = React.lazy(() => import('./pages/RegisterDonor'));
const RegisterRecipient = React.lazy(() => import('./pages/RegisterRecipient'));
const WaitingList = React.lazy(() => import('./pages/WaitingList'));
const OfferWorkflow = React.lazy(() => import('./pages/OfferWorkflow'));
const TransplantHistory = React.lazy(() => import('./pages/TransplantHistory'));
const Analytics = React.lazy(() => import('./pages/Analytics'));

/* Loading fallback */
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12, animation: 'pulse-dot 1.5s ease-in-out infinite' }}>🫀</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
      </div>
    </div>
  );
}

/* App shell layout (sidebar + topbar + outlet for page content) */
function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: 56 }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />   {/* child routes render here */}
          </Suspense>
        </main>
      </div>
      <NotificationToast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Auth guard — redirects to /login if not authenticated */}
              <Route element={<ProtectedRoute />}>
                {/* App shell — renders Topbar + Sidebar + <Outlet /> */}
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/matching" element={<MatchingEngine />} />
                  <Route path="/matching/:organId" element={<MatchingEngine />} />
                  <Route path="/map" element={<LocationMap />} />
                  <Route path="/donors/register" element={<RegisterDonor />} />
                  <Route path="/recipients/register" element={<RegisterRecipient />} />
                  <Route path="/waiting-list" element={<WaitingList />} />
                  <Route path="/offers" element={<OfferWorkflow />} />
                  <Route path="/offers/:offerId" element={<OfferWorkflow />} />
                  <Route path="/history" element={<TransplantHistory />} />
                  <Route path="/analytics" element={
                    <ProtectedRoute roles={[ROLES.NATIONAL_ADMIN, ROLES.REGIONAL_COORDINATOR]}>
                      <Analytics />
                    </ProtectedRoute>
                  } />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}