import React, { Suspense, useContext } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext'; // Importamos el contexto
import ProtectedRoute from './components/ProtectedRoute';
import RightAside from './components/RightAside.jsx';
import useIsMobile from './hooks/useIsMobile.js';

// --- Todas tus páginas importadas con lazy loading ---
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


// --- Componente interno que contiene toda la lógica de renderizado ---
function AppContent() {
  const isMobile = useIsMobile(900);
  const location = useLocation();
  const { loading } = useContext(AuthContext); // Obtenemos el estado de carga del contexto

  // ==================================================================
  // ESTA ES LA SOLUCIÓN CLAVE
  // Mientras el AuthContext está verificando el token por primera vez,
  // mostramos un loader a pantalla completa. Esto detiene la renderización
  // de cualquier otro componente hasta que sepamos si hay un usuario o no.
  // ==================================================================
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        placeContent: 'center',
        height: '100vh',
        backgroundColor: '#121212', // Fondo oscuro para consistencia
        color: '#FFFFFF'
      }}>
        Cargando aplicación...
      </div>
    );
  }

  // Determina si estamos en una ruta de autenticación para usar un layout simple
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // --- Layout para las páginas de Login y Registro (sin barras laterales) ---
  if (isAuthPage) {
    return (
      <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </Suspense>
    );
  }

  // --- Layout principal para el resto de la aplicación ---
  return (
    <div className="app-shell">
      <main>
        <Suspense fallback={<div style={{ padding: 16 }}>Cargando página…</div>}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Rutas Protegidas */}
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

            {/* Ruta de fallback para /perfil sin username */}
            <Route path="/perfil" element={<Navigate to="/" replace state={{ error: 'Debes especificar un nombre de usuario.' }} />} />

            {/* Página 404 para cualquier otra ruta no encontrada */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isMobile && <RightAside />}
    </div>
  );
}


// El componente App ahora solo se encarga de proveer el contexto
function App() {
  // NOTA: Es crucial que tu AuthProvider esté envolviendo a <App /> en tu archivo principal (main.jsx o index.js).
  // Si ya lo tienes así, este componente es perfecto.
  return <AppContent />;
}

export default App;