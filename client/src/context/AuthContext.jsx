import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/http.js';

// 1. Creamos el contexto que estará disponible en toda la aplicación.
export const AuthContext = createContext(null);

// 2. Creamos el componente "Proveedor" que envolverá nuestra aplicación.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Este estado es CRUCIAL. Es 'true' por defecto, mientras verificamos si hay una sesión válida.
  const [loading, setLoading] = useState(true);

  // Esta función se encarga de verificar el token al iniciar la aplicación.
  // Usamos useCallback para optimizar y evitar que se recree en cada render.
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Si no hay token en el almacenamiento, no hay sesión. Dejamos de cargar.
      // Esta es la corrección clave para evitar que `loading` se quede en `true`.
      if (!token) {
        setLoading(false);
        return;
      }

      // Si hay un token, lo validamos contra el backend para obtener los datos más recientes del usuario.
      // Esto también nos protege de tokens expirados o inválidos.
      const response = await api.get('/users/me');
      setUser(response.data);

    } catch (error) {
      // Si la llamada a la API falla (ej. token inválido), significa que no hay sesión.
      console.error("Fallo en la inicialización de la autenticación:", error.message);
      localStorage.removeItem('authToken'); // Limpiamos el token inválido.
      setUser(null);
    } finally {
      // Haya éxito o fallo, la verificación inicial SIEMPRE ha terminado.
      setLoading(false);
    }
  }, []);

  // Este useEffect se ejecuta UNA SOLA VEZ cuando la aplicación carga por primera vez.
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Función para cerrar sesión, que será accesible desde cualquier parte de la app.
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    // Forzamos una redirección para asegurar que el estado se limpie en toda la app.
    window.location.href = '/login';
  };

  // El valor que compartimos con todos los componentes hijos de la aplicación.
  const contextValue = { user, setUser, loading, logout };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};