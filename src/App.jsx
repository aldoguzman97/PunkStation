import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import BrowsePage from './pages/BrowsePage';
import UploadPage from './pages/UploadPage';
import MediaViewPage from './pages/MediaViewPage';
import SettingsPage from './pages/SettingsPage';
import PlaylistsPage from './pages/PlaylistsPage';
import WatchPartyPage from './pages/WatchPartyPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminMediaPage from './pages/admin/AdminMediaPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="page-center" style={{ height: '100vh' }}>
        <div className="cyber-spinner" />
      </div>
    );
  }
  return user ? children : <Navigate to="/auth" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="page-center" style={{ height: '100vh' }}>
        <div className="cyber-spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="page-center" style={{ height: '100vh' }}>
        <div className="cyber-spinner" />
      </div>
    );
  }
  return user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : children;
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111118',
            color: '#e0e0e8',
            border: '2px solid #00f0ff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8rem',
          },
          success: { style: { borderColor: '#39ff14' } },
          error: { style: { borderColor: '#ff003c' } },
        }}
      />

      <Routes>
        {/* Public auth */}
        <Route
          path="/auth"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/media/:id" element={<MediaViewPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/party/:code" element={<WatchPartyPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/media" element={<AdminRoute><AdminMediaPage /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
