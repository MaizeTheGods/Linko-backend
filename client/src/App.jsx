import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar.jsx';
import RightAside from './components/RightAside.jsx';
import useIsMobile from './hooks/useIsMobile.js';

// ... (tus importaciones lazy-loaded)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
// ... etc.

function App() {
  const isMobile = useIsMobile(900);
  const location = useLocation();

  // === LA SOLUCIÓN ESTÁ AQUÍ ===
  // Determina si estamos en una ruta de autenticación que no debe tener el layout principal.
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Si es una página de autenticación, solo renderiza el contenido de esa página.
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

  // Si NO es una página de autenticación, renderiza el layout principal con las rutas protegidas.
  return (
    <div className="app-shell">
      <Sidebar />
      <main>
        <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
          <Routes>
            {/* Las rutas públicas que SÍ usan el layout principal */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Rutas Protegidas */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/perfil/:username" element={<ProtectedRoute><ProfilePage key={location.pathname} /></ProtectedRoute>} />
            {/* ... (todas tus otras rutas protegidas van aquí) ... */}
            
            {/* Asegúrate de que login y register no estén aquí para evitar duplicados */}

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isMobile && <RightAside />}
    </div>
  );
}

export default App;