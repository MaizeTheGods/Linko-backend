import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar.jsx';
import RightAside from './components/RightAside.jsx';
import useIsMobile from './hooks/useIsMobile.js';

// Route-level code splitting (lazy-loaded pages)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage.jsx'));
const ExplorePage = React.lazy(() => import('./pages/ExplorePage.jsx'));
const EditProfilePage = React.lazy(() => import('./pages/EditProfilePage.jsx'));
const AccountSettingsPage = React.lazy(() => import('./pages/AccountSettingsPage.jsx'));
const FollowRequestsPage = React.lazy(() => import('./pages/FollowRequestsPage.jsx'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage.jsx'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage.jsx'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage.jsx'));
const SavedPage = React.lazy(() => import('./pages/SavedPage.jsx'));
const SearchPage = React.lazy(() => import('./pages/SearchPage.jsx'));
const PostDetailPage = React.lazy(() => import('./pages/PostDetailPage.jsx'));

function App() {
  const isMobile = useIsMobile(900);
  const location = useLocation();
  return (
    <Router>
      <div className="app-shell">
        <Sidebar />
        <main>
          <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
          <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/search" element={<SearchPage />} />
          
          {/* Ruta Protegida */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />

          {/* Básicas del sidebar */}
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <PostDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:username"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPage />
              </ProtectedRoute>
            }
          />

          {/* Perfil de Usuario (protegido) */}
          <Route
            path="/perfil/:username"
            element={
              <ProtectedRoute>
                <ProfilePage key={location.pathname} />
              </ProtectedRoute>
            }
          />

          {/* Configuración / Ajustes (protegido) */}
          <Route
            path="/settings/profile"
            element={
              <ProtectedRoute>
                <EditProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/account"
            element={
              <ProtectedRoute>
                <AccountSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/requests"
            element={
              <ProtectedRoute>
                <FollowRequestsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
          </Suspense>
        </main>
        {!isMobile && <RightAside />}
      </div>
    </Router>
  );
}

export default App;
