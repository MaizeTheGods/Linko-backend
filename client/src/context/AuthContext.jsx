import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/http.js';

// 1. Creamos el contexto
export const AuthContext = createContext(null);

// 2. Proveedor del contexto que envuelve la app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Este estado es CRUCIAL. Es true mientras verificamos el token por primera vez.
  const [loading, setLoading] = useState(true);

  // Usamos useCallback para que la función no se recree innecesariamente
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Si no hay token, no hay nada que hacer. Terminamos de cargar.
      if (!token) {
        setLoading(false);
        return;
      }
      // Si hay token, lo validamos contra el backend para obtener datos frescos del usuario.
      const res = await api.get('/users/me');
      setUser({ ...res.data, loggedIn: true });
    } catch (e) {
      // Si la API falla (token inválido/expirado), limpiamos el estado.
      console.error("Auth initialization failed:", e.message);
      localStorage.removeItem('authToken'); // Limpiamos el token inválido
      setUser(null);
    } finally {
      // En cualquier caso (éxito o fallo), marcamos la carga inicial como completada.
      setLoading(false);
    }
  }, []);

  // Este useEffect se ejecuta UNA SOLA VEZ cuando la aplicación carga por primera vez.
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};