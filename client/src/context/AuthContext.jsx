// RUTA: src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/http.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // === LA CORRECCIÓN CLAVE ===
      // Si no hay token, no hacemos nada y simplemente terminamos de cargar.
      if (!token) {
        setLoading(false);
        return;
      }

      // Si hay token, lo validamos contra el backend.
      const response = await api.get('/users/me');
      setUser(response.data);

    } catch (error) {
      console.error("Fallo en la inicialización de la autenticación:", error.message);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      // ESTO AHORA SIEMPRE SE EJECUTA.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    window.location.href = '/login'; // Forzamos recarga para limpiar todo el estado
  };

  const value = { user, setUser, loading, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};