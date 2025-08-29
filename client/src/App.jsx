import React, { Suspense } from 'react';
// Se importa 'Navigate' para la redirección
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'; 
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar.jsx';
import RightAside from './components/RightAside.jsx';
import useIsMobile from './hooks/useIsMobile.js';

// Todas tus páginas importadas con lazy loading
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

  // Se determina si estamos en una ruta de autenticación para mostrar un layout diferente
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // LAYOUT DE AUTENTICACIÓN (pantalla completa, sin barras laterales)
  if (isAuthPage) {
    return (
      <Suspense fallback={<div style={{ padding: 16, textAlign: 'center' }}>Cargando…</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </Suspense>
    );
  }

  // LAYOUT PRINCIPAL DE LA APLICACIÓN (con barras laterales)
  return (
    <div className="app-shell">
      <Sidebar />
      <main>
        <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
          <Routes>
            {/* Rutas Públicas que usan el layout principal */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Todas las Rutas Protegidas */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/messages/:username" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
            <Route path="/perfil/:username" element={<ProtectedRoute><ProfilePage key={location.pathname} /></ProtectedRoute>} />
            <Route path="/settings/profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
            <Route path="/settings/account" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
            <Route path="/settings/requests" element={<ProtectedRoute><FollowRequestsPage /></ProtectedRoute>} />
            
            {/* Ruta para manejar /perfil sin username, redirige al inicio */}
            <Route path="/perfil" element={<Navigate to="/" replace state={{ error: 'Debes especificar un nombre de usuario.' }} />} />

            {/* Página 404 para cualquier otra ruta */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isMobile && <RightAside />}
    </div>
  );
}

export default App;