import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // Mientras se verifica la sesión, muestra un loader para evitar "parpadeos"
  if (loading) {
    return <div style={{ display: 'grid', placeContent: 'center', height: '100vh' }}>Verificando sesión...</div>;
  }

  // Si la verificación terminó y NO hay usuario, redirige a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay usuario, muestra el contenido protegido
  return children;
};

export default ProtectedRoute;