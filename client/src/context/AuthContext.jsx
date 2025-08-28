import React, { createContext, useState, useEffect } from 'react';
import api from '../api/http.js';

// 1. Creamos el contexto
const AuthContext = createContext();

// 2. Proveedor del contexto que envuelve la app
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const res = await api.get('/users/me');
        setUser({ ...res.data, loggedIn: true });
      } catch (e) {
        // si falla, el interceptor puede redirigir; solo limpiar estado
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

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

export { AuthContext, AuthProvider };
