import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  // 1. Obtenemos el usuario y el estado de carga desde nuestro AuthContext.
  const { user, loading } = useContext(AuthContext);
  const location = useLocation(); // Guardamos la ubicación actual para redirigir de vuelta si es necesario.

  // ==================================================================
  // MEJORA DE EXPERIENCIA DE USUARIO
  // ==================================================================
  // 2. Mientras el AuthContext está verificando la sesión por primera vez (loading === true),
  //    mostramos un loader a pantalla completa. Esto evita un parpadeo o una pantalla
  //    en blanco y le comunica al usuario que algo está sucediendo.
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        placeContent: 'center',
        height: '100vh',
        backgroundColor: '#121212',
        color: '#FFFFFF'
      }}>
        Verificando sesión...
      </div>
    );
  }

  // 3. Si la verificación ha terminado (loading === false) y NO hay un usuario,
  //    redirigimos a la página de login. Guardamos la página de origen (`from`)
  //    para poder regresar al usuario a donde intentaba ir después de iniciar sesión.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Si la verificación ha terminado y SÍ hay un usuario, renderizamos el
  //    componente hijo que está protegido (la página solicitada).
  return children;
};

export default ProtectedRoute;